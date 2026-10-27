import './style.css'
import './themes.css'
import UIManager from './UIManager.js'
import { initImageCollection } from './collectionManager.js'
import { initSkillsManager } from './skillsManager.js'
import { initDailySky } from './dailySky.js'
import musicService from './MusicService.js'
import { loadSavedLang, setCurrentLang, getCurrentLang } from './i18n.js'
import { initStyleSwitcher } from './styleSwitcher.js'

/* ==========================================================================
 * 入口模块只负责 UI，3D 场景按需动态加载（见 sceneApp.js）。
 * 这样 AERO / Y2K 首屏不会下载 Three.js 及其场景组件。
 * ========================================================================== */

const STYLE_STORAGE_KEY = 'roku-site-style'
const SYNTH = 'synth'

/* 先探测 WebGL 是否可用：不可用时直接放 UI，避免卡在「加载 3D」这一步 */
function canUseWebGL() {
  try {
    const test = document.createElement('canvas')
    const gl = test.getContext('webgl2') || test.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch (error) {
    return false
  }
}

const WEBGL_SUPPORTED = canUseWebGL()

function readSavedStyle() {
  try {
    const saved = localStorage.getItem(STYLE_STORAGE_KEY)
    return saved || SYNTH
  } catch (error) {
    return SYNTH
  }
}

const loadingScreen = document.getElementById('loading-screen')
const loadingProgressEl = document.getElementById('loading-progress')
const loadingTextEl = document.getElementById('loading-text')

function setLoadingProgress(value, label) {
  if (loadingProgressEl) loadingProgressEl.value = value
  if (loadingTextEl) loadingTextEl.textContent = label || `${Math.round(value)}%`
}

function hideLoadingScreen() {
  if (loadingScreen) loadingScreen.classList.add('hidden')
}

// 一开始就给出进度，避免长时间停在 0% 让人以为卡死
setLoadingProgress(15)

/* 加载屏保底逻辑：
   - 至少显示 MIN_LOADING_TIME，避免一闪而过
   - 最多等 SCENE_WAIT_BEFORE_REVEAL 让 3D 先加载；超时则先放 UI，场景稍后补上
   - LOADING_HARD_TIMEOUT 兜底：任何异常都不允许加载屏永久盖住页面 */
const MIN_LOADING_TIME = 500
const SCENE_WAIT_BEFORE_REVEAL = 2500
const LOADING_HARD_TIMEOUT = 8000
const bootStartedAt = performance.now()

let uiRevealed = false
function revealUI() {
  if (uiRevealed) return
  uiRevealed = true
  const wait = Math.max(0, MIN_LOADING_TIME - (performance.now() - bootStartedAt))
  window.setTimeout(hideLoadingScreen, wait)
}
window.setTimeout(hideLoadingScreen, LOADING_HARD_TIMEOUT)

let resolveSceneReady = null
const sceneReadyPromise = new Promise((resolve) => {
  resolveSceneReady = resolve
})

let sceneModulePromise = null
// 仅在合成波风格下加载 3D 场景；重复调用复用同一个 import Promise
async function loadScene(allowRetry = true) {
  if (sceneModulePromise) return sceneModulePromise
  sceneModulePromise = (async () => {
    try {
      const module = await import('./sceneApp.js')
      setLoadingProgress(90)
      resolveSceneReady?.()
      return module
    } catch (error) {
      sceneModulePromise = null
      // 弱网或临时 404：等一会儿自动重试一次，避免用户只能手动刷新
      if (allowRetry) {
        setLoadingProgress(25, '网络较慢，正在重试...')
        await new Promise((resolve) => window.setTimeout(resolve, 1200))
        return loadScene(false)
      }
      hideLoadingScreen()
      console.error('3D 场景加载失败:', error)
      throw error
    }
  })()
  return sceneModulePromise
}

// 构建产物地址变化时浏览器会派发该事件（Vite 运行时），顺手重试一次
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  console.warn('静态资源加载失败，正在重试...')
  loadScene().catch(() => {})
})

// 首屏就是 synth 时立刻开始下载场景 chunk，与 UI 初始化并行
if (WEBGL_SUPPORTED && readSavedStyle() === SYNTH) {
  loadScene().catch(() => {})
}

/* ---------------- 励志语录 ---------------- */
let motivationQuoteModule = null
let currentQuote = null

