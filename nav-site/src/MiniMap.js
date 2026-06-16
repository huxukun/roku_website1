/**
 * MiniMap - 左上角迷你地图（真实高德地图）
 * - 显示真实街道/道路
 * - 显示当前定位点 + 朝向
 * - 显示目的地标记
 * - 显示起点→目的地的路径
 * - 调试模式：放大显示、鼠标点击/拖动设置当前位置
 */

// 复用 main.js 的 _amapStatus（通过 window 传递，保持模块间通信）
function _getAMapStatus() {
  return window.__amapStatus || { status: null };
}

export class MiniMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // 信息文本元素（显示当前道路/地址）
    this.infoElement = document.getElementById('mini-map-info');

    this.map = null;
    this.userMarker = null;       // 当前定位标记
    this.destMarker = null;       // 目的地标记
    this.headingArrow = null;     // 朝向箭头（overlay）
    this.watchId = null;
    this.geocoder = null;
    this.currentLngLat = null;    // [lng, lat]
    this.currentHeading = 0;
    this.hasTarget = false;
    this.targetLngLat = null;     // [lng, lat]
    this.polyline = null;
    this.routePath = null;        // 真实道路规划路线：[[lng, lat], ...]
    this.routeSteps = null;       // 转弯步骤列表
    this.turnMarkers = [];        // 路口方向标记

    this.debugMode = false;
    this._isDragging = false;      // 鼠标是否按下中
    this._lastDragLngLat = null;    // 上一次拖动的位置
    this._clickHandler = null;
    this._mouseDownHandler = null;
    this._mouseMoveHandler = null;
    this._mouseUpHandler = null;
    this._debugOverlay = null;         // 调试模式的 overlay 元素

    // 等待 AMap JS SDK 加载完成再初始化地图
    this._waitForAMapAndInit();
  }

  _waitForAMapAndInit() {
    // 每 300ms 检查 AMap 是否已加载，最多等待 30 秒
    const startAt = Date.now();
    const check = () => {
      const st = _getAMapStatus();
      if (st.status === 'ready' && window.AMap) {
        this._initAMap();
        return;
      }
      if (st.status === 'failed') {
        if (this.infoElement) {
          this.infoElement.textContent = st.error || '地图不可用';
        }
        return;
      }
      if (window.AMap) {
        this._initAMap();
        return;
      }
      if (Date.now() - startAt > 30000) {
        if (this.infoElement) {
          this.infoElement.textContent = '地图加载超时';
        }
        return;
      }
      setTimeout(check, 300);
    };
    check();
  }

  _initAMap() {
    if (!this.container || this.map) return;

    try {
      // 默认先显示一个中心（等定位后再 setCenter 到真实位置）
      const defaultCenter = [116.397428, 39.90923];
      this.map = new window.AMap.Map(this.container, {
        viewMode: '2D',
        zoom: 16,
        center: defaultCenter,
        resizeEnable: true,
        mapStyle: 'amap://styles/dark',
        features: ['road', 'building', 'background'],
        showLabel: true,
        showMarker: false
      });

      this.geocoder = new window.AMap.Geocoder({
        city: '全国',
        radius: 500,
        extensions: 'base'
      });

      this._createUserMarker(defaultCenter);
      this._createHeadingArrow(defaultCenter);

      // ★★★ 新增：地图初始化完成后通知 main.js ★★★
      console.log('[MiniMap] ✅ 高德地图初始化完成')
      window.dispatchEvent(new CustomEvent('minimap:ready', { detail: { map: this.map } }))

      // 若在 AMap 初始化之前已被切换到调试模式，此时再绑定事件、加样式、放大 zoom
      if (this.debugMode) {
        this._bindDebugEvents();
        this.container.classList.add('debug');
        this._showDebugOverlay();
        try { this.map.setZoom(17); } catch (e) {}
      }
      // 注意：不再在初始化时自动调用 _startBrowserLocation（避免违反"仅在用户手势后请求定位"）
      // 改为由外部（main.js 的 startGPS）在用户点击目的地后调用 this.enableLocation()
    } catch (e) {
      console.warn('[MiniMap] 初始化失败:', e);
      if (this.infoElement) {
        this.infoElement.textContent = '地图不可用';
      }
    }
  }

  _createUserMarker(center) {
    if (!window.AMap || !this.map) return;

    const icon = new window.AMap.Icon({
      size: new window.AMap.Size(32, 32),
      image: 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
           <circle cx="16" cy="16" r="14" fill="rgba(0,255,136,0.25)" stroke="#00ff88" stroke-width="1.5"/>
           <circle cx="16" cy="16" r="6" fill="#00ff88"/>
         </svg>`
      ),
      imageSize: new window.AMap.Size(32, 32)
    });

    this.userMarker = new window.AMap.Marker({
      position: center,
      icon: icon,
      offset: new window.AMap.Pixel(-16, -16),
      zIndex: 200,
      map: this.map
    });
  }

  _createHeadingArrow(center) {
    if (!window.AMap || !this.map) return;

    const arrowIcon = new window.AMap.Icon({
      size: new window.AMap.Size(40, 40),
      image: 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
           <polygon points="20,4 32,32 20,26 8,32" fill="#00ffff" stroke="#00ffff" stroke-width="2"/>
         </svg>`
      ),
      imageSize: new window.AMap.Size(40, 40)
    });

    this.headingArrow = new window.AMap.Marker({
      position: center,
      icon: arrowIcon,
      offset: new window.AMap.Pixel(-20, -20),
      rotation: 0,
      zIndex: 210,
      map: this.map,
      angle: 0
    });
  }

  _startBrowserLocation() {
    if (!('geolocation' in navigator)) return;
    if (this.watchId != null) return;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          this.setPosition(lng, lat);
        },
        (err) => {
          console.warn('[MiniMap] 定位失败:', err);
          if (this.infoElement) {
            this.infoElement.textContent = '无定位';
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000
        }
      );
    } catch (e) {
      console.warn('[MiniMap] 无法启动定位:', e);
    }
  }

  _stopBrowserLocation() {
    if (this.watchId != null && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(this.watchId);
      } catch (e) {}
      this.watchId = null;
    }
  }

  // 公开方法：由外部（main.js 的 startGPS）在用户手势后调用
  // 这样可以确保 geolocation 请求发生在用户 gesture 之后，符合浏览器策略
  enableLocation() {
    if (this.debugMode) return;
    this._startBrowserLocation();
  }

  disableLocation() {
    this._stopBrowserLocation();
  }

  /* ============================================================
     调试模式：click/drag 控制
     ============================================================ */
  setDebugMode(enabled) {
    const wasDebug = this.debugMode;
    this.debugMode = !!enabled;
    if (this.debugMode === wasDebug) return;

    if (this.debugMode) {
      // 进入调试模式：停掉真实 GPS（由鼠标控制）
      this._stopBrowserLocation();
      this._bindDebugEvents();
      this.container.classList.add('debug');
      this._showDebugOverlay();
      // 放大地图（更高 zoom）方便调试观察标记变化
      if (this.map) {
        try { this.map.setZoom(17); } catch (e) {}
      }
    } else {
      // 退出调试模式：恢复 GPS + 恢复正常 zoom
      this._unbindDebugEvents();
      this.container.classList.remove('debug');
      this._hideDebugOverlay();
      this._startBrowserLocation();
      if (this.map) {
        try { this.map.setZoom(16); } catch (e) {}
      }
    }
  }

  _showDebugOverlay() {
    if (!this.container) return;
    if (this._debugOverlay) return;
    const el = document.createElement('div');
    el.className = 'mini-map-debug-label';
    el.textContent = 'DEBUG · 点击/拖动设置位置';
    this.container.appendChild(el);
    this._debugOverlay = el;
  }

  _hideDebugOverlay() {
    if (this._debugOverlay && this._debugOverlay.parentNode) {
      this._debugOverlay.parentNode.removeChild(this._debugOverlay);
    }
    this._debugOverlay = null;
  }

  _bindDebugEvents() {
    if (!this.map) return;

    // 从高德事件中安全提取 [lng, lat]
    // 兼容 LngLat 对象(lng.lng / lnglat.lat) 和方法调用(lnglat.getLng() / getLat())
    const _extractLngLat = (lnglat) => {
      if (!lnglat) return null;
      let lng = null, lat = null;
      // 优先尝试方法调用（高德 v2 标准）
      if (typeof lnglat.getLng === 'function' && typeof lnglat.getLat === 'function') {
        lng = lnglat.getLng();
        lat = lnglat.getLat();
      }
      // 再尝试直接访问属性（旧版或部分事件格式）
      if (!Number.isFinite(lng) && 'lng' in lnglat) lng = lnglat.lng;
      if (!Number.isFinite(lat) && 'lat' in lnglat) lat = lnglat.lat;
      // 兼容 [lng, lat] 数组
      if (!Number.isFinite(lng) && Array.isArray(lnglat) && lnglat.length >= 2) {
        lng = lnglat[0]; lat = lnglat[1];
      }
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return [lng, lat];
    };

    // click 事件：单击设置位置
    this._clickHandler = (e) => {
      if (this._isDragging) return;
      const coords = _extractLngLat(e.lnglat);
      if (!coords) return;
      this._setDebugPosition(coords[0], coords[1]);
    };

    // mousedown / mousemove / mouseup：拖动设置位置 + 计算朝向
    this._mouseDownHandler = (e) => {
      this._isDragging = false;
      this._dragStartAt = Date.now();
      const coords = _extractLngLat(e.lnglat);
      this._dragStartLngLat = coords;
      this._lastDragLngLat = coords;
    };

    this._mouseMoveHandler = (e) => {
      if (!this._dragStartLngLat) return;
      const coords = _extractLngLat(e.lnglat);
      if (!coords) return;
      if (!this._lastDragLngLat) return;
      const dx = coords[0] - this._lastDragLngLat[0];
      const dy = coords[1] - this._lastDragLngLat[1];
      if (Math.abs(dx) < 0.00005 && Math.abs(dy) < 0.00005) return;
      this._isDragging = true;
      this._setDebugPosition(coords[0], coords[1], this._lastDragLngLat);
      this._lastDragLngLat = coords;
    };

    this._mouseUpHandler = (e) => {
      this._isDragging = false;
      this._dragStartLngLat = null;
      this._lastDragLngLat = null;
    };

    this.map.on('click', this._clickHandler);
    this.map.on('mousedown', this._mouseDownHandler);
    this.map.on('mousemove', this._mouseMoveHandler);
    this.map.on('mouseup', this._mouseUpHandler);
    this.map.on('mouseout', this._mouseUpHandler);
  }

  _unbindDebugEvents() {
    if (!this.map) return;
    if (this._clickHandler) { try { this.map.off('click', this._clickHandler); } catch (e) {} }
    if (this._mouseDownHandler) { try { this.map.off('mousedown', this._mouseDownHandler); } catch (e) {} }
    if (this._mouseMoveHandler) { try { this.map.off('mousemove', this._mouseMoveHandler); } catch (e) {} }
    if (this._mouseUpHandler) { try { this.map.off('mouseup', this._mouseUpHandler); } catch (e) {} }
    try { this.map.off('mouseout', this._mouseUpHandler); } catch (e) {}
    this._clickHandler = null;
    this._mouseDownHandler = null;
    this._mouseMoveHandler = null;
    this._mouseUpHandler = null;
  }

  _setDebugPosition(lng, lat, fromLngLat) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    this.setPosition(lng, lat);

    // 调试模式下：显示精确坐标（反地理编码可能因 key 问题失败）
    if (this.infoElement && this.debugMode) {
      const distMeters = this.hasTarget && this.targetLngLat
        ? Math.round(haversine(lat, lng, this.targetLngLat[1], this.targetLngLat[0]))
        : null;
      const distText = distMeters != null ? ' · 距目的地 ' + (distMeters < 1000 ? distMeters + ' m' : (distMeters / 1000).toFixed(2) + ' km') : '';
      this.infoElement.textContent = '(' + lng.toFixed(4) + ', ' + lat.toFixed(4) + ')' + distText;
    }

    // 如果有"来源点 → 计算朝向
    if (fromLngLat && fromLngLat.length === 2) {
      const heading = bearing(fromLngLat[1], fromLngLat[0], lat, lng);
      this.setHeading(heading);
      // 触发全局事件：让 main.js 更新主视图的 heading
      window.dispatchEvent(new CustomEvent('minimap:heading', { detail: { heading } }));
    }

    // 触发全局事件：通知 main.js 更新导航位置已更新
    window.dispatchEvent(new CustomEvent('minimap:position', {
      detail: { lng: lng, lat: lat }
    }));
  }

  /**
   * 设置当前用户位置（经纬度）
   */
  setPosition(lng, lat) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    if (lng === 0 || lat === 0) return;

    this.currentLngLat = [lng, lat];

    if (this.map && this.userMarker) {
      this.userMarker.setPosition(this.currentLngLat);
      // 调试模式：点击后也居中地图，让用户清晰看到标记位置变化
      // 非调试模式：保持原有跟随行为
      this.map.setCenter(this.currentLngLat);
    }
    if (this.headingArrow) {
      this.headingArrow.setPosition(this.currentLngLat);
    }

    this._reverseGeocode(lng, lat);
    this._updatePolyline();
  }

  /**
   * 设置手机朝向角度（0-360，0=北，顺时针）
   */
  setHeading(deg) {
    if (!Number.isFinite(deg)) return;
    this.currentHeading = deg;
    if (this.headingArrow) {
      this.headingArrow.setAngle(deg);
    }
  }

  /**
   * 设置目的地（经纬度）
   */
  setTarget(lng, lat) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    this.hasTarget = true;
    this.targetLngLat = [lng, lat];

    if (window.AMap && this.map) {
      if (!this.destMarker) {
        const icon = new window.AMap.Icon({
          size: new window.AMap.Size(40, 40),
          image: 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
               <circle cx="20" cy="20" r="16" fill="none" stroke="#ffaa00" stroke-width="2" stroke-dasharray="4,3"/>
               <circle cx="20" cy="20" r="7" fill="#ffaa00"/>
             </svg>`
          ),
          imageSize: new window.AMap.Size(40, 40)
        });
        this.destMarker = new window.AMap.Marker({
          position: this.targetLngLat,
          icon: icon,
          offset: new window.AMap.Pixel(-20, -20),
          zIndex: 180,
          map: this.map
        });
      } else {
        this.destMarker.setPosition(this.targetLngLat);
      }
    }

    this._updatePolyline();
  }

  _updatePolyline() {
    if (!window.AMap || !this.map) return;

    // 优先使用真实道路规划路线；否则回退到当前位置→目的地直线
    let fullPath = null;
    if (this.routePath && this.routePath.length >= 2) {
      fullPath = this.routePath;
    } else if (this.currentLngLat && this.targetLngLat) {
      fullPath = [this.currentLngLat, this.targetLngLat];
    }
    if (!fullPath) return;

    const normalized = [];
    for (let i = 0; i < fullPath.length; i++) {
      const p = fullPath[i];
      if (!p) continue;
      if (Array.isArray(p) && p.length >= 2) normalized.push([p[0], p[1]]);
      else if (p && typeof p.getLng === 'function') normalized.push([p.getLng(), p.getLat()]);
      else if (p && typeof p.lng === 'number') normalized.push([p.lng, p.lat]);
    }
    if (normalized.length < 2) return;

    // 统一绿色虚线样式（沿真实道路从起点到终点）
    if (!this.polyline) {
      this.polyline = new window.AMap.Polyline({
        path: normalized,
        strokeColor: '#00ff88',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        strokeStyle: 'dashed',
        lineJoin: 'round',
        zIndex: 80,
        map: this.map
      });
    } else {
      this.polyline.setOptions({
        strokeColor: '#00ff88',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        strokeStyle: 'dashed'
      });
      this.polyline.setPath(normalized);
    }
  }

  setRoutePath(pathArray, steps) {
    if (!pathArray || pathArray.length < 2) return;
    this.routePath = pathArray;
    this._updatePolyline();

    // 路线规划成功后，自动调整地图范围让整条路线可见
    if (window.AMap && this.map && this.routePath && this.routePath.length >= 2) {
      try {
        const bounds = new window.AMap.Bounds(
          new window.AMap.LngLat(this.routePath[0][0], this.routePath[0][1]),
          new window.AMap.LngLat(this.routePath[this.routePath.length - 1][0],
                                 this.routePath[this.routePath.length - 1][1])
        );
        for (let i = 1; i < this.routePath.length - 1; i++) {
          try { bounds.extend(new window.AMap.LngLat(this.routePath[i][0], this.routePath[i][1])); }
          catch (e) {}
        }
        try { this.map.setBounds(bounds, [40, 40, 40, 40]); }
        catch (e) { this.map.setFitView(); }
      } catch (e) {
        try { this.map.setFitView(); } catch (e2) {}
      }
    }

    // 清理旧的路口标记
    this._clearTurnMarkers();

    // 只在有 steps 信息时创建路口标记
    if (steps && Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length - 1; i++) {
        const step = steps[i];
        if (!step.turnPoint || step.action === 'straight') continue;
        this._createTurnMarker(step);
      }
    }
  }

  setRouteSteps(steps) { this.routeSteps = steps; }

  clearRoute() {
    this.routePath = null;
    this.routeSteps = null;
    if (this.polyline) { this.polyline.setMap(null); this.polyline = null; }
    this._clearTurnMarkers();
    this.hasTarget = false;
    this.targetLngLat = null;
    if (this.destMarker) { this.destMarker.setMap(null); this.destMarker = null; }
  }

  _createTurnMarker(step) {
    if (!window.AMap || !this.map) return;
    const [lng, lat] = step.turnPoint;
    if (typeof lng !== 'number' || typeof lat !== 'number') return;

    const iconMap = {
      'left': '↰',
      'left-slight': '↖',
      'right': '↱',
      'right-slight': '↗',
      'uturn': '↺',
      'arrive': '★'
    };
    const colorMap = {
      'left': '#4dd0e1',
      'left-slight': '#4dd0e1',
      'right': '#ffb74d',
      'right-slight': '#ffb74d',
      'uturn': '#e57373',
      'arrive': '#ffd54f'
    };
    const icon = iconMap[step.action] || '↑';
    const color = colorMap[step.action] || '#00ffff';

    try {
      const marker = new window.AMap.Marker({
        position: [lng, lat],
        offset: new window.AMap.Pixel(-12, -12),
        content: `<div style="width:24px;height:24px;background:rgba(0,0,0,0.7);border:2px solid ${color};border-radius:50%;color:${color};font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color};">${icon}</div>`,
        map: this.map,
        zIndex: 120
      });
      this.turnMarkers.push(marker);
    } catch (e) {}
  }

  _clearTurnMarkers() {
    if (this.turnMarkers && this.turnMarkers.length > 0) {
      for (const m of this.turnMarkers) {
        try { m.setMap(null); } catch (e) {}
      }
      this.turnMarkers = [];
    }
  }

  // 外部导航引擎传入当前进度（仅记录，不再参与绘制）
  // info: { progressMeters, totalDistance, currentStepIdx, nextStepIdx, position:[lng,lat] }
  setNavProgress(info) {
    this._navData = info;
  }

  _reverseGeocode(lng, lat) {
    if (!this.geocoder) return;
    const now = Date.now();
    if (this._lastReverseGeocode && (now - this._lastReverseGeocode) < 3000) return;
    this._lastReverseGeocode = now;

    try {
      this.geocoder.getAddress([lng, lat], (status, result) => {
        if (status === 'complete' && result && result.regeocode) {
          const road = (result.regeocode.addressComponent && result.regeocode.addressComponent.township) ||
                       result.regeocode.formattedAddress || '';
          if (this.infoElement) {
            this.infoElement.textContent = road || '';
          }
        }
      });
    } catch (e) {}
  }

  setInfo(text) {
    if (this.infoElement) {
      this.infoElement.textContent = text || '';
    }
  }
}

/* ============================================================
   工具函数：计算两点之间的球面距离（米）
   ============================================================ */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ============================================================
   工具函数：计算两点之间的朝向角（0-360，0=北，顺时针）
   ============================================================ */
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaL = toRad(lng2 - lng1);
  const y = Math.sin(deltaL) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaL);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
