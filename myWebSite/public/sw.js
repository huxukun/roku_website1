/* ==========================================================================
 * Service Worker：静态资源缓存
 * - 页面导航：网络优先，失败回退缓存（避免发版后长期停留在旧 HTML）
 * - 带 hash 的构建产物 / 字体 / 图片：缓存优先（文件名变化即自动失效）
 * - 音频 / 视频：完全不拦截，避免 Range 请求被缓存破坏
 * ========================================================================== */

const CACHE_NAME = 'roku-static-v1'
const PRECACHE_URLS = [
  '/',
  '/vendor/nes-core.min.css',
  '/fonts/pixel-zh.woff2'
]

const STATIC_PATH_PREFIXES = ['/assets/', '/fonts/', '/vendor/']
const STATIC_EXTENSIONS = /\.(css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|glb|gltf)$/i

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

function isCacheableAsset(url) {
  if (STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true
  return STATIC_EXTENSIONS.test(url.pathname)
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    return cached || Response.error()
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    const fallback = await cache.match('/')
    return fallback || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 只处理同源请求，Supabase 接口与存储交给网络
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(request))
  }
})
