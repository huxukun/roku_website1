#!/usr/bin/env node
/**
 * 「今晚的天空」日更数据抓取
 * ---------------------------------------------------------------
 * 运行环境：Node 20+（使用内置 fetch / AbortSignal.timeout，零依赖）
 *
 * 数据源：
 *   1. NASA APOD           —— 当天天文图（视频类型保留 thumbnail_url）
 *   2. 月相                —— 本地算法，不请求 API
 *   3. 日出 / 日落          —— sunrise-sunset.org（经纬度固定为南京）
 *
 * 兜底策略：
 *   - 任一块失败时读取上一次的 latest.json，把失败的那一块原样沿用；
 *   - 全部数据源都失败且没有旧文件时，保留旧文件并 exit 0（不让 Action 报红）；
 *   - 所有网络请求 10s 超时。
 *
 * 输出：
 *   public/daily/latest.json
 *   public/daily/YYYY-MM-DD.json（保留最近 90 天）
 */

import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DAILY_DIR = path.join(PROJECT_ROOT, 'public', 'daily')
const LATEST_FILE = path.join(DAILY_DIR, 'latest.json')

const TIME_ZONE = 'Asia/Shanghai'
const REQUEST_TIMEOUT = 10_000
const KEEP_DAYS = 90

// 月相参数（与任务书一致）
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC_MONTH = 29.530588853

// NASA 已于 2026-09 把 APOD 迁移到 WordPress 接口，旧接口 2026-12-01 下线
const APOD_PRIMARY = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1'
const APOD_LEGACY = 'https://api.nasa.gov/planetary/apod'
const SUN_ENDPOINT = 'https://api.sunrise-sunset.org/json?lat=32.0603&lng=118.7969&formatted=0'

const NASA_API_KEY = (process.env.NASA_API_KEY || '').trim() || 'DEMO_KEY'

/* ------------------------------------------------------------------ *
 * 时区工具：统一按 Asia/Shanghai 计算日期与 HH:mm
 * ------------------------------------------------------------------ */

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

function getBeijingDate(now = new Date()) {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(now).map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function beijingDateToUtcMs(dateStr, hour = 20) {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Asia/Shanghai 固定 UTC+8，无夏令时
  return Date.UTC(year, month - 1, day, hour - 8, 0, 0)
}

function utcIsoToBeijingTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return timeFormatter.format(date)
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/* ------------------------------------------------------------------ *
 * 网络请求（统一 10s 超时）
 * ------------------------------------------------------------------ */

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'roku-daily-sky/1.0' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/* ------------------------------------------------------------------ *
 * 1. NASA APOD
 * ------------------------------------------------------------------ */

function emptyApod() {
  return {
    title: '',
    date: '',
    media_type: 'image',
    url: '',
    hdurl: '',
    thumbnail_url: '',
    explanation: '',
    copyright: ''
  }
}

function normalizeApod(raw) {
  const mediaType = raw.media_type === 'video' ? 'video' : 'image'
  return {
    title: String(raw.title || ''),
    date: String(raw.date || ''),
    media_type: mediaType,
    url: String(raw.url || ''),
    hdurl: String(raw.hdurl || ''),
    thumbnail_url: String(raw.thumbnail_url || ''),
    explanation: String(raw.explanation || ''),
    copyright: String(raw.copyright || '')
  }
}

function decodeEntities(text) {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => map[name.toLowerCase()] ?? match)
}

