import * as THREE from 'three'

export default class SynthwaveSun {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.sun = null
    this.light = null
    this.init()
  }

  init() {
    const canvas = this.createSunTexture()
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const sunGeometry = new THREE.CircleGeometry(18, 96)
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      renderOrder: 1
    })
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial)
    this.sun.position.set(0, 3, -80)
    this.scene.add(this.sun)

    this.createLight()
  }

  createSunTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#FFFF00')
    gradient.addColorStop(0.4, '#FF6600')
    gradient.addColorStop(0.7, '#FF3300')
    gradient.addColorStop(1, '#FF0000')

    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 5, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    const centerY = canvas.height / 2
    const radius = canvas.width / 2 - 5
    const stripeCount = 6

    for (let i = 0; i < stripeCount; i++) {
      const progress = i / (stripeCount - 1)
      const stripeWidth = 40 * (1 - progress * 0.5)
      const stripeGap = 30 * (1 - progress * 0.4)
      
      const stripeTop = centerY + radius * 0.25 + (stripeWidth + stripeGap) * i
      const stripeBottom = stripeTop + stripeWidth

      if (stripeTop < canvas.height) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2)
        ctx.clip()
        
        ctx.clearRect(0, stripeTop, canvas.width, stripeBottom - stripeTop)
        ctx.restore()
      }
    }

    return canvas
  }

  createLight() {
    const ambientLight = new THREE.AmbientLight(0xFF9900, 0.2)
    this.scene.add(ambientLight)

    this.light = new THREE.DirectionalLight(0xFF6600, 0.35)
    this.light.position.copy(this.sun.position)
    this.light.target.position.set(0, 0, 0)
    this.scene.add(this.light)
    this.scene.add(this.light.target)
  }

  update() {
    if (this.sun && this.camera) {
      this.sun.lookAt(this.camera.position)
    }
  }

  dispose() {
    if (this.sun) {
      this.scene.remove(this.sun)
      this.sun.geometry.dispose()
      this.sun.material.dispose()
    }
    if (this.light) {
      this.scene.remove(this.light)
      this.scene.remove(this.light.target)
    }
  }
}
