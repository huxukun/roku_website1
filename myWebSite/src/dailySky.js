/**
 * 「今晚的天空」卡片
 * ---------------------------------------------------------------
 * 数据由 scripts/fetch-daily.mjs 定时预生成到 public/daily/latest.json，
 * 前端只 fetch 本地 JSON，不在浏览器里请求 NASA API。
 *
 * 观测位置：默认南京（直接用预生成数据）；用户输入城市 / 坐标或自动定位后，
 * 用 skyMath.js（日出日落）与 scripts/sky-guide.mjs（行星）在本地重算，
 * 不请求任何外部 API。位置保存在 localStorage。
 */

import { t, tf, translateTerm, getCurrentLang } from './i18n.js'
import { buildSkyGuide } from '../scripts/sky-guide.mjs'
import {
  getSavedLocation,
  saveLocation,
  clearSavedLocation,
  isDefaultLocation,
  locationLabel,
  locationUtcOffset,
  resolveLocation,
  calcSunTimes
} from './skyMath.js'

const DATA_URL = '/daily/latest.json'

// 缓存最近一次数据，切换语言 / 位置时直接重绘（不重新请求）
let lastData = null
// 当前观测位置：null 表示默认南京（沿用 JSON 里 Action 算好的数据）
let currentLocation = getSavedLocation()

/** 默认位置直接返回原数据；自定义位置在本地重算日出日落与行星（流星雨与位置无关，沿用） */
function resolveViewData(data) {
  if (!data || isDefaultLocation(currentLocation)) return data
  const dateStr = data.date
  if (!dateStr) return data

  const utcOffset = locationUtcOffset(currentLocation)
  const sun = calcSunTimes(dateStr, currentLocation.lat, currentLocation.lng, utcOffset)
  const guide = buildSkyGuide(dateStr, currentLocation.lat, currentLocation.lng, utcOffset)

  return {
    ...data,
    sun: sun || { sunrise: '', sunset: '' },
    sunPolar: !sun,
    planets: guide?.planets ?? data.planets
  }
}

const SKELETON_HTML = `
  <div class="daily-sky-skeleton" aria-hidden="true">
    <div class="daily-sky-skeleton-media"></div>
    <div class="daily-sky-skeleton-body">
      <span class="daily-sky-skeleton-line" style="width: 62%"></span>
      <span class="daily-sky-skeleton-line" style="width: 38%"></span>
      <span class="daily-sky-skeleton-line" style="width: 74%"></span>
    </div>
  </div>
`

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))
}

function renderSkeleton(root) {
  root.innerHTML = SKELETON_HTML
}

function renderUnavailable(root) {
  root.innerHTML = `<div class="daily-sky-empty">${escapeHtml(t('sky-empty'))}</div>`
}

function renderMedia(apod) {
  const isVideo = apod.media_type === 'video'
  // 图片优先用标准尺寸 url（hdurl 往往有几 MB），视频只用缩略图做封面
  const src = isVideo
    ? (apod.thumbnail_url || '')
    : (apod.url || apod.hdurl || apod.thumbnail_url || '')

  if (!src) {
    const fallback = `
      <div class="daily-sky-media-fallback">
        <span class="daily-sky-media-fallback-icon">🌌</span>
        <span>${escapeHtml(isVideo ? t('sky-video-hint') : t('sky-apod-missing'))}</span>
      </div>
    `
    if (isVideo && apod.url) {
      return `
        <a class="daily-sky-media is-video" href="${escapeHtml(apod.url)}"
           target="_blank" rel="noopener noreferrer" aria-label="在 NASA 页面观看视频">
          ${fallback}
          <span class="daily-sky-play" aria-hidden="true">▶</span>
        </a>
      `
    }
    return `<div class="daily-sky-media">${fallback}</div>`
  }

  const badge = isVideo ? 'NASA VIDEO' : 'NASA APOD'
  const inner = `
    <img class="daily-sky-img" src="${escapeHtml(src)}" alt="${escapeHtml(apod.title || 'NASA 天文图')}"
         decoding="async" referrerpolicy="no-referrer">
    <div class="daily-sky-media-fallback" hidden>
      <span class="daily-sky-media-fallback-icon">🌌</span>
      <span>${escapeHtml(t('sky-image-failed'))}</span>
    </div>
    <span class="daily-sky-badge">${badge}</span>
  `

  // 视频类型：用缩略图做静态封面，点击跳转到 NASA 页面看视频
  if (isVideo && apod.url) {
    return `
      <a class="daily-sky-media is-video" href="${escapeHtml(apod.url)}"
         target="_blank" rel="noopener noreferrer" aria-label="在 NASA 页面观看视频">
        ${inner}
        <span class="daily-sky-play" aria-hidden="true">▶</span>
      </a>
    `
  }

  return `<div class="daily-sky-media">${inner}</div>`
}

