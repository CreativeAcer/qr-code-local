// === STATE ════════════════════════════════════════════════════════════════════
const state = {
  currentType:  'url',
  lastSvgString: '',
  lastCanvas:    null,
  logoFile:      null,
  debounceTimer: null,
  toastTimer:    null,
  history:       [],
  batchEntries:  [],
  theme:         'light'
}

// === INIT ════════════════════════════════════════════════════════════════════
async function init() {
  await loadSettings()
  await loadHistory()
  buildForm('url')
  setupTypeSwitcher()
  setupOptionListeners()
  setupExportButtons()
  setupKeyboardShortcuts()
  setupLogoControls()
  setupBatch()
  setupHistoryControls()
  setupFrameOptions()
}

// === THEME ═══════════════════════════════════════════════════════════════════
function applyTheme(theme) {
  state.theme = theme
  document.documentElement.setAttribute('data-theme', theme)
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙'
}

document.getElementById('themeToggle').addEventListener('click', async () => {
  const next = state.theme === 'light' ? 'dark' : 'light'
  applyTheme(next)
  await window.qrAPI.saveSettings({ theme: next })
})

// === INPUT TYPE SWITCHER ══════════════════════════════════════════════════════
function setupTypeSwitcher() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => {
        b.classList.remove('active')
        b.setAttribute('aria-selected', 'false')
      })
      btn.classList.add('active')
      btn.setAttribute('aria-selected', 'true')
      state.currentType = btn.dataset.type
      buildForm(btn.dataset.type)
      scheduleLivePreview()
    })
  })
}

// === QR TYPE FORM BUILDERS ═══════════════════════════════════════════════════
const FORMS = {
  url: () => `
    <div class="option-group">
      <label for="f_url">🔗 URL</label>
      <input type="url" id="f_url" placeholder="https://example.com" spellcheck="false" autocomplete="off">
      <div class="field-error" id="f_url_err"></div>
    </div>`,

  wifi: () => `
    <div class="option-group">
      <label for="f_ssid">📶 Network Name (SSID)</label>
      <input type="text" id="f_ssid" placeholder="MyNetwork">
    </div>
    <div class="option-group">
      <label for="f_wpass">🔑 Password</label>
      <input type="password" id="f_wpass" placeholder="Leave blank if open">
    </div>
    <div class="option-group">
      <label for="f_enc">Encryption</label>
      <select id="f_enc">
        <option value="WPA">WPA/WPA2</option>
        <option value="WEP">WEP</option>
        <option value="nopass">None (open)</option>
      </select>
    </div>
    <div class="option-group">
      <label class="checkbox-label">
        <input type="checkbox" id="f_hidden"> Hidden Network
      </label>
    </div>`,

  vcard: () => `
    <div class="color-row">
      <div class="option-group">
        <label for="f_fn">First Name</label>
        <input type="text" id="f_fn" placeholder="Jane">
      </div>
      <div class="option-group">
        <label for="f_ln">Last Name</label>
        <input type="text" id="f_ln" placeholder="Doe">
      </div>
    </div>
    <div class="option-group">
      <label for="f_org">Organisation</label>
      <input type="text" id="f_org" placeholder="Acme Corp">
    </div>
    <div class="option-group">
      <label for="f_vtel">Phone</label>
      <input type="tel" id="f_vtel" placeholder="+1 555 0100">
    </div>
    <div class="option-group">
      <label for="f_vem">Email</label>
      <input type="email" id="f_vem" placeholder="jane@example.com">
    </div>
    <div class="option-group">
      <label for="f_vurl">Website</label>
      <input type="url" id="f_vurl" placeholder="https://example.com">
    </div>`,

  email: () => `
    <div class="option-group">
      <label for="f_eto">✉️ To</label>
      <input type="email" id="f_eto" placeholder="recipient@example.com">
      <div class="field-error" id="f_eto_err"></div>
    </div>
    <div class="option-group">
      <label for="f_esub">Subject</label>
      <input type="text" id="f_esub" placeholder="Hello!">
    </div>
    <div class="option-group">
      <label for="f_ebody">Body</label>
      <textarea id="f_ebody" placeholder="Message…" rows="3"></textarea>
    </div>`,

  sms: () => `
    <div class="option-group">
      <label for="f_stel">📱 Phone Number</label>
      <input type="tel" id="f_stel" placeholder="+1 555 0100">
    </div>
    <div class="option-group">
      <label for="f_smsg">Message</label>
      <textarea id="f_smsg" placeholder="Your message…" rows="3"></textarea>
    </div>`,

  calendar: () => `
    <div class="option-group">
      <label for="f_ctitle">📅 Event Title</label>
      <input type="text" id="f_ctitle" placeholder="Team Meeting">
    </div>
    <div class="color-row">
      <div class="option-group">
        <label for="f_cstart">Start</label>
        <input type="datetime-local" id="f_cstart">
      </div>
      <div class="option-group">
        <label for="f_cend">End</label>
        <input type="datetime-local" id="f_cend">
      </div>
    </div>
    <div class="option-group">
      <label for="f_cloc">Location</label>
      <input type="text" id="f_cloc" placeholder="Conference Room A">
    </div>
    <div class="option-group">
      <label for="f_cdesc">Description</label>
      <textarea id="f_cdesc" placeholder="Event details…" rows="2"></textarea>
    </div>`,

  phone: () => `
    <div class="option-group">
      <label for="f_phone">📞 Phone Number</label>
      <input type="tel" id="f_phone" placeholder="+1 555 0100">
    </div>`,

  text: () => `
    <div class="option-group">
      <label for="f_text">📝 Text Content</label>
      <textarea id="f_text" placeholder="Enter any text…" rows="4"></textarea>
    </div>`
}

