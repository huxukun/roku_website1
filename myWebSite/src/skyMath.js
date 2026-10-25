/**
 * 观测位置与日出日落计算（纯前端，零依赖）
 * ---------------------------------------------------------------
 * 1. 内置常见城市表（三语言名称 + 经纬度 + 标准时区偏移），离线匹配用户输入；
 *    也接受「纬度, 经度」直接输入，以及 navigator.geolocation 自动定位。
 * 2. 日出日落用 NOAA 简化算法，误差约 ±2 分钟，对本卡片足够；
 *    极昼 / 极夜时返回 null，由界面显示占位文案。
 * 3. 选择结果持久化到 localStorage，下次打开自动生效。
 *
 * 注意：内置城市的 tz 为标准时区偏移，不做夏令时换算（误差 ≤1 小时）；
 * 自定义坐标 / 定位按经度或浏览器时区估算。
 */

const LOCATION_STORAGE_KEY = 'synthwave-sky-location'

/** 默认观测地：南京（与 GitHub Action 预生成数据一致，此时直接用 JSON 不重算） */
export const DEFAULT_LOCATION = Object.freeze({
  names: { zh: '南京', en: 'Nanjing', ja: '南京' },
  lat: 32.0603,
  lng: 118.7969,
  tz: 8
})

// 常见城市：names 三语言名称；tz 为 UTC 偏移（标准时间）
const CITY_TABLE = [
  { names: { zh: '南京', en: 'Nanjing', ja: '南京' }, lat: 32.0603, lng: 118.7969, tz: 8 },
  { names: { zh: '北京', en: 'Beijing', ja: '北京' }, lat: 39.9042, lng: 116.4074, tz: 8 },
  { names: { zh: '上海', en: 'Shanghai', ja: '上海' }, lat: 31.2304, lng: 121.4737, tz: 8 },
  { names: { zh: '广州', en: 'Guangzhou', ja: '広州' }, lat: 23.1291, lng: 113.2644, tz: 8 },
  { names: { zh: '深圳', en: 'Shenzhen', ja: '深セン' }, lat: 22.5431, lng: 114.0579, tz: 8 },
  { names: { zh: '杭州', en: 'Hangzhou', ja: '杭州' }, lat: 30.2741, lng: 120.1551, tz: 8 },
  { names: { zh: '成都', en: 'Chengdu', ja: '成都' }, lat: 30.5728, lng: 104.0668, tz: 8 },
  { names: { zh: '武汉', en: 'Wuhan', ja: '武漢' }, lat: 30.5928, lng: 114.3055, tz: 8 },
  { names: { zh: '西安', en: "Xi'an", ja: '西安' }, lat: 34.3416, lng: 108.9398, tz: 8 },
  { names: { zh: '重庆', en: 'Chongqing', ja: '重慶' }, lat: 29.563, lng: 106.5516, tz: 8 },
  { names: { zh: '天津', en: 'Tianjin', ja: '天津' }, lat: 39.1334, lng: 117.2054, tz: 8 },
  { names: { zh: '香港', en: 'Hong Kong', ja: '香港' }, lat: 22.3193, lng: 114.1694, tz: 8 },
  { names: { zh: '台北', en: 'Taipei', ja: '台北' }, lat: 25.033, lng: 121.5654, tz: 8 },
  // 中国单一时区：西部城市同样按 UTC+8
  { names: { zh: '乌鲁木齐', en: 'Urumqi', ja: 'ウルムチ' }, lat: 43.8256, lng: 87.6168, tz: 8 },
  { names: { zh: '拉萨', en: 'Lhasa', ja: 'ラサ' }, lat: 29.652, lng: 91.1721, tz: 8 },
  { names: { zh: '东京', en: 'Tokyo', ja: '東京' }, lat: 35.6762, lng: 139.6503, tz: 9 },
  { names: { zh: '大阪', en: 'Osaka', ja: '大阪' }, lat: 34.6937, lng: 135.5023, tz: 9 },
  { names: { zh: '首尔', en: 'Seoul', ja: 'ソウル' }, lat: 37.5665, lng: 126.978, tz: 9 },
  { names: { zh: '新加坡', en: 'Singapore', ja: 'シンガポール' }, lat: 1.3521, lng: 103.8198, tz: 8 },
  { names: { zh: '曼谷', en: 'Bangkok', ja: 'バンコク' }, lat: 13.7563, lng: 100.5018, tz: 7 },
  { names: { zh: '迪拜', en: 'Dubai', ja: 'ドバイ' }, lat: 25.2048, lng: 55.2708, tz: 4 },
  { names: { zh: '伦敦', en: 'London', ja: 'ロンドン' }, lat: 51.5074, lng: -0.1278, tz: 0 },
  { names: { zh: '巴黎', en: 'Paris', ja: 'パリ' }, lat: 48.8566, lng: 2.3522, tz: 1 },
  { names: { zh: '柏林', en: 'Berlin', ja: 'ベルリン' }, lat: 52.52, lng: 13.405, tz: 1 },
  { names: { zh: '莫斯科', en: 'Moscow', ja: 'モスクワ' }, lat: 55.7558, lng: 37.6173, tz: 3 },
  { names: { zh: '纽约', en: 'New York', ja: 'ニューヨーク' }, lat: 40.7128, lng: -74.006, tz: -5 },
  { names: { zh: '洛杉矶', en: 'Los Angeles', ja: 'ロサンゼルス' }, lat: 34.0522, lng: -118.2437, tz: -8 },
  { names: { zh: '旧金山', en: 'San Francisco', ja: 'サンフランシスコ' }, lat: 37.7749, lng: -122.4194, tz: -8 },
  { names: { zh: '悉尼', en: 'Sydney', ja: 'シドニー' }, lat: -33.8688, lng: 151.2093, tz: 10 }
]

