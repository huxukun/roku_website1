import { createClient } from '@supabase/supabase-js'
import { trackRequest, requestLabel, now as telemetryNow } from './hudTelemetry.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here')

/* --------------------------------------------------------------------------
 * 弱网保护：给所有 Supabase 请求加超时与有限重试
 * - 读请求（GET/HEAD）：8s 超时，失败自动重试 1 次，避免请求一直挂着，
 *   前端等不到数据库内容只能显示默认值
 * - 写请求：20s 超时，不自动重试，避免重复写入
 * - 文件上传：5 分钟超时，避免大文件传到一半被中断
 * - 浏览器明确离线时直接失败，调用方立刻回退到本地缓存
 * -------------------------------------------------------------------------- */
const READ_TIMEOUT = 8000
const WRITE_TIMEOUT = 20000
const UPLOAD_TIMEOUT = 5 * 60 * 1000
const MAX_READ_ATTEMPTS = 2
const RETRY_DELAY = 600

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

function isUploadRequest(url, init) {
  if (/\/storage\/v1\/object\//i.test(url)) return true
  if (typeof FormData !== 'undefined' && init?.body instanceof FormData) return true
  return false
}

function isReadMethod(method) {
  return method === 'GET' || method === 'HEAD'
}

/* 包装原生 fetch：超时 + 读请求重试 */
function createTimeoutFetch(baseFetch) {
  return async function fetchWithTimeout(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || ''
    const method = String(
      init.method ||
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
    ).toUpperCase()
    const upload = isUploadRequest(url, init)
    const read = isReadMethod(method) && !upload
    const timeout = upload ? UPLOAD_TIMEOUT : (read ? READ_TIMEOUT : WRITE_TIMEOUT)
    const maxAttempts = read ? MAX_READ_ATTEMPTS : 1

    const requestStart = telemetryNow()
    let requestOk = false
    let requestStatus = 0

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const offlineError = new Error('当前网络未连接')
        // 用 AbortError 语义告诉上层库不要继续自动重试，直接回退本地缓存
        offlineError.name = 'AbortError'
        offlineError.code = 'ABORT_ERR'
        throw offlineError
      }

      let lastError
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController()
        const externalSignal = init.signal
        let timedOut = false

        const onExternalAbort = () => controller.abort()
        if (externalSignal) {
          if (externalSignal.aborted) controller.abort()
          else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
        }

        const timer = window.setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeout)

        try {
          const response = await baseFetch(input, { ...init, signal: controller.signal })
          requestOk = true
          requestStatus = response.status
          return response
        } catch (error) {
          lastError = error
          // 调用方主动取消或离线，不再重试
          if (externalSignal?.aborted) throw error
          if (attempt >= maxAttempts) {
            if (timedOut) {
              /* 用 AbortError 语义：postgrest 不会对中止请求再叠加内建重试，
                 避免 8s × 4 次的长时间等待，前端能尽快回退到本地缓存 */
              const timeoutError = new Error('连接超时')
              timeoutError.name = 'AbortError'
              timeoutError.code = 'ABORT_ERR'
              timeoutError.cause = error
              throw timeoutError
            }
            throw error
          }
          await sleep(RETRY_DELAY * attempt)
        } finally {
          window.clearTimeout(timer)
          externalSignal?.removeEventListener?.('abort', onExternalAbort)
        }
      }

      throw lastError
    } finally {
      // 只记录最终结果，不记录文件上传，也不影响请求本身
      if (!upload) {
        trackRequest({
          label: requestLabel(url),
          ms: telemetryNow() - requestStart,
          ok: requestOk,
          status: requestStatus
        })
      }
    }
  }
}

const nativeFetch = typeof window !== 'undefined' && window.fetch
  ? window.fetch.bind(window)
  : undefined

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: nativeFetch ? { fetch: createTimeoutFetch(nativeFetch) } : undefined
  })

  // 提前建立与 Supabase 的 DNS/TLS 连接，减少首个数据请求的等待
  // （index.html 里也内联了一份更早的预连接，这里作为兜底）
  try {
    const origin = new URL(supabaseUrl).origin
    ;[
      ['preconnect', 'anonymous'],
      ['dns-prefetch', '']
    ].forEach(([rel, crossOrigin]) => {
      const exists = document.head.querySelector(`link[rel="${rel}"][href="${origin}"]`)
      if (exists) return
      const link = document.createElement('link')
      link.rel = rel
      link.href = origin
      if (crossOrigin) link.crossOrigin = crossOrigin
      document.head.appendChild(link)
    })
  } catch (error) {
    /* URL 异常时忽略预连接，不影响正常初始化 */
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