function buildForm(type) {
  const container = document.getElementById('formContainer')
  container.innerHTML = FORMS[type] ? FORMS[type]() : ''
  // Attach live-preview listeners to all new inputs
  container.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', scheduleLivePreview)
    el.addEventListener('change', scheduleLivePreview)
  })
}

// === QR TEXT ENCODER ═════════════════════════════════════════════════════════
function escapeWifi(s) { return (s || '').replace(/([\\;,":"])/g, '\\$1') }

function encodeQRText(type) {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : '' }
  const chk = id => { const el = document.getElementById(id); return el ? el.checked : false }

  switch (type) {
    case 'url': {
      const url = v('f_url')
      const err = document.getElementById('f_url_err')
      if (!url) return null
      try { new URL(url) } catch {
        if (err) err.textContent = 'Enter a valid URL (include https://)'
        return null
      }
      if (err) err.textContent = ''
      return url
    }
    case 'wifi': {
      const ssid = v('f_ssid')
      if (!ssid) return null
      const enc = v('f_enc') || 'WPA'
      const pass = v('f_wpass')
      const hidden = chk('f_hidden') ? 'true' : 'false'
      return `WIFI:T:${enc};S:${escapeWifi(ssid)};P:${escapeWifi(pass)};H:${hidden};;`
    }
    case 'vcard': {
      const fn = v('f_fn'), ln = v('f_ln')
      if (!fn && !ln) return null
      const lines = [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${ln};${fn}`,
        `FN:${fn} ${ln}`.trim()
      ]
      if (v('f_org'))  lines.push(`ORG:${v('f_org')}`)
      if (v('f_vtel')) lines.push(`TEL:${v('f_vtel')}`)
      if (v('f_vem'))  lines.push(`EMAIL:${v('f_vem')}`)
      if (v('f_vurl')) lines.push(`URL:${v('f_vurl')}`)
      lines.push('END:VCARD')
      return lines.join('\n')
    }
    case 'email': {
      const to = v('f_eto')
      const err = document.getElementById('f_eto_err')
      if (!to) return null
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        if (err) err.textContent = 'Enter a valid email address'
        return null
      }
      if (err) err.textContent = ''
      const sub  = encodeURIComponent(v('f_esub'))
      const body = encodeURIComponent(v('f_ebody'))
      let str = `mailto:${to}`
      const params = []
      if (sub)  params.push(`subject=${sub}`)
      if (body) params.push(`body=${body}`)
      if (params.length) str += '?' + params.join('&')
      return str
    }
    case 'sms': {
      const tel = v('f_stel')
      if (!tel) return null
      const msg = v('f_smsg')
      return msg ? `smsto:${tel}:${msg}` : `smsto:${tel}`
    }
    case 'calendar': {
      const title = v('f_ctitle')
      if (!title) return null
      const start = formatVEventDate(v('f_cstart'))
      const end   = formatVEventDate(v('f_cend'))
      const lines = ['BEGIN:VEVENT', `SUMMARY:${title}`]
      if (start) lines.push(`DTSTART:${start}`)
      if (end)   lines.push(`DTEND:${end}`)
      if (v('f_cloc'))  lines.push(`LOCATION:${v('f_cloc')}`)
      if (v('f_cdesc')) lines.push(`DESCRIPTION:${v('f_cdesc')}`)
      lines.push('END:VEVENT')
      return lines.join('\n')
    }
    case 'phone': {
      const p = v('f_phone')
      return p ? `tel:${p}` : null
    }
    case 'text': {
      const t = v('f_text')
      return t || null
    }
    default: return null
  }
}

function formatVEventDate(s) {
  if (!s) return ''
  const [date, time] = s.split('T')
  if (!date) return ''
  const d = date.replace(/-/g, '')
  const t = (time || '0000').replace(/:/g, '').padEnd(6, '0')
  return `${d}T${t}`
}

// === LIVE PREVIEW ════════════════════════════════════════════════════════════
function scheduleLivePreview() {
  clearTimeout(state.debounceTimer)
  state.debounceTimer = setTimeout(generatePreview, 300)
}

function setupOptionListeners() {
  const ids = ['errorCorrection', 'qrSize', 'qrMargin', 'qrColor', 'bgColor',
               'qrStyle', 'eyeStyle', 'gradientEnabled', 'gradientType', 'gradientColor1',
               'gradientColor2', 'logoSize', 'logoBgColor', 'transparentBg']
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.addEventListener('input',  scheduleLivePreview)
    el.addEventListener('change', scheduleLivePreview)
  })

  // Size slider label
  document.getElementById('qrSize').addEventListener('input', e => {
    document.getElementById('sizeValue').textContent = e.target.value
  })
  document.getElementById('qrMargin').addEventListener('input', e => {
    document.getElementById('marginValue').textContent = e.target.value
  })
  document.getElementById('logoSize').addEventListener('input', e => {
    document.getElementById('logoSizeValue').textContent = e.target.value
  })

  // Gradient toggle
  document.getElementById('gradientEnabled').addEventListener('change', e => {
    document.getElementById('gradientOptions').classList.toggle('visible', e.target.checked)
    scheduleLivePreview()
  })

  // Transparent bg toggle for logo
  document.getElementById('transparentBg').addEventListener('change', e => {
    document.getElementById('logoBgGroup').style.display = e.target.checked ? 'none' : ''
    scheduleLivePreview()
  })
}

// === QR RENDERING ════════════════════════════════════════════════════════════
async function generatePreview() {
  const text = encodeQRText(state.currentType)
  if (!text) {
    showCanvas(false)
    setExportEnabled(false)
    return
  }

  const opts = getOptions()
  showSpinner(true)
  try {
    const { svgString, moduleCount, margin: marginMods } = await window.qrAPI.generate({
      text, ...opts, style: opts.style
    })
    state.lastSvgString = svgString
    const rawCanvas = await renderToCanvas(svgString, opts, moduleCount, marginMods)

    // Reliability score
    const cellPx = opts.size / (moduleCount + 2 * marginMods)
    showScorePanel(calcReliabilityScore({
      darkColor:  opts.darkColor  || '#000000',
      lightColor: opts.lightColor || '#ffffff',
      cellPx,
      errorLevel:  opts.errorLevel,
      hasLogo:    !!state.logoFile,
      logoSizePct: opts.logoSizePercent
    }))

    // Store raw canvas for share card, apply frame for display
    _rawQrCanvas = rawCanvas
    const ctaText    = document.getElementById('frameCta')?.value || 'SCAN ME'
    const frameColor = document.getElementById('frameColor')?.value || '#4299e1'
    const frameText  = document.getElementById('frameTextColor')?.value || '#ffffff'
    const displayCanvas = applyFrame(rawCanvas, activeFrame, ctaText, frameColor, frameText)
    state.lastCanvas = displayCanvas

    // Show canvas in preview
    const preview = document.getElementById('previewCanvas')
    preview.width  = displayCanvas.width
    preview.height = displayCanvas.height
    const ctx = preview.getContext('2d')
    ctx.drawImage(displayCanvas, 0, 0)

    showCanvas(true)
    setExportEnabled(true)
    await saveToHistory(rawCanvas, text)
  } catch (err) {
    console.error('QR generation error:', err)
    showToast('Failed to generate QR code', 'error')
    showCanvas(false)
    setExportEnabled(false)
  } finally {
    showSpinner(false)
  }
}

function getOptions() {
  return {
    errorLevel:     document.getElementById('errorCorrection').value,
    size:           parseInt(document.getElementById('qrSize').value, 10),
    margin:         parseInt(document.getElementById('qrMargin').value, 10),
    darkColor:      document.getElementById('qrColor').value,
    lightColor:     document.getElementById('bgColor').value,
    style:          document.getElementById('qrStyle').value,
    eyeStyle:       document.getElementById('eyeStyle').value,
    gradient:       document.getElementById('gradientEnabled').checked ? {
      type:   document.getElementById('gradientType').value,
      color1: document.getElementById('gradientColor1').value,
      color2: document.getElementById('gradientColor2').value
    } : null,
    logoSizePercent:  parseInt(document.getElementById('logoSize').value, 10),
    transparentBg:    document.getElementById('transparentBg').checked,
    logoBgColor:      document.getElementById('logoBgColor').value
  }
}

async function renderToCanvas(svgString, opts, moduleCount, margin) {
  const size = opts.size || 300
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size

  // 1. Render SVG (black on white) to canvas
  await drawSvgToCanvas(svgString, canvas)

  // 2. Colorise (replace black→darkColor, white→lightColor) + optional gradient
  coloriseCanvas(canvas, opts.darkColor, opts.lightColor, opts.gradient)

  // 3. Overlay custom corner eye style (erase + redraw finder patterns)
  if (opts.eyeStyle && opts.eyeStyle !== 'square' && moduleCount && margin !== undefined) {
    overlayFinderPatterns(canvas, moduleCount, margin, opts.darkColor || '#000000', opts.lightColor || '#ffffff', opts.eyeStyle)
  }

  // 4. Composite logo if present
  if (state.logoFile) {
    await compositeLogo(canvas, state.logoFile, opts.logoSizePercent, opts.logoBgColor, opts.transparentBg)
  }

  return canvas
}

function drawSvgToCanvas(svgString, canvas) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d')
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')) }
    img.src = url
  })
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

function coloriseCanvas(canvas, darkHex, lightHex, gradient) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const px = imageData.data

  const dark  = hexToRgb(darkHex  || '#000000')
  const light = hexToRgb(lightHex || '#ffffff')

  let gradPx = null
  if (gradient) {
    const gc = document.createElement('canvas')
    gc.width = width; gc.height = height
    const gCtx = gc.getContext('2d')
    let grad
    if (gradient.type === 'radial') {
      grad = gCtx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
    } else {
      grad = gCtx.createLinearGradient(0, 0, width, height)
    }
    grad.addColorStop(0, gradient.color1)
    grad.addColorStop(1, gradient.color2)
    gCtx.fillStyle = grad
    gCtx.fillRect(0, 0, width, height)
    gradPx = gCtx.getImageData(0, 0, width, height).data
  }

  for (let i = 0; i < px.length; i += 4) {
    const brightness = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000
    if (brightness < 128) {
      if (gradPx) {
        px[i] = gradPx[i]; px[i + 1] = gradPx[i + 1]; px[i + 2] = gradPx[i + 2]; px[i + 3] = gradPx[i + 3]
      } else {
        px[i] = dark.r; px[i + 1] = dark.g; px[i + 2] = dark.b; px[i + 3] = 255
      }
    } else {
      px[i] = light.r; px[i + 1] = light.g; px[i + 2] = light.b; px[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

// === CORNER EYE STYLING ══════════════════════════════════════════════════════
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawFinderPattern(ctx, ox, oy, cell, darkColor, lightColor, style) {
  const s = 7 * cell
  const cx = ox + s / 2
  const cy = oy + s / 2
  if (style === 'circle') {
    ctx.fillStyle = darkColor
    ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = lightColor
    ctx.beginPath(); ctx.arc(cx, cy, s / 2 - cell, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = darkColor
    ctx.beginPath(); ctx.arc(cx, cy, 1.5 * cell, 0, Math.PI * 2); ctx.fill()
  } else if (style === 'rounded') {
    ctx.fillStyle = darkColor; roundRect(ctx, ox, oy, s, s, cell * 1.5); ctx.fill()
    ctx.fillStyle = lightColor; roundRect(ctx, ox + cell, oy + cell, 5 * cell, 5 * cell, cell * 0.6); ctx.fill()
    ctx.fillStyle = darkColor; roundRect(ctx, ox + 2 * cell, oy + 2 * cell, 3 * cell, 3 * cell, cell * 0.6); ctx.fill()
  } else {
    ctx.fillStyle = darkColor; ctx.fillRect(ox, oy, s, s)
    ctx.fillStyle = lightColor; ctx.fillRect(ox + cell, oy + cell, 5 * cell, 5 * cell)
    ctx.fillStyle = darkColor; ctx.fillRect(ox + 2 * cell, oy + 2 * cell, 3 * cell, 3 * cell)
  }
}

function overlayFinderPatterns(canvas, moduleCount, margin, darkColor, lightColor, style) {
  const ctx = canvas.getContext('2d')
  const size = canvas.width
  const cell = size / (moduleCount + 2 * margin)
  const m = margin * cell
  const far = (margin + moduleCount - 7) * cell
  ;[{ x: m, y: m }, { x: far, y: m }, { x: m, y: far }].forEach(({ x, y }) => {
    ctx.fillStyle = lightColor
    ctx.fillRect(x, y, 7 * cell, 7 * cell)
    drawFinderPattern(ctx, x, y, cell, darkColor, lightColor, style)
  })
}

// === RELIABILITY SCORE ═══════════════════════════════════════════════════════
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  return [r, g, b].reduce((sum, c, i) => {
    const v = c / 255
    return sum + (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) * [0.2126, 0.7152, 0.0722][i]
  }, 0)
}

function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(hex1), L2 = relativeLuminance(hex2)
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
}

function calcReliabilityScore({ darkColor, lightColor, cellPx, errorLevel, hasLogo, logoSizePct }) {
  const contrast = contrastRatio(darkColor, lightColor)
  const ecRank = { L: 0, M: 1, Q: 2, H: 3 }
  const factors = []
  let score = 100

  if (contrast >= 7)        factors.push({ label: `Contrast ${contrast.toFixed(1)}:1 — excellent`, level: 'green' })
  else if (contrast >= 4.5) factors.push({ label: `Contrast ${contrast.toFixed(1)}:1 — good`, level: 'green' })
  else if (contrast >= 3)  { factors.push({ label: `Contrast ${contrast.toFixed(1)}:1 — low contrast`, level: 'amber' }); score -= 20 }
  else                     { factors.push({ label: `Contrast ${contrast.toFixed(1)}:1 — very low`, level: 'red' }); score -= 40 }

  if (cellPx >= 4)        factors.push({ label: `${cellPx.toFixed(1)}px per module — crisp`, level: 'green' })
  else if (cellPx >= 2.5) { factors.push({ label: `${cellPx.toFixed(1)}px per module — OK`, level: 'amber' }); score -= 15 }
  else                    { factors.push({ label: `${cellPx.toFixed(1)}px per module — too small`, level: 'red' }); score -= 35 }

  if (hasLogo && ecRank[errorLevel] < 3) {
    factors.push({ label: `EC ${errorLevel} with logo — scan failure risk`, level: 'red' }); score -= 30
  } else if (ecRank[errorLevel] >= 2) {
    factors.push({ label: `EC ${errorLevel} — highly resilient`, level: 'green' })
  } else if (ecRank[errorLevel] === 1) {
    factors.push({ label: `EC M — moderate resilience`, level: 'amber' }); score -= 5
  } else {
    factors.push({ label: `EC L — minimal resilience`, level: 'amber' }); score -= 10
  }

  if (hasLogo) {
    if (logoSizePct <= 20)      factors.push({ label: `Logo ${logoSizePct}% — safe coverage`, level: 'green' })
    else if (logoSizePct <= 27) { factors.push({ label: `Logo ${logoSizePct}% — near limit`, level: 'amber' }); score -= 15 }
    else                        { factors.push({ label: `Logo ${logoSizePct}% — may block data`, level: 'red' }); score -= 30 }
  }

  score = Math.max(0, score)
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'
  const subtitles = { A: 'Excellent — scan anywhere', B: 'Good — print with confidence', C: 'Fair — test before large print runs', D: 'Poor — adjust settings', F: 'Critical — likely to fail scanning' }
  return { grade, subtitle: subtitles[grade], factors }
}

function showScorePanel({ grade, subtitle, factors }) {
  const panel = document.getElementById('scorePanel')
  panel.style.display = 'flex'
  const badge = document.getElementById('scoreBadge')
  badge.textContent = grade
  badge.className = 'score-badge ' + grade
  document.getElementById('scoreSubtitle').textContent = subtitle
  document.getElementById('scoreFactors').innerHTML = factors.map(f =>
    `<div class="score-factor"><div class="score-dot ${f.level}"></div><span>${f.label}</span></div>`
  ).join('')
}

// === SCAN FRAME ══════════════════════════════════════════════════════════════
let activeFrame = 'none'

function setupFrameOptions() {
  ['frameNone', 'frameBanner', 'frameBadge'].forEach(id => {
    const btn = document.getElementById(id)
    if (!btn) return
    btn.addEventListener('click', () => {
      activeFrame = btn.dataset.frame
      document.querySelectorAll('.frame-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.frame === activeFrame))
      document.getElementById('frameOptions').style.display = activeFrame !== 'none' ? 'flex' : 'none'
      scheduleLivePreview()
    })
  })
  const ctaInput = document.getElementById('frameCta')
  if (ctaInput) ctaInput.addEventListener('input', scheduleLivePreview)
  const fc = document.getElementById('frameColor')
  if (fc) fc.addEventListener('input', scheduleLivePreview)
  const ftc = document.getElementById('frameTextColor')
  if (ftc) ftc.addEventListener('input', scheduleLivePreview)
}

function applyFrame(srcCanvas, style, ctaText, frameColor, textColor) {
  if (style === 'none') return srcCanvas
  const qrW = srcCanvas.width
  const bannerH = Math.round(qrW * 0.145)
  const pad = style === 'badge' ? Math.round(qrW * 0.055) : 0
  const totalW = qrW + pad * 2
  const totalH = qrW + pad * 2 + bannerH

  const out = document.createElement('canvas')
  out.width = totalW
  out.height = totalH
  const ctx = out.getContext('2d')
  const r = style === 'badge' ? Math.round(totalW * 0.065) : 0

  if (style === 'badge') {
    ctx.fillStyle = frameColor
    roundRect(ctx, 0, 0, totalW, totalH, r); ctx.fill()
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, pad, pad, qrW, qrW, Math.max(2, r - pad * 0.6)); ctx.fill()
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalW, qrW)
    ctx.fillStyle = frameColor
    ctx.fillRect(0, qrW, totalW, bannerH)
  }

  ctx.drawImage(srcCanvas, pad, pad)

  const fontSize = Math.max(12, Math.round(bannerH * 0.43))
  ctx.fillStyle = textColor
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((ctaText || 'SCAN ME').toUpperCase(), totalW / 2, qrW + pad + bannerH / 2)
  return out
}

// === SHARE CARD ══════════════════════════════════════════════════════════════
let _rawQrCanvas = null

function setupShareCard() {
  const btn = document.getElementById('shareCardBtn')
  if (btn) btn.addEventListener('click', exportShareCard)
}

async function exportShareCard() {
  if (!_rawQrCanvas) return
  const opts = getOptions()
  const darkColor  = opts.darkColor  || '#000000'
  const lightColor = opts.lightColor || '#ffffff'

  const lum = relativeLuminance(darkColor)
  let gradA = darkColor, gradB
  if (lum > 0.7) { gradA = '#4299e1'; gradB = '#667eea' }
  else {
    const { r, g, b } = hexToRgb(darkColor)
    const mix = c => Math.round(c + (255 - c) * 0.42)
    gradB = `#${mix(r).toString(16).padStart(2,'0')}${mix(g).toString(16).padStart(2,'0')}${mix(b).toString(16).padStart(2,'0')}`
  }

  const W = 1080, H = 1080
  const card = document.createElement('canvas')
  card.width = W; card.height = H
  const ctx = card.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, gradA); bg.addColorStop(1, gradB)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // Dot grid texture
  ctx.fillStyle = 'rgba(255,255,255,0.065)'
  for (let y = 28; y < H; y += 44) {
    for (let x = 28; x < W; x += 44) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
    }
  }

  // White card panel
  const pW = 720, pH = 820, pX = (W - pW) / 2, pY = 104, pR = 40
  ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 28
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, pX, pY, pW, pH, pR); ctx.fill()
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

  // QR (scaled to 600px) centered in panel
  const qrX = (W - 600) / 2, qrY = pY + 80
  ctx.drawImage(_rawQrCanvas, qrX, qrY, 600, 600)

  // CTA text
  const ctaEl = document.getElementById('frameCta')
  const ctaText = (activeFrame !== 'none' && ctaEl && ctaEl.value) ? ctaEl.value.toUpperCase() : 'SCAN ME'
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 50px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(ctaText, W / 2, qrY + 600 + 58)

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '400 20px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('Made with QR Generator', W / 2, H - 52)

  const dataUrl = card.toDataURL('image/png')
  const result = await window.qrAPI.save({ format: 'png', dataUrl, defaultName: 'share-card' })
  if (result.success) showToast(`Saved: ${result.filePath.split('/').pop()}`, 'success')
}

