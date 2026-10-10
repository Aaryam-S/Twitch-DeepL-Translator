// content.js — Twitch DOM manipulation: incoming chat and outgoing chat.
// Twitch is a React SPA: use MutationObserver for reading and native setters for writing.
// NOTE: Twitch changes class names/selectors periodically. All selectors live in SEL.

const SEL = {
  chatContainer: ".chat-scrollable-area__message-container",
  chatLine: ".chat-line__message",
  messageBody: '[data-a-target="chat-line-message-body"]',
  chatInput: '[data-a-target="chat-input"]',
  sendButton: '[data-a-target="chat-send-button"]',
};

let settings = {
  incomingEnabled: false,
  outgoingEnabled: false,
  targetLang: "EN-US",
  outgoingLang: "EN-US",
};

// ------------------------------------------------------------------ settings
chrome.storage.local.get(settings).then((s) => {
  settings = { ...settings, ...s };
  refreshAll();
});
chrome.storage.onChanged.addListener((changes) => {
  for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
  refreshAll();
});

function refreshAll() {
  attachChatObserver();
  injectTranslateButton();
}

function translate(text, targetLang) {
  return chrome.runtime.sendMessage({ type: "TRANSLATE", text, targetLang });
}

// ------------------------------------------------------------- incoming chat
let chatObserver = null;
let observedContainer = null;

function extractMessageText(line) {
  const body = line.querySelector(SEL.messageBody);
  const root = body || line;
  // Build text from text fragments only; skip emotes' <img> and badges.
  const parts = [];
  root.querySelectorAll('.text-fragment, [data-a-target="chat-message-text"]').forEach((el) => {
    parts.push(el.textContent);
  });
  return parts.join("").trim();
}

async function translateLine(line) {
  if (!settings.incomingEnabled || line.dataset.ttDone) return;
  line.dataset.ttDone = "1";

  const text = extractMessageText(line);
  if (!text || text.length < 2 || text.startsWith("!")) return; // skip commands

  const res = await translate(text, settings.targetLang);
  if (!res || !res.ok || !res.text) return;
  // Skip if DeepL says it's already in the target language (same text back).
  if (res.text.trim().toLowerCase() === text.toLowerCase()) return;

  const span = document.createElement("span");
  span.className = "tt-translation";
  span.textContent = res.text;
  span.title = res.detectedSource ? `Translated from ${res.detectedSource}` : "Translated";

  const body = line.querySelector(SEL.messageBody) || line;
  body.appendChild(document.createElement("br"));
  body.appendChild(span);
}

function attachChatObserver() {
  const container = document.querySelector(SEL.chatContainer);
  if (!container || container === observedContainer) return;
  if (chatObserver) chatObserver.disconnect();
  observedContainer = container;

  chatObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches(SEL.chatLine)) translateLine(node);
        else if (node.querySelectorAll) node.querySelectorAll(SEL.chatLine).forEach(translateLine);
      });
    }
  });
  chatObserver.observe(container, { childList: true, subtree: true });
}

// ------------------------------------------------------------- outgoing chat
function setReactInputValue(el, value) {
  // Chat input may be a <textarea> or a Slate contenteditable depending on Twitch's rollout.
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, value);
  }
}

function getInputText(el) {
  return (el.value !== undefined ? el.value : el.textContent || "").trim();
}

function pressEnter(el) {
  const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}

function injectTranslateButton() {
  const existing = document.getElementById("tt-send-btn");
  if (!settings.outgoingEnabled) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;

  const sendBtn = document.querySelector(SEL.sendButton);
  const input = document.querySelector(SEL.chatInput);
  if (!sendBtn || !input) return;

  const btn = document.createElement("button");
  btn.id = "tt-send-btn";
  btn.type = "button";
  btn.textContent = "Translate & Send";
  btn.addEventListener("click", async () => {
    const chatInput = document.querySelector(SEL.chatInput);
    if (!chatInput) return;
    const text = getInputText(chatInput);
    if (!text) return;

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Translating…";
    try {
      const res = await translate(text, settings.outgoingLang);
      if (!res || !res.ok) throw new Error((res && res.error) || "Translation failed");
      setReactInputValue(chatInput, res.text);
      // Give React a tick to register the new value, then send.
      setTimeout(() => pressEnter(chatInput), 50);
    } catch (e) {
      console.warn("[TwitchTranslator]", e.message);
      btn.textContent = "Error";
      setTimeout(() => (btn.textContent = original), 1500);
      btn.disabled = false;
      return;
    }
    btn.textContent = original;
    btn.disabled = false;
  });

  sendBtn.parentElement.insertBefore(btn, sendBtn);
}

// ------------------------------------------------- SPA resilience (re-attach)
// Twitch re-renders chat on navigation and layout changes; poll cheaply.
setInterval(() => {
  attachChatObserver();
  injectTranslateButton();
}, 2000);