async function initMotivationQuotes() {
  try {
    const triggerBtn = document.getElementById('quote-trigger-btn')
    const modalOverlay = document.getElementById('quote-modal-overlay')
    const closeBtn = document.getElementById('quote-close-btn')
    const refreshBtn = document.getElementById('modal-refresh-btn')
    const quoteTextEl = document.getElementById('modal-quote-text')
    const quoteAuthorEl = document.getElementById('modal-quote-author')

    if (!triggerBtn || !modalOverlay || !closeBtn || !refreshBtn || !quoteTextEl || !quoteAuthorEl) {
      console.warn('Motivation quote elements not found, skipping initialization')
      return
    }

    motivationQuoteModule = await import('./motivationQuotes.js')
    const { getDailyQuote, getRandomQuote, getQuoteInLanguage } = motivationQuoteModule

    const displayQuote = (quote) => {
      currentQuote = quote
      const currentLang = getCurrentLang()
      quoteTextEl.textContent = getQuoteInLanguage(quote, currentLang)
      quoteAuthorEl.textContent = `- ${quote.author}`
    }

    const openModal = () => {
      modalOverlay.classList.remove('hidden')
      modalOverlay.style.opacity = '1'
      modalOverlay.style.visibility = 'visible'

      if (!currentQuote) {
        displayQuote(getDailyQuote())
      }
    }

    const closeModal = () => {
      modalOverlay.style.opacity = '0'
      modalOverlay.style.visibility = 'hidden'
      setTimeout(() => {
        modalOverlay.classList.add('hidden')
      }, 300)
    }

    triggerBtn.addEventListener('click', openModal)
    closeBtn.addEventListener('click', closeModal)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal()
    })

    refreshBtn.addEventListener('click', () => {
      displayQuote(getRandomQuote())
    })

    document.addEventListener('languageChange', () => {
      if (motivationQuoteModule && currentQuote) {
        displayQuote(currentQuote)
      }
      // 3D 展示框文字由场景模块负责刷新；未加载时忽略
      window.updateDisplayBoxText?.()
    })

    triggerBtn.addEventListener('mouseenter', () => {
      triggerBtn.style.transform = 'scale(1.1)'
      triggerBtn.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.6)'
    })
    triggerBtn.addEventListener('mouseleave', () => {
      triggerBtn.style.transform = 'scale(1)'
      triggerBtn.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)'
    })

    refreshBtn.addEventListener('mouseenter', () => {
      refreshBtn.style.background = 'rgba(0, 255, 255, 0.1)'
      refreshBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)'
      refreshBtn.style.transform = 'rotate(180deg) scale(1.1)'
    })
    refreshBtn.addEventListener('mouseleave', () => {
      refreshBtn.style.background = 'transparent'
      refreshBtn.style.boxShadow = 'none'
      refreshBtn.style.transform = 'rotate(0deg) scale(1)'
    })

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 0, 255, 0.1)'
      closeBtn.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.5)'
    })
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent'
      closeBtn.style.boxShadow = 'none'
    })
  } catch (error) {
    console.error('Error initializing motivation quotes:', error)
  }
}

/* ---------------- 语言切换 ---------------- */
function setupLanguageSwitcher() {
  const langBtn = document.getElementById('lang-btn')
  const langDropdown = document.getElementById('lang-dropdown')
  const langOptions = document.querySelectorAll('.lang-option')

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    langDropdown.classList.toggle('active')
  })

  langOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation()
      const lang = option.dataset.lang
      setCurrentLang(lang)
      langDropdown.classList.remove('active')
      document.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }))
    })
  })

  document.addEventListener('click', () => {
    langDropdown.classList.remove('active')
  })
}

/* ---------------- 启动 ---------------- */
/* 知道首曲地址后提前与音频域名握手（不下载音频本身），
   点播放时少一次 DNS/TLS 往返 */
let songOriginWarmed = false
function preconnectFirstSong() {
  if (songOriginWarmed) return
  const firstUrl = musicService.getMainBgmSongs?.()[0]?.url
    || musicService.getAllSongs?.()[0]?.url
  if (!firstUrl) return
  try {
    const origin = new URL(firstUrl).origin
    if (origin === window.location.origin) return
    songOriginWarmed = true
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  } catch (error) {
    /* URL 异常时忽略 */
  }
}

let uiManager = null

const init = async () => {
  loadSavedLang()
  setupLanguageSwitcher()

  // 三风格切换（synth / aero / y2k）+ 底部拉杆
  initStyleSwitcher()

  // UIManager 需要在创建前拿到音乐服务
  window.musicService = musicService
  // 先读上次的歌单缓存，让音乐按钮与列表立即可用，云端刷新在后台进行
  musicService.loadCache()

  uiManager = new UIManager()
  // 供风格切换器在回到 synth 时复位内容抽屉
  window.__rokuUI = uiManager

  initImageCollection()
  initSkillsManager()
  // 「今晚的天空」日更卡片（读取 public/daily/latest.json）
  initDailySky()
  initMotivationQuotes()

  /* 歌单后台异步拉取（songs 表 + MainSynthBGM / GameSynthBGM 文件夹），
     完成后同步进播放器；失败也不阻塞 UI 与点击 */
  Promise.all([musicService.fetchSongs(), musicService.fetchBgmSongs()])
    .then(() => {
      uiManager.syncMusicLibrary()
      preconnectFirstSong()
    })
    .catch((error) => console.warn('歌单后台加载失败:', error))

  const style = document.documentElement.dataset.style || SYNTH
  if (style === SYNTH && WEBGL_SUPPORTED) {
    loadScene().catch(() => {})
    // 给 3D 一点先发优势；超过 2.5s 还没好就先放 UI，场景就绪后再补进画面
    await Promise.race([
      sceneReadyPromise,
      new Promise((resolve) => window.setTimeout(resolve, SCENE_WAIT_BEFORE_REVEAL))
    ])
  } else if (style === SYNTH) {
    console.warn('当前浏览器不支持 WebGL，跳过 3D 场景')
  }
  revealUI()

  document.addEventListener('siteStyleChange', (event) => {
    if (event.detail?.style === SYNTH) {
      if (WEBGL_SUPPORTED) loadScene().catch(() => {})
      revealUI()
    }
  })
}

const boot = () => {
  init().catch((error) => {
    // 初始化异常时也要收起加载屏，保证用户能看到可用界面
    console.error('初始化失败:', error)
    revealUI()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}

/* 生产环境注册 Service Worker：二次访问时静态资源直接走本地缓存 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service Worker 注册失败:', error)
    })
  })
}