function compositeLogo(canvas, file, sizePercent, bgColor, transparent) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = e => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const ctx = canvas.getContext('2d')
        const { width, height } = canvas
        const logoSize = Math.floor(Math.min(width, height) * (sizePercent / 100))
        const x = Math.floor((width  - logoSize) / 2)
        const y = Math.floor((height - logoSize) / 2)

        if (!transparent && bgColor) {
          const pad = Math.max(4, Math.floor(logoSize * 0.12))
          const bx = x - pad, by = y - pad, bs = logoSize + pad * 2
          ctx.fillStyle = bgColor
          ctx.beginPath()
          ctx.roundRect(bx, by, bs, bs, pad)
          ctx.fill()
        }
        ctx.drawImage(img, x, y, logoSize, logoSize)
        resolve()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// === EXPORT ══════════════════════════════════════════════════════════════════
function setupExportButtons() {
  document.getElementById('savePng').addEventListener('click', () => exportAs('png'))
  document.getElementById('saveSvg').addEventListener('click', () => exportAs('svg'))
  document.getElementById('saveJpg').addEventListener('click', () => exportAs('jpeg'))
  document.getElementById('copyClipboard').addEventListener('click', copyToClipboard)
  setupShareCard()
}

async function exportAs(format) {
  if (!state.lastCanvas) return
  try {
    let dataUrl = '', svgString = state.lastSvgString
    if (format !== 'svg') {
      const type = format === 'jpeg' ? 'image/jpeg' : 'image/png'
      const quality = format === 'jpeg' ? 0.92 : 1
      dataUrl = state.lastCanvas.toDataURL(type, quality)
    }
    const result = await window.qrAPI.save({ format, dataUrl, svgString, defaultName: 'qrcode' })
    if (result.success) showToast(`Saved: ${result.filePath.split('/').pop()}`, 'success')
  } catch (err) {
    console.error(err)
    showToast('Save failed', 'error')
  }
}

