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
    // 同时加载 Geocoder（反地理编码）和 AutoComplete（POI搜索）插件
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(trimmedKey)}&plugin=AMap.Geocoder,AMap.AutoComplete,AMap.PlaceSearch`

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

  speak(`目的地已设置：${name}。请面向骑行方向出发`)
}

/* ============================================================
   入口
   ============================================================ */
function init() {
  // 初始化 3D 场景
  const canvas = document.querySelector('canvas.webgl')
  state.scene3D = new Scene3D(canvas)

  // 初始化迷你地图
  state.miniMap = new MiniMap('mini-map')

  // ⚡ 预加载高德地图 SDK（不等用户点按钮，避免点击确定后才加载）
  _loadAMap()

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
   调试模式：URL 参数 + 键盘 D + 接收 MiniMap 位置/朝向事件
   ============================================================ */
function _initDebugMode() {
  // 1) URL 参数
  const params = new URLSearchParams(window.location.search)
  if (params.get('debug') === '1') {
    _toggleDebugMode(true)
  }

  // 2) 键盘 D 键切换
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      _toggleDebugMode()
    }
  })

  // 3) 按钮切换（如果页面上有 #debug-toggle）
  const debugBtn = document.getElementById('debug-toggle')
  if (debugBtn) {
    debugBtn.addEventListener('click', () => _toggleDebugMode())
  }

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

function _toggleDebugMode(forceValue) {
  const next = typeof forceValue === 'boolean' ? forceValue : !state.debugMode
  state.debugMode = next
  if (state.miniMap && state.miniMap.setDebugMode) {
    state.miniMap.setDebugMode(next)
  }
  // 切换 document.body 的 class，供 CSS 用
  if (next) {
    document.body.classList.add('debug-mode')
  } else {
    document.body.classList.remove('debug-mode')
  }
  // 同步按钮文案
  const btn = document.getElementById('debug-toggle')
  if (btn) {
    btn.textContent = next ? '🟡 调试模式（按 D 关闭）' : '⚪ 调试模式（按 D 开启）'
  }
  console.log('[AR NAV] 调试模式:', next ? 'ON' : 'OFF')
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
