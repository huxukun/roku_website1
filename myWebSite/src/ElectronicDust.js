import * as THREE from 'three'

export default class ElectronicDust {
  constructor(scene) {
    this.scene = scene
    this.particles = null
    this.velocities = null
    this.count = 3000
    this.phaseOffsets = null
    this.colorPhases = null
    this.wavePhases = null
    this.spiralAngles = null
    
    this.mouse = new THREE.Vector2(0, 0)
    this.targetMouse = new THREE.Vector2(0, 0)
    this.smoothedMouse = new THREE.Vector2(0, 0)
    this.mouseVelocity = new THREE.Vector2(0, 0)
    this.lastMouse = new THREE.Vector2(0, 0)
    
    this.pushForces = new Float32Array(this.count * 3)
    
    this.isGalleryMode = false
    this.baseOpacity = 0.5
    
    this.init()
  }

  init() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    this.velocities = new Float32Array(this.count * 3)
    this.phaseOffsets = new Float32Array(this.count)
    this.colorPhases = new Float32Array(this.count)
    this.wavePhases = new Float32Array(this.count)
    this.spiralAngles = new Float32Array(this.count)

    const synthwaveColors = [
      new THREE.Color(0xFF00FF),  // 霓虹粉
      new THREE.Color(0x00FFFF),  // 赛博蓝
      new THREE.Color(0x800080),  // 深紫
      new THREE.Color(0xFF1493),  // 深粉
      new THREE.Color(0x9400D3), // 暗紫
      new THREE.Color(0x00CED1),  // 深青
    ]

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 50
      positions[i3 + 1] = Math.random() * 25 - 8
      positions[i3 + 2] = (Math.random() - 0.5) * 50

      const colorIndex = Math.floor(Math.random() * synthwaveColors.length)
      const color = synthwaveColors[colorIndex]
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      this.phaseOffsets[i] = Math.random() * Math.PI * 2
      this.colorPhases[i] = Math.random() * Math.PI * 2
      this.wavePhases[i] = Math.random() * Math.PI * 2
      this.spiralAngles[i] = Math.random() * Math.PI * 2

      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.015
      this.velocities[i3] = Math.cos(angle) * radius
      this.velocities[i3 + 1] = 0.008 + Math.random() * 0.015
      this.velocities[i3 + 2] = Math.sin(angle) * radius
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  setMouse(x, y) {
    this.targetMouse.x = x
    this.targetMouse.y = y
  }

  setGalleryMode(enabled) {
    this.isGalleryMode = enabled
  }