async function copyToClipboard() {
  if (!state.lastCanvas) return
  try {
    const dataUrl = state.lastCanvas.toDataURL('image/png')
    const result = await window.qrAPI.copyToClipboard({ dataUrl })
    if (result.success) showToast('Copied to clipboard', 'success')
  } catch (err) {
    console.error(err)
    showToast('Copy failed', 'error')
  }
}

// === KEYBOARD SHORTCUTS ═══════════════════════════════════════════════════════
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey
    if (!ctrl) return

    if (e.key === 's' && !e.shiftKey) { e.preventDefault(); exportAs('png') }
    if (e.key === 'S' &&  e.shiftKey) { e.preventDefault(); exportAs('svg') }
    if (e.key === 'c' && document.getElementById('previewCanvas').style.display !== 'none') {
      // Only intercept Ctrl+C when preview is visible and no text selected
      if (!window.getSelection().toString()) { e.preventDefault(); copyToClipboard() }
    }
    if (e.key === 'Enter') { e.preventDefault(); generatePreview() }
  })
}

// === LOGO CONTROLS ════════════════════════════════════════════════════════════
function setupLogoControls() {
  document.getElementById('logoInput').addEventListener('change', e => {
    const file = e.target.files[0]
    const errEl = document.getElementById('logoError')
    if (!file) { state.logoFile = null; document.getElementById('logoControls').style.display = 'none'; return }

    if (file.size > 2 * 1024 * 1024) {
      errEl.textContent = 'File must be under 2 MB'
      e.target.value = ''
      return
    }
    errEl.textContent = ''
    state.logoFile = file
    document.getElementById('logoControls').style.display = 'block'
    scheduleLivePreview()
  })

  document.getElementById('clearLogoBtn').addEventListener('click', () => {
    state.logoFile = null
    document.getElementById('logoInput').value = ''
    document.getElementById('logoControls').style.display = 'none'
    scheduleLivePreview()
  })
}

