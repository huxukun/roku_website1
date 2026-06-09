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
   GPS 定位
   ============================================================ */
function startGPS() {
  if (!('geolocation' in navigator)) {
    console.warn('浏览器不支持定位')
    speak('无法获取定位')
    return
  }

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
  dom.compassText.textContent = bearingToText(heading)
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

  _updateArrowWithHeading()

  // 更新"下一个转弯"文本（第一阶段用简单方向）
  dom.nextTurn.textContent = `向 ${bearingToText(state.bearing)}`
}

function _updateArrowWithHeading() {
  if (!state.destination) {
    dom.bigArrow.textContent = '→'
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

  // --- 文字大箭头（CSS方案）---
  let arrowText = '↑'
  let turnType = 'straight'
  let hintText = '前方直行'

  if (relative >= -22.5 && relative < 22.5) {
    arrowText = '↑'
    turnType = 'straight'
    hintText = '前方直行'
  } else if (relative >= 22.5 && relative < 67.5) {
    arrowText = '↗'
    turnType = 'right'
    hintText = '右前方'
  } else if (relative >= 67.5 && relative < 112.5) {
    arrowText = '→'
    turnType = 'right'
    hintText = '右转'
  } else if (relative >= 112.5 && relative < 157.5) {
    arrowText = '↘'
    turnType = 'right'
    hintText = '右后方'
  } else if (relative >= 157.5 || relative < -157.5) {
    arrowText = '↓'
    turnType = 'uturn'
    hintText = '掉头'
  } else if (relative >= -157.5 && relative < -112.5) {
    arrowText = '↙'
    turnType = 'left'
    hintText = '左后方'
  } else if (relative >= -112.5 && relative < -67.5) {
    arrowText = '←'
    turnType = 'left'
    hintText = '左转'
  } else if (relative >= -67.5 && relative < -22.5) {
    arrowText = '↖'
    turnType = 'left'
    hintText = '左前方'
  }

  dom.bigArrow.textContent = arrowText
  dom.arrowHint.textContent = hintText

  // --- 3D 箭头 ---
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
