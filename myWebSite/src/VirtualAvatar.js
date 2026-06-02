import * as THREE from 'three'

export default class VirtualAvatar {
  constructor(scene, camera, canvas) {
    this.scene = scene
    this.camera = camera
    this.canvas = canvas
    this.group = new THREE.Group()
    this.isJumping = false
    this.jumpProgress = 0
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.bubbleElement = null
    this.bubbleTimeout = null
    this.greetings = [
      '你好创作者！',
      '欢迎来到我的作品集！',
      '很高兴见到你！',
      '准备好冒险了吗？',
      '赛博网格等待着你！',
      '让我们一起创造吧！',
      '你好，净网者！',
      '合成波时间到！',
      '赛博氛围！',
      '数字自由！'
    ]

    console.log('Initializing VirtualAvatar...')
    this.createAvatar()
    this.setupEventListeners()
    this.createBubble()
    console.log('VirtualAvatar initialized successfully')
  }

  createAvatar() {
    console.log('Creating avatar...')
    
    // 碰撞盒（要先添加）
    const hitboxMaterial = new THREE.MeshBasicMaterial({
      transparent: false,
      opacity: 1,
      color: 0x00FFFF,
      visible: false // 设置为不可见，不是透明
    })
    
    // 大碰撞盒覆盖整个机器人
    const bigHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2, 1),
      hitboxMaterial
    )
    bigHitbox.position.y = 0.6
    bigHitbox.name = 'hitbox'
    this.group.add(bigHitbox)
    console.log('Added hitbox to group')

    // 线框材质
    const pixelMaterial = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.9
    })

    // 身体
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2)
    const bodyEdges = new THREE.EdgesGeometry(bodyGeometry)
    const body = new THREE.LineSegments(bodyEdges, pixelMaterial)
    body.position.y = 0.25
    this.group.add(body)

    // 头部
    const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
    const headEdges = new THREE.EdgesGeometry(headGeometry)
    const head = new THREE.LineSegments(headEdges, pixelMaterial)
    head.position.y = 0.7
    this.group.add(head)

    // 眼睛（Mesh可以被检测）
    const eyeGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.025)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF00FF
    })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.06, 0.725, 0.15)
    this.group.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.06, 0.725, 0.15)
    this.group.add(rightEye)

    // 天线
    const antennaGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8)
    const antenna = new THREE.LineSegments(new THREE.EdgesGeometry(antennaGeometry), pixelMaterial)
    antenna.position.set(0, 0.95, 0)
    this.group.add(antenna)

    const antennaBall = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(0.03, 8, 8)),
      pixelMaterial
    )
    antennaBall.position.set(0, 1.05, 0)
    this.group.add(antennaBall)

    // 手臂
    const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1)
    const armEdges = new THREE.EdgesGeometry(armGeometry)
    
    const leftArm = new THREE.LineSegments(armEdges, pixelMaterial)
    leftArm.position.set(-0.275, 0.3, 0)
    this.group.add(leftArm)

    const rightArm = new THREE.LineSegments(armEdges, pixelMaterial)
    rightArm.position.set(0.275, 0.3, 0)
    this.group.add(rightArm)

    // 腿
    const legGeometry = new THREE.BoxGeometry(0.1, 0.35, 0.1)
    const legEdges = new THREE.EdgesGeometry(legGeometry)
    
    const leftLeg = new THREE.LineSegments(legEdges, pixelMaterial)
    leftLeg.position.set(-0.1, -0.15, 0)
    this.group.add(leftLeg)

    const rightLeg = new THREE.LineSegments(legEdges, pixelMaterial)
    rightLeg.position.set(0.1, -0.15, 0)
    this.group.add(rightLeg)

    // 保存引用
    this.head = head
    this.antennaBall = antennaBall
    this.leftEye = leftEye
    this.rightEye = rightEye
    this.hitboxes = [bigHitbox, leftEye, rightEye]

    // 定位整个组
    this.group.position.set(2, 0.25, -1)
    this.group.scale.set(0.6, 0.6, 0.6)
    this.scene.add(this.group)
    console.log('Avatar added to scene, position:', this.group.position)
    console.log('Group children count:', this.group.children.length)
  }

  createBubble() {
    this.bubbleElement = document.createElement('div')
    this.bubbleElement.className = 'avatar-bubble'
    this.bubbleElement.style.cssText = `
      position: fixed;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.95);
      border: 3px solid #00FFFF;
      padding: 20px 24px;
      border-radius: 12px;
      color: #00FFFF;
      font-family: 'Press Start 2P', cursive;
      font-size: 14px;
      max-width: 300px;
      text-align: center;
      display: none;
      pointer-events: none;
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.7), 0 0 60px rgba(0, 255, 255, 0.3);
    `
    document.body.appendChild(this.bubbleElement)
  }

  showBubble() {
    if (!this.bubbleElement) return
    
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout)
    }

    const greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)]
    this.bubbleElement.textContent = greeting

    const vector = new THREE.Vector3()
    this.group.getWorldPosition(vector)
    vector.project(this.camera)

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight

    this.bubbleElement.style.display = 'block'
    this.bubbleElement.style.left = `${x + 40}px`
    this.bubbleElement.style.top = `${y - 80}px`

    this.bubbleTimeout = setTimeout(() => {
      if (this.bubbleElement) {
        this.bubbleElement.style.display = 'none'
      }
    }, 3000)
  }

  setupEventListeners() {
    console.log('Setting up event listeners...')
    // 直接绑定到document，而不是canvas
    document.addEventListener('click', (event) => this.onClick(event), true)
    console.log('Event listener added to document')
  }

  onClick(event) {
    console.log('VirtualAvatar onClick triggered!')
    console.log('Target:', event.target.tagName, event.target.id)
    
    // 转换鼠标坐标
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    console.log('Mouse coords:', this.mouse.x.toFixed(3), this.mouse.y.toFixed(3))

    // 检查鼠标是否在canvas范围内
    if (this.mouse.x < -1 || this.mouse.x > 1 || this.mouse.y < -1 || this.mouse.y > 1) {
      console.log('Mouse outside canvas, skipping')
      return
    }

    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    // 检测碰撞盒
    const intersects = this.raycaster.intersectObjects(this.hitboxes, true)

    console.log('Intersects found:', intersects.length)

    if (intersects.length > 0 && !this.isJumping) {
      console.log('Avatar clicked! Hit:', intersects[0].object.name)
      this.startJump()
      this.showBubble()
    }
  }

  startJump() {
    this.isJumping = true
    this.jumpProgress = 0
  }

  update(time) {
    if (this.isJumping) {
      this.jumpProgress += 0.03
      const height = Math.sin(this.jumpProgress * Math.PI) * 0.75
      this.group.position.y = 0.25 + height
      this.group.rotation.y += 0.2

      if (this.jumpProgress >= 1) {
        this.isJumping = false
        this.jumpProgress = 0
        this.group.position.y = 0.25
      }
    }

    if (this.antennaBall) {
      const pulse = Math.sin(time / 300) * 0.2 + 0.8
      this.antennaBall.material.opacity = pulse
    }
  }

  dispose() {
    if (this.group && this.scene) {
      this.scene.remove(this.group)
    }
    if (this.bubbleElement) {
      this.bubbleElement.remove()
    }
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout)
    }
  }
}