// === HISTORY ═════════════════════════════════════════════════════════════════
async function loadHistory() {
  state.history = await window.qrAPI.getHistory()
  renderHistoryPanel()
}

async function saveToHistory(canvas, text) {
  // Generate 32px thumbnail
  const thumb = document.createElement('canvas')
  thumb.width = 32; thumb.height = 32
  thumb.getContext('2d').drawImage(canvas, 0, 0, 32, 32)
  const thumbnail = thumb.toDataURL('image/png')

  const entry = {
    id:        Date.now(),
    text:      text.slice(0, 80),
    type:      state.currentType,
    timestamp: Date.now(),
    thumbnail
  }

  // Avoid duplicate consecutive entries
  if (state.history.length && state.history[0].text === entry.text) return

  state.history.unshift(entry)
  if (state.history.length > 50) state.history = state.history.slice(0, 50)

  await window.qrAPI.addHistory(entry)
  renderHistoryPanel()
}

function renderHistoryPanel() {
  const list = document.getElementById('historyList')
  const recent = state.history.slice(0, 10)
  if (!recent.length) {
    list.innerHTML = '<p style="font-size:0.78rem;color:var(--text-muted)">No history yet.</p>'
    return
  }
  list.innerHTML = recent.map(item => {
    const date = new Date(item.timestamp).toLocaleString()
    const label = item.text.slice(0, 40) + (item.text.length > 40 ? '…' : '')
    const thumb = item.thumbnail || ''
    return `<div class="history-item" tabindex="0" data-id="${item.id}" title="${item.text}">
      ${thumb ? `<img class="history-thumb" src="${thumb}" alt="" aria-hidden="true">` : ''}
      <div class="history-text">
        <div class="history-label">${escapeHtml(label)}</div>
        <div class="history-meta">${escapeHtml(item.type)} · ${date}</div>
      </div>
    </div>`
  }).join('')

  list.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click',   () => restoreFromHistory(parseInt(el.dataset.id, 10)))
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') restoreFromHistory(parseInt(el.dataset.id, 10)) })
  })
}