function stripHtml(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

// WordPress 版字段：url/permalink 是文章页，hdurl 才是图片本身
function normalizeApodBasic(raw) {
  const isVideo = raw.media_type === 'video' || raw.media_type === 'iframe'
  const poster = String(raw.hdurl || '')
  const permalink = String(raw.permalink || raw.url || '')
  return {
    title: stripHtml(raw.title),
    date: String(raw.date || ''),
    media_type: isVideo ? 'video' : 'image',
    // 图片：直接用图片地址；视频：指向文章页，缩略图用 hdurl 海报图
    url: isVideo ? permalink : (poster || permalink),
    hdurl: poster,
    thumbnail_url: isVideo ? poster : '',
    explanation: stripHtml(raw.explanation),
    copyright: stripHtml(raw.copyright || raw.credit || '')
  }
}

async function fetchApod() {
  try {
    const data = await fetchJson(APOD_PRIMARY)
    const item = Array.isArray(data) ? data[0] : data
    if (!item || typeof item !== 'object') {
      throw new Error('APOD 返回数据为空')
    }
    if (!item.title && !item.hdurl) {
      throw new Error('APOD 数据缺少标题与图片')
    }
    return normalizeApodBasic(item)
  } catch (primaryError) {
    // 新接口不可用时回退到旧接口（2026-12-01 前仍可能可用）
    // thumbs=true：视频类型也会返回 thumbnail_url
    const url = `${APOD_LEGACY}?api_key=${encodeURIComponent(NASA_API_KEY)}&thumbs=true`
    try {
      const data = await fetchJson(url)
      if (!data || typeof data !== 'object') {
        throw new Error('APOD 返回数据为空')
      }
      return normalizeApod(data)
    } catch (legacyError) {
      throw new Error(`新接口 ${primaryError.message}；旧接口 ${legacyError.message}`)
    }
  }
}

/* ------------------------------------------------------------------ *
 * 2. 月相（本地算法）
 * ------------------------------------------------------------------ */

function getMoonPhaseName(phase) {
  if (phase < 0.03 || phase >= 0.97) return { name: '新月', emoji: '🌑' }
  if (phase < 0.22) return { name: '蛾眉月', emoji: '🌒' }
  if (phase < 0.28) return { name: '上弦', emoji: '🌓' }
  if (phase < 0.47) return { name: '盈凸月', emoji: '🌔' }
  if (phase < 0.53) return { name: '满月', emoji: '🌕' }
  if (phase < 0.72) return { name: '亏凸月', emoji: '🌖' }
  if (phase < 0.78) return { name: '下弦', emoji: '🌗' }
  return { name: '残月', emoji: '🌘' }
}

function getMoonPhase(dateStr) {
  // 取目标日北京时间 20:00 作为“今晚”代表时刻，同一天多次运行结果一致
  const targetMs = beijingDateToUtcMs(dateStr, 20)
  const daysSinceKnownNewMoon = (targetMs - KNOWN_NEW_MOON) / 86_400_000

  let age = daysSinceKnownNewMoon % SYNODIC_MONTH
  if (age < 0) age += SYNODIC_MONTH

  const phase = age / SYNODIC_MONTH
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2
  const { name, emoji } = getMoonPhaseName(phase)

  return {
    phase: round(phase, 3),
    illumination: round(illumination, 3),
    name,
    emoji
  }
}

/* ------------------------------------------------------------------ *
 * 3. 南京日出 / 日落
 * ------------------------------------------------------------------ */

function emptySun() {
  return { sunrise: '', sunset: '' }
}

async function fetchSun(dateStr) {
  const url = `${SUN_ENDPOINT}&date=${encodeURIComponent(dateStr)}`
  const data = await fetchJson(url)

  if (data.status !== 'OK' || !data.results) {
    throw new Error(`sunrise-sunset 返回异常：${data.status || 'unknown'}`)
  }

  return {
    sunrise: utcIsoToBeijingTime(data.results.sunrise),
    sunset: utcIsoToBeijingTime(data.results.sunset)
  }
}

/* ------------------------------------------------------------------ *
 * 旧数据读取 / 兜底合并
 * ------------------------------------------------------------------ */

async function readPreviousLatest() {
  try {
    const raw = await readFile(LATEST_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    return null
  }
}

// 失败时优先原样沿用上一次的整块数据，没有旧数据则用空结构占位
function reuseBlock(previousBlock, fallback) {
  if (previousBlock && typeof previousBlock === 'object') {
    return { ...fallback, ...previousBlock }
  }
  return { ...fallback }
}

/* ------------------------------------------------------------------ *
 * 归档清理：只保留最近 90 天的按天存档
 * ------------------------------------------------------------------ */

async function pruneArchives() {
  let files = []
  try {
    files = await readdir(DAILY_DIR)
  } catch (error) {
    return
  }

  const archives = files
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()

  const stale = archives.slice(0, Math.max(0, archives.length - KEEP_DAYS))
  await Promise.all(
    stale.map((name) => unlink(path.join(DAILY_DIR, name)).catch(() => {}))
  )

  if (stale.length > 0) {
    console.log(`清理旧存档 ${stale.length} 个，保留最近 ${KEEP_DAYS} 天`)
  }
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

async function main() {
  const targetDate = getBeijingDate()
  const previous = await readPreviousLatest()

  let apodFailed = false
  let sunFailed = false

  let apod
  try {
    apod = await fetchApod()
    console.log(`APOD 获取成功：${apod.title || '(无标题)'} [${apod.media_type}]`)
  } catch (error) {
    apodFailed = true
    console.warn(`APOD 获取失败：${error.message}`)
    apod = reuseBlock(previous?.apod, emptyApod())
  }

  let sun
  try {
    sun = await fetchSun(targetDate)
    console.log(`日出日落获取成功：${sun.sunrise} / ${sun.sunset}`)
  } catch (error) {
    sunFailed = true
    console.warn(`日出日落获取失败：${error.message}`)
    sun = reuseBlock(previous?.sun, emptySun())
  }

  // 月相为本地计算，不会失败
  const moon = getMoonPhase(targetDate)

  // 全部数据源失败且没有历史文件：保留现状，正常退出
  if (apodFailed && sunFailed && !previous) {
    console.warn('所有数据源均不可用且没有历史数据，跳过写入')
    return
  }

  const payload = {
    date: targetDate,
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    apod,
    moon,
    sun
  }

  await mkdir(DAILY_DIR, { recursive: true })

  const json = `${JSON.stringify(payload, null, 2)}\n`
  await writeFile(LATEST_FILE, json, 'utf8')
  await writeFile(path.join(DAILY_DIR, `${targetDate}.json`), json, 'utf8')

  console.log(`已写入 latest.json 与 ${targetDate}.json`)
  await pruneArchives()
}

main().catch((error) => {
  // 兜底：任何未预期异常都不让定时任务失败
  console.error('fetch-daily 执行出错：', error)
})
