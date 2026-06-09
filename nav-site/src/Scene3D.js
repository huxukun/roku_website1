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

    // ---- 相机 ----
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.z = 5

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

    // ---- 初始化元素 ----
    this._initArrow()
    this._initParticles()
    this._initLight()

    // ---- 状态 ----
    this.currentRotation = 0  // 当前箭头朝向（弧度）
    this.animating = false

    // ---- 响应窗口变化 ----
    window.addEventListener('resize', () => this._onResize())

    // ---- 启动动画循环 ----
    this._animate()
  }

  /* ========================================================
     初始化：3D大箭头
     ======================================================== */
  _initArrow() {
    this.arrowGroup = new THREE.Group()
    this.scene.add(this.arrowGroup)

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
     动画循环
     ======================================================== */
  _animate() {
    requestAnimationFrame(() => this._animate())

    const t = performance.now() * 0.001

    // 箭头浮动呼吸感
    if (this.arrowGroup) {
      const floatY = Math.sin(t * 1.5) * 0.08
      this.arrowGroup.position.y = floatY

      // 箭头旋转朝向平滑过渡
      this.arrowGroup.rotation.z +=
        (this.currentRotation - this.arrowGroup.rotation.z) * 0.08
    }

    // 光环旋转
    if (this.arrowRing)  this.arrowRing.rotation.z  += 0.025
    if (this.arrowRing2) this.arrowRing2.rotation.z -= 0.018

    // 粒子缓慢漂浮
    if (this.particles) {
      this.particles.rotation.y = t * 0.02
      this.particles.rotation.x = Math.sin(t * 0.1) * 0.05
    }

    this.renderer.render(this.scene, this.camera)
  }

  /* ========================================================
     设置箭头朝向角度（度）
     0 = 前方 / 正前方 = 指向上方
     左转为负，右转为正
     ======================================================== */
  setDirection(angleDeg) {
    // 角度 → 弧度
    // 箭头初始朝向为向上（+Z 旋转 90° = π/2）
    // 我们用：0° 代表前方，左转-90°=向左，右转90°=向右
    const rad = (angleDeg * Math.PI) / 180
    this.currentRotation = Math.PI / 2 + rad
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
