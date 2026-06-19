/**
 * ============================================================
 * AR NAV · 3D UI 场景管理器
 * ============================================================
 * 
 * 负责渲染：
 *   - 中央导航大箭头（科技感 3D 线框/发光）
 *   - 背景点阵（增强AR深度感）
 * 
 * 保持纯黑背景 = AR 透明
 * 仅渲染发光 UI 元素
 * ============================================================
 */

import * as THREE from 'three'

export class Scene3D {

  constructor(canvas) {
    this.canvas = canvas

    // ---- 场景基础 ----
    this.scene = new THREE.Scene()
    this.scene.background = null  // 透明背景（AR效果）

    // ---- 相机：偏仰视视角 — 路线悬浮在用户前上方 ----
    this.camera = new THREE.PerspectiveCamera(
      70,  // FOV 略大，透视感更强
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    // 相机位于下方偏后，朝上看
    this.camera.position.set(0, -1.5, 3.5)
    this.camera.lookAt(0, 3.0, 0)

    // ---- 渲染器 ----
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)  // 完全透明

    // ---- UI 根节点（承载：指向箭头 + 霓虹路线）
    // 抬高到用户前上方，轻微朝相机倾斜 — 形成仰视感
    this._uiRoot = new THREE.Group()
    this._uiRoot.position.y = 3.0           // 悬浮高度
    this._uiRoot.rotation.x = -0.35         // 顶部向相机方向倾斜（约 20°）
    this._uiScale = 1.0                     // 用户可调节的比例尺（1.0 = 默认大小）
    this._uiRoot.scale.set(this._uiScale, this._uiScale, this._uiScale)
    this.scene.add(this._uiRoot)

    // ---- 初始化元素 ----
    this._initArrow()
    this._initParticles()
    this._initLight()
    this._initRouteLine()

    // ---- 状态 ----
    this.currentRotation = 0  // 当前箭头朝向（弧度）
    this.animating = false

    // ---- 响应窗口变化 ----
    window.addEventListener('resize', () => this._onResize())

    // ---- 启动动画循环 ----
    this._animate()
  }

