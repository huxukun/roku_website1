/**
 * MiniMap - 左上角迷你地图（改用真实高德地图）
 * - 显示真实街道/道路
 * - 显示当前定位点 + 朝向
 * - 显示目的地标记
 * - 显示起点→目的地的路径
 */

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

    // 等待 AMap JS SDK 加载完成再初始化地图
    this._waitForAMapAndInit();
  }

  _waitForAMapAndInit() {
    // 每 300ms 检查 AMap 是否已加载，最多等待 30 秒
    const startAt = Date.now();
    const check = () => {
      if (window.AMap) {
        this._initAMap();
        return;
      }
      if (Date.now() - startAt > 30000) return;
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
        viewMode: '2D',       // 2D 俯视角，信息密度高，适合小地图
        zoom: 16,
        center: defaultCenter,
        resizeEnable: true,
        mapStyle: 'amap://styles/dark',   // 深色风格，贴合 AR UI
        features: ['road', 'building', 'background'],  // 隐藏默认的 poi/satellite
        showLabel: true,
        showMarker: false
      });

      // 反地理编码器（复用）
      this.geocoder = new window.AMap.Geocoder({
        city: '全国',
        radius: 500,
        extensions: 'base'
      });

      // 立刻在中心放一个小蓝点占位，等定位后再更新
      this._createUserMarker(defaultCenter);
      this._createHeadingArrow(defaultCenter);

      // 浏览器定位（独立于主页面的 GPS，确保小地图也能拿到位置）
      this._startBrowserLocation();
    } catch (e) {
      console.warn('[MiniMap] 初始化失败:', e);
      if (this.infoElement) {
        this.infoElement.textContent = '地图不可用';
      }
    }
  }

  _createUserMarker(center) {
    if (!window.AMap || !this.map) return;

    // 使用 SVG 自定义标记：绿色圆点 + 光环
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

    // 朝向箭头：三角形，绕着用户点旋转
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

  /**
   * 设置当前用户位置（经纬度）
   */
  setPosition(lng, lat) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    if (lng === 0 || lat === 0) return;

    this.currentLngLat = [lng, lat];

    if (this.map && this.userMarker) {
      this.userMarker.setPosition(this.currentLngLat);
      // 平滑地把地图中心移向用户
      this.map.setCenter(this.currentLngLat);
    }
    if (this.headingArrow) {
      this.headingArrow.setPosition(this.currentLngLat);
    }

    // 获取道路名（每 3 秒一次）
    this._reverseGeocode(lng, lat);

    // 更新目的地连线（如果设置了目的地）
    this._updatePolyline();
  }

  /**
   * 设置手机朝向角度（0-360，0=北，顺时针）
   */
  setHeading(deg) {
    if (!Number.isFinite(deg)) return;
    this.currentHeading = deg;
    if (this.headingArrow) {
      // AMap Marker rotation 是顺时针角度
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
    if (now - (this._lastGeoAt || 0) < 3000) return;
    this._lastGeoAt = now;

    try {
      this.geocoder.getAddress([lng, lat], (status, result) => {
        if (status === 'complete' && result && result.regeocode) {
          const regeo = result.regeocode;
          let road = '';
          if (regeo.roadnet && regeo.roadnet.length > 0) {
            road = regeo.roadnet[0].name || '';
          }
          if (!road && regeo.addressComponent) {
            road = regeo.addressComponent.township || regeo.addressComponent.district || '';
          }
          const formatted = regeo.formattedAddress || '';
          this.roadName = road;
          this.address = formatted;

          if (this.infoElement) {
            this.infoElement.textContent = road || formatted || '';
          }

          // 暴露给外部使用
          if (typeof this.onRoadUpdate === 'function') {
            this.onRoadUpdate(road, formatted);
          }
        }
      });
    } catch (e) {
      // silent
    }
  }

  /**
   * 设置底部文本（外部会调用）
   */
  setInfo(text) {
    if (this.infoElement) {
      this.infoElement.textContent = text || '';
    }
  }

  destroy() {
    if (this.watchId && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
  }
}
