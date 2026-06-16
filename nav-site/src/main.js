/**
 * ============================================================
 * AR NAV · 主入口
 * ============================================================
 * 功能阶段（第一阶段）：
 *   1. 初始化 3D 场景（Three.js）
 *   2. 获取 GPS 定位
 *   3. 获取指南针 / 陀螺仪方向
 *   4. 语音播报 (Web Speech API)
 *   5. 更新 UI 显示
 * 
 * 高德地图 / 路线规划 / 天气等功能在第二阶段实现
 * ============================================================
 */

import { CONFIG } from './config.js'
import { MiniMap } from './MiniMap.js'

/* ============================================================
   DOM 元素引用
   ============================================================ */
const $ = id => document.getElementById(id)

const dom = {
  initOverlay:     $('init-overlay'),
  startBtn:        $('start-btn'),
  destinationBox:  $('destination-box'),
  destinationInput:$('destination-input'),
  destConfirmBtn:  $('dest-confirm-btn'),
  destination:     $('destination-display'),
  poiSuggestions:  $('poi-suggestions'),

  // 指南针
  compassArrow:    $('compass-arrow'),
  compassText:     $('compass-text'),

  // 大箭头
  bigArrow:        $('big-arrow'),
  arrowDistance:   $('arrow-distance'),
  arrowHint:       $('arrow-hint'),

  // ★★★ 新增：转弯指示器 ★★★
  turnIndicator:   $('turn-indicator'),
  turnIcon:        $('turn-icon'),
  turnText:        $('turn-text'),

  // 进度条
  routeProgressFill: $('route-progress-fill'),

  // 路线概览
  routeSummary:      $('route-summary'),
  routeSummaryContent: $('route-summary-content'),
  routeSummaryClose: $('route-summary-close'),

  // 主信息
  totalDistance:   $('total-distance'),
  remainTime:      $('remain-time'),
  currentSpeed:    $('current-speed'),
  nextTurn:        $('next-turn'),

  // 次要信息
  weatherInfo:     $('weather-info'),
  trafficLight:    $('traffic-light'),
  traveled:        $('traveled'),

  // 语音提示
  voiceHint:       $('voice-hint'),
  voiceText:       $('voice-text'),

  // 传感器状态
  gpsStatus:       $('gps-status'),
  compassStatus:   $('compass-status'),
  gyroStatus:      $('gyro-status'),
}

/* ============================================================
   全局状态
   ============================================================ */
const state = {
  miniMap: null,
  watchId: null,
  headingWatchId: null,

  // 位置
  currentLat: null,
  currentLng: null,
  startLat: null,
  startLng: null,

  // 方向（度）
  heading: 0,   // 手机朝向（指南针方向，0=北）
  bearing: 0,   // 到终点的方向

  // 距离
  totalDistance: 0,      // 总距离（米）
  traveledDistance: 0,   // 已行驶（米）

  // ═══════ 导航引擎 ═══════
  // 路线步骤：[{index, path:[[lng,lat],...], distance, instruction, road, action, orientation, turnPoint:[lng,lat], cumDistance}]
  // cumDistance = 从起点到本步骤起始点的累计距离（米）
  navSteps: null,         // 规划的全部步骤
  navFullPath: null,      // 整条路线的连续折线点 [[lng,lat], ...]
  navFullPathDists: null, // 每个点在 navFullPath 上的累计距离（米）
  navTotalDistance: 0,    // 路线总距离（米）
  navProgressMeters: 0,   // 沿路线已行驶距离（米，基于点到折线投影）
  navCurrentStepIdx: 0,   // 当前位于哪一步
  navNextStepIdx: null,   // 下一转弯步骤（可能和 current 相同，意味着直行）
  navNextTurnDistance: 0, // 到下一转弯点的剩余距离（米）
  navNextTurnAction: 'straight', // straight/left/right/uturn/arrive
  navNextTurnText: '',    // 下一个转弯的描述（例："前方 200m 左转进入长安街"）
  navBearingToTurn: 0,    // 指向"下一转弯点"的方位（度，相对北顺时针）
  navArrowAngle: 0,       // 显示给用户的箭头偏转角（相对手机 heading）
  _routePlanned: false,   // 是否已成功规划路线
  _navInitialized: false, // 导航引擎是否就绪

  // 目的地
  destination: null,     // { name, lat, lng }

  // 时间
  startTime: null,

  // 高德 API
  amapReady: false,      // AMap JS SDK 是否已加载
  geocoder: null,        // 反地理编码器实例
  riding: null,          // 骑行路线规划（AMap.Riding）
  driving: null,         // 驾车路线规划（AMap.Driving）
  walking: null,         // 步行路线规划（AMap.Walking）
  lastGeocodeTime: 0,    // 上次反地理编码时间（毫秒）
  roadName: '',          // 当前道路名称
  address: '',           // 完整地址

  // 速度监测
  currentSpeed: 0,       // 当前速度（km/h，来自 GPS speed 或差分估算）
  speedHistory: [],      // 最近若干速度样本（便于平滑）
  lastGpsTime: null,     // 上一次 GPS 时间戳
  lastGpsLat: null,      // 上一次 GPS 坐标 lat
  lastGpsLng: null,      // 上一次 GPS 坐标 lng

  weather: null          // 当前天气信息对象
}

/* ============================================================
   工具函数
   ============================================================ */

// Haversine 公式计算两点距离（米）
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000 // 地球半径
  const toRad = d => d * Math.PI / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 计算从点1到点2的方位角（度，0=北）
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180
  const toDeg = r => r * 180 / Math.PI

  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return (toDeg(θ) + 360) % 360
}

// 给定起点、航向角、距离，计算目标经纬度（沿航向移动）
function moveAlongBearing(lat1, lng1, bearingDeg, distanceMeters) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const toDeg = r => r * 180 / Math.PI
  const φ1 = toRad(lat1)
  const λ1 = toRad(lng1)
  const δ = distanceMeters / R
  const θ = toRad(bearingDeg)

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  )
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  )
  return { lat: toDeg(φ2), lng: toDeg(λ2) }
}

// 把方位角转为文本方向
function bearingToText(deg) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]
}

// 把米格式化
function fmtDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

