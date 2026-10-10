// background.js — MV3 service worker. Handles DeepL requests for the content script
// (doing it here avoids page CORS restrictions).

async function translate(text, targetLang) {
  const { apiKey, targetLang: defaultLang } = await chrome.storage.local.get({
    apiKey: "",
    targetLang: "EN-US",
  });
  if (!apiKey) throw new Error("No DeepL API key set");

  // Free keys end in ":fx" and use the api-free host.
  const host = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text], target_lang: targetLang || defaultLang }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const t = data.translations && data.translations[0];
  return { text: t ? t.text : "", detectedSource: t ? t.detected_source_language : null };
}

// Small cache to avoid re-translating repeated chat spam and save quota.
const cache = new Map();
async function cachedTranslate(text, lang) {
  const key = `${lang}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const result = await translate(text, lang);
  cache.set(key, result);
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return result;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "TRANSLATE") {
    cachedTranslate(msg.text, msg.targetLang)
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // async response
  }
});
