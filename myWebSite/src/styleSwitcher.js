/* ==========================================================================
 * 风格切换 STYLE SWITCHER
 * 三档风格：synth（合成波 3D）/ aero（Frutiger Aero & SolarPunk）/ y2k（Y2K & Vaporwave）
 * - 同一份内容，三套视觉与页面结构，由 html[data-style] 驱动（见 themes.css）
 * - 拉杆拖动跨过中点即切换，松手吸附到最近档位
 * - 切换时用整屏扫过动画遮住重排的一帧，保证观感连贯
 * ========================================================================== */

const STORAGE_KEY = 'roku-site-style'
const STYLE_ORDER = ['synth', 'aero', 'y2k']
const STYLE_LABEL = { synth: 'SYNTH', aero: 'AERO', y2k: 'Y2K' }
/* 扫过动画总时长（毫秒）：先盖住 → 换风格 → 再揭开 */
const WIPE_IN = 320
const WIPE_OUT = 500

let currentStyle = 'synth'
let rangeEl = null
let nameEl = null
let wipeEl = null
let switching = false
let queuedStyle = null

function readSavedStyle() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return STYLE_ORDER.includes(saved) ? saved : 'synth'
  } catch (error) {
    return 'synth'
  }
}

function saveStyle(style) {
  try {
    localStorage.setItem(STORAGE_KEY, style)
  } catch (error) {
    /* 隐私模式下 localStorage 可能不可写，忽略即可 */
  }
}

function syncSwitcherUI(style) {
  const index = STYLE_ORDER.indexOf(style)
  if (rangeEl) {
    rangeEl.value = String(index)
    rangeEl.setAttribute('aria-valuetext', STYLE_LABEL[style])
  }
  if (nameEl) nameEl.textContent = STYLE_LABEL[style]
  document.querySelectorAll('.style-tick').forEach((tick) => {
    tick.classList.toggle('active', tick.dataset.style === style)
  })
}

function applyStyle(style) {
  if (!STYLE_ORDER.includes(style)) style = 'synth'
  const previous = currentStyle
  currentStyle = style

  if (document.documentElement.dataset.style !== style) {
    document.documentElement.dataset.style = style
  }

  // 分区入场动画在非 synth 风格里由 CSS 接管；回 synth 时把可能被跳过的分区补成可见
  document.querySelectorAll('.sheet-section').forEach((sec) => sec.classList.add('is-visible'))

  // 从整页风格回到合成波：内容抽屉可能被滚轮隐式推进过，先收起，保证落到 3D 首页
  if (previous !== 'synth' && style === 'synth') {
    window.__rokuUI?.closeContentSheet?.()
  }

  saveStyle(style)
  syncSwitcherUI(style)
  window.dispatchEvent(new CustomEvent('siteStyleChange', { detail: { style } }))
}

function transitionTo(style, { instant = false } = {}) {
  if (!STYLE_ORDER.includes(style)) return
  if (style === currentStyle) return

  if (instant || !wipeEl) {
    applyStyle(style)
    return
  }

  // 上一次扫过动画还没结束：记住最后一次选择，动画结束后补切
  if (switching) {
    queuedStyle = style
    return
  }

  switching = true
  const wipe = wipeEl
  wipe.dataset.to = style
  wipe.dataset.label = STYLE_LABEL[style]
  wipe.style.transition = 'none'
  wipe.style.opacity = '1'
  wipe.style.transform = 'translateY(101%)'
  void wipe.offsetHeight

  wipe.style.transition = `transform ${WIPE_IN}ms cubic-bezier(.7,0,.3,1)`
  wipe.style.transform = 'translateY(0%)'

  window.setTimeout(() => {
    applyStyle(style)
    wipe.style.transition = `transform ${WIPE_OUT}ms cubic-bezier(.7,0,.3,1)`
    wipe.style.transform = 'translateY(-101%)'
  }, WIPE_IN)

  window.setTimeout(() => {
    wipe.style.transition = 'none'
    wipe.style.opacity = '0'
    wipe.style.transform = 'translateY(101%)'
    wipe.dataset.label = ''
    switching = false
    const next = queuedStyle
    queuedStyle = null
    if (next && next !== currentStyle) transitionTo(next)
  }, WIPE_IN + WIPE_OUT + 30)
}

function bindRange() {
  if (!rangeEl) return

  // 拖动过程中：跨过中点就预览目标风格
  rangeEl.addEventListener('input', () => {
    const value = Number(rangeEl.value)
    if (!Number.isFinite(value)) return
    const target = STYLE_ORDER[Math.round(value)]
    if (target !== currentStyle) transitionTo(target)
  })

  // 松手：吸附到最近档位
  rangeEl.addEventListener('change', () => {
    const value = Number(rangeEl.value)
    const index = Math.max(0, Math.min(STYLE_ORDER.length - 1, Math.round(value)))
    rangeEl.value = String(index)
    if (STYLE_ORDER[index] !== currentStyle) transitionTo(STYLE_ORDER[index])
  })
}

function bindTicks() {
  document.querySelectorAll('.style-tick').forEach((tick) => {
    tick.addEventListener('click', () => {
      const style = tick.dataset.style
      if (!STYLE_ORDER.includes(style)) return
      if (rangeEl) rangeEl.value = String(STYLE_ORDER.indexOf(style))
      transitionTo(style)
    })
  })
}

export function initStyleSwitcher() {
  rangeEl = document.getElementById('style-range')
  nameEl = document.getElementById('style-name')
  wipeEl = document.getElementById('theme-wipe')

  const saved = readSavedStyle()
  currentStyle = saved
  applyStyle(saved)
  bindRange()
  bindTicks()

  // 方便控制台或其它模块调用：window.setSiteStyle('aero')
  window.setSiteStyle = (style) => transitionTo(style)
  window.getSiteStyle = () => currentStyle
}