function restoreFromHistory(id) {
  const entry = state.history.find(h => h.id === id)
  if (!entry) return
  // Switch to the right type tab
  const btn = document.querySelector(`.type-btn[data-type="${entry.type}"]`)
  if (btn) btn.click()
  // Populate first field
  setTimeout(() => {
    const firstInput = document.querySelector('#formContainer input, #formContainer textarea')
    if (firstInput) {
      firstInput.value = entry.text
      firstInput.dispatchEvent(new Event('input'))
    }
  }, 50)
}

function setupHistoryControls() {
  document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
    await window.qrAPI.clearHistory()
    state.history = []
    renderHistoryPanel()
    showToast('History cleared')
  })
}

// === BATCH ═══════════════════════════════════════════════════════════════════
function setupBatch() {
  document.getElementById('loadCsvBtn').addEventListener('click', async () => {
    const result = await window.qrAPI.openCsvDialog()
    if (!result.success) return
    state.batchEntries = parseCSV(result.content)
    renderBatchPreview()
  })

  document.getElementById('batchGenerateBtn').addEventListener('click', async () => {
    if (!state.batchEntries.length) return
    const btn = document.getElementById('batchGenerateBtn')
    btn.disabled = true
    btn.textContent = '⏳ Generating…'
    const opts = getOptions()
    const result = await window.qrAPI.batchGenerate({ entries: state.batchEntries, options: opts })
    btn.disabled = false
    btn.textContent = '⚡ Generate All'
    const el = document.getElementById('batchResult')
    if (result.success) {
      el.textContent = `✓ Generated ${result.count} QR codes → ${result.outputDir}`
    } else {
      el.textContent = result.success === false ? 'Cancelled.' : 'Failed.'
    }
  })
}

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const hasHeader = headers.some(h => h === 'url' || h === 'label' || h === 'link' || h === 'name')
  const urlIdx   = hasHeader ? Math.max(headers.findIndex(h => h === 'url' || h === 'link'), 0) : 0
  const labelIdx = hasHeader ? headers.findIndex(h => h === 'label' || h === 'name') : 1
  const start    = hasHeader ? 1 : 0

  return lines.slice(start).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    return { url: cols[urlIdx] || '', label: labelIdx >= 0 ? (cols[labelIdx] || '') : '' }
  }).filter(e => e.url)
}

