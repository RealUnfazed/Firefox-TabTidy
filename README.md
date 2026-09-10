# 🧹 TabTidy - Your Firefox TabTidy

A lightweight Firefox extension that automatically closes or archives tabs you haven't touched in a while.

TabTidy watches Firefox's own record of tab activity and sweeps away anything that's been idle longer than the time you set — no manual tab-hunting required.

Looking for the Chrome version instead? See the [Chrome build](https://github.com/RealUnfazed/Chrome-TabTidy).

## ✨ Features

- ⏱️ Set your own idle threshold, from **30 minutes** up to **14 days**
- 🗄️ **Archive mode** saves the link so you can reopen it later, or **Close mode** removes it for good
- 📌 Never sweeps pinned tabs, tabs playing audio, or your own whitelist of sites
- 🌗 Light, dark, or system appearance
- 📋 **Open Tabs** view shows every tab sorted by idle time, with sweep-eligible ones highlighted
- ♻️ **Archive** view lets you reopen or permanently delete anything that's been swept
- 🧹 "Sweep now" for on-demand cleanup instead of waiting for the next check
- 🪶 Lightweight Manifest V3 extension
- 🌐 No external servers or accounts required

## 📸 How It Works

TabTidy checks every open tab against Firefox's own activity record on a repeating timer:

```text
Open Browser Tabs
       │
       ▼
 tab.lastAccessed
       │
       ▼
   Idle Time Check
       │
       ▼
   Sweep Decision
       │
       ▼
  Archive or Close
```

The idle threshold can be set anywhere from:

```text
30 min ─────────────────────────────── 14 days
```

## 🚀 Installation

### Temporary install (for trying it out / development)

1. Download or clone this repository.

```bash
git clone https://github.com/RealUnfazed/Firefox-TabTidy.git
```

2. Open Firefox and navigate to:

```text
about:debugging#/runtime/this-firefox
```

3. Click **Load Temporary Add-on…**

4. Select the `manifest.json` file inside this folder.

5. Pin **TabTidy** to your toolbar.

6. Click the TabTidy icon, set your idle threshold and sweep mode.

> Temporary add-ons are removed when Firefox closes — you'll need to reload them each session. For a permanent install, you can install this addon from Firefox add-ons manager website.

### Permanent install (signed)

1. Just search at the Firefox Add-ons List and find TabTidy to install it permanently.

## 🎛️ Controls

### Enable Toggle

Turns automatic sweeping on or off for the whole extension.

### Sweep Tabs Idle For

Controls how long a tab must sit untouched before it's eligible for sweeping.

```text
30 min = Very aggressive
4 hrs  = Default
1 day  = Relaxed
14 days = Rare cleanup only
```

### Mode

```text
Archive = Save the link, then close the tab
Close   = Remove the tab immediately, no record kept
```

### Never Sweep

Pinned tabs, tabs currently playing audio, and any domains you whitelist are always left alone, regardless of idle time.

## 🧩 Project Structure

```text
tab-cleaner-firefox/
│
├── manifest.json
├── background.js
├── shared.js
│
├── popup.html
├── popup.css
├── popup.js
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── LICENSE
└── README.md
```

## 🔐 Permissions

The extension uses the following WebExtensions permissions:

- `tabs` — reads tab titles, URLs, and idle time, and closes tabs.
- `storage` — stores your settings and archived tabs locally on your device.
- `alarms` — runs the periodic sweep every 5 minutes.

The extension does not require an external server, user account, or cloud service. `browser_specific_settings.gecko.data_collection_permissions` is declared as `none` for the same reason.

## ⚠️ Limitations

Firefox does not allow extensions to read or close certain browser-owned pages, such as `about:` pages, `moz-extension://` pages, and other internal URLs — these are always left alone.

Firefox 115 or newer is required for this extension's Manifest V3 background model.

Firefox background scripts in Manifest V3 run as script-based background pages rather than service workers, so this build loads `shared.js` and `background.js` directly via `manifest.json` instead of using `importScripts()`.

## 🛠️ Technologies

- JavaScript
- HTML
- CSS
- Firefox WebExtensions Manifest V3
- Firefox `browser.tabs` API
- Firefox `browser.alarms` API
- Firefox `browser.storage` API

## 👨‍💻 Author

Created and maintained by **RealUnfazed**.

GitHub:
https://github.com/realunfazed

## 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for the complete license text.

## ⭐ Support

If you find TabTidy useful, consider giving the repository a ⭐ on GitHub.

Made with ❤️ and 🎵 by **RealUnfazed**.
