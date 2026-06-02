import * as THREE from 'three'

export default class WireframeMountain {
  constructor(scene, side) {
    this.scene = scene
    this.side = side
    this.mountainGroup = new THREE.Group()
    this.phaseOffset = Math.random() * Math.PI * 2
    
    this.stripCount = 12
    this.strips = []
    this.stripDepth = 70
    
    this.startZ = 180
    this.endZ = -100
    this.speed = 8
    
    this.baseHeight = 8

    this.colorPhase = 0 // 用于RGB颜色变化
    this.isColorChanging = false // 是否启用颜色变化
    
    this.init()
  }

  init() {
    for (let i = 0; i < this.stripCount; i++) {
      const strip = this.createMountainStrip()
      const zPos = this.endZ + (i * this.stripDepth)
      strip.position.z = zPos
      strip.userData.startHeight = this.getHeightAtZ(zPos + this.stripDepth / 2)
      this.strips.push(strip)
      this.mountainGroup.add(strip)
    }

    if (this.side === 'left') {
      this.mountainGroup.position.x = -50
    } else {
      this.mountainGroup.position.x = 50
    }

    this.mountainGroup.position.y = 0
    
    this.scene.add(this.mountainGroup)
  }

  createMountainStrip() {
    const planeWidth = 60
    const planeDepth = this.stripDepth
    const segmentsX = 12
    const segmentsZ = 8
    
    const planeGeometry = new THREE.PlaneGeometry(
      planeWidth,
      planeDepth,
      segmentsX,
      segmentsZ
    )

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      wireframe: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    })

    const mountainMesh = new THREE.Mesh(planeGeometry, lineMaterial)
    mountainMesh.rotation.x = -Math.PI / 2
    
    return mountainMesh
  }

  noise2D(x, z) {
    const n1 = Math.sin(x * 0.1 + z * 0.06) * 0.45
    const n2 = Math.sin(x * 0.2 + z * 0.12 + 1.3) * 0.28
    const n3 = Math.sin(x * 0.4 + z * 0.24 + 2.7) * 0.18
    const n4 = Math.sin(x * 0.8 + z * 0.48 + 0.5) * 0.09
    
    return (n1 + n2 + n3 + n4) / 1.0
  }

  getHeightAtZ(worldZ) {
    const baseHeight = this.noise2D(0, worldZ * 0.12) * 22
    const detailHeight = this.noise2D(0, worldZ * 0.25 + 3.0) * 10
    const fineHeight = this.noise2D(0, worldZ * 0.5 + 6.0) * 5
    
    return baseHeight + detailHeight + fineHeight
  }

  getMountainHeight(worldX, worldZ) {
    const xSign = this.side === 'left' ? -1 : 1
    const adjustedX = worldX * xSign
    
    const distFromInnerEdge = adjustedX - 10
    
    if (distFromInnerEdge < 0) {
      return 0
    }
    
    const transitionWidth = 25
    const mountainWidth = 35
    
    let heightFactor = 0
    
    if (distFromInnerEdge < transitionWidth) {
      heightFactor = Math.pow(distFromInnerEdge / transitionWidth, 0.7)
    } else if (distFromInnerEdge < mountainWidth) {
      heightFactor = 1.0
    } else {
      const fadeOut = 1 - (distFromInnerEdge - mountainWidth) / 10
      heightFactor = Math.max(fadeOut, 0)
    }
    
    const baseHeight = this.noise2D(adjustedX * 0.25, worldZ * 0.12) * 22
    const detailHeight = this.noise2D(adjustedX * 0.5, worldZ * 0.25 + 3.0) * 10
    const fineHeight = this.noise2D(adjustedX * 1.0, worldZ * 0.5 + 6.0) * 5
    
    const totalHeight = (baseHeight + detailHeight + fineHeight) * heightFactor
    
    return Math.max(totalHeight, 0)
  }

  updateStripGeometry(strip) {
    const positions = strip.geometry.attributes.position
    const vertex = new THREE.Vector3()
    const stripZ = strip.position.z

    const frontEdgeZ = stripZ - this.stripDepth / 2
    const backEdgeZ = stripZ + this.stripDepth / 2
    const frontEdgeHeight = this.getHeightAtZ(frontEdgeZ)
    const backEdgeHeight = this.getHeightAtZ(backEdgeZ)

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)

      const localX = vertex.x
      const localY = vertex.y
      const worldX = this.mountainGroup.position.x + localX
      const worldZ = stripZ + localY

      const height = this.getMountainHeight(worldX, worldZ)

      const normalizedY = (localY + this.stripDepth / 2) / this.stripDepth
      
      let edgeHeight = 0
      if (normalizedY <= 0.05) {
        edgeHeight = frontEdgeHeight
      } else if (normalizedY >= 0.95) {
        edgeHeight = backEdgeHeight
      }

      const perspectiveFactor = Math.pow(Math.max(normalizedY, 0.01), 0.35)
      let finalHeight = height * perspectiveFactor

      if (normalizedY < 0.08) {
        finalHeight *= normalizedY / 0.08
      }

      if (normalizedY <= 0.05 || normalizedY >= 0.95) {
        const blendFactor = normalizedY <= 0.05 
          ? normalizedY / 0.05 
          : (1 - normalizedY) / 0.05
        finalHeight = this.baseHeight + (finalHeight - this.baseHeight) * blendFactor
        finalHeight = Math.max(finalHeight, this.baseHeight)
      }

      positions.setZ(i, finalHeight)
    }

    positions.needsUpdate = true
    strip.geometry.computeVertexNormals()
  }

  update(time) {
    const delta = 0.016
    
    // RGB颜色变化效果
    if (this.isColorChanging) {
      this.colorPhase += delta * 2
      const r = 0.5 + 0.5 * Math.sin(this.colorPhase)
      const g = 0.5 + 0.5 * Math.sin(this.colorPhase + 2 * Math.PI / 3)
      const b = 0.5 + 0.5 * Math.sin(this.colorPhase + 4 * Math.PI / 3)
      
      const newColor = new THREE.Color(r, g, b)
      for (const strip of this.strips) {
        strip.material.color = newColor
      }
    }

    for (let i = 0; i < this.strips.length; i++) {
      const strip = this.strips[i]
      strip.position.z += this.speed * delta

      if (strip.position.z > this.startZ) {
        strip.position.z = this.endZ
      }

      this.updateStripGeometry(strip)

      const progress = (strip.position.z - this.endZ) / (this.startZ - this.endZ)
      const normalizedDist = Math.max(0, Math.min(progress, 1))
      strip.material.opacity = 0.1 + normalizedDist * 0.85
    }

    const floatAmplitude = 0.08
    const floatSpeed = 0.05
    const floatY = Math.sin(time / 1000 * floatSpeed + this.phaseOffset) * floatAmplitude
    this.mountainGroup.position.y = floatY
  }

  setColorChanging(enabled) {
    this.isColorChanging = enabled
    if (!enabled) {
      // 恢复默认颜色：青色
      const defaultColor = new THREE.Color(0x00FFFF)
      for (const strip of this.strips) {
        strip.material.color = defaultColor
      }
    }
  }

  dispose() {
    this.scene.remove(this.mountainGroup)
    
    for (const strip of this.strips) {
      if (strip.geometry) {
        strip.geometry.dispose()
      }
      if (strip.material) {
        strip.material.dispose()
      }
    }
  }
}
