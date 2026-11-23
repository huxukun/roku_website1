/**
 * 终端自检序列
 * 复用现有加载屏，用真实加载里程碑驱动，不新增等待、不阻塞 UI。
 */

import { subscribe } from './hudTelemetry.js'

const STEPS = [
  { key: 'core', label: 'BOOTING CORE' },
  { key: 'ui', label: 'UI MODULES' },
  { key: 'music', label: 'MUSIC CACHE' },
  { key: 'scene', label: 'RENDER PIPELINE' },
  { key: 'link', label: 'SUPABASE LINK' },
  { key: 'archive', label: 'SYNC ARCHIVE' }
]

const SESSION_KEY = 'roku-boot-played'
const FIRST_VISIT_MS = 1000
const REPEAT_VISIT_MS = 450
const REDUCED_MS = 300
const SPIN_GLYPHS = ['-', '\\', '|', '/']

let screen = null
let listEl = null
let startedAt = 0
let duration = FIRST_VISIT_MS
let finished = false
let lines = new Map()
let revealTimers = []
let spinTimer = null
let spinIndex = 0
let unsubscribe = null

function isReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (error) {
    return false
  }
}

function isRepeatVisit() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch (error) {
    return false
  }
}

function markRepeatVisit() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch (error) {
    /* 隐私模式忽略 */
  }
}

function setStatus(line, status) {
  if (!line) return
  // 已经成功的不再回退，避免后续失败把成功里程碑染红
  if (line.status === 'ok' && status !== 'ok') return
  line.status = status
  line.el.classList.remove('is-pending', 'is-ok', 'is-fail', 'is-skip')
  line.el.classList.add(`is-${status}`)
  if (status === 'ok') line.statusEl.textContent = 'ok'
  else if (status === 'fail') line.statusEl.textContent = 'FAIL'
  else if (status === 'skip') line.statusEl.textContent = 'skip'
  else line.statusEl.textContent = SPIN_GLYPHS[spinIndex]
}

function revealLine(line) {
  if (!line || line.revealed) return
  line.revealed = true
  line.el.classList.add('visible')
  if (line.status === 'pending') setStatus(line, 'pending')
}

function revealAll() {
  lines.forEach((line) => revealLine(line))
}

function spin() {
  if (finished) return
  spinIndex = (spinIndex + 1) % SPIN_GLYPHS.length
  lines.forEach((line) => {
    if (line.revealed && line.status === 'pending') {
      line.statusEl.textContent = SPIN_GLYPHS[spinIndex]
    }
  })
}

function scheduleReveal() {
  // 在总时长的前 55% 内逐行显示，给最后的 flicker 收起留出余量
  const perLine = Math.max(45, Math.min(130, (duration * 0.55) / STEPS.length))
  STEPS.forEach((step, index) => {
    if (index === 0) {
      revealLine(lines.get(step.key))
      return
    }
    revealTimers.push(window.setTimeout(() => {
      revealLine(lines.get(step.key))
    }, index * perLine))
  })
}

export function initBootScreen() {
  if (startedAt) return
  screen = document.getElementById('loading-screen')
  if (!screen) return

  startedAt = performance.now()
  duration = isReducedMotion()
    ? REDUCED_MS
    : (isRepeatVisit() ? REPEAT_VISIT_MS : FIRST_VISIT_MS)

  screen.classList.add('boot-active')
  listEl = document.getElementById('boot-log')
  if (!listEl) {
    listEl = document.createElement('ul')
    listEl.id = 'boot-log'
    listEl.className = 'boot-log'
    listEl.setAttribute('aria-hidden', 'true')
    const content = screen.querySelector('.loading-content') || screen
    content.insertBefore(listEl, content.firstChild)
  }

  lines = new Map()
  STEPS.forEach((step) => {
    const li = document.createElement('li')
    li.className = 'boot-line is-pending'
    li.dataset.key = step.key

    const label = document.createElement('span')
    label.className = 'boot-label'
    label.textContent = step.label

    const status = document.createElement('span')
    status.className = 'boot-status'
    status.textContent = SPIN_GLYPHS[0]

    li.append(label, status)
    listEl.appendChild(li)
    lines.set(step.key, {
      el: li,
      statusEl: status,
      status: 'pending',
      revealed: false
    })
  })

  scheduleReveal()
  spinTimer = window.setInterval(spin, 140)

  // 真实数据里程碑：首个 Supabase 请求、首次拿到数量
  unsubscribe = subscribe((snapshot) => {
    if (snapshot.net.at > 0) {
      markBootStep('link', 'SUPABASE LINK', snapshot.net.ok ? 'ok' : 'fail')
    }
    const total = Object.values(snapshot.counts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
    if (total > 0) {
      markBootStep('archive', 'SYNC ARCHIVE', 'ok')
    }
  })
}

export function markBootStep(key, label, status = 'ok') {
  const line = lines.get(key)
  if (!line) return
  if (label) {
    const labelEl = line.el.querySelector('.boot-label')
    if (labelEl) labelEl.textContent = label
  }
  // 只更新状态，按既定节奏逐行显示，避免初始化瞬间全部闪现
  setStatus(line, status)
}

export function minBootVisibleRemaining() {
  if (!startedAt) return 0
  return Math.max(0, duration - (performance.now() - startedAt))
}

export function finishBoot() {
  if (!startedAt || finished) return
  finished = true
  revealTimers.forEach((timer) => window.clearTimeout(timer))
  revealTimers = []
  if (spinTimer) {
    window.clearInterval(spinTimer)
    spinTimer = null
  }
  revealAll()
  lines.forEach((line) => {
    if (line.status === 'pending') setStatus(line, 'skip')
  })
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (screen) screen.classList.add('boot-complete')
  markRepeatVisit()
}