function renderBatchPreview() {
  const preview = document.getElementById('batchPreview')
  const tbody   = document.getElementById('batchTableBody')
  document.getElementById('batchResult').textContent = ''
  if (!state.batchEntries.length) { preview.style.display = 'none'; return }

  tbody.innerHTML = state.batchEntries.slice(0, 20).map(e =>
    `<tr><td title="${escapeHtml(e.url)}">${escapeHtml(e.url.slice(0, 40))}</td><td>${escapeHtml(e.label)}</td></tr>`
  ).join('')

  if (state.batchEntries.length > 20) {
    tbody.innerHTML += `<tr><td colspan="2" style="color:var(--text-muted);text-align:center">… and ${state.batchEntries.length - 20} more</td></tr>`
  }
  preview.style.display = 'block'
}

// === SETTINGS PERSISTENCE ════════════════════════════════════════════════════
async function loadSettings() {
  const s = await window.qrAPI.getSettings()
  if (!s || !Object.keys(s).length) return

  if (s.theme) applyTheme(s.theme)
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val }
  const setChk = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.checked = val }

  set('errorCorrection', s.errorLevel)
  set('qrSize',          s.size)
  set('qrMargin',        s.margin)
  set('qrColor',         s.darkColor)
  set('bgColor',         s.lightColor)
  set('qrStyle',         s.style)
  set('eyeStyle',        s.eyeStyle)
  set('gradientType',    s.gradientType)
  set('gradientColor1',  s.gradientColor1)
  set('gradientColor2',  s.gradientColor2)
  set('logoSize',        s.logoSizePercent)
  set('logoBgColor',     s.logoBgColor)
  setChk('gradientEnabled', s.gradientEnabled)
  setChk('transparentBg',   s.transparentBg)

  if (s.size)   document.getElementById('sizeValue').textContent   = s.size
  if (s.margin !== undefined) document.getElementById('marginValue').textContent = s.margin
  if (s.logoSizePercent) document.getElementById('logoSizeValue').textContent = s.logoSizePercent
  if (s.gradientEnabled) {
    document.getElementById('gradientOptions').classList.add('visible')
  }
  if (s.transparentBg) {
    document.getElementById('logoBgGroup').style.display = 'none'
  }
}

