/**
 * 观星指南（无第三方依赖，Node 与浏览器均可直接 import）
 * ---------------------------------------------------------------
 * 1. 行星：用 Paul Schlyter 的简化轨道根数算法，本地计算「今晚」可见行星，
 *    不请求任何天象 API（避免 key、限流与旧接口下线风险）。
 * 2. 天象：内置主要流星雨年历，算出距离下一次极大期的天数。
 * 3. utcOffset 为观测地时区（UTC 偏移小时，可为小数），默认 +8（北京时间）。
 */

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

// 轨道根数：value(d) = base + rate * d，d 为距 1999-12-31 00:00 UT 的天数
const PLANETS = [
  {
    name: '水星',
    N: [48.3313, 3.24587e-5],
    i: [7.0047, 5.0e-8],
    w: [29.1241, 1.01444e-5],
    a: [0.387098, 0],
    e: [0.205635, 5.59e-10],
    M: [168.6562, 4.0923344368]
  },
  {
    name: '金星',
    N: [76.6799, 2.4659e-5],
    i: [3.3946, 2.75e-8],
    w: [54.891, 1.38374e-5],
    a: [0.72333, 0],
    e: [0.006773, -1.302e-9],
    M: [48.0052, 1.6021302244]
  },
  {
    name: '火星',
    N: [49.5574, 2.11081e-5],
    i: [1.8497, -1.78e-8],
    w: [286.5016, 2.92961e-5],
    a: [1.523688, 0],
    e: [0.093405, 2.516e-9],
    M: [18.6021, 0.5240207766]
  },
  {
    name: '木星',
    N: [100.4542, 2.76854e-5],
    i: [1.303, -1.557e-7],
    w: [273.8777, 1.64505e-5],
    a: [5.20256, 0],
    e: [0.048498, 4.469e-9],
    M: [19.895, 0.0830853001]
  },
  {
    name: '土星',
    N: [113.6634, 2.3898e-5],
    i: [2.4886, -1.081e-7],
    w: [339.3939, 2.97661e-5],
    a: [9.55475, 0],
    e: [0.055546, -9.499e-9],
    M: [316.967, 0.0334442282]
  }
]

// 主要流星雨（极大期日期为常见观测值，ZHR 为理想条件下每小时颗数）
const METEOR_SHOWERS = [
  { name: '象限仪座流星雨', month: 1, day: 3, zhr: 110 },
  { name: '天琴座流星雨', month: 4, day: 22, zhr: 18 },
  { name: '宝瓶座η流星雨', month: 5, day: 6, zhr: 50 },
  { name: '英仙座流星雨', month: 8, day: 12, zhr: 100 },
  { name: '猎户座流星雨', month: 10, day: 21, zhr: 20 },
  { name: '狮子座流星雨', month: 11, day: 17, zhr: 15 },
  { name: '双子座流星雨', month: 12, day: 14, zhr: 150 },
  { name: '小熊座流星雨', month: 12, day: 22, zhr: 10 }
]

const COMPASS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

const norm360 = (deg) => ((deg % 360) + 360) % 360

function daysSinceEpoch(date) {
  // Schlyter 的 d 从 1999-12-31 00:00 UT 起算
  return (date.getTime() - Date.UTC(1999, 11, 31, 0, 0, 0)) / 86400000
}

function solveEccentricAnomaly(M, e) {
  const mRad = M * DEG
  let E = M + e * RAD * Math.sin(mRad) * (1 + e * Math.cos(mRad))
  for (let k = 0; k < 3; k++) {
    E = E - (E - e * RAD * Math.sin(E * DEG) - M) / (1 - e * Math.cos(E * DEG))
  }
  return E
}

function sunPosition(d) {
  const w = 282.9404 + 4.70935e-5 * d
  const e = 0.016709 - 1.151e-9 * d
  const M = norm360(356.047 + 0.9856002585 * d)
  const E = solveEccentricAnomaly(M, e)
  const xv = Math.cos(E * DEG) - e
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * DEG)
  const v = Math.atan2(yv, xv) * RAD
  const r = Math.hypot(xv, yv)
  const lon = norm360(v + w)

  return {
    xs: r * Math.cos(lon * DEG),
    ys: r * Math.sin(lon * DEG),
    meanLongitude: norm360(M + w)
  }
}

/** 某颗行星在地心视位置下的赤经、赤纬（度） */
function planetEquatorial(date, planet) {
  const d = daysSinceEpoch(date)
  const N = norm360(planet.N[0] + planet.N[1] * d) * DEG
  const i = (planet.i[0] + planet.i[1] * d) * DEG
  const w = (planet.w[0] + planet.w[1] * d) * DEG
  const a = planet.a[0] + planet.a[1] * d
  const e = planet.e[0] + planet.e[1] * d
  const M = norm360(planet.M[0] + planet.M[1] * d)

  const E = solveEccentricAnomaly(M, e) * DEG
  const xv = a * (Math.cos(E) - e)
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const v = Math.atan2(yv, xv)
  const r = Math.hypot(xv, yv)

  const vw = v + w
  const xh = r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(i))
  const yh = r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(i))
  const zh = r * Math.sin(vw) * Math.sin(i)

  const sun = sunPosition(d)
  // 地心坐标 = 行星日心坐标 + 太阳地心坐标（地球日心坐标是太阳地心坐标的相反数）
  const xg = xh + sun.xs
  const yg = yh + sun.ys
  const zg = zh

  const lon = Math.atan2(yg, xg)
  const lat = Math.atan2(zg, Math.hypot(xg, yg))
  const ecl = (23.4393 - 3.563e-7 * d) * DEG

  const xe = Math.cos(lon) * Math.cos(lat)
  const ye = Math.sin(lon) * Math.cos(lat) * Math.cos(ecl) - Math.sin(lat) * Math.sin(ecl)
  const ze = Math.sin(lon) * Math.cos(lat) * Math.sin(ecl) + Math.sin(lat) * Math.cos(ecl)

  return {
    ra: norm360(Math.atan2(ye, xe) * RAD),
    dec: Math.atan2(ze, Math.hypot(xe, ye)) * RAD,
    sunMeanLongitude: sun.meanLongitude
  }
}

