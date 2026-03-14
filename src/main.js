const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, session } = require('electron')
const path = require('path')
const fs = require('fs')
const QRCode = require('qrcode')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 550,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'"
        ]
      }
    })
  })

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Module Shape Helpers ─────────────────────────────────────────────────────
// Each function receives the top-left corner (x, y) of the module cell and its
// pixel size (s), and returns an SVG element string filled with #000.

function moduleShape(style, x, y, s) {
  const cx = x + s / 2
  const cy = y + s / 2

  switch (style) {
    case 'dots':
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.45)}" fill="#000"/>`

    case 'rounded':
      return `<rect x="${f(x + s * 0.05)}" y="${f(y + s * 0.05)}" ` +
             `width="${f(s * 0.9)}" height="${f(s * 0.9)}" rx="${f(s * 0.25)}" fill="#000"/>`

    case 'hearts': {
      // Heart path defined in a 32×28.8 viewBox, visual centre at (16, 14)
      const sc = (s * 0.88) / 32
      const tx = cx - 16 * sc
      const ty = cy - 14 * sc
      return `<path d="M16,28.8C8,22.4 0,18.4 0,10.4C0,5.2 4.4,0 10.4,0C13.6,0 15.2,1.6 16,2.8C16.8,1.6 18.4,0 21.6,0C27.6,0 32,5.2 32,10.4C32,18.4 24,22.4 16,28.8Z" fill="#000" transform="translate(${f(tx)},${f(ty)}) scale(${sc.toFixed(4)})"/>`
    }

    case 'stars': {
      const outer = s * 0.48
      const inner = s * 0.20
      const pts = []
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = (i * 36 - 90) * Math.PI / 180
        pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`)
      }
      return `<polygon points="${pts.join(' ')}" fill="#000"/>`
    }

    case 'diamonds': {
      const r = s * 0.48
      return `<polygon points="${f(cx)},${f(cy - r)} ${f(cx + r)},${f(cy)} ${f(cx)},${f(cy + r)} ${f(cx - r)},${f(cy)}" fill="#000"/>`
    }

    default: // squares
      return `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" fill="#000"/>`
  }
}

// Compact fixed-point helper (2 decimal places is enough for SVG paths)
function f(n) { return n.toFixed(2) }

// ─── IPC: QR Generation ───────────────────────────────────────────────────────
ipcMain.handle('qr:generate', async (event, options) => {
  const {
    text,
    errorLevel = 'M',
    size = 300,
    margin = 4,
    style = 'squares'
  } = options

  if (!text || typeof text !== 'string' || text.length > 4296) {
    throw new Error('Invalid or oversized input (QR codes support up to ~4296 characters)')
  }

  // Always generate black-on-white; renderer applies colours/gradient
  const qrData = QRCode.create(text, { errorCorrectionLevel: errorLevel })
  const modules = qrData.modules
  const moduleCount = modules.size
  const marginMods = Math.max(0, parseInt(margin, 10))
  const totalMods = moduleCount + 2 * marginMods
  const modPx = size / totalMods
  const offset = marginMods * modPx

  let shapes = ''
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.get(row, col)) {
        const x = offset + col * modPx
        const y = offset + row * modPx
        shapes += moduleShape(style, x, y, modPx)
      }
    }
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/>${shapes}</svg>`
  return { svgString, moduleCount, margin: marginMods }
})

// ─── IPC: Save File ───────────────────────────────────────────────────────────
ipcMain.handle('qr:save', async (event, { format, dataUrl, svgString, defaultName }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const filters = {
    png: [{ name: 'PNG Image', extensions: ['png'] }],
    jpeg: [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }],
    svg: [{ name: 'SVG Image', extensions: ['svg'] }]
  }
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save QR Code',
    defaultPath: defaultName || 'qrcode',
    filters: filters[format] || filters.png
  })
  if (canceled || !filePath) return { success: false }

  if (format === 'svg') {
    await fs.promises.writeFile(filePath, svgString, 'utf8')
  } else {
    const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    await fs.promises.writeFile(filePath, Buffer.from(b64, 'base64'))
  }
  return { success: true, filePath }
})

// ─── IPC: Clipboard ───────────────────────────────────────────────────────────
ipcMain.handle('qr:copy-clipboard', async (event, { dataUrl }) => {
  const img = nativeImage.createFromDataURL(dataUrl)
  clipboard.writeImage(img)
  return { success: true }
})

// ─── IPC: Open CSV ────────────────────────────────────────────────────────────
ipcMain.handle('qr:open-csv', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open CSV File',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths.length) return { success: false }
  const content = await fs.promises.readFile(filePaths[0], 'utf8')
  return { success: true, content }
})

// ─── IPC: Batch Generate ──────────────────────────────────────────────────────
ipcMain.handle('qr:batch-generate', async (event, { entries, options }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select Output Folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (canceled || !filePaths.length) return { success: false }

  const outputDir = filePaths[0]
  let count = 0
  for (const entry of entries) {
    const { url, label } = entry
    const safeLabel = (label || url).replace(/[^a-z0-9_\-]/gi, '_').slice(0, 64) || `qr_${count}`
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: options.errorLevel || 'M',
        width: options.size || 300,
        margin: options.margin || 4
      })
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      await fs.promises.writeFile(path.join(outputDir, `${safeLabel}.png`), Buffer.from(b64, 'base64'))
      count++
    } catch (err) {
      console.error(`Skipping "${url}": ${err.message}`)
    }
  }
  return { success: true, count, outputDir }
})

// ─── IPC: History ─────────────────────────────────────────────────────────────
const historyPath = () => path.join(app.getPath('userData'), 'history.json')

ipcMain.handle('qr:get-history', async () => {
  try {
    return JSON.parse(await fs.promises.readFile(historyPath(), 'utf8'))
  } catch { return [] }
})

ipcMain.handle('qr:add-history', async (event, entry) => {
  let history = []
  try { history = JSON.parse(await fs.promises.readFile(historyPath(), 'utf8')) } catch {}
  history.unshift(entry)
  if (history.length > 50) history = history.slice(0, 50)
  await fs.promises.writeFile(historyPath(), JSON.stringify(history, null, 2), 'utf8')
  return { success: true }
})

ipcMain.handle('qr:clear-history', async () => {
  try { await fs.promises.unlink(historyPath()) } catch {}
  return { success: true }
})

// ─── IPC: Settings ────────────────────────────────────────────────────────────
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json')

ipcMain.handle('qr:get-settings', async () => {
  try {
    return JSON.parse(await fs.promises.readFile(settingsPath(), 'utf8'))
  } catch { return {} }
})

ipcMain.handle('qr:save-settings', async (event, settings) => {
  let existing = {}
  try { existing = JSON.parse(await fs.promises.readFile(settingsPath(), 'utf8')) } catch {}
  await fs.promises.writeFile(settingsPath(), JSON.stringify({ ...existing, ...settings }, null, 2), 'utf8')
  return { success: true }
})