/* ------------------------------------------------------------------ *
 * 位置解析与持久化
 * ------------------------------------------------------------------ */

/**
 * 解析用户输入为观测位置。
 * 支持：城市名（中 / 英 / 日，精确或包含匹配）、「纬度, 经度」坐标。
 * @returns {{names: object|null, lat: number, lng: number, tz: number|null} | null}
 */
export function resolveLocation(input) {
  const text = String(input || '').trim()
  if (!text) return null

  // 坐标：「32.06, 118.80」「32.06 118.80」「-33.87，151.21」（支持中文逗号）
  const coord = text.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,，\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (coord) {
    const lat = Number(coord[1])
    const lng = Number(coord[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { names: null, lat, lng, tz: null }
    }
    return null
  }

  const needle = text.toLowerCase()
  // 先精确匹配任一语言名称，再退到包含匹配（如输入 "new" 也能命中 New York）
  const exact = CITY_TABLE.find((city) =>
    Object.values(city.names).some((name) => name.toLowerCase() === needle)
  )
  const fuzzy = exact || CITY_TABLE.find((city) =>
    Object.values(city.names).some((name) => {
      const n = name.toLowerCase()
      return n.includes(needle) || needle.includes(n)
    })
  )
  return fuzzy ? { names: fuzzy.names, lat: fuzzy.lat, lng: fuzzy.lng, tz: fuzzy.tz } : null
}

/** 读取已保存的观测位置（无则 null，表示使用默认南京数据） */
export function getSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    const loc = JSON.parse(raw)
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null
    return loc
  } catch (error) {
    return null
  }
}

export function saveLocation(loc) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc))
  } catch (error) {
    console.error('保存观测位置失败:', error)
  }
}

export function clearSavedLocation() {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY)
  } catch (error) {
    console.error('清除观测位置失败:', error)
  }
}

/** 与默认南京足够接近（< 0.05°，约 5km）时视为默认，直接沿用预生成 JSON */
export function isDefaultLocation(loc) {
  if (!loc) return true
  return Math.abs(loc.lat - DEFAULT_LOCATION.lat) < 0.05
    && Math.abs(loc.lng - DEFAULT_LOCATION.lng) < 0.05
}

/** 位置的显示名：内置城市按界面语言，坐标输入显示经纬度 */
export function locationLabel(loc, lang) {
  const target = loc || DEFAULT_LOCATION
  if (target.names) {
    return target.names[lang] || target.names.zh || ''
  }
  return `${target.lat.toFixed(2)}°, ${target.lng.toFixed(2)}°`
}

/** 位置的 UTC 偏移：城市表自带；坐标输入按经度估算；定位建议传浏览器时区 */
export function locationUtcOffset(loc) {
  if (loc && typeof loc.tz === 'number') return loc.tz
  const lng = loc ? loc.lng : DEFAULT_LOCATION.lng
  return Math.round(lng / 15)
}

/* ------------------------------------------------------------------ *
 * 日出日落（NOAA 简化算法）
 * ------------------------------------------------------------------ */

const RAD = Math.PI / 180

function norm360(deg) {
  return ((deg % 360) + 360) % 360
}

// 返回当地标准时的「小时数」（0-24，含小数）；极昼 / 极夜返回 null
function sunTimeHours(dateStr, lat, lng, isSunrise) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000)
  const lngHour = lng / 15

  const t = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24
  const M = 0.9856 * t - 3.289
  const L = norm360(M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634)

  let ra = norm360(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD)
  // 赤经与太阳黄经须在同一象限
  ra += Math.floor(L / 90) * 90 - Math.floor(ra / 90) * 90
  ra /= 15

  const sinDec = 0.39782 * Math.sin(L * RAD)
  const cosDec = Math.cos(Math.asin(sinDec))
  // 90.833°：官方日出日落天顶距（含大气折射与太阳视半径）
  const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD))
    / (cosDec * Math.cos(lat * RAD))
  if (cosH > 1 || cosH < -1) return null

  let H = Math.acos(cosH) / RAD
  if (isSunrise) H = 360 - H
  H /= 15

  const T = H + ra - 0.06571 * t - 6.622
  return T - lngHour // UTC 小时数
}

/**
 * 计算某日某地的日出日落（当地时间 HH:mm）。
 * @returns {{sunrise: string, sunset: string} | null} 极昼 / 极夜时返回 null
 */
export function calcSunTimes(dateStr, lat, lng, utcOffset) {
  const format = (utHours) => {
    const local = ((utHours + utcOffset) % 24 + 24) % 24
    let hh = Math.floor(local)
    let mm = Math.round((local - hh) * 60)
    if (mm === 60) { mm = 0; hh = (hh + 1) % 24 }
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const rise = sunTimeHours(dateStr, lat, lng, true)
  const set = sunTimeHours(dateStr, lat, lng, false)
  if (rise === null || set === null) return null
  return { sunrise: format(rise), sunset: format(set) }
}
