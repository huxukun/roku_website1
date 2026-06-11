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

      // 调试模式下不启动浏览器 GPS（由鼠标控制位置）
      if (!this.debugMode) {
        this._startBrowserLocation();
      }
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
    } else {
      // 退出调试模式：恢复 GPS
      this._unbindDebugEvents();
      this.container.classList.remove('debug');
      this._hideDebugOverlay();
      this._startBrowserLocation();
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

    // click 事件：单击设置位置
    this._clickHandler = (e) => {
      if (this._isDragging) return;  // drag 结束后由 mouseup 处理
      const lnglat = e.lnglat;
      if (!lnglat) return;
      this._setDebugPosition(lnglat.lng, lnglat.lat);
    };

    // mousedown / mousemove / mouseup：拖动设置位置 + 计算朝向
    this._mouseDownHandler = (e) => {
      this._isDragging = false;
      this._dragStartAt = Date.now();
      this._dragStartLngLat = e.lnglat ? [e.lnglat.lng, e.lnglat.lat] : null;
      this._lastDragLngLat = this._dragStartLngLat;
    };

    this._mouseMoveHandler = (e) => {
      if (!this._dragStartLngLat || !e.lnglat) return;
      // 拖动时不标记为 dragging（需要一点点移动距离 > 3 米才判定为拖动
      const lnglat = [e.lnglat.lng, e.lnglat.lat];
      if (!this._lastDragLngLat) return;
      const dx = lnglat[0] - this._lastDragLngLat[0];
      const dy = lnglat[1] - this._lastDragLngLat[1];
      if (Math.abs(dx) < 0.00005 && Math.abs(dy) < 0.00005) return;
      this._isDragging = true;
      this._setDebugPosition(lnglat[0], lnglat[1], this._lastDragLngLat);
      this._lastDragLngLat = lnglat;
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

    // 防止浏览器拖拽地图在高德本身的拖拽行为保留（允许拖动地图查看），但按住拖动时同时更新位置
    // 但我们的点击/拖动已通过高德的 click/mousedown 事件工作
    // 问题：高德地图默认可拖动地图视图 — 对调试模式下我们希望点击位置但也能同时移动视图
    // 所以保留默认行为：点击更新位置，拖动地图的同时也更新位置
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
      if (!this.debugMode) {
        this.map.setCenter(this.currentLngLat);
      }
      // 调试模式下不强制中心跟随用户，但允许用户拖动地图查看其他区域
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
    if (!this.currentLngLat || !this.targetLngLat || !window.AMap || !this.map) return;

    const path = [this.currentLngLat, this.targetLngLat];
    if (!this.polyline) {
      this.polyline = new window.AMap.Polyline({
        path: path,
        strokeColor: '#ffaa00',
        strokeWeight: 4,
        strokeOpacity: 0.85,
        strokeStyle: 'dashed',
        lineJoin: 'round',
        map: this.map
      });
    } else {
      this.polyline.setPath(path);
    }
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
