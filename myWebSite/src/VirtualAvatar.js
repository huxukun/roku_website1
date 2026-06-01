import * as THREE from 'three'

export default class VirtualAvatar {
  constructor(scene, camera, canvas) {
    try {
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

      this.createAvatar()
      this.setupEventListeners()
      this.createBubble()
      console.log('VirtualAvatar initialized successfully')
    } catch (error) {
      console.error('Error initializing VirtualAvatar:', error)
    }
  }

  createAvatar() {
    try {
      const pixelMaterial = new THREE.LineBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.9
      })

      const bodyGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2)
      const bodyEdges = new THREE.EdgesGeometry(bodyGeometry)
      const body = new THREE.LineSegments(bodyEdges, pixelMaterial)
      body.position.y = 0.25
      this.group.add(body)

      const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
      const headEdges = new THREE.EdgesGeometry(headGeometry)
      const head = new THREE.LineSegments(headEdges, pixelMaterial)
      head.position.y = 0.7
      this.group.add(head)

      const eyeGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.025)
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF00FF,
        transparent: true,
        opacity: 1
      })
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      leftEye.position.set(-0.06, 0.725, 0.15)
      this.group.add(leftEye)

      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      rightEye.position.set(0.06, 0.725, 0.15)
      this.group.add(rightEye)

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

      const armGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1)
      const armEdges = new THREE.EdgesGeometry(armGeometry)
      
      const leftArm = new THREE.LineSegments(armEdges, pixelMaterial)
      leftArm.position.set(-0.275, 0.3, 0)
      this.group.add(leftArm)

      const rightArm = new THREE.LineSegments(armEdges, pixelMaterial)
      rightArm.position.set(0.275, 0.3, 0)
      this.group.add(rightArm)

      const legGeometry = new THREE.BoxGeometry(0.1, 0.35, 0.1)
      const legEdges = new THREE.EdgesGeometry(legGeometry)
      
      const leftLeg = new THREE.LineSegments(legEdges, pixelMaterial)
      leftLeg.position.set(-0.1, -0.15, 0)
      this.group.add(leftLeg)

      const rightLeg = new THREE.LineSegments(legEdges, pixelMaterial)
      rightLeg.position.set(0.1, -0.15, 0)
      this.group.add(rightLeg)

      this.group.position.set(2, 0.25, -1)
      this.group.scale.set(0.6, 0.6, 0.6)
      this.scene.add(this.group)

      this.head = head
      this.antennaBall = antennaBall
      this.leftEye = leftEye
      this.rightEye = rightEye
    } catch (error) {
      console.error('Error creating avatar:', error)
    }
  }

  createBubble() {
    try {
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
    } catch (error) {
      console.error('Error creating bubble:', error)
    }
  }

  showBubble() {
    try {
      if (!this.bubbleElement) return;
      
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
    } catch (error) {
      console.error('Error showing bubble:', error)
    }
  }

  setupEventListeners() {
    try {
      this.canvas.addEventListener('click', (event) => this.onClick(event))
    } catch (error) {
      console.error('Error setting up event listeners:', error)
    }
  }

  onClick(event) {
    try {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.group.children, true)

      if (intersects.length > 0 && !this.isJumping) {
        this.startJump()
        this.showBubble()
      }
    } catch (error) {
      console.error('Error handling click:', error)
    }
  }

  startJump() {
    this.isJumping = true
    this.jumpProgress = 0
  }

  update(time) {
    try {
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
    } catch (error) {
      console.error('Error updating avatar:', error)
    }
  }

  dispose() {
    try {
      if (this.group && this.scene) {
        this.scene.remove(this.group)
      }
      if (this.bubbleElement) {
        this.bubbleElement.remove()
      }
      if (this.bubbleTimeout) {
        clearTimeout(this.bubbleTimeout)
      }
    } catch (error) {
      console.error('Error disposing avatar:', error)
    }
  }
}