// 预计时间（默认骑行速度 15km/h）
function fmtEta(meters, speedKmh = 15) {
  if (!meters) return '-- min'
  const hours = (meters / 1000) / speedKmh
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}min`
}

/* ============================================================
   ⭐ 导航几何工具函数
   ============================================================ */

// 点(p)到线段(a-b)的最近点 + 距离 + 在该线段上的投影距离（沿线段前进的距离）
// 返回 {lng, lat, distAlongSeg, distFromSeg}
function _projectPointToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  // 把经度/纬度近似成米制（局部平面近似，足够用于插值）
  // d(lat) ≈ 111320 m/deg, d(lng) ≈ 111320 * cos(lat) m/deg
  const avgLat = (pLat + aLat + bLat) / 3
  const metersPerDegLat = 111320
  const metersPerDegLng = 111320 * Math.cos(avgLat * Math.PI / 180)

  const ax = (aLng - pLng) * metersPerDegLng
  const ay = (aLat - pLat) * metersPerDegLat
  const bx = (bLng - pLng) * metersPerDegLng
  const by = (bLat - pLat) * metersPerDegLat

  const abx = bx - ax
  const aby = by - ay
  const abLen2 = abx * abx + aby * aby
  if (abLen2 < 1e-9) {
    return { lat: aLat, lng: aLng, distAlongSeg: 0, distFromSeg: Math.sqrt(ax*ax + ay*ay) }
  }

  // t = -(a · ab) / |ab|^2， 范围 [0,1]
  let t = -(ax * abx + ay * aby) / abLen2
  if (t < 0) t = 0
  if (t > 1) t = 1

  const projX = ax + t * abx
  const projY = ay + t * aby
  const projLat = pLat + projY / metersPerDegLat
  const projLng = pLng + projX / metersPerDegLng

  const segLen = Math.sqrt(abLen2)
  const distAlongSeg = t * segLen
  const distFromSeg = Math.sqrt(projX*projX + projY*projY)

  return { lat: projLat, lng: projLng, distAlongSeg: distAlongSeg, distFromSeg: distFromSeg, t: t }
}

// 点到整条折线的投影：遍历所有线段，找到最近的那条
// 返回 {lat, lng, cumDistanceMeters, segIdx, segT}
// cumDistanceMeters = 从路线起点到投影点的累计距离（米）
function _projectPointToPath(pLat, pLng, path) {
  if (!path || path.length < 2) return null

  let best = null
  let cumDist = 0  // 当前段起点的累计距离

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const proj = _projectPointToSegment(pLat, pLng, a[1], a[0], b[1], b[0])

    // 该段长度
    const segLen = haversine(a[1], a[0], b[1], b[0])

    if (best === null || proj.distFromSeg < best.distFromSeg) {
      best = {
        lat: proj.lat,
        lng: proj.lng,
        distFromSeg: proj.distFromSeg,
        segIdx: i,
        segT: proj.t,
        cumDistanceMeters: cumDist + proj.distAlongSeg
      }
    }
    cumDist += segLen
  }
  return best
}

// 根据累计距离，在路径上找到对应的坐标（插值）
// 用于：沿路线模拟前进
function _pointAtDistance(path, distanceMeters) {
  if (!path || path.length < 2) return null
  let cum = 0
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const segLen = haversine(a[1], a[0], b[1], b[0])
    if (cum + segLen >= distanceMeters) {
      const t = segLen > 0 ? (distanceMeters - cum) / segLen : 0
      return {
        lat: a[1] + (b[1] - a[1]) * t,
        lng: a[0] + (b[0] - a[0]) * t,
        segIdx: i
      }
    }
    cum += segLen
  }
  // 到达终点
  const last = path[path.length - 1]
  return { lat: last[1], lng: last[0], segIdx: path.length - 2 }
}

// 从路径点数组计算"有向路径"：每段都有起点、终点、bearing
// 返回 [{startLat, startLng, endLat, endLng, bearing, distance, cumDistance}] 数组
function _buildDirectionalPath(fullPath) {
  if (!fullPath || fullPath.length < 2) return []
  const segments = []
  let cumDist = 0
  for (let i = 0; i < fullPath.length - 1; i++) {
    const [lng1, lat1] = fullPath[i]
    const [lng2, lat2] = fullPath[i + 1]
    if (typeof lat1 !== 'number' || typeof lat2 !== 'number') continue
    const segDist = haversine(lat1, lng1, lat2, lng2)
    // 非常短的段（可能是重复点）忽略，避免 bearing 不稳定
    if (segDist < 1) continue
    const segBearing = bearing(lat1, lng1, lat2, lng2)
    segments.push({
      startLat: lat1, startLng: lng1,
      endLat: lat2, endLng: lng2,
      bearing: segBearing,
      distance: segDist,
      cumDistance: cumDist
    })
    cumDist += segDist
  }
  return segments
}

// 基于"前一段朝向"与"后一段朝向"计算左转/右转/直行/掉头
// 返回: 'left' | 'right' | 'left-slight' | 'right-slight' | 'uturn' | 'straight'
function _computeTurnDirection(prevBearing, nextBearing) {
  // 归一化角度差到 (-180, 180]
  let diff = ((nextBearing - prevBearing + 540) % 360) - 180
  if (Math.abs(diff) < 15) return 'straight'
  if (Math.abs(diff) > 150) return 'uturn'
  if (diff < 0) {
    // 向左偏转
    if (Math.abs(diff) < 45) return 'left-slight'
    return 'left'
  } else {
    // 向右偏转
    if (Math.abs(diff) < 45) return 'right-slight'
    return 'right'
  }
}

// 把 AMap.Riding 返回的 orientation 文本转成标准动作
function _orientationToAction(orientationText) {
  if (!orientationText) return 'straight'
  const t = String(orientationText)
  if (/左转|左拐|向左/i.test(t)) return 'left'
  if (/右转|右拐|向右/i.test(t)) return 'right'
  if (/掉头|回转|反向|u-turn|U形|U型|U 形/i.test(t)) return 'uturn'
  if (/左前方|向左前|左前斜/i.test(t)) return 'left-slight'
  if (/右前方|向右前|右前斜/i.test(t)) return 'right-slight'
  if (/左后方|向右后|右后方|向右后/i.test(t)) return 'back'
  return 'straight'
}

// 根据动作生成箭头符号与旋转角度（相对于手机朝向）
// 动作 → 文本
function _actionToText(action) {
  return ({
    'straight': '直行',
    'left': '左转',
    'left-slight': '左前方',
    'right': '右转',
    'right-slight': '右前方',
    'uturn': '掉头',
    'arrive': '到达目的地'
  })[action] || '直行'
}

/**
 * ★★★ 新增：更新转弯指示器UI ★★★
 * 根据当前动作类型显示对应的图标和文本
 */
function _updateTurnIndicator(action, distance) {
  if (!dom.turnIndicator) return

  // 转弯图标映射
  const iconMap = {
    'straight': '↑',
    'left': '←',
    'left-slight': '↖',
    'right': '→',
    'right-slight': '↗',
    'uturn': '↺',
    'arrive': '★'
  }

  // 转弯颜色映射
  const colorMap = {
    'straight': '#00ffff',
    'left': '#4dd0e1',
    'left-slight': '#4dd0e1',
    'right': '#ffb74d',
    'right-slight': '#ffb74d',
    'uturn': '#e57373',
    'arrive': '#ffd54f'
  }

  const icon = iconMap[action] || iconMap['straight']
  const text = _actionToText(action)
  const color = colorMap[action] || colorMap['straight']

  // 更新图标和文本
  if (dom.turnIcon) {
    dom.turnIcon.textContent = icon
    dom.turnIcon.style.color = color
  }

  if (dom.turnText) {
    dom.turnText.textContent = text
    dom.turnText.style.color = color
  }

  // 添加动画效果
  dom.turnIndicator.classList.add('pulse')
  setTimeout(() => {
    dom.turnIndicator.classList.remove('pulse')
  }, 300)
}

/**
 * ★★★ 新增：更新路线进度条 ★★★
 * 显示当前位置在整体路线上的进度
 */
function _updateRouteProgress(progressMeters, totalDistance) {
  if (!dom.routeProgressFill || !totalDistance) return

  const progress = Math.min((progressMeters / totalDistance) * 100, 100)
  dom.routeProgressFill.style.width = `${progress}%`
}

/**
 * ★★★ 新增：显示路线概览 ★★★
 * 在路线规划成功后显示简要路线信息
 */
function _showRouteSummary(steps, totalDist) {
  if (!dom.routeSummary || !dom.routeSummaryContent) return

  // 生成路线概览内容
  let content = `<div style="margin-bottom: 12px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>总距离：<strong style="color: #00ffff;">${fmtDistance(totalDist)}</strong></span>
      <span>预计：<strong style="color: #00ff88;">${fmtEta(totalDist)}</strong></span>
    </div>
    <div style="border-bottom: 1px solid rgba(0, 255, 255, 0.2); padding-bottom: 8px; margin-bottom: 8px;">
      途经 <strong style="color: #ffb74d;">${steps.length - 2}</strong> 个路口
    </div>
  </div>`

  // 添加主要转弯指示（最多显示前5个）
  const mainTurns = steps
    .filter(s => s.action !== 'arrive' && s.action !== 'straight')
    .slice(0, 5)

  if (mainTurns.length > 0) {
    content += '<div style="margin-bottom: 8px; font-weight: 600;">主要转弯：</div>'
    mainTurns.forEach((step, idx) => {
      const icon = _actionToIcon(step.action)
      const road = step.road ? `进入${step.road}` : ''
      const dist = idx === 0 ? '起点' : `${fmtDistance(step.cumDistance)}`
      content += `<div style="margin: 4px 0; padding-left: 8px; border-left: 2px solid rgba(0, 255, 255, 0.3);">
        <span style="color: #4dd0e1;">${icon}</span> ${dist} - ${_actionToText(step.action)} ${road}
      </div>`
    })
  }

  dom.routeSummaryContent.innerHTML = content
  dom.routeSummary.style.display = 'block'

  // 自动隐藏（10秒后）
  setTimeout(() => {
    if (dom.routeSummary) {
      dom.routeSummary.style.display = 'none'
    }
  }, 10000)

  // 点击关闭按钮
  if (dom.routeSummaryClose) {
    dom.routeSummaryClose.onclick = () => {
      if (dom.routeSummary) {
        dom.routeSummary.style.display = 'none'
      }
    }
  }
}

// 动作转图标
function _actionToIcon(action) {
  return ({
    'straight': '↑',
    'left': '←',
    'left-slight': '↖',
    'right': '→',
    'right-slight': '↗',
    'uturn': '↺',
    'arrive': '★'
  })[action] || '→'
}

// 根据动作选择 SVG 箭头样式：返回 arrowRotationDeg（箭头默认朝上，正角度=顺时针旋转）
// 在没有指南针时用默认箭头方向；实际显示角度由主逻辑根据手机 heading 决定
function _actionToDefaultArrow(action) {
  // 0 为朝上（前方），90 右，-90 左，180 掉头
  return ({
    'straight': 0,
    'left': -60,
    'left-slight': -30,
    'right': 60,
    'right-slight': 30,
    'uturn': 180,
    'arrive': 0
  })[action] ?? 0
}

/* ============================================================
   语音播报 (Web Speech Synthesis API)
   优先选择自然的中文音色
   ============================================================ */
let voiceBusy = false
const voiceQueue = []

// 语音合成：自动选择最优中文音色
let _bestVoice = null

function _initVoice() {
  if (!('speechSynthesis' in window)) return
  try {
    // 等待音色列表加载（部分浏览器需要短暂延迟）
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        setTimeout(loadVoices, 100)
        return
      }
      // 优先选含"云"的中文音色（Windows 小娜/Zhixia 系列音色较自然）
      // 其次选含"晓"/"Xiao"的，再选标准 zh-CN
      const preferred = [
        v => /云|晓|xiao|xiaoxiao|zhi|hui|hui/i.test(v.name),
        v => /zh-CN.*female/i.test(v.lang) || /zh-CN/i.test(v.lang),
        v => v.lang.startsWith('zh-CN')
      ]
      for (const filter of preferred) {
        const found = voices.filter(filter)
        if (found.length > 0) {
          _bestVoice = found[0]
          break
        }
      }
      if (!_bestVoice) {
        _bestVoice = voices.find(v => v.lang.startsWith('zh-CN')) || voices[0]
      }
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  } catch (e) {}
}

function speak(text, priority = false) {
  if (priority) voiceQueue.unshift(text)
  else voiceQueue.push(text)
  _processVoiceQueue()
}

function _processVoiceQueue() {
  if (voiceBusy || voiceQueue.length === 0) return
  if (!('speechSynthesis' in window)) return

  const text = voiceQueue.shift()
  if (!text) return

  // 如果音色还没选好，初始化一次
  if (!_bestVoice) _initVoice()

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 1.0      // 正常语速，听起来更自然
  utter.pitch = 1.05     // 略高音，听感更清晰
  utter.volume = 1

  if (_bestVoice) {
    utter.voice = _bestVoice
  }

  utter.onend = () => {
    voiceBusy = false
    _processVoiceQueue()
  }
  utter.onerror = () => {
    voiceBusy = false
    _processVoiceQueue()
  }

  // 浮动提示
  _showVoiceHint(text)

  voiceBusy = true
  window.speechSynthesis.speak(utter)
}

function _showVoiceHint(text) {
  dom.voiceText.textContent = text
  dom.voiceHint.classList.add('show')
  clearTimeout(_showVoiceHint._t)
  _showVoiceHint._t = setTimeout(() => {
    dom.voiceHint.classList.remove('show')
  }, 2800)
}

/* ============================================================
   天气监测：Open-Meteo（免费、无需 API Key，HTTPS 直连）
   ============================================================ */
let _lastWeatherFetchTime = 0
let _weatherTimer = null

// WMO weather code -> 中文描述
function _wmoCodeToText(code) {
  const map = {
    0: '☀️ 晴',
    1: '🌤️ 晴间多云', 2: '⛅ 多云', 3: '☁️ 阴',
    45: '🌫️ 雾', 48: '🌫️ 冻雾',
    51: '🌦️ 小毛毛雨', 53: '🌦️ 毛毛雨', 55: '🌧️ 强毛毛雨',
    56: '❄️ 冻毛毛雨', 57: '❄️ 强冻毛毛雨',
    61: '🌧️ 小雨', 63: '🌧️ 中雨', 65: '🌧️ 大雨',
    66: '❄️ 冻雨', 67: '❄️ 强冻雨',
    71: '🌨️ 小雪', 73: '🌨️ 中雪', 75: '❄️ 大雪',
    77: '🌨️ 雪粒',
    80: '🌦️ 阵雨', 81: '🌧️ 强阵雨', 82: '⛈️ 暴雨',
    85: '🌨️ 阵雪', 86: '❄️ 强阵雪',
    95: '⛈️ 雷雨',
    96: '⛈️ 雷雨冰雹', 99: '⛈️ 强雷雨冰雹'
  }
  return map[code] || '🌡️ 未知'
}

function fetchWeather(lat, lng) {
  if (lat == null || lng == null) return
  // 10 分钟内不重复请求
  if (Date.now() - _lastWeatherFetchTime < 10 * 60 * 1000) return
  _lastWeatherFetchTime = Date.now()

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia%2FShanghai&forecast_days=1`
  fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then(data => {
      if (!data || !data.current) throw new Error('weather: 无 current 字段')
      const c = data.current
      const temp = (typeof c.temperature_2m === 'number') ? c.temperature_2m : null
      const humidity = (typeof c.relative_humidity_2m === 'number') ? c.relative_humidity_2m : null
      const windSpeed = (typeof c.wind_speed_10m === 'number') ? c.wind_speed_10m : null
      const weatherText = _wmoCodeToText(c.weather_code)
      let hint = weatherText
      if (temp != null) hint += ` ${temp.toFixed(1)}°C`
      if (humidity != null) hint += ` · 湿度${humidity}%`
      if (windSpeed != null) hint += ` · 风${windSpeed.toFixed(1)}km/h`

      state.weather = {
        temperature: temp,
        humidity: humidity,
        windSpeed: windSpeed,
        weatherCode: c.weather_code,
        summary: weatherText,
        text: hint,
        updatedAt: Date.now()
      }
      if (dom['weather-info']) dom['weather-info'].textContent = hint
      console.log('[AR NAV] ✅ 天气：' + hint)
    })
    .catch(err => {
      console.warn('[AR NAV] ❌ 天气获取失败：', err && err.message || err)
      if (dom['weather-info']) dom['weather-info'].textContent = '天气服务不可用'
      _lastWeatherFetchTime = Date.now() - 9 * 60 * 1000 // 1 分钟后重试
    })
}

// 启动天气监测：首次立即获取，之后每 10 分钟刷新一次
function startWeatherMonitor() {
  if (_weatherTimer) return // 已经启动
  // 首次请求：延迟 2 秒（等 GPS 定位到）
  const tryFirst = () => {
    if (state.currentLat != null && state.currentLng != null) {
      fetchWeather(state.currentLat, state.currentLng)
    } else {
      setTimeout(tryFirst, 2000) // 继续等 GPS
    }
  }
  setTimeout(tryFirst, 1500)

  // 周期性刷新：每 10 分钟
  _weatherTimer = setInterval(() => {
    if (state.currentLat != null && state.currentLng != null) {
      fetchWeather(state.currentLat, state.currentLng)
    }
  }, 10 * 60 * 1000)
}

/* ============================================================
   高德地图：动态加载 JS SDK + 反地理编码
   ============================================================ */
let _amapLoadingPromise = null
// AMap 加载状态：null=未开始 / 'loading'=加载中 / 'ready'=已就绪 / 'failed'=失败
let _amapStatus = null
let _amapError = null   // 失败原因，用于 UI 展示

// 同步状态到 window，让 MiniMap 等其他模块可以读到
function _setAMapStatus(status, error) {
  _amapStatus = status
  _amapError = error || null
  window.__amapStatus = { status: _amapStatus, error: _amapError }
  if (status === 'ready') state.amapReady = true
}

function getAMapStatus() {
  return { status: _amapStatus, error: _amapError, hasKey: !!CONFIG.AMAP_KEY }
}