  update(time) {
    const positions = this.particles.geometry.attributes.position.array
    const colors = this.particles.geometry.attributes.color.array
    const deltaTime = 0.016
    
    const smoothFactor = 0.08
    this.smoothedMouse.x += (this.targetMouse.x - this.smoothedMouse.x) * smoothFactor
    this.smoothedMouse.y += (this.targetMouse.y - this.smoothedMouse.y) * smoothFactor
    
    this.mouseVelocity.x = (this.smoothedMouse.x - this.lastMouse.x) * 2
    this.mouseVelocity.y = (this.smoothedMouse.y - this.lastMouse.y) * 2
    this.lastMouse.x = this.smoothedMouse.x
    this.lastMouse.y = this.smoothedMouse.y
    
    const beatFreq = 1.2
    const bpmPhase = (time / 1000) * beatFreq * Math.PI * 2

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      const baseX = positions[i3]
      const baseY = positions[i3 + 1]
      const baseZ = positions[i3 + 2]
      
      this.spiralAngles[i] += 0.002
      const spiralStrength = 0.0004
      positions[i3] += Math.cos(this.spiralAngles[i]) * spiralStrength
      positions[i3 + 2] += Math.sin(this.spiralAngles[i]) * spiralStrength
      
      const wavePhase = this.wavePhases[i]
      const waveAmplitude = 0.0015
      positions[i3] += Math.sin(wavePhase + time * 0.001) * waveAmplitude
      positions[i3 + 1] += Math.cos(wavePhase * 1.3 + time * 0.0008) * waveAmplitude * 0.5
      positions[i3 + 2] += Math.sin(wavePhase * 0.7 + time * 0.0012) * waveAmplitude
      
      const screenX = (positions[i3] / 50 + 1) / 2
      const screenY = (positions[i3 + 1] / 25 + 0.5) / 2
      
      const dx = screenX - this.smoothedMouse.x
      const dy = screenY - this.smoothedMouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const interactionRadius = 0.25
      
      if (dist < interactionRadius && dist > 0.01) {
        const force = (1 - dist / interactionRadius) * 0.08
        const pushX = (dx / dist) * force
        const pushY = (dy / dist) * force
        
        this.pushForces[i3] += pushX * deltaTime * 2
        this.pushForces[i3 + 1] += pushY * deltaTime * 2
        this.pushForces[i3 + 2] += (Math.random() - 0.5) * force * 0.1
      }
      
      this.pushForces[i3] *= 0.94
      this.pushForces[i3 + 1] *= 0.94
      this.pushForces[i3 + 2] *= 0.94
      
      positions[i3] += this.pushForces[i3]
      positions[i3 + 1] += this.pushForces[i3 + 1]
      positions[i3 + 2] += this.pushForces[i3 + 2]

      const colorPhase = this.colorPhases[i]
      const phase = this.phaseOffsets[i]
      const t = (time / 1000) * beatFreq
      
      const heartbeat = Math.pow(Math.max(0, Math.sin(t + phase)), 4)
      const breathe = 0.4 + 0.3 * Math.sin(bpmPhase + phase)
      const flicker = breathe * (1 + heartbeat * 0.3)
      
      const colorShift = Math.sin(t * 0.5 + colorPhase) * 0.5 + 0.5
      const neonPink = { r: 1.0, g: 0.0, b: 1.0 }
      const cyberBlue = { r: 0.0, g: 1.0, b: 1.0 }
      const deepPurple = { r: 0.5, g: 0.0, b: 0.5 }
      
      const color1 = colorShift < 0.5 ? neonPink : cyberBlue
      const color2 = colorShift < 0.5 ? cyberBlue : deepPurple
      const blendFactor = (colorShift < 0.5 ? colorShift * 2 : (colorShift - 0.5) * 2)
      
      // 画廊模式下增加亮度
      const brightnessMultiplier = this.isGalleryMode ? 1.8 : 1.0
      colors[i3] = (color1.r * (1 - blendFactor) + color2.r * blendFactor) * flicker * brightnessMultiplier
      colors[i3 + 1] = (color1.g * (1 - blendFactor) + color2.g * blendFactor) * flicker * brightnessMultiplier
      colors[i3 + 2] = (color1.b * (1 - blendFactor) + color2.b * blendFactor) * flicker * brightnessMultiplier

      if (positions[i3 + 1] > 22) {
        positions[i3] = (Math.random() - 0.5) * 50
        positions[i3 + 1] = -8 - Math.random() * 5
        positions[i3 + 2] = (Math.random() - 0.5) * 50
        this.pushForces[i3] = 0
        this.pushForces[i3 + 1] = 0
        this.pushForces[i3 + 2] = 0
      }

      if (Math.abs(positions[i3]) > 30) {
        positions[i3] = (Math.random() - 0.5) * 50
      }
      if (Math.abs(positions[i3 + 2]) > 30) {
        positions[i3 + 2] = (Math.random() - 0.5) * 50
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
    this.particles.geometry.attributes.color.needsUpdate = true
    
    // 画廊模式下增加粒子透明度
    const targetOpacity = this.isGalleryMode ? 0.8 : 0.5
    this.particles.material.opacity += (targetOpacity - this.particles.material.opacity) * 0.05
  }

  dispose() {
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles.geometry.dispose()
      this.particles.material.dispose()
    }
  }
}