function renderMoon(moon) {
  if (!moon || typeof moon !== 'object') return ''
  const illumination = Math.round((Number(moon.illumination) || 0) * 100)
  const barWidth = Math.max(0, Math.min(100, illumination))

  return `
    <div class="daily-sky-row daily-sky-moon">
      <span class="daily-sky-moon-emoji" aria-hidden="true">${escapeHtml(moon.emoji || '🌙')}</span>
      <span class="daily-sky-moon-name">${escapeHtml(translateTerm(moon.name) || moon.name || '')}</span>
      <span class="daily-sky-moon-bar" aria-hidden="true"><i style="width: ${barWidth}%"></i></span>
      <span class="daily-sky-moon-illum">${escapeHtml(t('sky-moon-illum').replace('{n}', String(illumination)))}</span>
    </div>
  `
}

function renderSun(sun, polar) {
  if (!sun || typeof sun !== 'object') return ''
  const hasData = Boolean(sun.sunrise && sun.sunset)

  return `
    <div class="daily-sky-row daily-sky-sun">
      <span class="daily-sky-sun-item">
        <span class="daily-sky-sun-icon" aria-hidden="true">🌅</span>${escapeHtml(t('sky-sunrise'))}
        <b>${escapeHtml(sun.sunrise || '--:--')}</b>
      </span>
      <span class="daily-sky-sun-item">
        <span class="daily-sky-sun-icon" aria-hidden="true">🌇</span>${escapeHtml(t('sky-sunset'))}
        <b>${escapeHtml(sun.sunset || '--:--')}</b>
      </span>
      ${hasData ? '' : `<span class="daily-sky-muted">${escapeHtml(t(polar ? 'sky-location-polar' : 'sky-sun-missing'))}</span>`}
    </div>
  `
}