function _loadAMap() {
  // ⚠️ 情况 1：完全没有 Key
  if (!CONFIG.AMAP_KEY) {
    const err = '未配置高德 Key（请在 nav-site/src/config.js 中填入）'
    _setAMapStatus('failed', err)
    console.warn('[AR NAV]', err)
    return
  }
  // ⚠️ 情况 2：Key 是占位符
  const trimmedKey = String(CONFIG.AMAP_KEY).trim()
  const isPlaceholder = trimmedKey === ''
    || trimmedKey.toLowerCase().includes('your_')
    || trimmedKey.toLowerCase().includes('请填')
    || trimmedKey.length < 10
  if (isPlaceholder) {
    const err = '高德 Key 看起来是占位符，请填入真实的 Web 端 JS API Key'
    _setAMapStatus('failed', err)
    console.warn('[AR NAV]', err)
    return
  }

  if (_amapStatus === 'ready') return
  if (_amapStatus === 'loading' && _amapLoadingPromise) return _amapLoadingPromise

  _setAMapStatus('loading', null)

  // 配置安全密钥（v2.0 需要）
  if (CONFIG.AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = {
      securityJsCode: CONFIG.AMAP_SECURITY_CODE
    }
  }

  _amapLoadingPromise = new Promise((resolve, reject) => {
    // 如果已加载
    if (window.AMap) {
      _initAMapServices(resolve, reject)
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    // 同时加载骑行/驾车/步行三种路线规划服务，便于在主服务失败时 fallback 到备用
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(trimmedKey)}&plugin=AMap.Geocoder,AMap.AutoComplete,AMap.PlaceSearch,AMap.Riding,AMap.Driving,AMap.Walking`

    script.onerror = () => {
      const err = '高德 SDK 网络加载失败（可能是网络问题或 Key 被封禁）'
      _setAMapStatus('failed', err)
      console.warn('[AR NAV]', err)
      reject(new Error(err))
    }

    // ⚠️ 关键：高德 v2.0 在 key 无效/白名单不匹配时，不会触发 onerror，
    // 而是脚本正常"加载完成"但 window.AMap 可能不存在，或 Geocoder 初始化会抛异常
    script.onload = () => {
      if (window.AMap) {
        _initAMapServices(resolve, reject)
      } else {
        const err = '高德 SDK 已加载但 AMap 不可用（Key 可能无效或类型不匹配，请确认是"Web 端 JS API" Key）'
        _setAMapStatus('failed', err)
        console.warn('[AR NAV]', err)
        reject(new Error(err))
      }
    }
    document.head.appendChild(script)

    // 8 秒超时兜底
    setTimeout(() => {
      if (_amapStatus === 'loading') {
        const err = '高德 SDK 加载超时（请检查网络或 Key 的域名白名单）'
        _setAMapStatus('failed', err)
        reject(new Error(err))
      }
    }, 8000)
  })

  _amapLoadingPromise.catch((e) => {
    console.warn('[AR NAV] AMap load rejected:', e && e.message)
  })

  return _amapLoadingPromise
}

function _initAMapServices(resolve, reject) {
  try {
    state.geocoder = new window.AMap.Geocoder({
      city: '全国',
      radius: 500,
      extensions: 'base'
    })

    // 同时创建三种路线规划服务（Riding / Driving / Walking），
    // 运行时根据 CONFIG.NAV_MODE 选择主服务，失败时可 fallback 到备用
    if (window.AMap.Riding) {
      try { state.riding = new window.AMap.Riding({ policy: 0 }) } catch (e) { console.warn('[AR NAV] AMap.Riding 初始化失败:', e && e.message) }
    }
    if (window.AMap.Driving) {
      try { state.driving = new window.AMap.Driving({ policy: 0 }) } catch (e) { console.warn('[AR NAV] AMap.Driving 初始化失败:', e && e.message) }
    }
    if (window.AMap.Walking) {
      try { state.walking = new window.AMap.Walking({ policy: 0 }) } catch (e) { console.warn('[AR NAV] AMap.Walking 初始化失败:', e && e.message) }
    }

    const primary = (CONFIG.NAV_MODE || 'riding').toLowerCase()
    console.log(`[AR NAV] ✅ AMap 服务初始化成功：riding=${!!state.riding} driving=${!!state.driving} walking=${!!state.walking}（主服务=${primary}）`)

    _setAMapStatus('ready', null)
    resolve()
  } catch (e) {
    const err = 'AMap 服务初始化失败: ' + (e && e.message || e)
    _setAMapStatus('failed', err)
    console.error('[AR NAV] ❌', err)
    reject(new Error(err))
  }
}

function _reverseGeocode(lng, lat) {
  if (!state.geocoder) return
  // 限流：每 3 秒最多一次
  const now = Date.now()
  if (now - state.lastGeocodeTime < 3000) return
  state.lastGeocodeTime = now

  try {
    state.geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result && result.regeocode) {
        const regeo = result.regeocode
        // 优先取 road（道路名）
        let road = ''
        if (regeo.roadnet && regeo.roadnet.length > 0) {
          road = regeo.roadnet[0].name || ''
        }
        if (!road && regeo.addressComponent) {
          road = regeo.addressComponent.township || regeo.addressComponent.district || ''
        }
        const formatted = regeo.formattedAddress || ''

        state.roadName = road
        state.address = formatted

        // 更新 UI：把"红绿灯"那块区域改成显示当前道路
        if (dom.trafficLight) {
          const txt = road ? `${road}` : (formatted || '定位中...')
          dom.trafficLight.textContent = txt
        }
        // 迷你地图信息
        if (state.miniMap && state.miniMap.setInfo) {
          state.miniMap.setInfo(road || formatted || '')
        }
      } else {
        // 反地理编码失败，可能是 Key 问题或坐标异常
        if (dom.trafficLight) {
          dom.trafficLight.textContent = '地图未就绪'
        }
      }
    })
  } catch (e) {
    console.warn('[AR NAV] 反地理编码调用失败:', e)
  }
}

/* ============================================================
   GPS 定位
   ============================================================ */
function startGPS() {
  // 调试模式下：不启动真实 GPS，由鼠标点击 / 拖动控制位置
  if (state.debugMode) {
    console.log('[AR NAV] 调试模式：跳过真实 GPS，使用鼠标控制位置')
    _loadAMap()
    return
  }

  if (!('geolocation' in navigator)) {
    console.warn('浏览器不支持定位')
    speak('无法获取定位')
    return
  }

  // 预加载高德地图 SDK（用于道路显示）
  _loadAMap()

  // 让 MiniMap 也启用定位（此时已是用户手势后）
  if (state.miniMap && typeof state.miniMap.enableLocation === 'function') {
    state.miniMap.enableLocation()
  }

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.currentLat = pos.coords.latitude
      state.currentLng = pos.coords.longitude

      dom.gpsStatus.classList.add('active')

      if (state.startLat == null) {
        state.startLat = state.currentLat
        state.startLng = state.currentLng
        state.startTime = Date.now()
      }

      if (state.miniMap) {
        state.miniMap.setPosition(state.currentLng, state.currentLat)
      }

      // 有目的地但还没路线 → 统一走 _tryPlanRoute（避免重复触发）
      if (state.destination && !state._navInitialized) {
        _tryPlanRoute()
      }

      // 有路线 → 沿路线计算导航进度；无路线 → 回退到朝向/距离显示
      if (state._navInitialized) {
        _updateNavProgress(state.currentLat, state.currentLng)
      } else if (state.destination) {
        _updateDistanceAndBearing()
      }

      if (state._navInitialized) {
        const p = _projectPointToPath(state.currentLat, state.currentLng, state.navFullPath)
        if (p) dom.traveled.textContent = fmtDistance(p.cumDistanceMeters)
      } else {
        state.traveledDistance = haversine(
          state.startLat, state.startLng,
          state.currentLat, state.currentLng
        )
        dom.traveled.textContent = fmtDistance(state.traveledDistance)
      }

      // ===== 速度估算：优先用 GPS speed；不可用时用差分估算 =====
      let kmh = null
      if (pos.coords.speed != null && isFinite(pos.coords.speed) && pos.coords.speed >= 0) {
        kmh = pos.coords.speed * 3.6
      } else {
        // 差分估算：用上一次位置 + 时间差
        if (state.lastGpsTime && state.lastGpsLat != null && state.lastGpsLng != null) {
          const dtSeconds = (Date.now() - state.lastGpsTime) / 1000
          if (dtSeconds > 0.5) {
            const distMeters = _haversineMeters(
              state.lastGpsLat, state.lastGpsLng,
              state.currentLat, state.currentLng)
            kmh = (distMeters / dtSeconds) * 3.6
          }
        }
      }
      // 平滑：取最近 5 个样本的移动平均，减少抖动
      if (kmh != null && isFinite(kmh)) {
        state.speedHistory.push(Math.min(kmh, 200)) // 上限 200 km/h，过滤跳点
        if (state.speedHistory.length > 5) state.speedHistory.shift()
        state.currentSpeed = state.speedHistory.reduce((a, b) => a + b, 0) / state.speedHistory.length
      } else {
        // 没有有效 GPS 数据时缓慢衰减显示，避免一直显示旧速度
        state.currentSpeed = Math.max(0, (state.currentSpeed || 0) - 0.5)
      }
      state.lastGpsTime = Date.now()
      state.lastGpsLat = state.currentLat
      state.lastGpsLng = state.currentLng

      if (dom['current-speed']) {
        dom['current-speed'].textContent = `${state.currentSpeed.toFixed(1)} km/h`
      }

      _reverseGeocode(state.currentLng, state.currentLat)
    },
    (err) => {
      console.warn('定位失败:', err)
      dom.gpsStatus.classList.remove('active')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000
    }
  )
}

/* ============================================================
   指南针 / 陀螺仪方向
   ============================================================ */
async function startCompass() {
  // 方式一：webkitCompassHeading（iOS Safari）
  window.addEventListener('deviceorientation', (e) => {
    let heading = 0

    if (typeof e.webkitCompassHeading === 'number') {
      // iOS
      heading = e.webkitCompassHeading
      dom.compassStatus.classList.add('active')
    } else if (e.alpha != null) {
      // Android / 其他
      // alpha 是绕 Z 轴旋转，北=0 的约定不同浏览器有差异
      heading = 360 - e.alpha
      dom.compassStatus.classList.add('active')
    } else {
      return
    }

    // 归一化到 0-360
    heading = (heading + 360) % 360
    state.heading = heading

    // 同步到迷你3D地图
    if (state.miniMap) {
      state.miniMap.setHeading(heading)
    }

    // 更新 UI 指南针
    _updateCompassUI(heading)

    // 更新 3D 大箭头（相对目的地方向）
    _updateArrowWithHeading()
  }, true)

  // iOS 13+ 需要申请权限
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceOrientationEvent.requestPermission()
      if (resp === 'granted') {
        dom.gyroStatus.classList.add('active')
      }
    } catch (e) {
      console.warn('方向权限未授予', e)
    }
  } else {
    dom.gyroStatus.classList.add('active')
  }
}

/* ============================================================
   UI 更新
   ============================================================ */

// 🔄 大箭头 + 指南针箭头 平滑旋转循环（rAF + lerp）
// 使用 JS rAF + 线性插值，替代 CSS transition，避免高频 heading 更新导致的抖动
// 同时正确处理 179° ↔ -179° 环绕问题
function _startArrowSmoothLoop() {
  state._arrowCurrentAngle   = state._arrowCurrentAngle   || 0
  state._arrowTargetAngle    = state._arrowTargetAngle    || 0
  state._compassCurrentAngle = state._compassCurrentAngle || 0
  state._compassTargetAngle  = state._compassTargetAngle  || 0

  const LERP_FAST = 0.25   // 大箭头稍快：响应更灵敏
  const LERP_SLOW = 0.18   // 指南针稍慢：更稳
  const SNAP_THRESHOLD = 0.2

  let lastTs = 0

  let lastLogTs = 0
  let tickCount = 0

  function tick(ts) {
    if (!lastTs) lastTs = ts
    const dt = Math.min((ts - lastTs) / 1000, 0.1)
    lastTs = ts
    const dtScale = Math.max(dt * 60, 1)  // 以 60fps 为基准，做帧率无关缩放
    tickCount++

    // 每 5 秒打印一次箭头状态（调试用）
    if (ts - lastLogTs > 5000) {
      lastLogTs = ts
      console.log(`[AR NAV] 箭头循环 #${tickCount}: target=${state._arrowTargetAngle?.toFixed(1)}, current=${state._arrowCurrentAngle?.toFixed(1)}, heading=${state.heading}, dom.bigArrow=${dom.bigArrow ? '✅' : '❌'}`)
    }

    // -------- 大箭头 --------
    // 3D 平视视角：先让箭头在屏幕平面内转向（rotateZ），再整体向前倾斜（rotateX）
    // rotateZ(angle)：绕"垂直屏幕平面穿出"的轴旋转——这正是垂直箭头平面的旋转轴
    // rotateX(65deg)：从屏幕平面向后倾斜，模拟平视视角
    {
      let diff = state._arrowTargetAngle - state._arrowCurrentAngle
      while (diff >  180) diff -= 360
      while (diff < -180) diff += 360
      if (Math.abs(diff) > SNAP_THRESHOLD) {
        const factor = 1 - Math.pow(1 - LERP_FAST, dtScale)
        state._arrowCurrentAngle += diff * factor
        if (dom.bigArrow) {
          dom.bigArrow.style.transform = `rotateX(65deg) rotateZ(${state._arrowCurrentAngle}deg)`
        }
      } else if (Math.abs(diff) > 0.001) {
        state._arrowCurrentAngle = state._arrowTargetAngle
        if (dom.bigArrow) {
          dom.bigArrow.style.transform = `rotateX(65deg) rotateZ(${state._arrowTargetAngle}deg)`
        }
      }
    }

    // -------- 指南针箭头 --------
    {
      let diff = state._compassTargetAngle - state._compassCurrentAngle
      while (diff >  180) diff -= 360
      while (diff < -180) diff += 360
      if (Math.abs(diff) > SNAP_THRESHOLD) {
        const factor = 1 - Math.pow(1 - LERP_SLOW, dtScale)
        state._compassCurrentAngle += diff * factor
        if (dom.compassArrow) dom.compassArrow.style.transform = `rotate(${state._compassCurrentAngle}deg)`
      } else if (Math.abs(diff) > 0.001) {
        state._compassCurrentAngle = state._compassTargetAngle
        if (dom.compassArrow) dom.compassArrow.style.transform = `rotate(${state._compassTargetAngle}deg)`
      }
    }

    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function _updateCompassUI(heading) {
  // 指南针：目标角度 = -heading（箭头朝北，屏幕相对手机朝向旋转）
  if (state._compassCurrentAngle == null) state._compassCurrentAngle = -heading
  let target = -heading
  // 环绕归一化，确保走最短路径
  while (target - state._compassCurrentAngle >  180) target -= 360
  while (target - state._compassCurrentAngle < -180) target += 360
  state._compassTargetAngle = target
  // 实际 transform 由 rAF 平滑循环设置，这里只更新文本提示
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const idx = Math.round(((heading % 360) + 360) % 360 / 45) % 8
  if (dom.compassText) dom.compassText.textContent = `${dirs[idx]} ${Math.round(((heading % 360) + 360) % 360)}°`
}

function _updateDistanceAndBearing() {
  if (!state.destination ||
      state.currentLat == null) return

  const dist = haversine(
    state.currentLat, state.currentLng,
    state.destination.lat, state.destination.lng
  )
  state.totalDistance = dist

  dom.totalDistance.textContent = fmtDistance(dist)
  dom.remainTime.textContent = fmtEta(dist)
  dom.arrowDistance.textContent = fmtDistance(dist)

  // 计算相对目的地的方位（从当前位置到目的地）
  state.bearing = bearing(
    state.currentLat, state.currentLng,
    state.destination.lat, state.destination.lng
  )

  // 同步目的地到迷你地图（直接用经纬度）
  if (state.miniMap) {
    state.miniMap.setTarget(state.destination.lng, state.destination.lat)
  }

  _updateArrowWithHeading()

  // 更新"下一个转弯"文本（第一阶段用简单方向）
  dom.nextTurn.textContent = `向 ${bearingToText(state.bearing)}`
}

function _updateArrowWithHeading() {
  if (!state.destination) {
    // 无目的地：直接停在 0°，不再抖动
    state._arrowTargetAngle = 0
    state._arrowCurrentAngle = 0
    dom.bigArrow.style.transform = 'rotateX(65deg) rotateZ(0deg)'
    dom.arrowDistance.style.display = 'block'
    dom.arrowHint.textContent = '未设置目的地'
    return
  }

  // 计算相对手机朝向，到目的地的方向差
  // bearing: 从当前位置指北顺时针到目的地的角度
  // heading: 手机朝向（度，0=北）
  // 相对角度 = (bearing - heading + 360) % 360
  let relative = (state.bearing - state.heading + 360) % 360
  if (relative > 180) relative -= 360  // 归一化到 -180 ~ 180

  // --- 关键点：避免 180° 翻转导致 CSS 绕远路 ---
  // 把 relative 换算成"与当前显示角度最接近的等价角度"——
  // 即如果当前显示 179°，新 relative 是 -177°，我们把目标设为 183°（而不是 -177°）
  // 这样 rAF lerp 只会转 4°，不会绕一整圈
  if (state._arrowCurrentAngle == null) state._arrowCurrentAngle = 0
  let target = relative
  const TWO_PI = 360
  while (target - state._arrowCurrentAngle >  180) target -= TWO_PI
  while (target - state._arrowCurrentAngle < -180) target += TWO_PI
  state._arrowTargetAngle = target

  // 实际的 transform 由 rAF 平滑循环设置，这里只更新目标值

  // --- 提示文字（用精确相对角度）---
  let hintText = ''
  const absRel = Math.abs(relative)
  if (absRel < 15)            hintText = `前方直行 · ${Math.round(absRel)}°`
  else if (absRel < 45)       hintText = `${relative > 0 ? '右' : '左'}前方 · ${Math.round(absRel)}°`
  else if (absRel < 75)       hintText = `${relative > 0 ? '右' : '左'}转 · ${Math.round(absRel)}°`
  else if (absRel < 105)      hintText = `${relative > 0 ? '右' : '左'}转 · ${Math.round(absRel)}°`
  else if (absRel < 135)      hintText = `${relative > 0 ? '右' : '左'}后方 · ${Math.round(absRel)}°`
  else if (absRel < 165)      hintText = `后方 · ${Math.round(180 - absRel)}°`
  else                        hintText = `掉头 · ${Math.round(absRel)}°`

  dom.arrowHint.textContent = hintText
}

/* ============================================================
   启动流程
   ============================================================ */
function startNav() {
  console.log('[AR NAV] startNav() 被调用了！')

  // 防御性检查：确保关键 DOM 元素存在
  if (!dom.startBtn) {
    console.error('[AR NAV] ❌ 错误：找不到 start-btn 元素！')
    return
  }
  if (!dom.destinationBox) {
    console.error('[AR NAV] ❌ 错误：找不到 destination-box 元素！')
    return
  }

  // 确保 AMap 在加载（init 已预加载，这里再确认一次）
  _loadAMap()

  // 显示目的地输入
  dom.destinationBox.classList.remove('hidden')
  dom.startBtn.classList.add('hidden')

  console.log('[AR NAV] ✅ 开始导航界面已显示')

  // 获取一次轻量定位（用于 POI 搜索按距离排序）
  _getUserLocationForSearch()

  // 等 AMap 准备好后启用 POI 搜索
  _waitForAMap(() => {
    _setupPoiSearch()
    // 给用户一个视觉提示：搜索功能就绪
    if (dom.destConfirmBtn) {
      dom.destConfirmBtn.textContent = '确定 · 已就绪'
    }
  })

  // ---- 确定按钮逻辑（基于 _amapStatus 的明确状态机）----
  let _confirming = false
  dom.destConfirmBtn.addEventListener('click', () => {
    if (_confirming) return
    _confirming = true
    const originalText = dom.destConfirmBtn.textContent || '确定'

    // 情况 1：已从 POI 下拉列表选中了某个地点 → 直接用
    if (_currentPoi) {
      _applyDestination(_currentPoi.name, _currentPoi.lng, _currentPoi.lat)
      _confirming = false
      return
    }

    // 情况 2：用户直接在输入框里输入了文本
    const name = dom.destinationInput.value.trim()
    if (!name) {
      speak('请输入或选择目的地')
      _confirming = false
      return
    }

    // ⚠️ 根据 _amapStatus 分情况处理（最关键的部分，之前这里是模糊判断）
    if (_amapStatus === 'ready' && window.AMap && state.geocoder) {
      // 2a: 完全就绪 → 直接地理编码
      dom.destConfirmBtn.textContent = '搜索中…'
      state.geocoder.getLocation(name, (status, result) => {
        dom.destConfirmBtn.textContent = originalText
        _confirming = false
        if (status === 'complete' && result && result.geocodes && result.geocodes.length > 0) {
          const g = result.geocodes[0]
          _applyDestination(g.formattedAddress || name, g.location.lng, g.location.lat)
        } else {
          speak('没有找到这个地方，请尝试输入更具体的地址或从列表中选择')
        }
      })
      return
    }

    if (_amapStatus === 'loading' || _amapStatus === null) {
      // 2b: 还在加载 → 等待并提示
      dom.destConfirmBtn.textContent = '地图加载中…'
      speak('地图服务正在加载，请稍候')
      _loadAMap()   // 确保在加载
      _waitForAMap(() => {
        dom.destConfirmBtn.textContent = originalText
        _confirming = false
        speak('地图已就绪，请再次点击确定')
      }, () => {
        // 加载失败 → 显示具体错误原因
        dom.destConfirmBtn.textContent = '⚠️ ' + (_amapError || '地图不可用')
        speak(_amapError || '地图服务不可用')
        setTimeout(() => { dom.destConfirmBtn.textContent = originalText; _confirming = false }, 4000)
      })
      return
    }

    if (_amapStatus === 'failed') {
      // 2c: 加载失败 → 显示具体原因并让用户可操作
      dom.destConfirmBtn.textContent = '⚠️ ' + (_amapError || '地图不可用')
      speak(_amapError || '地图服务不可用')
      setTimeout(() => { dom.destConfirmBtn.textContent = originalText; _confirming = false }, 5000)
      return
    }

    // 兜底：未知状态
    dom.destConfirmBtn.textContent = originalText
    _confirming = false
  })
}

// 当前选中的 POI（供确认按钮使用）
let _currentPoi = null

// POI 搜索防抖
let _poiSearchTimer = null

// 请求序号（避免旧请求覆盖新结果）
let _poiSearchSeq = 0

// 用户当前位置（用于按距离排序）：{lng, lat} 或 null
let _userLocation = null

/* ---------- 轻量定位（用于 POI 搜索按距离排序）---------- */
function _getUserLocationForSearch() {
  if (!('geolocation' in navigator)) return
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _userLocation = { lng: pos.coords.longitude, lat: pos.coords.latitude }
      },
      (err) => {
        // 定位失败静默处理，依然可用全国搜索
        _userLocation = null
      },
      {
        enableHighAccuracy: false, // 不要求高精度，快速获取即可
        timeout: 5000,
        maximumAge: 3 * 60 * 1000  // 3 分钟内的缓存也接受
      }
    )
  } catch (e) {
    // ignore
  }
}

