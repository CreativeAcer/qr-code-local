# QR Generator

A feature-rich, local-first QR code generator built with Electron. No cloud, no tracking — everything runs on your machine.

## Features

**Content Types**
- URL, WiFi credentials, vCard contact, Email, SMS, Calendar event, Phone number, Plain text

**Customisation**
- Foreground & background colour pickers
- Linear and radial gradient fills
- Square or round dot styles
- Adjustable size (100–1000 px) and quiet-zone margin
- Logo overlay with optional background padding

**Export**
- Save as PNG, SVG, or JPEG via native file dialog
- Copy to clipboard
- Keyboard shortcuts: `Ctrl+S` · `Ctrl+⇧+S` · `Ctrl+C` · `Ctrl+↵`

**Productivity**
- Live preview (300 ms debounce)
- Generation history with thumbnails (last 50 entries)
- Batch generation from CSV (`url,label` columns)
- Dark / light theme, persisted across sessions
- All settings auto-saved and restored on next launch

## Installation (end users)

Download the latest release from the [Releases](https://github.com/CreativeAcer/qr-code-local/releases) page:

| Platform | File |
|----------|------|
| Windows  | `QR-Generator-Setup-x.x.x.exe` |
| Linux    | `QR-Generator-x.x.x.AppImage` or `.deb` |
| macOS    | `QR-Generator-x.x.x.dmg` |

## Developer Setup

**Prerequisites:** Node.js 20+ (tested on Node.js 24 / npm 11)

```bash
# Linux / macOS
bash scripts/setup-dev.sh
npm start

# Windows (CMD)
scripts\setup-dev.bat

# Windows (PowerShell)
.\scripts\setup-dev.ps1
```

## Building for Distribution

```bash
# Linux / macOS
bash scripts/build.sh linux
bash scripts/build.sh win
bash scripts/build.sh all

# Windows
scripts\build.bat win
```

Artifacts are written to `./dist/`.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Shell | Electron | 34.0.0 |
| QR generation | qrcode (main process) | 1.5.3 |
| Rendering | Canvas 2D API (renderer) | — |
| Security | `contextIsolation: true`, CSP, `contextBridge` | — |
| Persistence | JSON files in Electron `userData` | — |
| Build | electron-builder | 25.1.8 |

Versions are pinned exactly (no `^` ranges) for reproducible builds. Tested with **Node.js 24** and **npm 11**. After a successful `npm install`, verify with:

```bash
npm list electron electron-builder qrcode --depth=0
```

If any version differs from the above, update `package.json` to match before committing.

## Project Structure

```
src/
  main.js          ← Electron main process + IPC handlers (Node.js context)
  preload.js       ← contextBridge: exposes window.qrAPI (sandboxed Node.js)
  renderer/
    index.html     ← HTML structure (Chromium context — no Node.js access)
    renderer.js    ← All frontend logic
    styles.css     ← Themed CSS (light + dark)
assets/
  icon.svg         ← App icon
scripts/
  setup-dev.sh / .bat / .ps1
  build.sh / .bat
```

`src/` and `src/renderer/` are kept as separate levels intentionally — the boundary in the folder structure mirrors the security boundary in Electron: files directly in `src/` run with Node.js access, files in `src/renderer/` run in the sandboxed Chromium renderer with no Node.js access whatsoever.

### Windows + network/virtual drives

Electron's installer uses `fs.realpath()` during `npm install`, which fails on network shares, mapped drives, and virtual filesystem passthroughs (e.g. QEMU/KVM virtio, Samba). **Always `npm install` from a local NTFS path on Windows** (e.g. `C:\Users\you\qr-code-local`). On Linux/macOS no such restriction applies.

## TODO

- ARIA live regions for screen-reader QR update announcements
- Native app menu (File > Save, Edit > Copy)
- Drag-and-drop logo upload
- Export history as ZIP
- Auto-update via electron-updater
- `.icns` / `.ico` icon generation in build pipeline

## License

MIT — see [LICENSE](LICENSE)

---

Developed by **MM (CreativeAcer)** · [GitHub](https://github.com/CreativeAcer/qr-code-local)
