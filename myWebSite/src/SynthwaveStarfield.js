import * as THREE from 'three'

export default class SynthwaveStarfield {
  constructor(scene, count = 2000) {
    this.scene = scene
    this.count = count
    this.stars = null
    this.twinkleOffsets = null
    this.init()
  }

  init() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    this.twinkleOffsets = new Float32Array(this.count)

    const color1 = new THREE.Color(0xff00ff)
    const color2 = new THREE.Color(0x00ffff)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 50 + Math.random() * 50

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.cos(phi)
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      const color = Math.random() > 0.5 ? color1 : color2
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      this.twinkleOffsets[i] = Math.random() * Math.PI * 2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })

    this.stars = new THREE.Points(geometry, material)
    this.scene.add(this.stars)
  }

  update(time) {
    const positions = this.stars.geometry.attributes.position.array
    const sizes = new Float32Array(this.count)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const twinkle = 0.6 + 0.4 * Math.sin(time * 0.003 + this.twinkleOffsets[i])
      sizes[i] = 0.15 * twinkle
    }

    this.stars.rotation.y = time * 0.0001
  }

  dispose() {
    if (this.stars) {
      this.scene.remove(this.stars)
      this.stars.geometry.dispose()
      this.stars.material.dispose()
    }
  }
}