/* ---------- 距离格式化 ---------- */
function _formatDistance(meters) {
  if (meters == null || isNaN(meters)) return ''
  if (meters < 1000) return Math.round(meters) + ' m'
  return (meters / 1000).toFixed(1) + ' km'
}

/* ---------- Haversine 球面距离（米）---------- */
function _haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (x) => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function _setupPoiSearch() {
  if (!window.AMap) return
  if (state._poiSearchReady) return   // 避免重复绑定事件
  state._poiSearchReady = true

  // 同时准备两种搜索能力
  // 1) PlaceSearch.searchNearBy：拿到用户位置时用它，结果自带 distance，天然按距离排序
  // 2) AutoComplete.search：没有用户位置时回退到全国搜索
  let placeSearch = null
  let autoComplete = null
  try {
    placeSearch = new window.AMap.PlaceSearch({
      pageSize: 15,
      pageIndex: 1,
      extensions: 'base'
    })
  } catch (e) { /* ignore */ }
  try {
    autoComplete = new window.AMap.AutoComplete({
      city: '全国',
      pageSize: 10,
      extensions: 'base'
    })
  } catch (e) { /* ignore */ }

  // 统一的搜索 + 渲染
  function _doSearch(keyword) {
    clearTimeout(_poiSearchTimer)
    _currentPoi = null
    if (!keyword) { _renderPoiSuggestions([]); return }

    const mySeq = ++_poiSearchSeq
    const acceptOnlyIfLatest = (items) => {
      if (mySeq !== _poiSearchSeq) return   // 过期请求，丢弃
      _renderPoiSuggestions(items)
    }

    // 有定位：先用 PlaceSearch.searchNearBy（附近搜索，天然按距离排序，返回 distance）
    if (_userLocation && placeSearch) {
      const center = [_userLocation.lng, _userLocation.lat]
      placeSearch.searchNearBy(keyword, center, 50000, (status, result) => {
        if (mySeq !== _poiSearchSeq) return
        let pois = []
        if (status === 'complete' && result && result.poiList && Array.isArray(result.poiList.pois)) {
          pois = result.poiList.pois
            .filter((p) => p && p.location && p.location.lng && p.location.lat)
            .map((p) => ({
              name: p.name,
              district: p.pname ? `${p.pname}${p.cityname || ''}${p.adname || ''}` : (p.adname || ''),
              address: p.address || '',
              lng: p.location.lng,
              lat: p.location.lat,
              distance: typeof p.distance === 'number' ? p.distance : null
            }))
        }
        if (pois.length > 0) {
          // 按距离升序（高德本身也这么排，但双保险）
          pois.sort((a, b) => {
            const da = a.distance == null ? Infinity : a.distance
            const db = b.distance == null ? Infinity : b.distance
            return da - db
          })
          acceptOnlyIfLatest(pois)
        } else if (autoComplete) {
          // 附近搜不到 → 回退到全国联想
          autoComplete.search(keyword, (r1, r2) => _onAutoCompleteResult(r1, r2, mySeq, acceptOnlyIfLatest))
        } else {
          acceptOnlyIfLatest([])
        }
      })
      return
    }

    // 没有定位：走全国联想
    if (autoComplete) {
      autoComplete.search(keyword, (r1, r2) => _onAutoCompleteResult(r1, r2, mySeq, acceptOnlyIfLatest))
    }
  }

  function _onAutoCompleteResult(r1, r2, mySeq, acceptOnlyIfLatest) {
    if (mySeq !== _poiSearchSeq) return
    let tips = []
    if (r1 && Array.isArray(r1.tips)) tips = r1.tips
    else if (r2 && Array.isArray(r2.tips)) tips = r2.tips
    else if (r1 && typeof r1 === 'object' && r1.status === 'complete' && r1.tips) tips = r1.tips

    let pois = tips
      .filter((t) => t && t.location && t.location.lng && t.location.lat)
      .map((t) => ({
        name: t.name,
        district: t.district || '',
        address: t.address || '',
        lng: t.location.lng,
        lat: t.location.lat,
        distance: null
      }))

    // 若此时拿到了用户位置，则计算距离并排序
    if (_userLocation) {
      for (const p of pois) {
        p.distance = _haversineMeters(_userLocation.lat, _userLocation.lng, p.lat, p.lng)
      }
      pois.sort((a, b) => {
        const da = a.distance == null ? Infinity : a.distance
        const db = b.distance == null ? Infinity : b.distance
        return da - db
      })
    }
    acceptOnlyIfLatest(pois)
  }

  // 输入变化时搜索（300ms 防抖）
  dom.destinationInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim()
    clearTimeout(_poiSearchTimer)
    _poiSearchTimer = setTimeout(() => _doSearch(keyword), 300)
  })

  // 聚焦时也搜索一次
  dom.destinationInput.addEventListener('focus', () => {
    const keyword = dom.destinationInput.value.trim()
    if (keyword) _doSearch(keyword)
  })

  // 点击页面其他地方时关闭下拉
  document.addEventListener('click', (e) => {
    if (!dom.destinationBox.contains(e.target)) {
      _hidePoiSuggestions()
    }
  })
}

