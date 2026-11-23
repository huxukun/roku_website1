/**
 * 站点遥测总线
 * HUD 双轨与 DataConstellation 共用同一份真实数据快照。
 * 本模块不依赖任何业务模块，所有上报都必须保持静默，不能影响主流程。
 */

const MAX_LOGS = 8
const MAX_ACTIVITY = 3
const EMIT_INTERVAL = 120

const listeners = new Set()

const state = {
  net: {
    lastMs: 0,
    avgMs: 0,
    ok: true,
    label: '',
    at: 0,
    samples: 0,
    totalMs: 0
  },
  cache: {
    hits: 0,
    misses: 0,
    ratio: 0,
    names: {}
  },
  counts: {
    messages: 0,
    portfolio: 0,
    blogs: 0,
    collection: 0,
    skills: 0,
    songs: 0
  },
  datasets: {
    skills: []
  },
  sync: {
    at: 0,
    ok: true
  },
  activity: [],
  logs: [],
  system: {
    mobile: false,
    reducedMotion: false
  }
}

let spectrumProvider = null
let emitTimer = null
let initialized = false

function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function snapshot() {
  return {
    net: { ...state.net },
    cache: {
      hits: state.cache.hits,
      misses: state.cache.misses,
      ratio: state.cache.ratio,
      names: { ...state.cache.names }
    },
    counts: { ...state.counts },
    datasets: { skills: state.datasets.skills.slice() },
    sync: { ...state.sync },
    activity: state.activity.slice(),
    logs: state.logs.slice(),
    system: { ...state.system }
  }
}

function dispatch(name, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch (error) {
    /* CustomEvent 不可用时忽略 */
  }
}

function notify() {
  const data = snapshot()
  listeners.forEach((fn) => {
    try {
      fn(data)
    } catch (error) {
      /* 单个订阅者异常不影响其它订阅者 */
    }
  })
  dispatch('roku:hud:update', data)
}

function emitUpdate() {
  if (emitTimer) return
  emitTimer = setTimeout(() => {
    emitTimer = null
    notify()
  }, EMIT_INTERVAL)
}

function detectSystem() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  try {
    state.system.mobile = window.matchMedia('(max-width: 768px)').matches
    state.system.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (error) {
    /* 忽略 */
  }
}

export function initHudTelemetry() {
  if (initialized) return snapshot()
  initialized = true
  detectSystem()
  if (typeof window !== 'undefined') {
    try {
      const mobileQuery = window.matchMedia('(max-width: 768px)')
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const sync = () => {
        state.system.mobile = mobileQuery.matches
        state.system.reducedMotion = motionQuery.matches
        emitUpdate()
      }
      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', sync)
        motionQuery.addEventListener('change', sync)
      }
    } catch (error) {
      /* 忽略 */
    }
  }
  return snapshot()
}

export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {}
  listeners.add(fn)
  try {
    fn(snapshot())
  } catch (error) {
    /* 忽略 */
  }
  return () => listeners.delete(fn)
}

export function getSnapshot() {
  return snapshot()
}

export function logEvent(level, text, meta) {
  if (!text) return
  const line = {
    level: level || 'info',
    text: String(text),
    at: Date.now(),
    meta: meta || null
  }
  state.logs.push(line)
  if (state.logs.length > MAX_LOGS) state.logs.shift()
  dispatch('roku:hud:log', line)
  emitUpdate()
}

export function trackRequest({ label, ms, ok, status }) {
  try {
    const duration = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0
    state.net.lastMs = duration
    state.net.ok = ok !== false
    state.net.label = label || ''
    state.net.at = Date.now()
    state.net.samples += 1
    state.net.totalMs += duration
    state.net.avgMs = Math.round(state.net.totalMs / state.net.samples)
    if (state.net.ok) {
      state.sync.at = Date.now()
      state.sync.ok = true
    } else {
      state.sync.ok = false
      logEvent('error', `LINK FAIL ${label || 'SUPABASE'}`)
    }
    emitUpdate()
  } catch (error) {
    /* 遥测异常不影响请求本身 */
  }
}

export function markCache(name, hit, count) {
  try {
    if (hit) state.cache.hits += 1
    else state.cache.misses += 1
    const total = state.cache.hits + state.cache.misses
    state.cache.ratio = total > 0 ? state.cache.hits / total : 0
    state.cache.names[name] = hit ? 'hit' : 'miss'
    if (Number.isFinite(count)) {
      setCounts({ [name]: count })
    }
    emitUpdate()
  } catch (error) {
    /* 忽略 */
  }
}

export function setCounts(partial) {
  if (!partial) return
  try {
    Object.keys(partial).forEach((key) => {
      if (!(key in state.counts)) return
      const value = Number(partial[key])
      if (Number.isFinite(value)) state.counts[key] = value
    })
    emitUpdate()
  } catch (error) {
    /* 忽略 */
  }
}

export function setDataset(name, rows) {
  if (!name || !Array.isArray(rows)) return
  try {
    if (name === 'skills') {
      state.datasets.skills = rows.slice(0, 24).map((item) => ({
        name: String(item?.name || ''),
        level: Number(item?.level) || 1
      }))
    }
    emitUpdate()
  } catch (error) {
    /* 忽略 */
  }
}

export function notifyActivity({ type, label, at }) {
  try {
    state.activity.unshift({
      type: type || 'update',
      label: label || '',
      at: Number(at) || Date.now()
    })
    if (state.activity.length > MAX_ACTIVITY) state.activity.length = MAX_ACTIVITY
    if (label) logEvent('activity', label)
    emitUpdate()
  } catch (error) {
    /* 忽略 */
  }
}

export function setSpectrumProvider(fn) {
  spectrumProvider = typeof fn === 'function' ? fn : null
}

export function getSpectrum() {
  if (!spectrumProvider) return null
  try {
    return spectrumProvider()
  } catch (error) {
    return null
  }
}

export function requestLabel(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url, typeof location !== 'undefined' ? location.origin : 'http://localhost')
    return parsed.pathname || ''
  } catch (error) {
    return ''
  }
}

export { now }
