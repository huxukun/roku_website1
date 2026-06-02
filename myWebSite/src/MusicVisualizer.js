import * as THREE from 'three'

export default class MusicVisualizer {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.bars = []
    this.audioContext = null
    this.analyser = null
    this.dataArray = null
    this.source = null
    this.audioElement = null
    this.isPlaying = false
    this.hasAudioData = false
    this.isDebugMode = false
    
    this.init()
  }

  init() {
    this.createBars()
    this.setupAudio()
  }

  createBars() {
    const barCount = 64
    const spacing = 0.25
    const startX = -(barCount - 1) * spacing * 0.5
    
    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(0.2, 0.1, 0.5)
      
      const baseColor = this.getNeonColor(i, barCount)
      const material = new THREE.MeshPhongMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.9,
        shininess: 100
      })
      
      const bar = new THREE.Mesh(geometry, material)
      bar.position.set(startX + i * spacing, -6, -20)
      
      this.bars.push({ mesh: bar, currentScale: 1, baseColor: baseColor.clone() })
      this.scene.add(bar)
    }
  }

  getNeonColor(index, total) {
    const t = index / total
    // 霓虹蓝色渐变：从深蓝到青色
    const color1 = new THREE.Color(0x0000FF) // 深蓝
    const color2 = new THREE.Color(0x00FFFF)  // 青色
    const color3 = new THREE.Color(0x00BFFF)  // 亮青色
    
    if (t < 0.5) {
      return color1.clone().lerp(color2, t / 0.5)
    } else {
      return color2.clone().lerp(color3, (t - 0.5) / 0.5)
    }
  }

  setupAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.0
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.connect(this.audioContext.destination)
  }

  loadAudio(url) {
    return new Promise((resolve, reject) => {
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement = null
      }
      
      this.audioElement = new Audio()
      this.audioElement.crossOrigin = 'anonymous'
      this.audioElement.src = url
      this.audioElement.loop = true
      this.audioElement.volume = 0.5
      
      // 使用 canplay 而不是 canplaythrough，可以更快开始播放
      this.audioElement.addEventListener('canplay', () => {
        try {
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume()
          }
          
          if (this.source) this.source.disconnect()
          this.source = this.audioContext.createMediaElementSource(this.audioElement)
          this.source.connect(this.analyser)
          this.hasAudioData = true
          resolve()
        } catch (error) {
          reject(error)
        }
      }, { once: true })
      
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio load error:', e)
        reject(new Error('Failed to load audio'))
      }, { once: true })
      
      this.audioElement.load()
    })
  }

  loadLocalAudio(file) {
    return new Promise((resolve, reject) => {
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement = null
      }
      
      const url = URL.createObjectURL(file)
      this.audioElement = new Audio(url)
      this.audioElement.loop = true
      this.audioElement.volume = 0.5
      
      this.audioElement.addEventListener('canplaythrough', () => {
        try {
          if (this.source) this.source.disconnect()
          this.source = this.audioContext.createMediaElementSource(this.audioElement)
          this.source.connect(this.analyser)
          this.hasAudioData = true
          resolve()
        } catch (error) {
          reject(error)
        }
      })
      
      this.audioElement.addEventListener('error', reject)
      this.audioElement.load()
    })
  }

  play() {
    if (this.audioElement) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
      
      this.audioElement.play().then(() => {
        this.isPlaying = true
        this.hasAudioData = true
      }).catch(e => console.error('Play error:', e))
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause()
      this.isPlaying = false
    }
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play()
      this.isPlaying = true
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.resume()
    }
  }

  update(time) {
    if (this.hasAudioData && this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.dataArray)
      
      const barCount = this.bars.length
      const binCount = this.analyser.frequencyBinCount
      const binSize = binCount / barCount
      
      for (let i = 0; i < barCount; i++) {
        const binIndex = Math.floor(i * binSize)
        const value = this.dataArray[binIndex]
        const normalizedValue = value / 255
        
        const ratio = i / barCount
        
        // 全部频率都响应，但低音区幅度更大
        let boost = 1
        if (ratio < 0.25) {
          boost = 4.0  // 低音区幅度最大
        } else if (ratio < 0.5) {
          boost = 2.5  // 中低频幅度适中
        } else if (ratio < 0.75) {
          boost = 1.5  // 中高频正常响应
        } else {
          boost = 1.2  // 高频也有响应
        }
        
        const scale = normalizedValue * boost
        const bar = this.bars[i]
        
        bar.mesh.scale.y = scale
        bar.mesh.position.y = -6 + scale * 0.5
        
        // 保持霓虹蓝色的辉光效果
        const intensity = 0.5 + normalizedValue * 0.5
        bar.mesh.material.emissiveIntensity = intensity
        bar.mesh.material.opacity = 0.8 + normalizedValue * 0.2
        
        // 霓虹蓝色渐变
        const hue = 0.5 + (i / barCount) * 0.15  // 在蓝-青范围内变化
        const saturation = 1.0
        const lightness = 0.4 + normalizedValue * 0.2
        const color = new THREE.Color()
        color.setHSL(hue, saturation, lightness)
        bar.mesh.material.color.copy(color)
        bar.mesh.material.emissive.copy(color)
      }
    } else {
      for (let i = 0; i < this.bars.length; i++) {
        const bar = this.bars[i]
        
        // 全部轻微波动
        const idleScale = 0.1 + Math.sin(time * 0.002 + i * 0.1) * 0.05
        
        bar.mesh.scale.y = idleScale
        bar.mesh.position.y = -6 + idleScale * 0.5
        
        bar.mesh.material.emissiveIntensity = 0.4 + idleScale * 0.3
        bar.mesh.material.opacity = 0.8
        
        // 霓虹蓝色
        const hue = 0.5 + (i / this.bars.length) * 0.15
        const color = new THREE.Color()
        color.setHSL(hue, 1.0, 0.4)
        bar.mesh.material.color.copy(color)
        bar.mesh.material.emissive.copy(color)
      }
    }
  }

  dispose() {
    if (this.audioContext) this.audioContext.close()
    if (this.audioElement) this.audioElement.pause()
    
    this.bars.forEach(bar => {
      bar.mesh.geometry.dispose()
      bar.mesh.material.dispose()
      this.scene.remove(bar.mesh)
    })
    
    this.bars = []
  }
}
