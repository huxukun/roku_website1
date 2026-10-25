import * as THREE from 'three'

export default class MusicVisualizer {
  constructor(scene, camera) {
    this.scene = scene
    this.camera = camera
    this.bars = []
    this.barGroup = null
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

    /* 阶梯整体挂到分组里，摆到落日正上方：
       太阳中心 (0, 3, -80)、半径 18，顶部约 y = 21；
       分组底边放在 y = 22.2、z 略靠前，缩放后宽度与太阳直径相当，
       视觉上像是立在太阳顶上的一排声波台阶。 */
    this.barGroup = new THREE.Group()
    this.barGroup.position.set(0, 22.2, -78)
    this.barGroup.scale.set(2.4, 7, 2.4)
    this.scene.add(this.barGroup)

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
      /* 局部坐标：底边贴住分组原点，只按音量向上生长 */
      bar.position.set(startX + i * spacing, 0, 0)
      
      this.bars.push({ 
        mesh: bar, 
        currentScale: 1, 
        targetScale: 1,
        baseColor: baseColor.clone() 
      })
      this.barGroup.add(bar)
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

    /* 全程复用同一个 <audio> 元素：切歌只换 src。
       之前每首歌都新建 Audio + MediaElementSource，长时间播放歌单会不断堆积
       媒体节点并触发无限重试，最终拖垮渲染（表现为整屏黑掉）。
       元素复用后 ended 只绑定一次，交给 UIManager 的 onEnded 切下一首。 */
    this.audioElement = new Audio()
    this.audioElement.crossOrigin = 'anonymous'
    this.audioElement.preload = 'auto'
    this.audioElement.loop = false
    this.audioElement.volume = 0.5
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false
      this.onEnded?.()
    })
    this.source = this.audioContext.createMediaElementSource(this.audioElement)
    this.source.connect(this.analyser)
  }

  /* loop=false：播完交给 UIManager 随机切下一首；本地文件 loop=true 单曲循环 */
  loadAudio(url) {
    return this.loadSource(url, false)
  }

  loadLocalAudio(file) {
    return this.loadSource(URL.createObjectURL(file), true)
  }

  loadSource(url, loop) {
    return new Promise((resolve, reject) => {
      const audio = this.audioElement
      if (!audio) {
        reject(new Error('No audio element'))
        return
      }

      /* 新的加载请求直接取消上一个未完成的请求，避免旧请求串台 */
      if (this._cancelPendingLoad) this._cancelPendingLoad()
      audio.pause()
      this.isPlaying = false

      let settled = false
      let timer = 0
      const onCanPlay = () => {
        if (this.audioContext.state === 'suspended') this.audioContext.resume()
        this.hasAudioData = true
        finish()
      }
      const onError = () => finish(new Error(this.describeAudioError()))
      const cleanup = () => {
        window.clearTimeout(timer)
        audio.removeEventListener('canplay', onCanPlay)
        audio.removeEventListener('error', onError)
        if (this._cancelPendingLoad === cancel) this._cancelPendingLoad = null
      }
      const finish = (error) => {
        if (settled) return
        settled = true
        cleanup()
        if (error) reject(error)
        else resolve()
      }
      const cancel = () => {
        if (settled) return
        settled = true
        cleanup()
        resolve(false)
      }
      this._cancelPendingLoad = cancel

      audio.loop = loop
      audio.addEventListener('canplay', onCanPlay)
      audio.addEventListener('error', onError)
      /* 超时兜底：canplay 迟迟不触发时主动失败，防止 Promise 永久挂起 */
      timer = window.setTimeout(() => finish(new Error('音频加载超时')), 8000)

      audio.src = url
      audio.load()
    })
  }

  describeAudioError() {
    const code = this.audioElement?.error?.code
    switch (code) {
      case 1:
        return '加载被用户中止'
      case 2:
        return '网络错误'
      case 3:
        return '解码错误'
      case 4:
        return 'URL 无效或不可访问'
      default:
        return `未知错误 (代码: ${code ?? 'none'})`
    }
  }

  play() {
    return new Promise((resolve, reject) => {
      if (this.audioElement) {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume()
        }
        
        this.audioElement.play().then(() => {
          this.isPlaying = true
          this.hasAudioData = true
          resolve()
        }).catch(e => {
          console.error('Play error:', e)
          reject(e)
        })
      } else {
        reject(new Error('No audio element'))
      }
    })
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
        
        // 进一步增大起伏幅度
        let boost = 1
        if (ratio < 0.2) {
          boost = 8.0  // 低音区超大幅增强
        } else if (ratio < 0.35) {
          boost = 6.5  // 次低音区大幅增强
        } else if (ratio < 0.5) {
          boost = 4.5  // 中低频增强
        } else if (ratio < 0.75) {
          boost = 2.8  // 中高频
        } else {
          boost = 2.0  // 高频
        }
        
        const targetScale = normalizedValue * boost
        const bar = this.bars[i]
        
        // 减少缓降效果，响应更快
        // 必须钳制下限：静音段 analyser 输出全 0，scale 会一路衰减到 1e-181
        // 这种次正规数会让矩阵接近奇异（法线 NaN），经 Bloom 扩散后整屏全黑
        const nextScale = bar.currentScale * 0.6 + targetScale * 0.4
        bar.currentScale = Number.isFinite(nextScale) ? Math.max(0.04, nextScale) : 0.04
        
        bar.mesh.scale.y = bar.currentScale
        bar.mesh.position.y = bar.currentScale * 0.05
        
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
        const nextScale = bar.currentScale * 0.8 + idleScale * 0.2
        bar.currentScale = Number.isFinite(nextScale) ? Math.max(0.04, nextScale) : 0.04
        
        bar.mesh.scale.y = bar.currentScale
        bar.mesh.position.y = bar.currentScale * 0.05
        
        bar.mesh.material.emissiveIntensity = 0.4 + bar.currentScale * 0.3
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
    })
    
    if (this.barGroup) {
      this.scene.remove(this.barGroup)
      this.barGroup = null
    }
    
    this.bars = []
  }
}