function _renderPoiSuggestions(pois) {
  if (!dom.poiSuggestions) return

  if (!pois || pois.length === 0) {
    dom.poiSuggestions.innerHTML = '<div class="poi-item" style="opacity:0.5;pointer-events:none;">没有匹配结果，请输入更具体的名称</div>'
    dom.poiSuggestions.classList.add('show')
    return
  }

  const html = pois.map((p, i) => {
    const address = p.district && p.address ? `${p.district} ${p.address}` : (p.address || p.district || '')
    const distanceStr = _formatDistance(p.distance)
    return `
      <div class="poi-item" data-index="${i}" data-name="${_escapeHtml(p.name)}" data-lng="${p.lng}" data-lat="${p.lat}" data-address="${_escapeHtml(address || '')}">
        <div class="poi-item-main">
          <div class="poi-item-name">${_escapeHtml(p.name)}</div>
          ${address ? `<div class="poi-item-address">${_escapeHtml(address)}</div>` : ''}
        </div>
        ${distanceStr ? `<div class="poi-item-distance">${distanceStr}</div>` : ''}
      </div>
    `
  }).join('')

  dom.poiSuggestions.innerHTML = html
  dom.poiSuggestions.classList.add('show')

  // 绑定点击事件
  dom.poiSuggestions.querySelectorAll('.poi-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.getAttribute('data-name') || ''
      const lng = parseFloat(item.getAttribute('data-lng'))
      const lat = parseFloat(item.getAttribute('data-lat'))
      const address = item.getAttribute('data-address') || ''
      // 填入输入框，并缓存选择结果
      dom.destinationInput.value = address ? `${name} · ${address}` : name
      _currentPoi = { name, lng, lat }
      _hidePoiSuggestions()
      // 直接选中目的地（不再需要点击确定按钮）
      _applyDestination(name, lng, lat)
    })
  })
}

function _hidePoiSuggestions() {
  if (dom.poiSuggestions) {
    dom.poiSuggestions.classList.remove('show')
  }
}

function _escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 等待 AMap 就绪（使用 _amapStatus 状态机）
function _waitForAMap(cb, failCb) {
  // 立刻检查
  if (_amapStatus === 'ready' && window.AMap && state.geocoder) { cb(); return }
  if (_amapStatus === 'failed') { if (failCb) failCb(); return }

  // 确保在加载
  if (_amapStatus === null || !_amapLoadingPromise) {
    _loadAMap()
  }

  // 轮询等待
  const startAt = Date.now()
  const check = () => {
    if (_amapStatus === 'ready' && window.AMap && state.geocoder) { cb(); return }
    if (_amapStatus === 'failed') { if (failCb) failCb(); return }
    if (Date.now() - startAt > 10000) { if (failCb) failCb(); return }
    setTimeout(check, 200)
  }
  check()
}

function _applyDestination(name, lng, lat) {
  state.destination = { name: name, lng: lng, lat: lat }
  dom.destination.textContent = name
  dom.initOverlay.classList.add('hidden')

  // 清除旧路线状态，允许重新规划
  state._routePlanned = false
  state._navInitialized = false
  state.navSteps = null
  state.navFullPath = null
  if (state.miniMap && typeof state.miniMap.clearRoute === 'function') {
    state.miniMap.clearRoute()
  }
  if (state.miniMap) {
    state.miniMap.setTarget(lng, lat)
  }

  startGPS()
  startCompass()

  // 尝试规划路线；GPS/AMap 未就绪时每 1 秒重试，最多 30 秒
  const planned = _tryPlanRoute()
  if (!planned) {
    let retryCount = 0
    const retryInterval = setInterval(() => {
      retryCount++
      if (state._navInitialized || retryCount > 30) {
        clearInterval(retryInterval)
        if (!state._navInitialized && retryCount > 30 && state.currentLng != null) {
          _initFallbackRoute(state.currentLng, state.currentLat,
                             state.destination.lng, state.destination.lat)
        }
        return
      }
      _tryPlanRoute()
    }, 1000)
  }

  speak(`目的地已设置：${name}，正在规划路线`)
}

// ============================================================
// 🗺️ 完整骑行路线规划与导航引擎（AMap.Riding + 逐路口引导）
// ============================================================

/**
 * ★★★ 新增：尝试规划路线的安全包装函数 ★★★
 * 检查所有必要条件：GPS定位、目的地、Riding服务
 * 确保路线规划在正确的时机触发
 */
function _tryPlanRoute() {
  if (state.currentLat == null || state.currentLng == null) {
    console.log('[AR NAV] _tryPlanRoute: 等待GPS定位...')
    return false
  }
  if (!state.destination) {
    console.log('[AR NAV] _tryPlanRoute: 等待设置目的地...')
    return false
  }
  if (!state.riding && !state.driving && !state.walking) {
    console.warn('[AR NAV] _tryPlanRoute: 没有任何路线规划服务就绪（riding/driving/walking 都为 null）')
    _loadAMap()
    return false
  }
  if (state._navInitialized) return false  // 已经有路线了，不再规划
  if (state._routePlanned) return false    // 正在规划中，避免重复触发

  state._routePlanned = true  // 标记"正在规划"，防止重复触发
  console.log('[AR NAV] 🚴 发起路线规划：从', state.currentLat, state.currentLng,
              '→', state.destination.lat, state.destination.lng)
  _planRoute(state.currentLng, state.currentLat,
             state.destination.lng, state.destination.lat)
  return true
}