  /* ========================================================
     初始化：3D 指向箭头（挂到 _uiRoot 上，共享浮动）
     ======================================================== */
  _initArrow() {
    this.arrowGroup = new THREE.Group()
    this.arrowGroup.visible = false  // 暂时隐藏箭头，只显示路线
    this._uiRoot.add(this.arrowGroup)

    // 青色发光材质
    const arrowColor = 0x00ffff
    const mat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      transparent: true,
      opacity: 0.9
    })

    // 线框材质（科技感）
    const wireMat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    })

    // --- 箭头主体（梯形+三角） ---
    // 1) 箭身：扁长立方体
    const shaftGeo = new THREE.BoxGeometry(1.5, 0.45, 0.15)
    const shaft = new THREE.Mesh(shaftGeo, mat)
    shaft.position.x = -0.5
    this.arrowGroup.add(shaft)

    // 箭身线框层（发光感）
    const shaftWire = new THREE.Mesh(shaftGeo, wireMat)
    shaftWire.position.x = -0.5
    shaftWire.scale.set(1.12, 1.15, 1.2)
    this.arrowGroup.add(shaftWire)

    // 2) 箭头头部：锥体
    const headGeo = new THREE.ConeGeometry(0.55, 0.9, 4)
    const head = new THREE.Mesh(headGeo, mat)
    head.rotation.z = -Math.PI / 2
    head.position.x = 0.9
    this.arrowGroup.add(head)

    const headWire = new THREE.Mesh(headGeo, wireMat)
    headWire.rotation.z = -Math.PI / 2
    headWire.position.x = 0.9
    headWire.scale.set(1.12, 1.12, 1.2)
    this.arrowGroup.add(headWire)

    // 3) 外部发光光晕环（在箭头周围旋转的圆环）
    const ringGeo = new THREE.TorusGeometry(0.85, 0.03, 6, 80)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.45
    })
    this.arrowRing = new THREE.Mesh(ringGeo, ringMat)
    this.arrowRing.position.x = -0.2
    this.arrowRing.rotation.y = Math.PI / 2
    this.arrowGroup.add(this.arrowRing)

    // 第二个环
    const ringGeo2 = new THREE.TorusGeometry(1.2, 0.02, 4, 60)
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.25
    })
    this.arrowRing2 = new THREE.Mesh(ringGeo2, ringMat2)
    this.arrowRing2.position.x = -0.2
    this.arrowRing2.rotation.x = Math.PI / 2
    this.arrowGroup.add(this.arrowRing2)

    // 初始朝向：箭头指向 +X 方向，我们让它默认指向上
    this.arrowGroup.rotation.z = Math.PI / 2
  }

  /* ========================================================
     初始化：背景粒子点（增加AR空间感）
     ======================================================== */
  _initParticles() {
    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(geom, mat)
    this.scene.add(this.particles)
  }

  /* ========================================================
     初始化：光照
     ======================================================== */
  _initLight() {
    // 基础环境光（很暗，保持黑色背景）
    const ambient = new THREE.AmbientLight(0x00ffff, 0.15)
    this.scene.add(ambient)
  }

  /* ========================================================
     初始化：路线线段（霓虹线段）—— 挂到 _uiRoot，与箭头共享浮动
     ======================================================== */
  _initRouteLine() {
    this.routeLineGroup = new THREE.Group()
    this.routeLineGroup.visible = false
    this._uiRoot.add(this.routeLineGroup)
  }

  /* ========================================================
     设置路线：把经纬度坐标映射到 3D 场景中
     ★ 关键优化（解决路线忽大忽小）：
       1) 固定参考点：路线第一个点作为几何原点（不随用户移动）
       2) 固定 scale：基于"路线总延伸范围"（而非到用户的最远距离）
       3) 用户位置仅影响 routeLineGroup 的 position（偏移）
       4) heading 仅影响 routeLineGroup 的 rotation.z（旋转）
       → 用户移动/转向时，路线大小保持稳定，仅位置/朝向变化
     ======================================================== */
  setRoute(coords, originLat, originLng, headingDeg) {
    this.clearRoute()
    if (!coords || coords.length < 2) return

    // 1) 经纬度 → ENU 局部东-北坐标（米），以路线第一点为固定原点
    const R = 6371000
    const firstLat = coords[0][1]
    const firstLng = coords[0][0]
    const latToM = (Math.PI / 180) * R
    const lngToM = (Math.PI / 180) * R * Math.cos(firstLat * Math.PI / 180)

    // 2) 计算每条路线点的 ENU 坐标 + 路线总延伸范围（固定值，不随用户变化）
    const localXY = []
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i]
      const x = (lng - firstLng) * lngToM   // 东向（米）
      const y = (lat - firstLat) * latToM   // 北向（米）
      localXY.push([x, y])
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    const routeExtent = Math.max(maxX - minX, maxY - minY, 100)
    const scale = 50.0 / routeExtent  // 再次放大（原 30.0），悬浮效果更醒目

    // 3) 存储固定参考信息，供后续 updateUserPosition/updateHeading 使用
    this._routeRef = {
      firstLat,
      firstLng,
      latToM,
      lngToM,
      scale,
      userLat: originLat,
      userLng: originLng,
      headingRad: (headingDeg || 0) * Math.PI / 180,
      segData: null,   // 填充于下方
      totalLen: 0       // 路线总长度（世界单位）
    }

    // 4) 构建路线线段 — 沿每段法向生成多条偏移副本，实现粗体线条效果
    //    (WebGL 中 LineBasicMaterial.linewidth 被忽略，只能靠多层叠加模拟线宽)
    const neonColor = 0x00ffff
    const darkColor = 0x004455  // 暗色，用于已走过的路线

    // 生成路线点集 + 每段的法向偏移（模拟粗线条）
    // offsets 单位 = 世界坐标的一小部分（≈ 0.04 × scale）
    // 用 5 条平行叠加线（0, +n, -n, +2n, -2n）
    const offsets = [0.0, 0.03, -0.03, 0.06, -0.06]

    // 主路线点（以 scale 缩放后）—— 记录每段的方向与法向
    const segData = []  // {p1x, p1y, p2x, p2y, dx, dy, nx, ny, len}

    for (let i = 0; i < localXY.length - 1; i++) {
      const [x1, y1] = localXY[i]
      const [x2, y2] = localXY[i + 1]
      const sx1 = x1 * scale, sy1 = y1 * scale
      const sx2 = x2 * scale, sy2 = y2 * scale
      const segLen = Math.sqrt((sx2 - sx1) ** 2 + (sy2 - sy1) ** 2)
      if (segLen < 0.01) continue

      // 法向（单位向量，逆时针旋转 90°）
      const dx = (sx2 - sx1) / segLen
      const dy = (sy2 - sy1) / segLen
      const nx = -dy
      const ny = dx

      const steps = Math.max(2, Math.ceil(segLen / 0.12))
      for (let s = 0; s < steps; s++) {
        const t1 = s / steps
        const t2 = (s + 1) / steps
        const p1x = sx1 + (sx2 - sx1) * t1
        const p1y = sy1 + (sy2 - sy1) * t1
        const p2x = sx1 + (sx2 - sx1) * t2
        const p2y = sy1 + (sy2 - sy1) * t2

        segData.push({ p1x, p1y, p2x, p2y, nx, ny, isDash: (s % 2 === 0) })
      }
    }

    // 保存 segData 并计算路线总长度（便于 updateUserPosition 判定"已走过"）
    this._routeRef.segData = segData
    this._routeRef.totalLen = 0
    for (let k = 0; k < segData.length; k++) {
      this._routeRef.totalLen += Math.sqrt(
        (segData[k].p2x - segData[k].p1x) ** 2 +
        (segData[k].p2y - segData[k].p1y) ** 2
      )
    }

    // --- 辅助函数：按 offset 沿法向偏移生成位置数组 ---
    function buildPositions(segs, offset, useAll) {
      const arr = []
      for (let k = 0; k < segs.length; k++) {
        const sg = segs[k]
        if (!useAll && !sg.isDash) continue
        const ox = sg.nx * offset
        const oy = sg.ny * offset
        arr.push(sg.p1x + ox, sg.p1y + oy, 0)
        arr.push(sg.p2x + ox, sg.p2y + oy, 0)
      }
      return arr
    }

    // --- 多层发光线条（外 → 内，亮度递增） ---
    //   (a) 最外层宽淡光晕（offset ±0.06, ±0.03, 0 叠加）
    //   (b) 中等级发光
    //   (c) 虚线核心高亮

    // (a1) 最外层宽淡光晕 — 5 条平行叠加（offset ±0.06, ±0.03, 0）
    for (let oi = 0; oi < offsets.length; oi++) {
      const off = offsets[oi]
      const posOuter = buildPositions(segData, off, true)
      if (posOuter.length >= 6) {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(posOuter, 3))
        const m = new THREE.LineBasicMaterial({
          color: 0x66ffff,
          transparent: true,
          opacity: 0.18
        })
        this.routeLineGroup.add(new THREE.LineSegments(g, m))
      }
    }

    // (a2) 中等级发光 — 3 条平行（±0.03, 0）
    const midOffsets = [0.0, 0.03, -0.03]
    for (let oi = 0; oi < midOffsets.length; oi++) {
      const off = midOffsets[oi]
      const posMid = buildPositions(segData, off, true)
      if (posMid.length >= 6) {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(posMid, 3))
        const m = new THREE.LineBasicMaterial({
          color: neonColor,
          transparent: true,
          opacity: 0.42
        })
        this.routeLineGroup.add(new THREE.LineSegments(g, m))
      }
    }

    // (b) 实线外轮廓（连续、中等亮度） — 3 条叠加
    for (let oi = 0; oi < midOffsets.length; oi++) {
      const off = midOffsets[oi] * 0.5
      const posSolid = buildPositions(segData, off, true)
      if (posSolid.length >= 6) {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(posSolid, 3))
        const m = new THREE.LineBasicMaterial({
          color: neonColor,
          transparent: true,
          opacity: 0.6
        })
        this.routeLineGroup.add(new THREE.LineSegments(g, m))
      }
    }

    // (c) 虚线核心高亮 — 3 条平行（更亮）
    for (let oi = 0; oi < midOffsets.length; oi++) {
      const off = midOffsets[oi] * 0.3
      const posDash = buildPositions(segData, off, false)
      if (posDash.length >= 6) {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(posDash, 3))
        const m = new THREE.LineBasicMaterial({
          color: neonColor,
          transparent: true,
          opacity: 0.95
        })
        this.routeLineGroup.add(new THREE.LineSegments(g, m))
      }
    }

    // (d) 最内层核心线（最亮，居中）
    const posCore = buildPositions(segData, 0, true)
    if (posCore.length >= 6) {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(posCore, 3))
      const m = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
      })
      this.routeLineGroup.add(new THREE.LineSegments(g, m))
    }

    // (e) 沿路线每隔固定距离放置一个无柄箭头（三角形箭头头）
    //     箭头方向 = 该点处路线的前进方向
    const arrowSpacing = 1.6       // 箭头间距（世界单位）
    const arrowSize = 0.14         // 箭头大小（稍放大以匹配新场景比例）
    const accumSegs = []           // 原始路线段（细分后的 segs，用于精确沿路径放箭头）
    for (let si = 0; si < segData.length; si++) {
      const sg = segData[si]
      const vx = sg.p2x - sg.p1x
      const vy = sg.p2y - sg.p1y
      const len = Math.sqrt(vx * vx + vy * vy)
      if (len < 0.001) continue
      accumSegs.push({
        ax: sg.p1x, ay: sg.p1y,
        bx: sg.p2x, by: sg.p2y,
        dx: vx / len, dy: vy / len,
        len: len
      })
    }
    if (accumSegs.length > 0) {
      let traveled = 0
      let nextArrow = arrowSpacing * 0.5   // 第一个箭头放在 ½ 间距处（视觉更平衡）
      let si = 0
      let remaining = accumSegs[0].len
      while (si < accumSegs.length) {
        const seg = accumSegs[si]
        if (nextArrow <= traveled + remaining) {
          // 在当前 seg 内放置箭头
          const localT = (nextArrow - traveled) / seg.len
          const px = seg.ax + (seg.bx - seg.ax) * localT
          const py = seg.ay + (seg.by - seg.ay) * localT
          const dirX = seg.dx
          const dirY = seg.dy

          // 构建三角形箭头头（等腰三角形，尖端朝向 dir）
          // 本地坐标：三角形沿 +X 方向（尖端在 +ahead，底部在 -behind，底宽 halfWidth）
          const ahead = arrowSize * 1.2
          const behind = -arrowSize * 0.5
          const halfW = arrowSize * 0.6

          // 本地 3 个顶点
          const v0 = [ahead, 0]
          const v1 = [behind, halfW]
          const v2 = [behind, -halfW]

          // 旋转到实际方向（逆时针 rotation by atan2(dirY, dirX)）
          const cosR = dirX
          const sinR = dirY
          const rotate = (x, y) => [
            x * cosR - y * sinR,
            x * sinR + y * cosR
          ]
          const r0 = rotate(v0[0], v0[1])
          const r1 = rotate(v1[0], v1[1])
          const r2 = rotate(v2[0], v2[1])

          // 作为实心三角形面
          const triGeo = new THREE.BufferGeometry()
          const triVerts = new Float32Array([
            px + r0[0], py + r0[1], 0,
            px + r1[0], py + r1[1], 0,
            px + r2[0], py + r2[1], 0
          ])
          triGeo.setAttribute('position', new THREE.BufferAttribute(triVerts, 3))
          triGeo.computeVertexNormals()
          const triMat = new THREE.MeshBasicMaterial({
            color: neonColor,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
          })
          this.routeLineGroup.add(new THREE.Mesh(triGeo, triMat))

          nextArrow += arrowSpacing
        } else {
          traveled += remaining
          si += 1
          if (si < accumSegs.length) {
            remaining = accumSegs[si].len
          }
        }
      }
    }

    // (f) 终点标记（发光立方体 + 圆环）—— 加粗 2 倍
    if (localXY.length >= 1) {
      const lastIdx = localXY.length - 1
      const [ex, ey] = localXY[lastIdx]
      const exs = ex * scale
      const eys = ey * scale

      // 外发光立方（大）
      const outerEndGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3)
      const outerEndMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        transparent: true,
        opacity: 0.35
      })
      const outerEnd = new THREE.Mesh(outerEndGeo, outerEndMat)
      outerEnd.position.set(exs, eys, 0)
      this.routeLineGroup.add(outerEnd)

      // 核心立方（小，更亮）
      const endGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
      const endMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        transparent: true,
        opacity: 0.95
      })
      const endBox = new THREE.Mesh(endGeo, endMat)
      endBox.position.set(exs, eys, 0)
      this._routeEndMarker = endBox
      this.routeLineGroup.add(endBox)

      // 外环（更粗）
      const ringGeo = new THREE.TorusGeometry(2.0, 0.12, 8, 80)
      const ringMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        transparent: true,
        opacity: 0.85
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.set(exs, eys, 0)
      this._routeEndRing = ring
      this.routeLineGroup.add(ring)

      // 第二环（外发光）
      const ring2Geo = new THREE.TorusGeometry(2.8, 0.08, 6, 60)
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0x88ffff,
        transparent: true,
        opacity: 0.4
      })
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
      ring2.position.set(exs, eys, 0)
      this.routeLineGroup.add(ring2)
    }

    // (f) 起点标记（小立方 + 发光）
    const startGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
    const startMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    })
    const startBox = new THREE.Mesh(startGeo, startMat)
    startBox.position.set(0, 0, 0)
    this.routeLineGroup.add(startBox)

    // 5) 走过的路线暗色覆盖层（叠加在亮色路线之上）
    this._traveledLineGroup = new THREE.Group()
    this.routeLineGroup.add(this._traveledLineGroup)
    this._rebuildTraveledSegments()

    // 6) 设置用户位置偏移 + heading 旋转（使路线以用户为中心，用户前方朝屏幕上方）
    this._updateRouteTransform()
    this.routeLineGroup.visible = true
  }

  /* ========================================================
     ★ 根据用户当前位置重建"已走过"的暗色线段
     ======================================================== */
  _rebuildTraveledSegments() {
    if (!this._traveledLineGroup) return
    const ref = this._routeRef
    if (!ref || !ref.segData || ref.segData.length === 0) return

    // 清除旧的暗色段
    while (this._traveledLineGroup.children.length > 0) {
      const c = this._traveledLineGroup.children[0]
      try { if (c.geometry) c.geometry.dispose() } catch (e) {}
      try { if (c.material) c.material.dispose() } catch (e) {}
      this._traveledLineGroup.remove(c)
    }

    // 用户在路线局部坐标系中的位置
    const userX = (ref.userLng - ref.firstLng) * ref.lngToM * ref.scale
    const userY = (ref.userLat - ref.firstLat) * ref.latToM * ref.scale

    // 沿路线按段累加距离并做投影，找到"当前"所在的段
    const segs = ref.segData
    let traveledUpto = -1  // 已完全走过的段的索引（含该段）
    let partialSeg = -1
    let partialT = 0

    for (let k = 0; k < segs.length; k++) {
      const s = segs[k]
      const vx = s.p2x - s.p1x
      const vy = s.p2y - s.p1y
      const len2 = vx * vx + vy * vy
      if (len2 < 1e-8) { partialSeg = k; continue }
      const t = ((userX - s.p1x) * vx + (userY - s.p1y) * vy) / len2
      if (t < 0) break  // 用户还没走到这条段的起点
      if (t <= 1) {
        // 用户在该段内
        partialSeg = k
        partialT = t
        break
      }
      traveledUpto = k
    }

    // 用暗色绘制所有"已完全走过"的段 + 当前段的部分
    const darkColor = 0x004455
    const offsetList = [0.0, 0.03, -0.03, 0.06, -0.06]

    // 构建暗色段（完全走过）
    if (traveledUpto >= 0) {
      for (let oi = 0; oi < offsetList.length; oi++) {
        const off = offsetList[oi]
        const arr = []
        for (let k = 0; k <= traveledUpto; k++) {
          const s = segs[k]
          const ox = s.nx * off
          const oy = s.ny * off
          arr.push(s.p1x + ox, s.p1y + oy, 0)
          arr.push(s.p2x + ox, s.p2y + oy, 0)
        }
        if (arr.length >= 6) {
          const g = new THREE.BufferGeometry()
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3))
          const opacity = (oi === 0) ? 0.55 : 0.25
          const m = new THREE.LineBasicMaterial({
            color: darkColor,
            transparent: true,
            opacity: opacity
          })
          this._traveledLineGroup.add(new THREE.LineSegments(g, m))
        }
      }
    }

    // 构建当前段的部分（从起点到用户投影位置）
    if (partialSeg >= 0 && partialT > 0 && traveledUpto < partialSeg) {
      const s = segs[partialSeg]
      for (let oi = 0; oi < offsetList.length; oi++) {
        const off = offsetList[oi]
        const ox = s.nx * off
        const oy = s.ny * off
        const p1x = s.p1x + ox, p1y = s.p1y + oy
        const p2x = s.p1x + (s.p2x - s.p1x) * partialT + ox
        const p2y = s.p1y + (s.p2y - s.p1y) * partialT + oy
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          p1x, p1y, 0, p2x, p2y, 0
        ]), 3))
        const opacity = (oi === 0) ? 0.55 : 0.25
        const m = new THREE.LineBasicMaterial({
          color: darkColor,
          transparent: true,
          opacity: opacity
        })
        this._traveledLineGroup.add(new THREE.LineSegments(g, m))
      }
    }
  }

  /* ========================================================
     ★ 用户位置更新（不重建几何体！仅修改 offset + rotation）
     用户移动时调用，使路线保持正确的相对位置和方向
     ======================================================== */
  updateUserPosition(userLat, userLng, headingDeg) {
    if (!this._routeRef) return
    this._routeRef.userLat = userLat
    this._routeRef.userLng = userLng
    if (headingDeg != null) {
      this._routeRef.headingRad = headingDeg * Math.PI / 180
    }
    this._updateRouteTransform()
    this._rebuildTraveledSegments()  // 位置变化后重建暗色已走路段
  }

  /* ========================================================
     ★ heading 仅影响旋转（不重建几何体）
     ======================================================== */
  updateHeading(headingDeg) {
    if (!this._routeRef) return
    this._routeRef.headingRad = (headingDeg || 0) * Math.PI / 180
    this._updateRouteTransform()
  }

  /* ========================================================
     ★ 3D 场景比例尺缩放（与 mini-map 同步）
     scale: 相对默认大小的倍数（0.2 ~ 3.0）
     影响：指向箭头 + 霓虹路线 + 终点环 + 粒子 整体放大/缩小
     ======================================================== */
  setUIScale(scale) {
    if (!this._uiRoot) return
    const s = Math.max(0.1, Math.min(5.0, Number(scale) || 1.0))
    this._uiScale = s
    this._uiRoot.scale.set(s, s, s)
  }

  getUIScale() {
    return this._uiScale
  }

  /* ========================================================
     ★ 内部：根据存储的参考信息，更新路线的 position + rotation
     routeLineGroup 坐标系统：
       - 子几何体在 ENU 空间（localXY * scale，以 first point 为原点）
       - 我们要用户始终在场景中心 (0,0,0)，用户前方始终朝屏幕上方 (+y)
       - 所以：先将路线围绕用户位置平移，再按 heading 旋转
       - 变换顺序：world = position + rotate_by_heading(localPosition)
         → position = -rotate(user_local_position, heading_rad)
     ======================================================== */
  _updateRouteTransform() {
    const ref = this._routeRef
    if (!ref) return
    if (!this.routeLineGroup) return

    // user position in ENU coords (in meters from first point)
    const userX = (ref.userLng - ref.firstLng) * ref.lngToM
    const userY = (ref.userLat - ref.firstLat) * ref.latToM
    const ux = userX * ref.scale
    const uy = userY * ref.scale

    // rotate user's local position by heading counterclockwise
    const cosH = Math.cos(ref.headingRad)
    const sinH = Math.sin(ref.headingRad)
    // rotate((x,y), heading_ccw) = (x*cos - y*sin, x*sin + y*cos)
    const rotX = ux * cosH - uy * sinH
    const rotY = ux * sinH + uy * cosH

    // translate by -rotated_user so user ends up at (0,0)
    this.routeLineGroup.position.x = -rotX
    this.routeLineGroup.position.y = -rotY
    this.routeLineGroup.rotation.z = ref.headingRad
  }

  /* ========================================================
     清除路线（释放几何体/材质）
     ======================================================== */
  clearRoute() {
    if (!this.routeLineGroup) return
    this.routeLineGroup.traverse(obj => {
      if (obj.geometry) {
        try { obj.geometry.dispose() } catch (e) {}
      }
      if (obj.material) {
        try {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
          else obj.material.dispose()
        } catch (e) {}
      }
    })
    while (this.routeLineGroup.children.length > 0) {
      this.routeLineGroup.remove(this.routeLineGroup.children[0])
    }
    this._routeEndMarker = null
    this._routeEndRing = null
    this._routeRef = null
    this.routeLineGroup.visible = false
  }

  /* ========================================================
     动画循环：让 _uiRoot 统一做呼吸浮动；
     箭头仍然平滑插值自己的 rotation.z；
     路线终点做呼吸放大与旋转 —— 整体步调一致。
     ======================================================== */
  _animate() {
    requestAnimationFrame(() => this._animate())

    const t = performance.now() * 0.001

    // _uiRoot 位置 & 倾斜固定（悬浮在前上方，顶部朝向相机）
    // 不再做呼吸浮动，保持稳定的仰视姿态
    this._uiRoot.position.y = 3.0
    this._uiRoot.rotation.x = -0.35

    // 箭头旋转朝向平滑过渡
    if (this.arrowGroup) {
      this.arrowGroup.rotation.z +=
        (this.currentRotation - this.arrowGroup.rotation.z) * 0.08
    }

    // 箭头光环旋转
    if (this.arrowRing)  this.arrowRing.rotation.z  += 0.025
    if (this.arrowRing2) this.arrowRing2.rotation.z -= 0.018

    // 粒子缓慢漂浮
    if (this.particles) {
      this.particles.rotation.y = t * 0.02
      this.particles.rotation.x = Math.sin(t * 0.1) * 0.05
    }

    // 路线终点标记动画（呼吸 + 旋转）
    if (this._routeEndMarker) {
      const pulse = 1.0 + Math.sin(t * 2.0) * 0.25
      this._routeEndMarker.scale.set(pulse, pulse, pulse)
      this._routeEndMarker.rotation.z += 0.04
    }
    if (this._routeEndRing) {
      this._routeEndRing.rotation.z += 0.03
    }

    this.renderer.render(this.scene, this.camera)
  }

  /* ========================================================
     设置箭头朝向角度（度）
     0 = 前方 / 正前方 = 指向上方
     左转为负，右转为正
     ======================================================== */
  setDirection(angleDeg) {
    // 用户朝向前方始终对应屏幕上方 (+y)
    // 传入的 angleDeg 为"目的地相对于用户前方"的角度：
    //   0° = 正前方（上方），+90° = 右方（屏幕右），-90° = 左方（屏幕左），±180° = 后方
    // 注意：导航中 bearing 是顺时针（0°=北），而 Three.js rotation.z 是逆时针
    // 所以使用 π/2 - angle_rad 让 +angle 向屏幕右方偏转
    const rad = (angleDeg * Math.PI) / 180
    this.currentRotation = Math.PI / 2 - rad
  }

  /* ========================================================
     切换为转弯指示（视觉变化：颜色/放大）
     ======================================================== */
  setTurnMode(type /* 'straight' | 'left' | 'right' | 'uturn' */) {
    if (!this.arrowGroup) return

    let targetColor = 0x00ffff
    let scale = 1

    switch (type) {
      case 'left':
        targetColor = 0x00ffff
        scale = 1.1
        this.setDirection(-60)
        break
      case 'right':
        targetColor = 0x00ffff
        scale = 1.1
        this.setDirection(60)
        break
      case 'uturn':
        targetColor = 0xffaa00
        scale = 1.2
        this.setDirection(180)
        break
      case 'straight':
      default:
        targetColor = 0x00ffff
        scale = 1
        this.setDirection(0)
        break
    }

    // 平滑缩放
    this.arrowGroup.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)

    // 颜色变化（这里简化用材质统一颜色）
    this.arrowGroup.children.forEach(child => {
      if (child.material && child.material.color) {
        child.material.color.lerp(
          new THREE.Color(targetColor),
          0.1
        )
      }
    })
  }

  /* ========================================================
     响应窗口大小
     ======================================================== */
  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

}