/** 计算某时刻、某地点的地平高度与方位角（度） */
function altAz(date, ra, dec, latitude, longitude, sunMeanLongitude) {
  const utHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const gmst0 = ((sunMeanLongitude / 15 + 12) % 24 + 24) % 24 // 小时
  const lstHours = ((gmst0 + utHours + longitude / 15) % 24 + 24) % 24
  const hourAngle = (((lstHours * 15 - ra) % 360) + 540) % 360 - 180

  const ha = hourAngle * DEG
  const decRad = dec * DEG
  const latRad = latitude * DEG

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD
  const azimuth = norm360(
    Math.atan2(
      Math.sin(ha),
      Math.cos(ha) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
    ) * RAD + 180
  )

  return { altitude, azimuth }
}

/** 太阳高度，用于判断是否天黑 */
function sunAltitude(date, latitude, longitude) {
  const d = daysSinceEpoch(date)
  const sun = sunPosition(d)
  const lon = Math.atan2(sun.ys, sun.xs)
  const ecl = (23.4393 - 3.563e-7 * d) * DEG
  const xe = Math.cos(lon)
  const ye = Math.sin(lon) * Math.cos(ecl)
  const ze = Math.sin(lon) * Math.sin(ecl)
  const ra = norm360(Math.atan2(ye, xe) * RAD)
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) * RAD
  return altAz(date, ra, dec, latitude, longitude, sun.meanLongitude).altitude
}

function compassDirection(azimuth) {
  return COMPASS[Math.round(norm360(azimuth) / 45) % 8]
}

/**
 * 今晚可见行星
 * @param {string} dateStr 当地日期 YYYY-MM-DD
 * @param {number} utcOffset 观测地 UTC 偏移小时（可为小数，如 5.5），默认 +8
 */
export function getVisiblePlanets(dateStr, latitude = 32.0603, longitude = 118.7969, utcOffset = 8) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const results = []

  for (const planet of PLANETS) {
    let best = null

    // 当地 18:00 → 次日 05:00，每小时采样，只取天黑后的时刻
    // 用毫秒加法换算 UTC（不用 Date.UTC 的 hour 参数），支持 5.5 这类非整数时区
    const dayStartUtc = Date.UTC(year, month - 1, day, 0, 0, 0)
    for (let hour = 18; hour <= 29; hour++) {
      const utcMs = dayStartUtc + (hour - utcOffset) * 3600000
      const time = new Date(utcMs)
      if (sunAltitude(time, latitude, longitude) > -4) continue

      const { ra, dec, sunMeanLongitude } = planetEquatorial(time, planet)
      const { altitude, azimuth } = altAz(time, ra, dec, latitude, longitude, sunMeanLongitude)
      if (!best || altitude > best.altitude) {
        best = { altitude, azimuth, hour: hour % 24 }
      }
    }

    if (best && best.altitude >= 8) {
      results.push({
        name: planet.name,
        azimuth: compassDirection(best.azimuth),
        altitude: Math.round(best.altitude),
        time: `${String(best.hour).padStart(2, '0')}:00`
      })
    }
  }

  return results.sort((a, b) => b.altitude - a.altitude)
}

/** 单颗行星在指定时刻的地平高度与方位角（可用于校验） */
export function planetAltAz(date, name, latitude = 32.0603, longitude = 118.7969) {
  const planet = PLANETS.find((item) => item.name === name)
  if (!planet) return null
  const { ra, dec, sunMeanLongitude } = planetEquatorial(date, planet)
  return altAz(date, ra, dec, latitude, longitude, sunMeanLongitude)
}

/** 距离下一次流星雨极大期的天数（含当天为 0） */
export function getNextSkyEvent(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const today = Date.UTC(year, month - 1, day)

  let next = null
  for (const offsetYear of [0, 1]) {
    for (const shower of METEOR_SHOWERS) {
      const peak = Date.UTC(year + offsetYear, shower.month - 1, shower.day)
      const days = Math.round((peak - today) / 86400000)
      if (days < 0) continue
      if (!next || days < next.days) {
        next = {
          name: shower.name,
          date: new Date(peak).toISOString().slice(0, 10),
          days,
          zhr: shower.zhr
        }
      }
    }
  }

  return next
}

/** 组装观星指南：任何一步失败都返回 null，由调用方沿用旧数据 */
export function buildSkyGuide(dateStr, latitude = 32.0603, longitude = 118.7969, utcOffset = 8) {
  try {
    return {
      planets: getVisiblePlanets(dateStr, latitude, longitude, utcOffset),
      event: getNextSkyEvent(dateStr)
    }
  } catch (error) {
    console.warn(`观星指南计算失败：${error.message}`)
    return null
  }
}