function _planRoute(fromLng, fromLat, toLng, toLat) {
  // 按优先级确定服务尝试顺序
  const primary = (CONFIG.NAV_MODE || 'riding').toLowerCase()
  // 候选列表：[{name, service}]，主服务在前
  const candidates = []
  if (primary === 'driving') {
    if (state.driving) candidates.push({ name: 'driving', service: state.driving })
    if (state.riding)  candidates.push({ name: 'riding',  service: state.riding })
    if (state.walking) candidates.push({ name: 'walking', service: state.walking })
  } else if (primary === 'walking') {
    if (state.walking) candidates.push({ name: 'walking', service: state.walking })
    if (state.riding)  candidates.push({ name: 'riding',  service: state.riding })
    if (state.driving) candidates.push({ name: 'driving', service: state.driving })
  } else {
    if (state.riding)  candidates.push({ name: 'riding',  service: state.riding })
    if (state.driving) candidates.push({ name: 'driving', service: state.driving })
    if (state.walking) candidates.push({ name: 'walking', service: state.walking })
  }

  if (candidates.length === 0) {
    console.warn('[AR NAV] ❌ 路线规划服务全部不可用，降级为直线导航')
    _initFallbackRoute(fromLng, fromLat, toLng, toLat)
    return
  }

  console.log(`[AR NAV] 📝 路线规划候选服务: ${candidates.map(c => c.name).join(' → ')}，起点(${fromLng.toFixed(5)},${fromLat.toFixed(5)}) → 终点(${toLng.toFixed(5)},${toLat.toFixed(5)})`)

  let attemptIdx = 0
  let currentTimeout = null
  let finished = false   // 防止重复处理

  function tryNext() {
    if (finished) return
    if (attemptIdx >= candidates.length) {
      finished = true
      console.warn('[AR NAV] ⚠️ 所有路线规划服务均失败，降级为直线导航')
      _initFallbackRoute(fromLng, fromLat, toLng, toLat)
      return
    }

    const cand = candidates[attemptIdx]
    attemptIdx += 1
    console.log(`[AR NAV] 🎯 第 ${attemptIdx} 次尝试，使用 [${cand.name}] 服务...`)

    // 清除上一个超时
    if (currentTimeout) { clearTimeout(currentTimeout); currentTimeout = null }

    // 15 秒超时兜底：当前服务无回调则尝试下一个
    currentTimeout = setTimeout(() => {
      console.warn(`[AR NAV] ⏱️ [${cand.name}] 15秒无回调，尝试下一个服务...`)
      tryNext()
    }, 15000)

    try {
      cand.service.search(
        new window.AMap.LngLat(fromLng, fromLat),
        new window.AMap.LngLat(toLng, toLat),
        function (status, result) {
          if (finished) return   // 已经被超时/其他回调接管
          console.log(`[AR NAV] 🔎 [${cand.name}] 回调：status=${status}, result类型=${result && typeof result}`)

          if (status !== 'complete' || !result) {
            console.warn(`[AR NAV] ❌ [${cand.name}] 返回异常 (status=${status})，尝试下一个服务...`)
            tryNext()
            return
          }

          // ============ 结构诊断：打印 route 的所有键和数组字段长度 ============
          let route = null
          let routeSource = ''
          if (Array.isArray(result.routes) && result.routes.length > 0) {
            route = result.routes[0]; routeSource = 'result.routes[0]'
          } else if (Array.isArray(result.plans) && result.plans.length > 0) {
            route = result.plans[0]; routeSource = 'result.plans[0]'
          } else if (result.data && Array.isArray(result.data.routes) && result.data.routes.length > 0) {
            route = result.data.routes[0]; routeSource = 'result.data.routes[0]'
          } else if (result.route) {
            route = result.route; routeSource = 'result.route'
          } else {
            route = result; routeSource = 'result（作为 route）'
          }

          console.log(`[AR NAV] 📊 ${routeSource} 顶层字段: keys=${Object.keys(route).join(',')}`)
          const arrLens = []
          for (const k of Object.keys(route)) {
            if (Array.isArray(route[k])) arrLens.push(`${k}:${route[k].length}`)
            else if (route[k] !== null && typeof route[k] === 'object' && Array.isArray(route[k].steps)) arrLens.push(`${k}.steps:${route[k].steps.length}`)
          }
          console.log(`[AR NAV] 📊 ${routeSource} 各数组字段长度: ${arrLens.join(' ')}`)

          // step[0] 字段检查
          if (Array.isArray(route.steps) && route.steps.length > 0) {
            const step0 = route.steps[0]
            console.log(`[AR NAV] 📊 step[0] 字段: ${Object.keys(step0).join(',')}`)
            if (step0.path) {
              const sp = _normalizePath(step0.path)
              const sample = step0.path.slice(0, 3).map((e, i) => `#${i}=${typeof e === 'object' ? (Array.isArray(e) ? JSON.stringify(e) : JSON.stringify(e)) : String(e)}`)
              console.log(`[AR NAV] 📊 step[0].path 类型: Array; 长度:${step0.path.length}; 前3元素: ${sample.join(', ')}`)
              console.log(`[AR NAV] 📊 _normalizePath(step[0].path) 后有效点数: ${sp.length}`)
            } else {
              console.log(`[AR NAV] 📊 step[0].path 不存在或为空`)
            }
            // step[0].polyline 检查（骑行服务常用 polyline 替代 path）
            if (step0.polyline) {
              const sp = _normalizePath(step0.polyline)
              console.log(`[AR NAV] 📊 step[0].polyline 类型: ${Array.isArray(step0.polyline) ? 'Array' : typeof step0.polyline}; 长度:${Array.isArray(step0.polyline) ? step0.polyline.length : 'N/A'}; _normalizePath 后有效点数: ${sp.length}`)
            }
          }

          // route.path / route.polyline / route.route 检查
          for (const key of ['path', 'polyline', 'route', 'polyline_encoded']) {
            if (route[key] && Array.isArray(route[key])) {
              const np = _normalizePath(route[key])
              const sample = route[key].slice(0, 2).map(e => typeof e === 'object' ? (Array.isArray(e) ? JSON.stringify(e) : (typeof e.getLng === 'function' ? `LngLat(${e.getLng()},${e.getLat()})` : JSON.stringify(e))) : String(e))
              console.log(`[AR NAV] 📊 route.${key} 类型: Array; 长度:${route[key].length}; _normalizePath 后: ${np.length} 点; 前2元素: ${sample.join(', ')}`)
            }
          }

          // ============ 多来源路径提取（按优先级） ============
          let fullPath = []
          let extractedFrom = ''

          // 来源 1: route.polyline / route.path / route.route（完整路径）
          const fullPathKeys = ['polyline', 'path', 'route', 'polyline_encoded']
          for (let i = 0; i < fullPathKeys.length; i++) {
            const key = fullPathKeys[i]
            if (route[key] && Array.isArray(route[key]) && route[key].length > 0) {
              const np = _normalizePath(route[key])
              if (np.length >= 2) {
                fullPath = np
                extractedFrom = `route.${key}`
                console.log(`[AR NAV] ✅ 从 ${extractedFrom} 提取到 ${fullPath.length} 个路径点`)
                break
              }
            }
          }

          // 来源 2: steps[*].path 拼接
          if (fullPath.length < 2 && Array.isArray(route.steps) && route.steps.length > 0) {
            const merged = []
            for (let s = 0; s < route.steps.length; s++) {
              const step = route.steps[s]
              const stepPath = _normalizePath(step.path)
              if (stepPath.length > 0) {
                for (let i = 0; i < stepPath.length; i++) merged.push(stepPath[i])
              }
            }
            if (merged.length >= 2) {
              fullPath = merged
              extractedFrom = 'steps[*].path'
              console.log(`[AR NAV] ✅ 从 steps[*].path 拼接提取到 ${fullPath.length} 个路径点`)
            }
          }

          // 来源 3: steps[*].polyline 拼接（Riding 服务真实路径点常在这里）
          if (fullPath.length < 2 && Array.isArray(route.steps) && route.steps.length > 0) {
            const merged = []
            for (let s = 0; s < route.steps.length; s++) {
              const step = route.steps[s]
              const stepPoly = _normalizePath(step.polyline)
              if (stepPoly.length > 0) {
                for (let i = 0; i < stepPoly.length; i++) merged.push(stepPoly[i])
              }
            }
            if (merged.length >= 2) {
              fullPath = merged
              extractedFrom = 'steps[*].polyline'
              console.log(`[AR NAV] ✅ 从 steps[*].polyline 拼接提取到 ${fullPath.length} 个路径点`)
            }
          }

          // 若所有来源都取不到点 → 尝试下一个服务
          if (fullPath.length < 2) {
            console.warn(`[AR NAV] ⚠️ [${cand.name}] 未能从任何来源提取到有效路径点，尝试下一个服务...`)
            tryNext()
            return
          }

          // 成功 → 标记完成并解析步骤（转弯提示）
          finished = true
          if (currentTimeout) { clearTimeout(currentTimeout); currentTimeout = null }
          console.log(`[AR NAV] ✅ 最终从 [${cand.name}] 的 ${extractedFrom} 提取到 ${fullPath.length} 个路径点`)

          // ============ 解析 steps（转弯提示） ============
          const steps = []
          let cumDistance = 0
          const rawSteps = route.steps || (route.TMC && route.TMC.steps) || []
          if (rawSteps.length > 0) {
            for (let s = 0; s < rawSteps.length; s++) {
              const rs = rawSteps[s]
              // 优先用 path，其次 polyline
              let stepPath = _normalizePath(rs.path)
              if (stepPath.length === 0) stepPath = _normalizePath(rs.polyline)

              const distance = Number(rs.distance) || 0
              const road = rs.road || rs.assistantName || rs.road_name || rs.roadName || ''
              const instruction = rs.instruction || rs.tips || ''
              const orientation = rs.orientation || rs.orient || rs.direction || ''
              const action = _orientationToAction(instruction || orientation)
              const turnPoint = stepPath.length > 0 ? stepPath[0] : fullPath[0]
              steps.push({
                index: steps.length,
                path: stepPath, distance: distance, instruction: instruction,
                road: road, action: action, turnPoint: turnPoint, cumDistance: cumDistance
              })
              cumDistance += distance
            }
          }

          // ===== 基于坐标方向路径重新计算路口转向方向（避免依赖高德 orientation）=====
          const directionalPath = _buildDirectionalPath(fullPath)
          if (directionalPath.length >= 2) {
            // 按累计距离把每个路口 turnPoint 定位到路径上
            // 策略：取 steps 中每个非 straight/非 arrive 步骤，从该 step 累计距离在路径上
            // 找到对应的段，用"该段 bearing"与"下一段 bearing"的夹角算转向
            for (let i = 0; i < steps.length - 1; i++) {
              const step = steps[i]
              // 1) 定位 step.cumDistance 对应的路径段
              const targetCum = step.cumDistance || 0
              let segIdx = 0
              for (let j = 0; j < directionalPath.length; j++) {
                if (directionalPath[j].cumDistance <= targetCum) segIdx = j
              }
              const thisSeg = directionalPath[segIdx]
              const nextSeg = directionalPath[Math.min(segIdx + 1, directionalPath.length - 1)]
              // 2) 两段 bearing 的差决定左/右/直
              const turnAction = _computeTurnDirection(thisSeg.bearing, nextSeg.bearing)
              // 3) 覆盖原 action，若原本是 straight 但这里算到转向也改为真实转向
              step.action = turnAction
              // 4) turnPoint 改为两段的交汇点（下一段起点）
              step.turnPoint = [nextSeg.startLng, nextSeg.startLat]
            }
            console.log(`[AR NAV] ✅ 方向路径重建完成：${directionalPath.length} 段，${steps.length - 1} 个路口`)
          } else {
            console.warn('[AR NAV] ⚠️ 方向路径不足 2 段，保留原始 step 方向')
          }

          const totalDist = cumDistance > 0 ? cumDistance
            : (Number(route.distance) || haversine(fromLat, fromLng, toLat, toLng))
          // 到达目的地 step
          steps.push({
            index: steps.length,
            path: [[toLng, toLat]],
            distance: 0,
            instruction: '到达目的地',
            road: '',
            action: 'arrive',
            turnPoint: [toLng, toLat],
            cumDistance: totalDist
          })

          state.navSteps = steps
          state.navFullPath = fullPath
          state.navTotalDistance = totalDist
          state._routePlanned = true
          state._navInitialized = true

          if (state.miniMap && typeof state.miniMap.setRoutePath === 'function') {
            state.miniMap.setRoutePath(fullPath, steps)
          }

          state.totalDistance = totalDist
          dom.totalDistance.textContent = fmtDistance(totalDist)
          dom.remainTime.textContent = fmtEta(totalDist)

          _showRouteSummary(steps, totalDist)
          _updateNavProgress(fromLat, fromLng)

          console.log(`[AR NAV] ✅ 路线规划完成：${steps.length - 1} 个转弯，总距离 ${fmtDistance(totalDist)}，路径点数 ${fullPath.length}（来源：${cand.name}/${extractedFrom}）`)
          speak(`路线规划完成，总距离 ${fmtDistance(totalDist)}，请出发`)
        }
      )
    } catch (e) {
      console.error(`[AR NAV] [${cand.name}] 调用抛出异常:`, e && e.message || e)
      tryNext()
    }
  }

  tryNext()
}

// 辅助：把高德返回的任意格式路径点标准化为 [[lng, lat], ...]
// 支持格式：
//   1. "lng,lat" 字符串
//   2. AMap.LngLat 对象（getLng/getLat 方法）
//   3. {lng:number, lat:number} 对象
//   4. 压缩字段名（Q/R/P/O 等高德内部字段）
//   5. [lng, lat] 数组
function _normalizePath(points) {
  const out = []
  if (!Array.isArray(points) || points.length === 0) return out
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p == null) continue

    // 1) 字符串 "lng,lat"
    if (typeof p === 'string') {
      const parts = p.split(',')
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0])
        const lat = parseFloat(parts[1])
        if (Number.isFinite(lng) && Number.isFinite(lat)) { out.push([lng, lat]); continue }
      }
    }

    // 2) AMap.LngLat 对象（getLng/getLat）
    if (typeof p.getLng === 'function') {
      try {
        const lng = p.getLng()
        const lat = p.getLat()
        if (Number.isFinite(lng) && Number.isFinite(lat)) { out.push([lng, lat]); continue }
      } catch (e) {}
    }

    // 3) {lng, lat} 对象
    if (typeof p.lng === 'number' && typeof p.lat === 'number') {
      out.push([p.lng, p.lat]); continue
    }

    // 4) 高德压缩字段名（Q/R/P/O 等，不同版本字段名可能不同）
    let compressedLng = null
    let compressedLat = null
    const compressedKeys = ['Q', 'R', 'P', 'O', 'q', 'r', 'p', 'o', 'lng_', 'lat_', 'Lng', 'Lat']
    for (let k = 0; k < compressedKeys.length; k++) {
      const key = compressedKeys[k]
      if (typeof p[key] === 'number') {
        if (compressedLng === null) { compressedLng = p[key] }
        else if (compressedLat === null) { compressedLat = p[key]; break }
      }
    }
    if (compressedLng !== null && compressedLat !== null) {
      out.push([compressedLng, compressedLat]); continue
    }

    // 5) [lng, lat] 数组
    if (Array.isArray(p) && p.length >= 2
        && typeof p[0] === 'number' && typeof p[1] === 'number') {
      out.push([p[0], p[1]])
      continue
    }

    // 6) 兜底：尝试提取任意字段里包含数字
    const vals = Object.values(p)
    const nums = vals.filter(v => typeof v === 'number' && Number.isFinite(v))
    if (nums.length >= 2) { out.push([nums[0], nums[1]]) }
  }
  return out
}