// Persist settings whenever any option changes (debounced separately)
let settingsSaveTimer = null
function scheduleSettingsSave() {
  clearTimeout(settingsSaveTimer)
  settingsSaveTimer = setTimeout(async () => {
    const opts = getOptions()
    await window.qrAPI.saveSettings({
      errorLevel:      opts.errorLevel,
      size:            opts.size,
      margin:          opts.margin,
      darkColor:       opts.darkColor,
      lightColor:      opts.lightColor,
      style:           opts.style,
      eyeStyle:        opts.eyeStyle,
      gradientEnabled: !!opts.gradient,
      gradientType:    opts.gradient?.type,
      gradientColor1:  opts.gradient?.color1,
      gradientColor2:  opts.gradient?.color2,
      logoSizePercent: opts.logoSizePercent,
      transparentBg:   opts.transparentBg,
      logoBgColor:     opts.logoBgColor
    })
  }, 500)
}

['errorCorrection','qrSize','qrMargin','qrColor','bgColor','qrStyle','eyeStyle',
 'gradientEnabled','gradientType','gradientColor1','gradientColor2',
 'logoSize','logoBgColor','transparentBg'].forEach(id => {
  const el = document.getElementById(id)
  if (el) {
    el.addEventListener('input',  scheduleSettingsSave)
    el.addEventListener('change', scheduleSettingsSave)
  }
})

// === UI HELPERS ══════════════════════════════════════════════════════════════
function showCanvas(visible) {
  document.getElementById('previewCanvas').style.display     = visible ? 'block' : 'none'
  document.getElementById('previewPlaceholder').style.display = visible ? 'none'  : 'flex'
}

function showSpinner(visible) {
  document.getElementById('spinner').style.display = visible ? 'block' : 'none'
  if (visible) {
    document.getElementById('previewCanvas').style.display     = 'none'
    document.getElementById('previewPlaceholder').style.display = 'none'
  }
}

function setExportEnabled(enabled) {
  ['savePng','saveSvg','saveJpg','copyClipboard','shareCardBtn'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.disabled = !enabled
  })
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast')
  toast.textContent = msg
  toast.className   = `toast${type ? ' ' + type : ''} visible`
  clearTimeout(state.toastTimer)
  state.toastTimer = setTimeout(() => { toast.className = 'toast' }, 2800)
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// === BOOT ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init)
