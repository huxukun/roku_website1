/**
 * 赛博终端 HUD
 * 左侧：时钟 / 音频频谱 / 真实事件流；右侧：真实数据状态卡。
 * 仅作为 synth 风格的环境层，pointer-events: none，不拦截任何交互。
 */

import { getSnapshot, subscribe, logEvent, getSpectrum } from './hudTelemetry.js'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_LOG_LINES = 6
const SPECTRUM_BARS = 56

const CARDS = [
  { key: 'link', title: 'LINK // LATENCY' },
  { key: 'cache', title: 'CACHE // HIT RATE' },
  { key: 'archive', title: 'ARCHIVE // RECORDS' },
  { key: 'music', title: 'MUSIC // LIBRARY' },
  { key: 'sync', title: 'SYNC // LAST SYNC' }
]

let initialized = false
let leftEl = null
let rightEl = null
let clockEl = null
let dateEl = null
let tzEl = null
let versionEl = null
let logEl = null
let audioStateEl = null
let canvas = null
let ctx = null
let cards = new Map()
let latestSnapshot = null
let renderedLogKey = ''
let clockTimer = null
let rafId = null
let lastDraw = 0
let lastAudioState = 0
let lastCardPaint = 0

const pad = (value) => String(value).padStart(2, '0')

function buildLeft() {
  leftEl.innerHTML = `
    <div class="hud-block">
      <div class="hud-row">
        <span class="hud-label">LOCAL TIME</span>
        <span class="hud-value" id="hud-tz">UTC+8</span>
      </div>
      <div class="hud-clock" id="hud-clock">--:--:--</div>
      <div class="hud-date" id="hud-date">----.--.--.---</div>
    </div>
    <div class="hud-block">
      <div class="hud-row">
        <span class="hud-label">AUDIO // SPECTRUM</span>
        <span class="hud-value" id="hud-audio-state">IDLE</span>
      </div>
      <canvas id="hud-spectrum" class="hud-spectrum" width="400" height="84"></canvas>
    </div>
    <div class="hud-block">
      <div class="hud-row">
        <span class="hud-label">EVENT STREAM</span>
        <span class="hud-value">LIVE</span>
      </div>
      <ul id="hud-log" class="hud-log"></ul>
    </div>
    <div class="hud-footer">
      <span>ROKU // TERMINAL</span>
      <span id="hud-version">V.----.--</span>
    </div>
  `

  clockEl = document.getElementById('hud-clock')
  dateEl = document.getElementById('hud-date')
  tzEl = document.getElementById('hud-tz')
  versionEl = document.getElementById('hud-version')
  logEl = document.getElementById('hud-log')
  audioStateEl = document.getElementById('hud-audio-state')
  canvas = document.getElementById('hud-spectrum')
  if (canvas) ctx = canvas.getContext('2d')
}

function buildRight() {
  rightEl.innerHTML = CARDS.map((card) => `
    <section class="hud-card" data-card="${card.key}" data-state="idle">
      <i class="hud-corner tl"></i>
      <i class="hud-corner tr"></i>
      <i class="hud-corner bl"></i>
      <i class="hud-corner br"></i>
      <div class="hud-card-head">
        <span class="hud-card-title">${card.title}</span>
        <span class="hud-card-value">--</span>
      </div>
      <div class="hud-card-sub">
        <span class="sub-left">STANDBY</span>
        <span class="sub-right">--</span>
      </div>
      <div class="hud-bars">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </section>
  `).join('')

  cards = new Map()
  CARDS.forEach((card) => {
    const el = rightEl.querySelector(`[data-card="${card.key}"]`)
    if (!el) return
    cards.set(card.key, {
      el,
      value: el.querySelector('.hud-card-value'),
      left: el.querySelector('.sub-left'),
      right: el.querySelector('.sub-right'),
      bars: [...el.querySelectorAll('.hud-bars span')]
    })
  })
}