function _initFallbackRoute(fromLng, fromLat, toLng, toLat) {
  const dist = haversine(fromLat, fromLng, toLat, toLng)
  state.navSteps = [
    { index: 0, path: [[fromLng, fromLat], [toLng, toLat]], distance: dist,
      instruction: '直行至目的地', action: 'straight',
      turnPoint: [fromLng, fromLat], cumDistance: 0 },
    { index: 1, path: [[toLng, toLat]], distance: 0, action: 'arrive',
      turnPoint: [toLng, toLat], cumDistance: dist }
  ]
  state.navFullPath = [[fromLng, fromLat], [toLng, toLat]]
  state.navTotalDistance = dist
  state._routePlanned = true
  state._navInitialized = true
  if (state.miniMap && state.miniMap.setRoutePath) {
    state.miniMap.setRoutePath([[fromLng, fromLat], [toLng, toLat]], state.navSteps)
  }
  state.totalDistance = dist
  dom.totalDistance.textContent = fmtDistance(dist)
  dom.remainTime.textContent = fmtEta(dist)
  _updateNavProgress(fromLat, fromLng)
}




function _updateNavProgress(lat, lng) {
  const curLat = (lat != null && lng != null) ? lat : state.currentLat
  const curLng = (lat != null && lng != null) ? lng : state.currentLng
  if (curLat == null || !state.destination) return

  let targetLat = state.destination.lat
  let targetLng = state.destination.lng
  let displayAction = 'straight'
  let displayText = `前方 ${fmtDistance(haversine(curLat, curLng, targetLat, targetLng))} · ${state.destination.name || '目的地'}`
  let distanceToTurn = haversine(curLat, curLng, targetLat, targetLng)
  let progress = 0
  let total = Math.max(distanceToTurn, 1)

  // 有规划路线 → 使用路线中的下一个转弯点作为箭头目标
  if (state._navInitialized && state.navSteps && state.navFullPath) {
    const proj = _projectPointToPath(curLat, curLng, state.navFullPath)
    if (proj) {
      state.navProgressMeters = proj.cumDistanceMeters

      const steps = state.navSteps
      let nextIdx = 0
      for (let i = 0; i < steps.length; i++) {
        if (proj.cumDistanceMeters >= steps[i].cumDistance) nextIdx = i
      }
      nextIdx = Math.min(nextIdx + 1, steps.length - 1)
      state.navNextStepIdx = nextIdx

      const nextStep = steps[nextIdx]
      targetLat = nextStep.turnPoint[1]
      targetLng = nextStep.turnPoint[0]
      displayAction = nextStep.action || 'straight'
      distanceToTurn = Math.max(0, nextStep.cumDistance - proj.cumDistanceMeters)

      if (displayAction === 'arrive') {
        displayText = `即将到达 · ${state.destination.name}`
      } else {
        const road = nextStep.road ? `，进入${nextStep.road}` : ''
        displayText = `前方 ${fmtDistance(distanceToTurn)} ${_actionToText(displayAction)}${road}`
      }

      progress = proj.cumDistanceMeters
      total = Math.max(state.navTotalDistance || 1, 1)
    }
  }

  if (dom.arrowHint) dom.arrowHint.textContent = displayText
  if (dom.arrowDistance) dom.arrowDistance.textContent = fmtDistance(distanceToTurn)
  if (dom.nextTurn) dom.nextTurn.textContent = _actionToText(displayAction)
  _updateTurnIndicator(displayAction, distanceToTurn)
  _updateRouteProgress(progress, total)

  // 蓝色大箭头：始终从"用户当前朝向"为基准，指向目的地
  // bearing(curLat, curLng, destLat, destLng) 给出目标方位角（0°=北）
  // 减去手机 heading（当前朝向）→ 相对手机的角度（0°=前方，-90°=左方，+90°=右方）
  const brg = bearing(curLat, curLng,
                      (state.destination ? state.destination.lat : targetLat),
                      (state.destination ? state.destination.lng : targetLng))
  const arrowAngle = ((brg - (state.heading || 0) + 540) % 360) - 180
  state.navArrowAngle = arrowAngle
  state._arrowTargetAngle = arrowAngle

  if (state._navInitialized && state.navSteps && state.navNextStepIdx != null) {
    const ns = state.navSteps[state.navNextStepIdx]
    if (ns) {
      _maybeAnnounceTurn(
        distanceToTurn,
        displayAction,
        ns.index,
        ns.road,
        state.destination.name
      )
    }
  }
}

/* ============================================================
   ★★★ 路口提示：按距离分级播报 ★★★
   - 500米：预告前方路口
   - 300米：再次提醒
   - 100米：强提示 + 视觉动画
   - 50米：最后提醒（开始转向）
   - 到达：提示即将到达目的地
   ============================================================ */
let _announceState = {
  lastStepIndex: -1,
  lastAnnouncedMark: -1
}

function _maybeAnnounceTurn(distanceToTurnMeters, action, stepIndex, roadName, destName) {
  if (!state.destination) return

  const d = Math.round(distanceToTurnMeters)

  if (action === 'arrive') {
    if (d < 50 && _announceState.lastStepIndex !== stepIndex) {
      _announceState.lastStepIndex = stepIndex
      _announceState.lastAnnouncedMark = 50
      speak(`前方即将到达 ${destName || '目的地'}，请准备停车`, false)
      _pulseTurnIndicator()
    }
    return
  }

  if (stepIndex !== _announceState.lastStepIndex) {
    const actionText = _actionToText(action)
    let hint = `前方路口${actionText}`
    if (roadName) hint += `，进入${roadName}`
    if (d > 0) hint += `，还有 ${fmtDistance(d)}`
    speak(hint, false)
    _announceState.lastStepIndex = stepIndex
    _announceState.lastAnnouncedMark = 9999
    _pulseTurnIndicator()
    return
  }

  const marks = [500, 300, 100, 50]
  for (const m of marks) {
    if (d <= m && _announceState.lastAnnouncedMark > m) {
      _announceState.lastAnnouncedMark = m
      const actionText = _actionToText(action)
      if (m === 50) {
        speak(`现在${actionText}`, true)
        _pulseTurnIndicator()
      } else if (m === 100) {
        speak(`${fmtDistance(d)}后${actionText}`, false)
        _pulseTurnIndicator()
      } else {
        speak(`前方${fmtDistance(d)}${actionText}`, false)
      }
      break
    }
  }
}

function _pulseTurnIndicator() {
  if (!dom.turnIndicator) return
  dom.turnIndicator.classList.add('pulse')
  setTimeout(() => {
    if (dom.turnIndicator) dom.turnIndicator.classList.remove('pulse')
  }, 500)
  if (dom.turnIcon) {
    dom.turnIcon.style.textShadow = '0 0 20px currentColor, 0 0 40px currentColor'
    setTimeout(() => {
      if (dom.turnIcon) dom.turnIcon.style.textShadow = 'none'
    }, 800)
  }
}

/* ============================================================
   入口
   ============================================================ */
function init() {
  console.log('[AR NAV] 🚀 开始初始化...')
  console.log('[AR NAV] 检查 DOM 元素...')
  console.log('  startBtn:', dom.startBtn ? '✅ 存在' : '❌ 不存在')
  console.log('  destinationBox:', dom.destinationBox ? '✅ 存在' : '❌ 不存在')

  // 1) 初始化迷你地图（此时还没有AMap，它会自己等待）
  state.miniMap = new MiniMap('mini-map')

  // 2) 启动大箭头平滑旋转循环（rAF + lerp，替代 CSS transition）
  _startArrowSmoothLoop()

  // 3) 🔊 提前初始化语音（选择最佳中文音色）
  _initVoice()

  // 4) 启动按钮绑定
  dom.startBtn.addEventListener('click', startNav)
  console.log('[AR NAV] ✅ 开始导航按钮事件监听已绑定')

  // 5) 调试模式：URL 参数 ?debug=1 或键盘 D 键切换
  _initDebugMode()

  // 6) 演示：如果是演示模式
  if (CONFIG.USE_MOCK_DATA) {
    _startDemo()
  }

  // ★★★ 关键改进：页面加载时立即并行执行两件事 ★★★
  //   A. 加载高德地图 SDK（等SDK加载好后，迷你地图会自动初始化）
  //   B. 获取 GPS 定位（拿到坐标后立即在地图上显示当前位置）
  _bootstrapNavigationSystem()

  // ★★★ 小提示：如果 5 秒后还没拿到GPS，告诉用户可能需要授权 ★★★
  setTimeout(() => {
    if (state.currentLat == null) {
      console.log('[AR NAV] ⏱️ 5秒未获取定位，检查是否需要授权')
    }
  }, 5000)

  // ★★★ 天气监测（Open-Meteo，10 分钟刷新一次）★★★
  startWeatherMonitor()
}

/* ============================================================
   ★★★ 新增：导航系统启动入口 ★★★
   页面加载时立即调用，并行完成：
     1) 加载高德 SDK
     2) 获取 GPS 定位
     3) 在迷你地图上显示当前位置和道路
   ============================================================ */
function _bootstrapNavigationSystem() {
  console.log('[AR NAV] 📍 并行启动：地图SDK加载 + GPS定位')

  // --- 并行 A：加载高德 SDK ---
  const mapPromise = _loadAMap()
    .then(() => {
      console.log('[AR NAV] ✅ 高德地图SDK加载完成')
      return true
    })
    .catch((err) => {
      console.warn('[AR NAV] ❌ 高德地图SDK加载失败：', err)
      return false
    })

  // --- 并行 B：获取 GPS 定位 ---
  const gpsPromise = new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      console.warn('[AR NAV] ❌ 浏览器不支持定位')
      resolve(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 拿到GPS定位
        state.currentLat = pos.coords.latitude
        state.currentLng = pos.coords.longitude
        state.startLat = state.currentLat
        state.startLng = state.currentLng
        state.startTime = Date.now()

        dom.gpsStatus.classList.add('active')
        console.log(`[AR NAV] ✅ GPS定位成功：(${state.currentLng.toFixed(6)}, ${state.currentLat.toFixed(6)})`)

        // 同步到迷你地图
        if (state.miniMap) {
          state.miniMap.setPosition(state.currentLng, state.currentLat)
        }

        // 立即反地理编码获取道路名称
        _reverseGeocode(state.currentLng, state.currentLat)

        resolve(true)
      },
      (err) => {
        console.warn('[AR NAV] ⚠️ GPS定位失败：', err.message)
        // 失败时用默认位置（北京），让用户仍能体验功能
        state.currentLat = CONFIG.DEFAULT_LOCATION.lat
        state.currentLng = CONFIG.DEFAULT_LOCATION.lng
        state.startLat = state.currentLat
        state.startLng = state.currentLng
        state.startTime = Date.now()

        console.log(`[AR NAV] 📌 使用默认位置：${CONFIG.DEFAULT_LOCATION.name}（${CONFIG.DEFAULT_LOCATION.lng}, ${CONFIG.DEFAULT_LOCATION.lat}）`)

        if (state.miniMap) {
          state.miniMap.setPosition(state.currentLng, state.currentLat)
        }
        // 也获取一下默认位置的道路名
        _reverseGeocode(state.currentLng, state.currentLat)

        resolve(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })

  // 等待两个都完成（或者其中一个失败后继续）
  Promise.all([mapPromise, gpsPromise]).then(([mapOK, gpsOK]) => {
    console.log(`[AR NAV] 🎯 初始化阶段完成：地图=${mapOK ? '✅' : '❌'}，GPS=${gpsOK ? '✅' : '⚠️'}`)

    // 现在启动持续GPS跟踪（用于实时更新位置）
    if (gpsOK) {
      _startGpsWatch()
    }

    // 如果两个都OK，显示"准备就绪"状态
    if (mapOK && (gpsOK || CONFIG.USE_MOCK_DATA)) {
      // 更新UI，让用户知道可以开始导航了
      _updateReadyState()
    }
  })
}

/* ============================================================
   ★★★ 新增：持续 GPS 位置跟踪 ★★★
   用 watchPosition 监听位置变化，实时更新当前位置和道路信息
   ============================================================ */
