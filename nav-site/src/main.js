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
  lastGeocodeTime: 0,    // 上次反地理编码时间（毫秒）
  roadName: '',          // 当前道路名称
  address: '',           // 完整地址
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
    // 同时加载 Geocoder（反地理编码）、AutoComplete（POI搜索）、PlaceSearch（周边搜索）和 Riding（骑行路线规划）插件
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(trimmedKey)}&plugin=AMap.Geocoder,AMap.AutoComplete,AMap.PlaceSearch,AMap.Riding`

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
    // 骑行路线规划服务
    if (typeof window.AMap.Riding === 'function') {
      state.riding = new window.AMap.Riding({
        policy: 0   // 0=最快捷（推荐），1=最少换乘，2=避免步行
      })
    } else {
      console.warn('[AR NAV] AMap.Riding 不可用（可能是 Key 权限或插件加载顺序）')
    }
    _setAMapStatus('ready', null)
    resolve()
  } catch (e) {
    const err = 'Geocoder 初始化失败（Key 可能无效或白名单不匹配）: ' + (e && e.message || e)
    _setAMapStatus('failed', err)
    console.warn('[AR NAV]', err)
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

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.currentLat = pos.coords.latitude
      state.currentLng = pos.coords.longitude

      // 标记 GPS 状态为正常
      dom.gpsStatus.classList.add('active')

      // 如果还没记录起点，这里记录一下
      if (state.startLat == null) {
        state.startLat = state.currentLat
        state.startLng = state.currentLng
        state.startTime = Date.now()
      }

      // 同步到迷你地图（使用真实经纬度）
      if (state.miniMap) {
        state.miniMap.setPosition(state.currentLng, state.currentLat)
      }

      // 如果有目的地且还没规划过路线，立即规划（首次定位成功后）
      if (state.destination && state.riding && !state._routePlanned) {
        state._routePlanned = true
        _planRoute(state.currentLng, state.currentLat,
                   state.destination.lng, state.destination.lat)
      }

      // 有路线 → 沿路线计算导航进度（下一转弯、箭头）
      if (state._navInitialized) {
        _updateNavProgress(state.currentLat, state.currentLng)
      } else {
        // 没路线 → 回退到"距离目的地 + 朝向"
        _updateDistanceAndBearing()
      }

      // 已行驶距离
      if (state._navInitialized) {
        // 沿路线行驶距离（更准确）
        const p = _projectPointToPath(state.currentLat, state.currentLng, state.navFullPath)
        if (p) dom.traveled.textContent = fmtDistance(p.cumDistanceMeters)
      } else {
        state.traveledDistance = haversine(
          state.startLat, state.startLng,
          state.currentLat, state.currentLng
        )
        dom.traveled.textContent = fmtDistance(state.traveledDistance)
      }

      // 当前速度
      if (pos.coords.speed != null && pos.coords.speed > 0) {
        const kmh = (pos.coords.speed * 3.6).toFixed(1)
        dom.currentSpeed.textContent = `${kmh} km/h`
      }

      // 反地理编码：获取当前道路名称（限流 ~ 3 秒一次）
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

  function tick(ts) {
    if (!lastTs) lastTs = ts
    const dt = Math.min((ts - lastTs) / 1000, 0.1)
    lastTs = ts
    const dtScale = Math.max(dt * 60, 1)  // 以 60fps 为基准，做帧率无关缩放

    // -------- 大箭头 --------
    // 3D 平视视角：先把箭头"立起来"绕竖直轴（Y 轴）旋转——像前方悬浮的路标
    // rotateX(65deg)：从屏幕平面向后倾斜，模拟平视视角；rotateY(angle)：绕水平面法线旋转
    {
      let diff = state._arrowTargetAngle - state._arrowCurrentAngle
      while (diff >  180) diff -= 360
      while (diff < -180) diff += 360
      if (Math.abs(diff) > SNAP_THRESHOLD) {
        const factor = 1 - Math.pow(1 - LERP_FAST, dtScale)
        state._arrowCurrentAngle += diff * factor
        if (dom.bigArrow) dom.bigArrow.style.transform = `rotateX(65deg) rotateY(${state._arrowCurrentAngle}deg)`
      } else if (Math.abs(diff) > 0.001) {
        state._arrowCurrentAngle = state._arrowTargetAngle
        if (dom.bigArrow) dom.bigArrow.style.transform = `rotateX(65deg) rotateY(${state._arrowTargetAngle}deg)`
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
    dom.bigArrow.style.transform = 'rotateX(65deg) rotateY(0deg)'
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
  // 确保 AMap 在加载（init 已预加载，这里再确认一次）
  _loadAMap()

  // 显示目的地输入
  dom.destinationBox.classList.remove('hidden')
  dom.startBtn.classList.add('hidden')

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

// 目的地设置完成 → 启动导航
function _applyDestination(name, lng, lat) {
  state.destination = {
    name: name,
    lng: lng,
    lat: lat
  }
  dom.destination.textContent = name

  // 隐藏启动层
  dom.initOverlay.classList.add('hidden')

  // 同步到 MiniMap
  if (state.miniMap) {
    state.miniMap.setTarget(lng, lat)
  }

  // 开始获取定位和方向
  startGPS()
  startCompass()

  // 如果已经有起点了，立即规划骑行路线
  if (state.currentLat != null && state.riding) {
    _planRoute(state.currentLng, state.currentLat, lng, lat)
  }

  speak(`目的地已设置：${name}。请面向骑行方向出发`)
}

// ============================================================
// 🗺️ 完整骑行路线规划与导航引擎（AMap.Riding + 逐路口引导）
// ============================================================

// 根据起点→终点规划骑行路线（AMap.Riding），并生成结构化步骤
function _planRoute(fromLng, fromLat, toLng, toLat) {
  if (!state.riding) return
  try {
    state.riding.search(
      [fromLng, fromLat],
      [toLng, toLat],
      (status, result) => {
        if (status !== 'complete' || !result || !result.routes || result.routes.length === 0) {
          console.warn('[AR NAV] 骑行路线规划失败：', status, result)
          // 失败时：回退到简单直线（不影响显示）
          _initFallbackRoute(fromLng, fromLat, toLng, toLat)
          return
        }
        const route = result.routes[0]

        // ── 解析步骤 ──
        const steps = []        // {index, path, distance, instruction, road, action, orientation, turnPoint, cumDistance}
        const fullPath = [[fromLng, fromLat]]  // 完整折线（起始点已插入）
        let cumDistance = 0

        if (route.steps && route.steps.length > 0) {
          route.steps.forEach((rawStep, idx) => {
            // step.path 是 AMap.LngLat 对象或 [lng,lat] 数组的拐点序列
            const stepPath = []
            if (rawStep.path && rawStep.path.length > 0) {
              rawStep.path.forEach((pt) => {
                if (Array.isArray(pt)) stepPath.push([pt[0], pt[1]])
                else if (pt && typeof pt.getLng === 'function') stepPath.push([pt.getLng(), pt.getLat()])
              })
            }

            const distance = Number(rawStep.distance) || 0
            const road = rawStep.road || rawStep.assistantName || ''
            const instruction = rawStep.instruction || ''
            const orientation = rawStep.orientation || rawStep.orient || ''
            const action = _orientationToAction(instruction || orientation)

            // 该步骤的起点 = 上一步骤的终点 = fullPath 的最后一个点
            const turnPoint = stepPath.length > 0 ? stepPath[0] : (fullPath.length > 0 ? fullPath[fullPath.length - 1] : [fromLng, fromLat])

            steps.push({
              index: idx,
              path: stepPath,
              distance: distance,
              instruction: instruction,
              road: road,
              orientation: orientation,
              action: action,
              turnPoint: turnPoint,
              cumDistance: cumDistance
            })

            // 累积距离 + 连续折线（去重：与上一段的结尾点相同，避免重复）
            for (let i = 0; i < stepPath.length; i++) {
              const last = fullPath[fullPath.length - 1]
              const p = stepPath[i]
              if (!last || Math.abs(last[0] - p[0]) > 1e-8 || Math.abs(last[1] - p[1]) > 1e-8) {
                fullPath.push(p)
              }
            }
            cumDistance += distance
          })
        }

        // 最后一段 → 终点
        fullPath.push([toLng, toLat])

        // 步骤不够（路线短，riding 没生成步骤）→ 也补齐一个"到达"步骤
        if (steps.length === 0) {
          steps.push({
            index: 0,
            path: [[fromLng, fromLat], [toLng, toLat]],
            distance: haversine(fromLat, fromLng, toLat, toLng),
            instruction: '沿当前道路骑行至目的地',
            road: '',
            orientation: '',
            action: 'straight',
            turnPoint: [fromLng, fromLat],
            cumDistance: 0
          })
        }

        // 添加"到达"步骤
        const totalDist = cumDistance > 0 ? cumDistance : haversine(fromLat, fromLng, toLat, toLng)
        steps.push({
          index: steps.length,
          path: [[toLng, toLat]],
          distance: 0,
          instruction: '到达目的地',
          road: '',
          orientation: '',
          action: 'arrive',
          turnPoint: [toLng, toLat],
          cumDistance: totalDist
        })

        // ── 写入导航状态 ──
        state.navSteps = steps
        state.navFullPath = fullPath
        state.navTotalDistance = totalDist
        state.navCurrentStepIdx = 0
        state.navProgressMeters = 0
        state._routePlanned = true
        state._navInitialized = true

        // 同步到 MiniMap（显示完整路线）
        if (state.miniMap) {
          state.miniMap.setRoutePath(fullPath)
          state.miniMap.setRouteSteps(steps)
        }

        // 更新总距离显示
        state.totalDistance = totalDist
        dom.totalDistance.textContent = fmtDistance(totalDist)
        dom.remainTime.textContent = fmtEta(totalDist)

        // 立即计算一次导航状态（用于"设置目的地后立即显示第一个转弯提示"）
        const startPt = fullPath[0]
        _updateNavProgress(startPt[1], startPt[0])

        console.log(`[AR NAV] 路线规划成功：${steps.length - 1} 个转弯，总距离 ${fmtDistance(totalDist)}`)
      }
    )
  } catch (e) {
    console.warn('[AR NAV] riding.search 异常：', e && e.message || e)
    _initFallbackRoute(fromLng, fromLat, toLng, toLat)
  }
}

// 规划失败时的兜底：一条从起点到终点的直线（伪 step）
function _initFallbackRoute(fromLng, fromLat, toLng, toLat) {
  const dist = haversine(fromLat, fromLng, toLat, toLng)
  const steps = [
    {
      index: 0,
      path: [[fromLng, fromLat], [toLng, toLat]],
      distance: dist,
      instruction: '直行至目的地',
      road: '',
      orientation: '',
      action: 'straight',
      turnPoint: [fromLng, fromLat],
      cumDistance: 0
    },
    {
      index: 1, path: [[toLng, toLat]], distance: 0,
      instruction: '到达目的地', road: '', orientation: '', action: 'arrive',
      turnPoint: [toLng, toLat], cumDistance: dist
    }
  ]
  state.navSteps = steps
  state.navFullPath = [[fromLng, fromLat], [toLng, toLat]]
  state.navTotalDistance = dist
  state.navProgressMeters = 0
  state.navCurrentStepIdx = 0
  state._routePlanned = true
  state._navInitialized = true
  if (state.miniMap) {
    state.miniMap.setRoutePath([[fromLng, fromLat], [toLng, toLat]])
    state.miniMap.setRouteSteps(steps)
  }
  state.totalDistance = dist
  dom.totalDistance.textContent = fmtDistance(dist)
  dom.remainTime.textContent = fmtEta(dist)

  // 立即显示第一个"转弯"提示（其实就是直行到达）
  _updateNavProgress(fromLat, fromLng)
}

// 主导航更新：基于当前坐标或路线累计距离，计算下一步转弯提示
// 可传入 (lat, lng) 直接计算；若不传入则使用 state.currentLat/state.currentLng
function _updateNavProgress(lat, lng) {
  if (!state._navInitialized || !state.navSteps) return

  const usePos = (lat != null && lng != null)
  const curLat = usePos ? lat : state.currentLat
  const curLng = usePos ? lng : state.currentLng

  if (curLat == null) return

  // 1) 找到当前位置在路线上的投影
  const proj = _projectPointToPath(curLat, curLng, state.navFullPath)
  if (!proj) return

  state.navProgressMeters = proj.cumDistanceMeters

  // 2) 找到当前位于哪一步（基于 cumDistance）
  const steps = state.navSteps
  let curStepIdx = 0
  for (let i = 0; i < steps.length; i++) {
    if (proj.cumDistanceMeters >= steps[i].cumDistance) curStepIdx = i
    else break
  }
  state.navCurrentStepIdx = curStepIdx

  // 3) 下一"转弯"步骤：跳过当前步骤起点，寻找下一个动作非 straight 的步骤
  //    ——也可以简单地取 steps[curStepIdx + 1]（即下一段路的起点）作为转弯点
  let nextIdx = curStepIdx + 1
  if (nextIdx >= steps.length) nextIdx = steps.length - 1
  state.navNextStepIdx = nextIdx

  const nextStep = steps[nextIdx]
  const distanceToTurn = Math.max(0, nextStep.cumDistance - proj.cumDistanceMeters)
  state.navNextTurnDistance = distanceToTurn

  // 4) 生成指示文本
  const action = nextStep.action || 'straight'
  state.navNextTurnAction = action

  let text = ''
  if (action === 'arrive') {
    if (distanceToTurn < 50) text = `即将到达 · ${state.destination ? state.destination.name : '目的地'}`
    else text = `前方 ${fmtDistance(distanceToTurn)} · 到达 ${state.destination ? state.destination.name : '目的地'}`
  } else {
    const road = nextStep.road ? `进入${nextStep.road}` : ''
    text = `前方 ${fmtDistance(distanceToTurn)} ${_actionToText(action)} ${road}`.trim()
  }
  state.navNextTurnText = text

  // 5) 计算指向"下一个转弯点"的方位（用于箭头角度）
  //    —— 接近转弯时（<80m）用动作本身的方向（已相对朝向，不用再减 heading）；
  //       否则用"朝向转弯点的地理方位"（需减去 heading 得到屏幕相对角度）
  let relative = 0  // 最终给大箭头的屏幕相对旋转角（-180 ~ 180）
  if (distanceToTurn < 80 || action === 'arrive') {
    // 接近路口：用动作本身的方向（如 -60 = 左转，已经是相对角度，不要再减 heading）
    relative = _actionToDefaultArrow(action)
  } else {
    // 指向转弯点：用地理方位角（0=北），减去当前朝向得到屏幕相对角度
    const brg = bearing(curLat, curLng, nextStep.turnPoint[1], nextStep.turnPoint[0])
    relative = ((brg - (state.heading || 0) + 540) % 360) - 180
  }
  state.navArrowAngle = relative
  state._arrowTargetAngle = relative

  // 记录朝向转弯点的绝对方位（供调试）
  if (distanceToTurn >= 80 && action !== 'arrive') {
    state.navBearingToTurn = bearing(curLat, curLng, nextStep.turnPoint[1], nextStep.turnPoint[0])
  } else {
    state.navBearingToTurn = (state.heading || 0) + relative
  }

  // 文本提示（中央）
  dom.arrowHint.textContent = text
  dom.arrowDistance.textContent = action === 'arrive'
    ? fmtDistance(Math.max(0, state.navTotalDistance - proj.cumDistanceMeters))
    : fmtDistance(distanceToTurn)

  // 底部信息栏
  const remaining = Math.max(0, state.navTotalDistance - proj.cumDistanceMeters)
  dom.totalDistance.textContent = fmtDistance(state.navTotalDistance)
  dom.remainTime.textContent = fmtEta(remaining)
  dom.nextTurn.textContent = action === 'arrive' ? '到达目的地' : _actionToText(action)
  dom.traveled.textContent = fmtDistance(proj.cumDistanceMeters)

  // 同步 MiniMap：高亮当前步骤与下一步
  if (state.miniMap) {
    state.miniMap.setNavProgress({
      progressMeters: proj.cumDistanceMeters,
      totalDistance: state.navTotalDistance,
      currentStepIdx: curStepIdx,
      nextStepIdx: nextIdx,
      position: [proj.lng, proj.lat]
    })
  }

  // 7) 语音播报（仅在关键节点）
  _maybeAnnounceTurn(distanceToTurn, action, nextStep, remaining)
}

// 转弯语音播报：接近路口时触发
let _lastAnnouncedStepIdx = -1
let _lastAnnouncedDistance = -1
function _maybeAnnounceTurn(distanceToTurn, action, nextStep, remaining) {
  if (!state.destination) return

  const announceKey = `${nextStep.index}-${Math.floor(distanceToTurn / 50)}`
  if (announceKey === _lastAnnouncedStepIdx + '-' + _lastAnnouncedDistance) return

  let shouldSpeak = false
  let text = ''

  if (action === 'arrive') {
    if (distanceToTurn < 80 && _lastAnnouncedStepIdx !== nextStep.index) {
      shouldSpeak = true
      text = `前方即将到达 ${state.destination.name}`
    }
  } else {
    // 在三个距离点播报
    const dist = Math.round(distanceToTurn)
    const marks = [500, 300, 100, 50]
    for (const m of marks) {
      if (dist <= m && _lastAnnouncedDistance > m && _lastAnnouncedStepIdx === nextStep.index) {
        shouldSpeak = true
        text = `前方 ${fmtDistance(distanceToTurn)} ${_actionToText(action)}`
        break
      }
    }
    if (!shouldSpeak && _lastAnnouncedStepIdx !== nextStep.index) {
      // 第一次遇到该步骤（例如跨段了）
      shouldSpeak = true
      text = `${_actionToText(action)}，继续骑行 ${fmtDistance(distanceToTurn)}`
    }
  }

  _lastAnnouncedStepIdx = nextStep.index
  _lastAnnouncedDistance = Math.floor(distanceToTurn / 50)

  if (shouldSpeak && text) speak(text, false)
}

/* ============================================================
   入口
   ============================================================ */
function init() {
  // 初始化迷你地图
  state.miniMap = new MiniMap('mini-map')

  // 🔄 启动大箭头平滑旋转循环（rAF + lerp，替代 CSS transition）
  _startArrowSmoothLoop()

  // ⚡ 预加载高德地图 SDK（不等用户点按钮，避免点击确定后才加载）
  _loadAMap()

  // 🔊 提前初始化语音（选择最佳中文音色）
  _initVoice()

  // 点击开始
  dom.startBtn.addEventListener('click', startNav)

  // 调试模式：URL 参数 ?debug=1 或键盘 D 键切换
  _initDebugMode()

  // 演示：如果是演示模式
  if (CONFIG.USE_MOCK_DATA) {
    _startDemo()
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
                     'Shift']
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

    // -------- 前进 / 后退（沿当前朝向）--------
    let moveDir = 0  // +1 前进 / -1 后退 / 0 不动
    if (debugKeys.has('ArrowUp') || debugKeys.has('w') || debugKeys.has('W')) moveDir += 1
    if (debugKeys.has('ArrowDown') || debugKeys.has('s') || debugKeys.has('S')) moveDir -= 1

    // 无操作则跳过，什么也不变
    if (turnDelta === 0 && moveDir === 0) {
      debugRafId = requestAnimationFrame(_debugTick)
      return
    }

    // ================= 关键：设置初始起点 =================
    // 优先级（从"最自然"到"最后兜底"）：
    //   1) 已有 state.currentLat / Lng（之前 GPS 定位成功）
    //   2) 规划路线 navFullPath 的起点（如果已有路线）
    //   3) miniMap.currentLngLat（用户可能点过地图）
    //   4) 地图中心点（如果地图已初始化）
    //   5) 最后兜底：天安门（用户从没进入过路线设置时）
    if (state.currentLat == null) {
      if (state._navInitialized && state.navFullPath && state.navFullPath.length > 0) {
        // ★ 优先：使用路线起点（这是调试导航最自然的起点）
        state.currentLng = state.navFullPath[0][0]
        state.currentLat = state.navFullPath[0][1]
        if (state.navFullPath.length >= 2) {
          state.heading = bearing(state.navFullPath[0][1], state.navFullPath[0][0],
                                  state.navFullPath[1][1], state.navFullPath[1][0])
        } else {
          state.heading = 0
        }
      } else if (state.miniMap && state.miniMap.currentLngLat) {
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

    // ================= 沿路线移动 vs 自由移动 =================
    const dist = moveSpeed * dt * moveDir
    let movedAlongRoute = false

    if (state._navInitialized && state.navFullPath && moveDir !== 0) {
      // ── 有路线 → 沿路线前进 ──
      state.navProgressMeters = Math.max(0, (state.navProgressMeters || 0) + dist)
      const total = state.navTotalDistance || 0
      if (total > 0 && state.navProgressMeters >= total) state.navProgressMeters = total

      const pt = _pointAtDistance(state.navFullPath, state.navProgressMeters)
      if (pt && typeof pt.lat === 'number') {
        const prevLat = state.currentLat, prevLng = state.currentLng
        state.currentLat = pt.lat
        state.currentLng = pt.lng
        if (moveDir !== 0 && (Math.abs(prevLat - pt.lat) > 1e-8 || Math.abs(prevLng - pt.lng) > 1e-8)) {
          const routeHeading = bearing(prevLat, prevLng, pt.lat, pt.lng)
          state.heading = moveDir > 0 ? routeHeading : (routeHeading + 180) % 360
        }
        movedAlongRoute = true
      }
    }

    if (!movedAlongRoute && moveDir !== 0) {
      // ── 没路线 → 自由按朝向移动 ──
      const p = moveAlongBearing(state.currentLat, state.currentLng, state.heading, dist)
      state.currentLat = p.lat
      state.currentLng = p.lng
    }

    // 再叠加"手动转向"（允许用户在路线上也叠加一点角度微调）
    if (turnDelta !== 0) {
      state.heading = (state.heading + turnDelta + 360) % 360
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

      // 优先：有导航引擎 → 更新导航进度（这也会更新大箭头和 arrowHint/距离）
      if (state._navInitialized && state.destination) {
        _updateNavProgress(state.currentLat, state.currentLng)
      } else if (state.destination) {
        _updateDistanceAndBearing()
        _updateArrowWithHeading()
      }

      // 已行驶距离
      if (state._navInitialized) {
        dom.traveled.textContent = fmtDistance(state.navProgressMeters || 0)
      } else {
        state.traveledDistance = haversine(state.startLat, state.startLng, state.currentLat, state.currentLng)
        dom.traveled.textContent = fmtDistance(state.traveledDistance)
      }

      const distDest = state.destination
        ? haversine(state.currentLat, state.currentLng, state.destination.lat, state.destination.lng)
        : null
      const speedKmh = Math.round(moveSpeed * 3.6 * Math.abs(moveDir))
      const moveTag = moveDir > 0 ? '🚴 前进' : moveDir < 0 ? '🚴↩ 后退' : ''
      const turnTag = turnDelta < 0 ? ' ⬅ 左偏' : turnDelta > 0 ? ' ➡ 右偏' : ''
      const destStr = distDest != null ? ' → 目的地 ' + fmtDistance(distDest) : ''

      // 调试信息不要覆盖导航提示（导航提示更重要）
      if (!state._navInitialized) {
        const hint = `[DEBUG] ${moveTag}${turnTag} ${speedKmh} km/h · (${state.currentLng.toFixed(5)}, ${state.currentLat.toFixed(5)}) · 朝向 ${Math.round(state.heading)}°${destStr}`
        dom.arrowHint.textContent = hint
        if (distDest != null) dom.arrowDistance.textContent = fmtDistance(distDest)
      }
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
      _updateDistanceAndBearing()
      _updateArrowWithHeading()
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
