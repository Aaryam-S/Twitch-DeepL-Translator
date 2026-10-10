# Twitch Chat Translator

A Chrome extension (Manifest V3) that translates Twitch chat using the [DeepL API](https://www.deepl.com/pro-api).

- **Incoming chat:** each new message gets its translation shown beneath it in yellow italics.
- **Outgoing chat:** a **Translate & Send** button next to Twitch's Chat button translates what you typed into your chosen language and sends it.

Not affiliated with Twitch or DeepL.

## Install

The extension isn't on the Chrome Web Store, so load it manually:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
5. Optional: click the puzzle-piece icon in the toolbar and pin the extension.
6. Reload any Twitch tabs that were already open.

## Setup

1. Get a DeepL API key. The free tier works; free keys end in `:fx`.
2. Click the extension icon and paste your key.
3. Choose the language for incoming translations and the language for outgoing messages.
4. Tick **Enable Incoming Chat Translation** and/or **Enable Outgoing Chat Translation**.
5. Click **Save**.

## Usage

- With incoming translation on, translations appear under each new chat message. Messages that are already in your target language, very short messages, and `!commands` are skipped.
- With outgoing translation on, type your message in the chat box and click **Translate & Send** instead of Chat. The translated text replaces your input and is sent automatically.

## Live captions

This extension doesn't generate captions. To get translated captions for a stream, use Chrome's built-in Live Caption with Live Translate (Chrome → Settings → Accessibility). See [Chrome's help page](https://support.google.com/chrome/answer/10538231) for supported languages.

## Privacy

- Your DeepL API key and settings are stored locally using `chrome.storage.local`.
- Chat text is sent to DeepL for translation, and nowhere else.
- The extension only has access to `twitch.tv` and DeepL's API hosts (`api-free.deepl.com`, `api.deepl.com`).
- Translations are cached in memory for the current browser session to avoid repeat API calls. Nothing else is stored.

## Known limitations

- **Twitch layout changes can break it.** The extension relies on Twitch's page structure. All selectors are in the `SEL` object at the top of `content.js`, so that's the first place to update if chat translation or the button stops working.
- **API usage:** every translated message counts against your DeepL quota. Busy chats can use it up quickly on the free tier, so consider enabling incoming translation only when you need it.
- **Unlisted languages:** the popup includes a common set of target languages. To add more, add an `<option>` using a [DeepL language code](https://developers.deepl.com/docs/resources/supported-languages) to the selects in `popup.html`.

## Project structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `popup.html` / `popup.css` / `popup.js` | Settings popup |
| `background.js` | Service worker that calls the DeepL API |
| `content.js` / `content.css` | Chat translation and the Translate & Send button |

## License

Released under the [MIT License](LICENSE).