function _startGpsWatch() {
  if (state.watchId != null) return  // 已经启动过了
  if (!('geolocation' in navigator)) return

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const newLat = pos.coords.latitude
      const newLng = pos.coords.longitude

      // 计算移动距离（只有移动超过5米才更新，避免GPS抖动）
      const moved = state.currentLat != null
        ? _haversineMeters(state.currentLat, state.currentLng, newLat, newLng)
        : Infinity

      state.currentLat = newLat
      state.currentLng = newLng
      dom.gpsStatus.classList.add('active')

      if (state.startLat == null) {
        state.startLat = newLat
        state.startLng = newLng
        state.startTime = Date.now()
      }

      // 同步到迷你地图
      if (state.miniMap && moved > 3) {
        state.miniMap.setPosition(newLng, newLat)
      }

      // 有目的地 → 更新导航进度（直线模式）
      if (state.destination) {
        _updateNavProgress(newLat, newLng)
      }

      if (moved > 10) {
        _reverseGeocode(newLng, newLat)
      }

      // 已行驶距离
      state.traveledDistance = _haversineMeters(
        state.startLat, state.startLng,
        state.currentLat, state.currentLng
      )
      dom.traveled.textContent = fmtDistance(state.traveledDistance)
    },
    (err) => {
      console.warn('[AR NAV] GPS更新失败：', err)
      dom.gpsStatus.classList.remove('active')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000
    }
  )
}

/* ============================================================
   ★★★ 新增：更新"准备就绪"状态 ★★★
   ============================================================ */
function _updateReadyState() {
  // 显示道路信息
  if (state.roadName) {
    const info = `📍 当前位置：${state.roadName}`
    if (state.miniMap && state.miniMap.setInfo) {
      state.miniMap.setInfo(info)
    }
  }
}



/* ============================================================
   调试模式：URL 参数 + 键盘 D + checkbox 联动
   ============================================================ */
function _initDebugMode() {
  const checkbox = document.getElementById('debug-checkbox')

  // 1) URL 参数
  const params = new URLSearchParams(window.location.search)
  if (params.get('debug') === '1') {
    _setDebugMode(true)
  }

  // 2) 键盘 D 键切换调试模式 + 方向键连续控制（支持同时前进+转弯）
  //    使用按键状态集合 + requestAnimationFrame 循环，取代"按一次瞬移一段"
  const debugKeys = new Set()                // 当前按下的方向键
  let debugRafId = null                      // rAF 循环句柄
  let debugLastTs = 0                        // 上一帧时间戳，用于按 dt 平滑推进
  let uiUpdateAcc = 0                        // UI 节流计时器（避免 DOM 写过于频繁）

  // -------- 键盘监听 --------
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    // D 键切换调试模式
    if (e.key === 'd' || e.key === 'D') {
      _setDebugMode(!state.debugMode)
      if (state.debugMode) _startDebugLoopIfNeeded()
      return
    }

    // 调试模式下，方向键进入状态集合（去重后由 rAF 循环推进）
    if (!state.debugMode) return
    const tracked = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                     'w', 'W', 'a', 'A', 's', 'S', 'q', 'Q',
                     'Shift', 'Alt']
    if (tracked.includes(e.key)) {
      debugKeys.add(e.key)
      e.preventDefault()
    }
  })

  document.addEventListener('keyup', (e) => {
    debugKeys.delete(e.key)
  })

  // -------- 调试循环：每帧按 dt 小步推进 --------
  function _debugTick(ts) {
    if (!state.debugMode) {
      // 调试模式已关闭，停止循环
      debugRafId = null
      return
    }

    if (!debugLastTs) debugLastTs = ts
    const dt = Math.min((ts - debugLastTs) / 1000, 0.1)  // 钳制最大 0.1s，防跳帧
    debugLastTs = ts

    // -------- 参数：速度 & 角速度（支持 Shift 加速）--------
    const isShift = debugKeys.has('Shift')
    // 正常 50 m/s（180 km/h）；Shift 加速 200 m/s（长距离调试移动用）
    const moveSpeed = (isShift ? 200 : 50)    // 米/秒
    // 正常 180°/s；Shift 540°/s
    const turnSpeed = (isShift ? 540 : 180)   // 度/秒

    // -------- 转向（左右）--------
    let turnDelta = 0
    if (debugKeys.has('ArrowLeft') || debugKeys.has('a') || debugKeys.has('A')) {
      turnDelta -= turnSpeed * dt
    }
    if (debugKeys.has('ArrowRight') || debugKeys.has('q') || debugKeys.has('Q')) {
      turnDelta += turnSpeed * dt
    }

    // ★★★ 修复1：先处理转向，再处理移动 ★★★
    // 这样转向是独立的，不会被移动逻辑覆盖
    if (turnDelta !== 0) {
      state.heading = (state.heading + turnDelta + 360) % 360
    }

    // -------- 前进 / 后退（沿当前朝向）--------
    let moveDir = 0  // +1 前进 / -1 后退 / 0 不动
    if (debugKeys.has('ArrowUp') || debugKeys.has('w') || debugKeys.has('W')) moveDir += 1
    if (debugKeys.has('ArrowDown') || debugKeys.has('s') || debugKeys.has('S')) moveDir -= 1

    // 无操作则跳过，什么也不变
    if (turnDelta === 0 && moveDir === 0) {
      debugRafId = requestAnimationFrame(_debugTick)
      return
    }

    if (state.currentLat == null) {
      if (state.miniMap && state.miniMap.currentLngLat) {
        state.currentLat = state.miniMap.currentLngLat[1]
        state.currentLng = state.miniMap.currentLngLat[0]
      } else if (state.miniMap && state.miniMap.map && typeof state.miniMap.map.getCenter === 'function') {
        const center = state.miniMap.map.getCenter()
        if (center) {
          const lng = typeof center.getLng === 'function' ? center.getLng() : center.lng
          const lat = typeof center.getLat === 'function' ? center.getLat() : center.lat
          if (typeof lng === 'number' && typeof lat === 'number') {
            state.currentLng = lng; state.currentLat = lat
          }
        }
      } else {
        state.currentLat = 39.907; state.currentLng = 116.397
      }
    }
    if (state.heading == null) state.heading = 0

    // ★★★ 简化：统一自由移动，不再区分路线模式 ★★★
    // 始终按当前 heading 方向自由移动，不再沿路线锁定
    const dist = moveSpeed * dt * moveDir
    if (moveDir !== 0) {
      const p = moveAlongBearing(state.currentLat, state.currentLng, state.heading, dist)
      state.currentLat = p.lat
      state.currentLng = p.lng
    }

    // -------- 同步 MiniMap --------
    if (state.miniMap) {
      state.miniMap.setPosition(state.currentLng, state.currentLat)
      state.miniMap.setHeading(state.heading)
    }

    // -------- UI 更新（每 80ms 刷新一次，避免 DOM 写抖动）--------
    uiUpdateAcc += dt
    if (uiUpdateAcc >= 0.08) {
      uiUpdateAcc = 0

      dom.gpsStatus.classList.add('active')
      _updateCompassUI(state.heading)

      if (state.startLat == null) {
        state.startLat = state.currentLat
        state.startLng = state.currentLng
        state.startTime = Date.now()
      }

      if (state.destination) {
        _updateNavProgress(state.currentLat, state.currentLng)
      }

      state.traveledDistance = haversine(state.startLat, state.startLng, state.currentLat, state.currentLng)
      dom.traveled.textContent = fmtDistance(state.traveledDistance)

      const distDest = state.destination
        ? haversine(state.currentLat, state.currentLng, state.destination.lat, state.destination.lng)
        : null
      const speedKmh = Math.round(moveSpeed * 3.6 * Math.abs(moveDir))
      const moveTag = moveDir > 0 ? '🚴 前进' : moveDir < 0 ? '🚴↩ 后退' : ''
      const turnTag = turnDelta < 0 ? ' ⬅ 左转' : turnDelta > 0 ? ' ➡ 右转' : ''
      const hint = `[DEBUG] ${moveTag}${turnTag} ${speedKmh} km/h · (${state.currentLng.toFixed(5)}, ${state.currentLat.toFixed(5)}) · 朝向 ${Math.round(state.heading)}°`
      dom.arrowHint.textContent = hint
      if (distDest != null) dom.arrowDistance.textContent = fmtDistance(distDest)
    }

    debugRafId = requestAnimationFrame(_debugTick)
  }

  // -------- 启动 / 停止循环（显式调用，避免覆盖函数声明问题）--------
  function _startDebugLoopIfNeeded() {
    if (debugRafId) return
    debugLastTs = 0
    uiUpdateAcc = 0
    debugRafId = requestAnimationFrame(_debugTick)
  }

  // URL 参数路径：如果 URL 里 debug=1，立即启动循环
  if (params.get('debug') === '1') {
    _startDebugLoopIfNeeded()
  }

  // 3) checkbox 切换
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      _setDebugMode(checkbox.checked)
      if (checkbox.checked) _startDebugLoopIfNeeded()
    })
  }

  // D 键路径：在 keydown 处理中启动（在上面的 keydown 里已写好）

  // 4) 接收来自 MiniMap 的位置事件（调试模式下鼠标点击/拖动触发）
  window.addEventListener('minimap:position', (e) => {
    if (!state.debugMode) return
    const { lng, lat } = e.detail
    state.currentLng = lng
    state.currentLat = lat
    dom.gpsStatus.classList.add('active')

    if (state.startLat == null) {
      state.startLat = state.currentLat
      state.startLng = state.currentLng
      state.startTime = Date.now()
    }

    if (state.destination) {
      _updateNavProgress(state.currentLat, state.currentLng)
    }

    state.traveledDistance = haversine(
      state.startLat, state.startLng,
      state.currentLat, state.currentLng
    )
    dom.traveled.textContent = fmtDistance(state.traveledDistance)
  })

  // 5) 接收来自 MiniMap 的朝向事件（调试模式下拖动方向触发）
  window.addEventListener('minimap:heading', (e) => {
    if (!state.debugMode) return
    const { heading } = e.detail
    state.heading = heading
    _updateCompassUI(heading)
    if (state.destination) {
      _updateArrowWithHeading()
    }
  })

  // 6) 迷你地图就绪（直线导航模式，不需要额外处理）
  window.addEventListener('minimap:ready', (e) => {
    console.log('[AR NAV] 迷你地图就绪（直线导航模式）')
  })
}

function _setDebugMode(enabled) {
  const on = !!enabled
  if (state.debugMode === on) return
  state.debugMode = on

  // 同步 checkbox 状态
  const checkbox = document.getElementById('debug-checkbox')
  if (checkbox && checkbox.checked !== on) checkbox.checked = on

  // 同步 body class
  if (on) {
    document.body.classList.add('debug-mode')
  } else {
    document.body.classList.remove('debug-mode')
  }

  // 同步 MiniMap
  if (state.miniMap && state.miniMap.setDebugMode) {
    state.miniMap.setDebugMode(on)
  }

  // —— 调试模式：控制 main.js 自身的 GPS 监听 ——
  if (on) {
    // 进入调试模式：停掉真实 GPS，避免覆盖鼠标点击设置的位置
    if (state.watchId != null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(state.watchId) } catch (e) {}
      state.watchId = null
    }
    // GPS 状态灯保持亮起（位置由调试模式提供）
    dom.gpsStatus.classList.add('active')
  } else {
    // 退出调试模式：如果已经设置了目的地，重启真实 GPS
    if (state.destination) {
      startGPS()
    }
  }

  console.log('[AR NAV] 调试模式:', on ? '开启' : '关闭')
  speak(on ? '调试模式已开启' : '调试模式已关闭')
}

// --- 演示数据：没 GPS 时跑一个简单循环 ---
function _startDemo() {
  console.log('[AR NAV] 演示模式开启')
  let demoHeading = 0
  setInterval(() => {
    demoHeading = (demoHeading + 1) % 360
    state.heading = demoHeading
    _updateCompassUI(demoHeading)

    if (state.destination) {
      state.bearing = (demoHeading + 30) % 360
      _updateArrowWithHeading()
    }
  }, 200)

  dom.gpsStatus.classList.add('active')
  dom.compassStatus.classList.add('active')
  dom.gyroStatus.classList.add('active')
}

// DOM 就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 调试辅助：把内部 state 暴露到 window（仅在开发环境方便测试）
if (typeof window !== 'undefined') {
  window.__navState = function() { return state; }
}
