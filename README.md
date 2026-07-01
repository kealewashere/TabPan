# Tab DJ
Per-tab stereo audio panning and volume extension for Firefox / Chrome / Chromium.

Intended use: DJing from web sources.

<<<<<<< Updated upstream
![Tab DJ - balance left right channels and volume for Chrome tabs](screenshots/screenshot-en.png?raw=true)
=======
### Purpose
Chrome has no built-in per-tab audio routing. If you wear headphones and a tab's audio is mixed wrong, or you want to boost bass on one tab while reducing it on another, there's no native way to do that. TabPanEQ fills that gap — it intercepts a tab's audio stream and routes it through a configurable audio graph before it reaches your ears.

It's a rebranded and extended fork of [TabDJ](https://github.com/davidschlachter/TabDJ) and [AudioPan](https://github.com/WardenDrew/AudioPan), adding an equalizer panel on top of the original pan/volume controls.

### Screenshots
**Balance and Volume**

![Screenshot of balance](screenshots/balance.png)

**Equalizer**

![Screenshot of equalizer](screenshots/equalizer.png)

### Installation Instructions
Chrome Web Store installation is the intended distribution path, but for local development:

1. Clone the repo
2. Open Chrome and go to chrome://extensions
3. Enable Developer mode (toggle, top-right)
4. Click Load unpacked and select the repo folder
5. The TabPanEQ icon will appear in your toolbar
6. Click it while a tab is playing audio

No build step is required — the extension is plain JS with no bundler.

### Build Description

The codebase is three files plus supporting assets:

| File | Role |
|------|------|
| `background.js` | Service worker — handles tab capture lifecycle |
| `offscreen.js` | Audio graph — panning, volume, EQ nodes live here |
| `popup.js` | UI logic — sliders send messages to offscreen |
| `_locales/` | i18n strings (`en`, `en_GB`, `es`, `fr`) |

#### To add a feature

- Audio processing changes go in `offscreen.js`.
- UI changes go in `popup.html` + `popup.js` + the relevant `_locales/en/messages.json` key.
- Message passing between `popup` → `background` → `offscreen` follows Chrome's `chrome.runtime.sendMessage` pattern.

#### To add a locale

Copy `_locales/en/messages.json` into a new folder (e.g. `_locales/de/`) and translate the `message` values.

Register the locale in `manifest.json`'s `default_locale` area if needed.

#### Reload the extension

Reload the extension from `chrome://extensions` after any JS/HTML change — there is no hot reload.


### Credits
- Forked from:
    - https://github.com/davidschlachter/TabDJ
    - https://github.com/WardenDrew/AudioPan
>>>>>>> Stashed changes