// 观测位置输入行：城市名 / 坐标 / 自动定位；自定义位置时显示恢复按钮
function renderLocationBar() {
  const isCustom = !isDefaultLocation(currentLocation)
  return `
    <div class="daily-sky-location">
      <span class="daily-sky-location-icon" aria-hidden="true">📍</span>
      <input type="text" class="daily-sky-location-input" maxlength="40"
             placeholder="${escapeHtml(t('sky-location-placeholder'))}"
             aria-label="${escapeHtml(t('sky-location-placeholder'))}">
      <button type="button" class="daily-sky-location-btn daily-sky-location-apply">${escapeHtml(t('sky-location-apply'))}</button>
      <button type="button" class="daily-sky-location-btn daily-sky-location-locate"
              title="${escapeHtml(t('sky-location-locate'))}" aria-label="${escapeHtml(t('sky-location-locate'))}">🛰️</button>
      ${isCustom
        ? `<button type="button" class="daily-sky-location-btn daily-sky-location-reset"
              title="${escapeHtml(t('sky-location-reset'))}" aria-label="${escapeHtml(t('sky-location-reset'))}">✕</button>`
        : ''}
      <span class="daily-sky-location-msg" role="status"></span>
    </div>
  `
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatEventDate(month, day, lang) {
  if (lang === 'en') return `${MONTHS_EN[month - 1] || month} ${day}`
  if (lang === 'ja') return `${month}月${day}日`
  return `${month} 月 ${day} 日`
}

function renderGuide(planets, event, lang) {
  const list = Array.isArray(planets) ? planets : []

  const planetItems = list.map((planet) => `
    <li class="daily-sky-planet">
      <b>${escapeHtml(translateTerm(planet.name) || planet.name || '')}</b>
      <span class="daily-sky-planet-pos">${escapeHtml(translateTerm(planet.azimuth) || planet.azimuth || '')} ${escapeHtml(String(planet.altitude ?? ''))}°</span>
      <span class="daily-sky-planet-time">${escapeHtml(planet.time || '')}</span>
    </li>
  `).join('')

  let eventText = ''
  if (event && event.name) {
    const [, month, day] = String(event.date || '').split('-')
    const when = event.days === 0
      ? t('sky-peak-tonight')
      : event.days === 1
        ? t('sky-peak-tomorrow')
        : t('sky-days-after').replace('{n}', String(event.days))
    const dateText = formatEventDate(Number(month), Number(day), lang)
    const isZh = lang === 'zh'
    const pad = isZh ? '' : ' '
    const open = isZh ? '（' : '('
    const close = isZh ? '）' : ')'
    eventText = `<p class="daily-sky-event">${escapeHtml(t('sky-next-event'))}${escapeHtml(translateTerm(event.name) || event.name)} · ${escapeHtml(dateText)}${pad}${open}${escapeHtml(when)}${close}</p>`
  }

  return `
    <div class="daily-sky-guide">
      <div class="daily-sky-guide-head">
        <h4 class="daily-sky-guide-title">${escapeHtml(t('sky-guide'))}</h4>
        <span class="daily-sky-guide-sub">${escapeHtml(tf('sky-guide-sub', { place: locationLabel(currentLocation, lang) }))}</span>
      </div>
      ${planetItems
        ? `<ul class="daily-sky-planets">${planetItems}</ul>`
        : `<p class="daily-sky-muted">${escapeHtml(t('sky-no-planets'))}</p>`}
      ${eventText}
    </div>
  `
}

function renderApodLink(apod) {
  // APOD 存档页：https://apod.nasa.gov/apod/apYYMMDD.html
  if (!apod.date || !/^\d{4}-\d{2}-\d{2}$/.test(apod.date)) return null
  const [year, month, day] = apod.date.split('-')
  return `https://apod.nasa.gov/apod/ap${year.slice(2)}${month}${day}.html`
}

// 卡片正文（会随语言切换重新生成）
function buildBody(data) {
  const apod = data?.apod && typeof data.apod === 'object' ? data.apod : {}
  const hasApod = Boolean(apod.url || apod.hdurl || apod.thumbnail_url)
  const lang = getCurrentLang()

  const title = hasApod ? (apod.title || '') : t('sky-apod-missing')
  const link = renderApodLink(apod)
  const credit = `Image Credit: NASA APOD${apod.copyright ? ` · ${escapeHtml(apod.copyright)}` : ''}`

  return `
    <h3 class="daily-sky-apod-title">${escapeHtml(title)}</h3>
    ${apod.date ? `<p class="daily-sky-apod-meta">APOD · ${escapeHtml(apod.date)}</p>` : ''}
    ${renderMoon(data?.moon)}
    ${renderSun(data?.sun, data?.sunPolar)}
    ${renderLocationBar()}
    <p class="daily-sky-credit">
      ${link
        ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${credit}</a>`
        : credit}
    </p>
    ${apod.explanation
      ? `<details class="daily-sky-expl">
           <summary>${escapeHtml(t('sky-explanation'))}</summary>
           <p>${escapeHtml(apod.explanation)}</p>
         </details>`
      : ''}
    ${renderGuide(data?.planets, data?.event, lang)}
  `
}

// 位置行事件：body 每次重建后都要重新绑定
function bindLocationBar(root) {
  const bar = root.querySelector('.daily-sky-location')
  if (!bar) return

  const input = bar.querySelector('.daily-sky-location-input')
  const msg = bar.querySelector('.daily-sky-location-msg')
  const rerender = () => render(root, resolveViewData(lastData))

  const submit = () => {
    const loc = resolveLocation(input.value)
    if (!loc) {
      input.classList.add('is-invalid')
      msg.textContent = t('sky-location-notfound')
      return
    }
    currentLocation = loc
    saveLocation(loc)
    rerender()
  }

  bar.querySelector('.daily-sky-location-apply').addEventListener('click', submit)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit()
  })
  input.addEventListener('input', () => {
    input.classList.remove('is-invalid')
    msg.textContent = ''
  })

  bar.querySelector('.daily-sky-location-locate').addEventListener('click', () => {
    if (!navigator.geolocation) {
      msg.textContent = t('sky-location-failed')
      return
    }
    msg.textContent = t('sky-location-locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLocation = {
          names: null,
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
          // 定位的是本机，浏览器时区比经度估算更准
          tz: -new Date().getTimezoneOffset() / 60
        }
        saveLocation(currentLocation)
        rerender()
      },
      () => {
        msg.textContent = t('sky-location-failed')
      },
      { timeout: 10000 }
    )
  })

  const reset = bar.querySelector('.daily-sky-location-reset')
  if (reset) {
    reset.addEventListener('click', () => {
      currentLocation = null
      clearSavedLocation()
      rerender()
    })
  }
}

function render(root, data) {
  const apod = data?.apod && typeof data.apod === 'object' ? data.apod : {}

  const dateEl = document.getElementById('daily-sky-date')
  if (dateEl) {
    dateEl.textContent = data?.date || ''
  }

  // 已渲染过：只替换正文文字，保留图片元素，避免切语言时图片重新加载闪烁
  const existingBody = root.querySelector('.daily-sky-body')
  const existingMedia = root.querySelector('.daily-sky-media')
  if (existingBody && existingMedia) {
    existingBody.innerHTML = buildBody(data)
    bindLocationBar(root)
    return
  }

  root.innerHTML = `
    ${renderMedia(apod)}
    <div class="daily-sky-body">${buildBody(data)}</div>
  `
  bindLocationBar(root)

  // 图片加载失败时保留占位底图，避免卡片塌掉
  const img = root.querySelector('.daily-sky-img')
  if (img) {
    const fallback = root.querySelector('.daily-sky-media-fallback')
    const showFallback = () => {
      img.hidden = true
      if (fallback) fallback.hidden = false
    }

    img.addEventListener('error', showFallback, { once: true })
    img.addEventListener('load', () => {
      img.hidden = false
      if (fallback) fallback.hidden = true
    }, { once: true })

    // 图片请求悬挂时也给个兜底，8s 后仍没有尺寸就切到占位底图
    setTimeout(() => {
      if (!img.complete || img.naturalWidth === 0) showFallback()
    }, 8000)
  }
}

async function load(root) {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    lastData = data
    render(root, resolveViewData(data))
  } catch (error) {
    console.warn('读取「今晚的天空」数据失败：', error)
    renderUnavailable(root)
  }
}

export function initDailySky() {
  const root = document.getElementById('daily-sky-card')
  if (!root) return
  renderSkeleton(root)
  load(root)

  // 切换语言时用缓存数据重绘文字（不重新请求网络）
  document.addEventListener('languageChange', () => {
    if (lastData) render(root, resolveViewData(lastData))
  })
}
