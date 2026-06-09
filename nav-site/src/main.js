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
import { Scene3D } from './Scene3D.js'
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
  scene3D: null,
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

  // 目的地
  destination: null,     // { name, lat, lng }

  // 时间
  startTime: null,

  // 高德 API
  amapReady: false,      // AMap JS SDK 是否已加载
  geocoder: null,        // 反地理编码器实例
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
   语音播报 (Web Speech Synthesis API)
   ============================================================ */
let voiceBusy = false
const voiceQueue = []

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

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 1.05
  utter.pitch = 1
  utter.volume = 1

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
  dom.voiceText.textContent = `🔊 ${text}`
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

function _loadAMap() {
  // 如果用户没填 Key，就不加载
  if (!CONFIG.AMAP_KEY) {
    console.log('[AR NAV] 未配置高德 Key，跳过道路名称显示')
    return
  }
  if (state.amapReady) return
  if (_amapLoadingPromise) return _amapLoadingPromise

  // 配置安全密钥（v2.0 需要）
  if (CONFIG.AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = {
      securityJsCode: CONFIG.AMAP_SECURITY_CODE
    }
  }

  _amapLoadingPromise = new Promise((resolve, reject) => {
    // 如果已加载
    if (window.AMap) {
      state.amapReady = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(CONFIG.AMAP_KEY)}&plugin=AMap.Geocoder`
    script.onerror = () => {
      console.warn('[AR NAV] 高德地图加载失败，请检查 Key 和白名单')
      reject(new Error('amap load failed'))
    }
    script.onload = () => {
      if (window.AMap) {
        state.amapReady = true
        // 创建反地理编码器
        try {
          state.geocoder = new window.AMap.Geocoder({
            city: '全国',
            radius: 500,
            extensions: 'base'
          })
        } catch (e) {
          console.warn('[AR NAV] 创建 Geocoder 失败:', e)
        }
        resolve()
      } else {
        reject(new Error('amap not loaded'))
      }
    }
    document.head.appendChild(script)
  })
  return _amapLoadingPromise
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

      // 同步到迷你3D地图
      // 把经纬度差转换为本地 x/z 坐标（1 度 ≈ 111km）
      const dLat = state.currentLat - state.startLat
      const dLng = state.currentLng - state.startLng
      const metersPerDeg = 111000
      const localX = dLng * metersPerDeg * Math.cos(state.startLat * Math.PI / 180)
      const localZ = -dLat * metersPerDeg   // 纬度向北为 +, 在地图里表示为 -Z（Three.js -Z 即北）
      if (state.miniMap) {
        state.miniMap.setPosition(localX, localZ)
      }

      // 更新到目的地的距离与方向
      _updateDistanceAndBearing()

      // 已行驶距离
      state.traveledDistance = haversine(
        state.startLat, state.startLng,
        state.currentLat, state.currentLng
      )
      dom.traveled.textContent = fmtDistance(state.traveledDistance)

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

function _updateCompassUI(heading) {
  // 旋转指南针箭头（让箭头总是指向北方，相对屏幕旋转手机朝向角度）
  const rotation = -heading
  dom.compassArrow.style.transform = `rotate(${rotation}deg)`
  // 显示精确角度 + 方向文字（不再离散成 8 个方向）
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const idx = Math.round(heading / 45) % 8
  dom.compassText.textContent = `${dirs[idx]} ${Math.round(heading)}°`
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

  // 同步目的地到迷你地图（相对当前位置的本地偏移）
  if (state.miniMap && state.currentLat != null) {
    const dLat = state.destination.lat - state.currentLat
    const dLng = state.destination.lng - state.currentLng
    const metersPerDeg = 111000
    const dx = dLng * metersPerDeg * Math.cos(state.currentLat * Math.PI / 180)
    const dz = -dLat * metersPerDeg
    state.miniMap.setTarget(dx, dz)
  }

  _updateArrowWithHeading()

  // 更新"下一个转弯"文本（第一阶段用简单方向）
  dom.nextTurn.textContent = `向 ${bearingToText(state.bearing)}`
}

function _updateArrowWithHeading() {
  if (!state.destination) {
    dom.bigArrow.textContent = '→'
    dom.bigArrow.style.transform = 'rotate(0deg)'
    dom.arrowDistance.style.display = 'block'
    dom.arrowHint.textContent = '未设置目的地'
    if (state.scene3D) state.scene3D.setTurnMode('straight')
    return
  }

  // 计算相对手机朝向，到目的地的方向差
  // bearing: 从当前位置指北顺时针到目的地的角度
  // heading: 手机朝向（度，0=北）
  // 相对角度 = (bearing - heading + 360) % 360
  // 0 = 前方，-90=左，90=右，180=后方
  let relative = (state.bearing - state.heading + 360) % 360
  if (relative > 180) relative -= 360  // 归一化到 -180 ~ 180

  // --- 大箭头（真正的360°旋转，不再是8方向字符）---
  // arrow 默认指向上方（北），我们把它旋转到 relative 角度
  // relative=0 → 箭头朝上（前方），relative=90 → 箭头朝右
  const arrowRotation = relative   // 直接用相对角度旋转
  dom.bigArrow.textContent = '⬆'   // 始终用朝上的箭头字符
  dom.bigArrow.style.transform = `rotate(${arrowRotation}deg)`

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

  // --- 3D 场景 ---
  let turnType = 'straight'
  if (absRel < 20) turnType = 'straight'
  else if (absRel < 120) turnType = relative > 0 ? 'right' : 'left'
  else turnType = 'uturn'
  if (state.scene3D) {
    state.scene3D.setTurnMode(turnType)
  }
}

/* ============================================================
   启动流程
   ============================================================ */
function startNav() {
  // 显示目的地输入
  dom.destinationBox.classList.remove('hidden')
  dom.startBtn.classList.add('hidden')

  dom.destConfirmBtn.addEventListener('click', () => {
    const name = dom.destinationInput.value.trim()
    if (!name) {
      speak('请输入目的地')
      return
    }

    // 第一阶段：仅做"模拟目的地"演示
    // 真实高德 API 地理编码功能将在第二阶段加入
    // 这里让用户输入一个名称，然后用"默认位置+偏移"模拟
    state.destination = {
      name: name,
      lat: CONFIG.DEFAULT_LOCATION.lat + 0.01,
      lng: CONFIG.DEFAULT_LOCATION.lng + 0.015,
    }
    dom.destination.textContent = name

    // 隐藏启动层
    dom.initOverlay.classList.add('hidden')

    // 开始获取定位和方向
    startGPS()
    startCompass()

    speak(`目的地已设置：${name}。请面向骑行方向出发`)
  })
}

/* ============================================================
   入口
   ============================================================ */
function init() {
  // 初始化 3D 场景
  const canvas = document.querySelector('canvas.webgl')
  state.scene3D = new Scene3D(canvas)

  // 初始化迷你3D地图
  state.miniMap = new MiniMap('mini-map')

  // 点击开始
  dom.startBtn.addEventListener('click', startNav)

  // 演示：如果是演示模式
  if (CONFIG.USE_MOCK_DATA) {
    _startDemo()
  }
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
