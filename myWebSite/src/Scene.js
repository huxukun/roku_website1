import * as THREE from 'three'

export default class Scene {
  constructor() {
    this.instance = new THREE.Scene()
    this.backgroundSphere = null
    this.setLights()
    this.setVerticalGradientBackground()
    // 禁用雾效果
    this.instance.fog = null
  }

  setLights() {
    // 这里我们不添加默认光源，由 SynthwaveSun 管理光源
  }

  setVerticalGradientBackground() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    // 垂直渐变：地平线深橙色 → 顶部更深
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
    gradient.addColorStop(0, '#0d0400')    // 更深的深橙色（地平线）
    gradient.addColorStop(0.5, '#060310')  // 更深的中间过渡
    gradient.addColorStop(1, '#010108')    // 非常深的靛蓝色（顶部）

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    // 增大背景球体，避免遮挡
    const geometry = new THREE.SphereGeometry(500, 64, 64)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    })

    this.backgroundSphere = new THREE.Mesh(geometry, material)
    this.instance.add(this.backgroundSphere)
  }

  dispose() {
    while (this.instance.children.length > 0) {
      const child = this.instance.children[0]
      this.instance.remove(child)
      
      if (child.geometry) {
        child.geometry.dispose()
      }
      
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose())
        } else {
          child.material.dispose()
        }
      }
      
      if (child.dispose) {
        child.dispose()
      }
    }
  }
}
