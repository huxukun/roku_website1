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

function _loadAMap() {
  // ⚠️ 如果用户没填 Key → 给明确 UI 提示，让用户知道"为什么点确定没反应"
  if (!CONFIG.AMAP_KEY) {
    console.warn('[AR NAV] 未配置高德 Key（nav-site/src/config.js）')
    state.amapReady = false
    // 在目的地输入框里显示提示（给用户一个明确反馈，不是"点了没反应"）
    if (dom.destinationInput && dom.destinationInput.placeholder) {
      dom.destinationInput.setAttribute('data-notice', '未配置高德Key')
    }
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
      state.geocoder = new window.AMap.Geocoder({ city: '全国', radius: 500, extensions: 'base' })
      resolve()
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    // 同时加载 Geocoder（反地理编码）和 AutoComplete（POI搜索）插件
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(CONFIG.AMAP_KEY)}&plugin=AMap.Geocoder,AMap.AutoComplete`
    script.onerror = () => {
      console.warn('[AR NAV] 高德地图加载失败，请检查 Key 和白名单')
      state.amapReady = false
      reject(new Error('amap load failed'))
    }
    script.onload = () => {
      if (window.AMap) {
        state.amapReady = true
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

  // 等 AMap 准备好后启用 POI 搜索
  _waitForAMap(() => {
    _setupPoiSearch()
    // 给用户一个视觉提示：搜索功能就绪
    if (dom.destConfirmBtn) {
      dom.destConfirmBtn.textContent = '确定 · 已就绪'
    }
  })

  // ---- 确定按钮逻辑（有清晰的 loading/成功/失败三态） ----
  let _confirming = false
  dom.destConfirmBtn.addEventListener('click', () => {
    if (_confirming) return   // 防重复点击
    _confirming = true
    const originalText = dom.destConfirmBtn.textContent || '确定'
    dom.destConfirmBtn.textContent = '搜索中…'

    // 情况 1：已经从下拉列表选了 POI → 直接用它的坐标
    if (_currentPoi) {
      _applyDestination(_currentPoi.name, _currentPoi.lng, _currentPoi.lat)
      dom.destConfirmBtn.textContent = originalText
      _confirming = false
      return
    }

    // 情况 2：没有选 POI，用户在输入框里敲了文字
    const name = dom.destinationInput.value.trim()
    if (!name) {
      speak('请输入或选择目的地')
      dom.destConfirmBtn.textContent = originalText
      _confirming = false
      return
    }

    // 情况 2a：地图 SDK 还没加载好
    if (!window.AMap || !state.geocoder) {
      // 如果用户没填 Key（amapReady === false）→ 给明确提示
      if (CONFIG.AMAP_KEY === 'YOUR_AMAP_KEY_HERE' || !CONFIG.AMAP_KEY) {
        dom.destConfirmBtn.textContent = '⚠️ 请先配置高德Key'
        speak('请先在配置文件中填入您的高德地图 Key')
        setTimeout(() => { dom.destConfirmBtn.textContent = originalText; _confirming = false }, 2500)
        return
      }
      // SDK 还在加载 → 等一会儿再试
      dom.destConfirmBtn.textContent = '地图加载中，请稍候…'
      _waitForAMap(() => {
        dom.destConfirmBtn.textContent = originalText
        _confirming = false
        speak('地图已就绪，请再次点击确定')
      })
      return
    }

    // 情况 2b：SDK 就绪 → 用 geocoder 做地理编码
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
  })
}

// 当前选中的 POI（供确认按钮使用）
let _currentPoi = null

// POI 搜索防抖
let _poiSearchTimer = null

function _setupPoiSearch() {
  if (!window.AMap) return
  if (state._poiSearchReady) return   // 避免重复绑定事件
  state._poiSearchReady = true

  // 创建 AutoComplete 实例
  const autoComplete = new window.AMap.AutoComplete({
    city: '全国',
    pageSize: 10,
    extensions: 'base'
  })

  // 输入变化时搜索
  dom.destinationInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim()
    clearTimeout(_poiSearchTimer)
    _currentPoi = null
    if (!keyword) {
      _renderPoiSuggestions([])
      return
    }
    _poiSearchTimer = setTimeout(() => {
      autoComplete.search(keyword, (r1, r2) => {
        // 高德不同版本回调签名不一致：兼容 (status, result) 和 (result) 两种
        let tips = []
        if (r1 && Array.isArray(r1.tips)) tips = r1.tips
        else if (r2 && Array.isArray(r2.tips)) tips = r2.tips
        else if (r1 && typeof r1 === 'object' && r1.status === 'complete' && r1.tips) tips = r1.tips
        const validTips = tips.filter(t => t && t.location && t.location.lng && t.location.lat)
        _renderPoiSuggestions(validTips)
      })
    }, 300)
  })

  // 聚焦时也搜索一次
  dom.destinationInput.addEventListener('focus', () => {
    const keyword = dom.destinationInput.value.trim()
    if (keyword) {
      autoComplete.search(keyword, (r1, r2) => {
        let tips = []
        if (r1 && Array.isArray(r1.tips)) tips = r1.tips
        else if (r2 && Array.isArray(r2.tips)) tips = r2.tips
        const validTips = tips.filter(t => t && t.location && t.location.lng && t.location.lat)
        _renderPoiSuggestions(validTips)
      })
    }
  })

  // 点击页面其他地方时关闭下拉
  document.addEventListener('click', (e) => {
    if (!dom.destinationBox.contains(e.target)) {
      _hidePoiSuggestions()
    }
  })
}

function _renderPoiSuggestions(tips) {
  if (!dom.poiSuggestions) return

  if (!tips || tips.length === 0) {
    dom.poiSuggestions.innerHTML = '<div class="poi-item" style="opacity:0.5;pointer-events:none;">没有匹配结果，请输入更具体的名称</div>'
    dom.poiSuggestions.classList.add('show')
    return
  }

  const html = tips.map((t, i) => {
    const address = t.district && t.address ? `${t.district} ${t.address}` : (t.address || t.district || '')
    return `
      <div class="poi-item" data-index="${i}" data-name="${_escapeHtml(t.name)}" data-lng="${t.location.lng}" data-lat="${t.location.lat}" data-address="${_escapeHtml(address || '')}">
        <div class="poi-item-name">${_escapeHtml(t.name)}</div>
        ${address ? `<div class="poi-item-address">${_escapeHtml(address)}</div>` : ''}
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

// 等待 AMap 可用（带超时 + 失败回调）
function _waitForAMap(cb, failCb) {
  if (window.AMap && state.geocoder) { cb(); return }
  const t0 = Date.now()
  const check = () => {
    if (window.AMap && state.geocoder) { cb(); return }
    if (Date.now() - t0 > 8000) {   // 8 秒超时
      if (failCb) failCb()
      return
    }
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
