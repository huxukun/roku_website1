/**
 * 「今晚的天空」卡片
 * ---------------------------------------------------------------
 * 数据由 scripts/fetch-daily.mjs 定时预生成到 public/daily/latest.json，
 * 前端只 fetch 本地 JSON，不在浏览器里请求 NASA API。
 */

const DATA_URL = '/daily/latest.json'

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
  root.innerHTML = '<div class="daily-sky-empty">今天的天空暂时看不到</div>'
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
        <span>${isVideo ? '点击观看 NASA 视频' : '今日天文图暂缺'}</span>
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
      <span>图片加载失败</span>
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
      <span class="daily-sky-moon-name">${escapeHtml(moon.name || '月相未知')}</span>
      <span class="daily-sky-moon-bar" aria-hidden="true"><i style="width: ${barWidth}%"></i></span>
      <span class="daily-sky-moon-illum">照亮 ${illumination}%</span>
    </div>
  `
}

function renderSun(sun) {
  if (!sun || typeof sun !== 'object') return ''
  const hasData = Boolean(sun.sunrise && sun.sunset)

  return `
    <div class="daily-sky-row daily-sky-sun">
      <span class="daily-sky-sun-item">
        <span class="daily-sky-sun-icon" aria-hidden="true">🌅</span>日出
        <b>${escapeHtml(sun.sunrise || '--:--')}</b>
      </span>
      <span class="daily-sky-sun-item">
        <span class="daily-sky-sun-icon" aria-hidden="true">🌇</span>日落
        <b>${escapeHtml(sun.sunset || '--:--')}</b>
      </span>
      ${hasData ? '' : '<span class="daily-sky-muted">日出日落数据暂缺</span>'}
    </div>
  `
}

function renderApodLink(apod) {
  // APOD 存档页：https://apod.nasa.gov/apod/apYYMMDD.html
  if (!apod.date || !/^\d{4}-\d{2}-\d{2}$/.test(apod.date)) return null
  const [year, month, day] = apod.date.split('-')
  return `https://apod.nasa.gov/apod/ap${year.slice(2)}${month}${day}.html`
}

function render(root, data) {
  const apod = data?.apod && typeof data.apod === 'object' ? data.apod : {}
  const hasApod = Boolean(apod.url || apod.hdurl || apod.thumbnail_url)

  const dateEl = document.getElementById('daily-sky-date')
  if (dateEl) {
    dateEl.textContent = data?.date || ''
  }

  const title = hasApod ? (apod.title || 'NASA 天文图') : '今日天文图暂缺'
  const link = renderApodLink(apod)
  const credit = `Image Credit: NASA APOD${apod.copyright ? ` · ${escapeHtml(apod.copyright)}` : ''}`

  root.innerHTML = `
    ${renderMedia(apod)}
    <div class="daily-sky-body">
      <h3 class="daily-sky-apod-title">${escapeHtml(title)}</h3>
      ${apod.date ? `<p class="daily-sky-apod-meta">APOD · ${escapeHtml(apod.date)}</p>` : ''}
      ${renderMoon(data?.moon)}
      ${renderSun(data?.sun)}
      <p class="daily-sky-credit">
        ${link
          ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${credit}</a>`
          : credit}
      </p>
      ${apod.explanation
        ? `<details class="daily-sky-expl">
             <summary>NASA 原文说明（英文）</summary>
             <p>${escapeHtml(apod.explanation)}</p>
           </details>`
        : ''}
    </div>
  `

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
    render(root, data)
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
}
