import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here')

let supabaseOrigin = ''
try {
  supabaseOrigin = new URL(supabaseUrl).origin
} catch (error) {
  /* URL 异常时保持为空，后续按直连处理 */
}

// 线上把 REST/Auth 请求改走同源反向代理（vercel.json 中的 /api/sb 重写），
// 避免部分移动网络/运营商无法解析或连不上 *.supabase.co 时整站数据空白。
// 注意：只代理 REST 与 Auth，Storage / Realtime 仍保持直连。
const SUPABASE_PROXY_PREFIX = '/api/sb'
const SUPABASE_PROXIED_PATH_PREFIXES = ['/rest/v1/', '/auth/v1/']
const SUPABASE_REQUEST_TIMEOUT = 15000
const useSameOriginProxy = import.meta.env.PROD && typeof window !== 'undefined'

// 给所有 Supabase 请求加超时，避免网络被劫持/丢包时请求一直挂起、界面永远空白
function createSupabaseFetch() {
  return async function supabaseFetch(input, init = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Supabase request timed out', 'TimeoutError'))
    }, SUPABASE_REQUEST_TIMEOUT)

    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort(init.signal.reason)
      } else {
        init.signal.addEventListener('abort', () => controller.abort(init.signal.reason), { once: true })
      }
    }

    let requestTarget = input
    try {
      if (useSameOriginProxy) {
        const url = new URL(typeof input === 'string' ? input : input.url)
        if (
          url.origin === supabaseOrigin &&
          SUPABASE_PROXIED_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix))
        ) {
          requestTarget = `${SUPABASE_PROXY_PREFIX}${url.pathname}${url.search}`
        }
      }
      return await fetch(requestTarget, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createSupabaseFetch() }
  })

  // 仅开发环境直连 Supabase，提前建立 DNS/TLS 连接
  if (!useSameOriginProxy && supabaseOrigin) {
    try {
      [
        ['preconnect', 'anonymous'],
        ['dns-prefetch', '']
      ].forEach(([rel, crossOrigin]) => {
        const link = document.createElement('link')
        link.rel = rel
        link.href = supabaseOrigin
        if (crossOrigin) link.crossOrigin = crossOrigin
        document.head.appendChild(link)
      })
    } catch (error) {
      /* URL 异常时忽略预连接，不影响正常初始化 */
    }
  }

  console.log('Supabase client initialized successfully')
} else {
  console.warn('Supabase environment variables are not set or using default values. Using local storage fallback.')
  // 创建一个模拟对象，让代码不会崩溃
  supabase = {
    from: () => ({
      select: () => ({
        order: async () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
        limit: async () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
      }),
      insert: () => ({
        select: () => ({
          single: async () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      upsert: () => ({
        select: () => ({
          single: async () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      delete: () => ({
        eq: async () => Promise.resolve({ error: new Error('Supabase not configured') })
      })
    })
  }
}

export { supabase, isSupabaseConfigured }
export default supabase
