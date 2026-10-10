// popup.js — settings UI. Persists everything to chrome.storage.local.

const DEFAULTS = {
  apiKey: "",
  targetLang: "EN-US",
  outgoingLang: "EN-US",
  incomingEnabled: false,
  outgoingEnabled: false,
};

const $ = (id) => document.getElementById(id);

async function load() {
  const s = await chrome.storage.local.get(DEFAULTS);
  $("apiKey").value = s.apiKey;
  $("targetLang").value = s.targetLang;
  $("outgoingLang").value = s.outgoingLang;
  $("incomingEnabled").checked = s.incomingEnabled;
  $("outgoingEnabled").checked = s.outgoingEnabled;
}

async function save() {
  await chrome.storage.local.set({
    apiKey: $("apiKey").value.trim(),
    targetLang: $("targetLang").value,
    outgoingLang: $("outgoingLang").value,
    incomingEnabled: $("incomingEnabled").checked,
    outgoingEnabled: $("outgoingEnabled").checked,
  });
  $("status").textContent = "Saved.";
}

$("save").addEventListener("click", save);
load();