function updateClock() {
  if (!clockEl) return
  const now = new Date()
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  if (dateEl) {
    dateEl.textContent = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${WEEKDAYS[now.getDay()]}`
  }
  if (tzEl) {
    const offset = -now.getTimezoneOffset() / 60
    tzEl.textContent = `UTC${offset >= 0 ? '+' : ''}${Number.isInteger(offset) ? offset : offset.toFixed(1)}`
  }
  if (versionEl) {
    versionEl.textContent = `V.${now.getFullYear()}.${pad(now.getMonth() + 1)}`
  }
  if (latestSnapshot) renderSync(latestSnapshot)
}

function setCardState(card, state) {
  if (!card) return
  card.el.dataset.state = state
}

function paintBars(card, base, time) {
  if (!card || card.bars.length === 0) return
  const reduced = latestSnapshot?.system?.reducedMotion
  for (let i = 0; i < card.bars.length; i += 1) {
    const wave = reduced ? 0.65 : Math.sin(time / 720 + i * 1.4) * 0.5 + 0.5
    const height = Math.max(8, Math.min(100, Math.round(base * (0.35 + 0.65 * wave) * 100)))
    card.bars[i].style.height = `${height}%`
  }
}

function formatAgo(at) {
  if (!at) return '--'
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

function renderLink(snapshot, time) {
  const card = cards.get('link')
  if (!card) return
  if (snapshot.net.at > 0) {
    card.value.textContent = `${snapshot.net.lastMs}ms`
    card.left.textContent = 'SUPABASE'
    card.right.textContent = snapshot.net.ok ? 'ONLINE' : (navigator.onLine === false ? 'OFFLINE' : 'TIMEOUT')
    setCardState(card, snapshot.net.ok ? 'ok' : 'error')
    paintBars(card, Math.min(1, snapshot.net.lastMs / 2000), time)
  } else {
    card.value.textContent = '--'
    card.left.textContent = 'SUPABASE'
    card.right.textContent = 'STANDBY'
    setCardState(card, 'idle')
    paintBars(card, 0.12, time)
  }
}

function renderCache(snapshot, time) {
  const card = cards.get('cache')
  if (!card) return
  const percent = Math.round((snapshot.cache.ratio || 0) * 100)
  card.value.textContent = `${percent}%`
  card.left.textContent = `HIT ${snapshot.cache.hits}`
  card.right.textContent = `MISS ${snapshot.cache.misses}`
  setCardState(card, 'ok')
  paintBars(card, Math.max(0.15, snapshot.cache.ratio || 0), time)
}

function renderArchive(snapshot, time) {
  const card = cards.get('archive')
  if (!card) return
  const total = Object.values(snapshot.counts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
  card.value.textContent = String(total)
  card.left.textContent = `MSG ${snapshot.counts.messages} · WORKS ${snapshot.counts.portfolio}`
  card.right.textContent = `BLOG ${snapshot.counts.blogs}`
  setCardState(card, 'ok')
  paintBars(card, Math.min(1, Math.max(0.15, total / 80)), time)
}

function renderMusic(snapshot, time) {
  const card = cards.get('music')
  if (!card) return
  const songTitle = document.getElementById('song-title')?.textContent?.trim() || 'IDLE'
  card.value.textContent = String(snapshot.counts.songs || 0)
  card.left.textContent = 'BGM'
  card.right.textContent = songTitle.length > 20 ? `${songTitle.slice(0, 19)}…` : songTitle
  setCardState(card, 'ok')
  paintBars(card, Math.min(1, Math.max(0.15, (snapshot.counts.songs || 0) / 60)), time)
}

function renderSync(snapshot) {
  const card = cards.get('sync')
  if (!card) return
  card.value.textContent = formatAgo(snapshot.sync.at)
  card.left.textContent = 'CLOUD'
  card.right.textContent = snapshot.sync.ok ? 'SYNCED' : 'DEGRADED'
  setCardState(card, snapshot.sync.ok ? 'ok' : 'error')
}

function renderLogs(logs) {
  if (!logEl) return
  const entries = (logs || []).slice(-MAX_LOG_LINES)
  const key = entries.map((line) => `${line.at}:${line.text}`).join('|')
  if (key === renderedLogKey) return
  renderedLogKey = key

  logEl.textContent = ''
  entries.forEach((line) => {
    const item = document.createElement('li')
    item.dataset.level = line.level || 'info'
    const time = document.createElement('span')
    time.className = 'log-time'
    const stamp = new Date(line.at)
    time.textContent = `${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`
    const text = document.createElement('span')
    text.className = 'log-text'
    text.textContent = line.text
    item.append(time, text)
    logEl.appendChild(item)
  })
}

function render(snapshot) {
  latestSnapshot = snapshot
  const time = performance.now()
  if (time - lastCardPaint < 200) {
    renderLogs(snapshot.logs)
    return
  }
  lastCardPaint = time
  renderLink(snapshot, time)
  renderCache(snapshot, time)
  renderArchive(snapshot, time)
  renderMusic(snapshot, time)
  renderSync(snapshot)
  renderLogs(snapshot.logs)
}

function drawSpectrum() {
  rafId = window.requestAnimationFrame(drawSpectrum)
  if (!ctx || !canvas) return

  const style = document.documentElement.dataset.style
  if (style !== 'synth' || document.body.classList.contains('racer-active')) return
  if (document.hidden) return

  const now = performance.now()
  if (now - lastDraw < 55) return
  lastDraw = now

  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)

  const spectrum = getSpectrum()
  const reduced = latestSnapshot?.system?.reducedMotion

  if (spectrum && spectrum.length > 0) {
    const step = Math.max(1, Math.floor(spectrum.length / SPECTRUM_BARS))
    const barWidth = width / SPECTRUM_BARS
    for (let i = 0; i < SPECTRUM_BARS; i += 1) {
      let sum = 0
      for (let j = 0; j < step; j += 1) sum += spectrum[i * step + j] || 0
      const value = sum / step / 255
      const barHeight = Math.max(3, value * height * 0.92)
      ctx.fillStyle = value > 0.72 ? 'rgba(217, 254, 255, 0.95)' : 'rgba(50, 234, 255, 0.72)'
      ctx.fillRect(i * barWidth, height - barHeight, Math.max(2, barWidth - 2), barHeight)
    }
  } else {
    // 没有音频时画一条缓慢漂浮的空闲波形
    const phase = reduced ? 0 : now / 900
    ctx.beginPath()
    for (let x = 0; x <= width; x += 4) {
      const y = height / 2 + Math.sin(x / 26 + phase) * height * 0.14
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(50, 234, 255, 0.38)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  if (audioStateEl && now - lastAudioState > 1200) {
    lastAudioState = now
    audioStateEl.textContent = spectrum ? 'LIVE' : 'IDLE'
  }
}

export function initHud() {
  if (initialized) return
  leftEl = document.getElementById('hud-left')
  rightEl = document.getElementById('hud-right')
  if (!leftEl || !rightEl) return
  initialized = true

  buildLeft()
  buildRight()
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  subscribe(render)
  logEvent('ok', 'HUD LINK ESTABLISHED')

  rafId = window.requestAnimationFrame(drawSpectrum)
}

export function destroyHud() {
  if (clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
  if (rafId) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }
  initialized = false
}
