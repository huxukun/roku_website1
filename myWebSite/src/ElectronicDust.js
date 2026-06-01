import * as THREE from 'three'

export default class ElectronicDust {
  constructor(scene) {
    this.scene = scene
    this.particles = null
    this.velocities = null
    this.count = 800
    this.phaseOffsets = null  // 用于节奏闪烁
    this.init()
  }

  init() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    this.velocities = new Float32Array(this.count * 3)
    this.phaseOffsets = new Float32Array(this.count)  // 每个粒子一个相位偏移

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 40
      positions[i3 + 1] = Math.random() * 20 - 5
      positions[i3 + 2] = (Math.random() - 0.5) * 40

      // 降低对比度的颜色，更暗一些
      if (Math.random() > 0.5) {
        colors[i3] = 0.15
        colors[i3 + 1] = 0.4
        colors[i3 + 2] = 0.4
      } else {
        colors[i3] = 0.4
        colors[i3 + 1] = 0.1
        colors[i3 + 2] = 0.4
      }

      this.phaseOffsets[i] = Math.random() * Math.PI * 2  // 随机相位偏移

      // 缓慢上升的速度
      this.velocities[i3] = (Math.random() - 0.5) * 0.01
      this.velocities[i3 + 1] = 0.01 + Math.random() * 0.02
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  update(time) {
    const positions = this.particles.geometry.attributes.position.array
    const colors = this.particles.geometry.attributes.color.array

    const beatFreq = 1.5 // 闪烁节奏频率

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      // 更新位置
      positions[i3] += this.velocities[i3]
      positions[i3 + 1] += this.velocities[i3 + 1]
      positions[i3 + 2] += this.velocities[i3 + 2]

      // 节奏闪烁效果
      const phase = this.phaseOffsets[i]
      const t = (time / 1000) * beatFreq
      const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t + phase))

      // 应用闪烁到颜色
      if (colors[i3] > 0.2) {  // 洋红色系
        colors[i3] = 0.4 * flicker
        colors[i3 + 1] = 0.1 * flicker
        colors[i3 + 2] = 0.4 * flicker
      } else {  // 青色系
        colors[i3] = 0.15 * flicker
        colors[i3 + 1] = 0.4 * flicker
        colors[i3 + 2] = 0.4 * flicker
      }

      // 如果粒子超出范围，重置到较低位置
      if (positions[i3 + 1] > 20) {
        positions[i3] = (Math.random() - 0.5) * 40
        positions[i3 + 1] = -5 - Math.random() * 5
        positions[i3 + 2] = (Math.random() - 0.5) * 40
      }

      // 边界检查 X 和 Z
      if (Math.abs(positions[i3]) > 25) {
        positions[i3] = (Math.random() - 0.5) * 40
      }
      if (Math.abs(positions[i3 + 2]) > 25) {
        positions[i3 + 2] = (Math.random() - 0.5) * 40
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
    this.particles.geometry.attributes.color.needsUpdate = true
  }

  dispose() {
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles.geometry.dispose()
      this.particles.material.dispose()
    }
  }
}
