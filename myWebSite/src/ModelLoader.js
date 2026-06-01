import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader()
    this.model = null
  }

  load(url, onLoad, onProgress, onError) {
    this.loader.load(
      url,
      (gltf) => {
        this.model = gltf.scene
        if (onLoad) onLoad(this.model)
      },
      (progress) => {
        if (onProgress) onProgress(progress)
      },
      (error) => {
        console.error('Model loading error:', error)
        if (onError) onError(error)
      }
    )
  }

  animateEntry(model, scaleFrom = 0, scaleTo = 1, duration = 1000) {
    return new Promise((resolve) => {
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        const easeOutBack = (t) => {
          const c1 = 1.70158
          const c3 = c1 + 1
          return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
        }

        const easedProgress = easeOutBack(progress)
        const currentScale = scaleFrom + (scaleTo - scaleFrom) * easedProgress

        model.scale.set(currentScale, currentScale, currentScale)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animate()
    })
  }
}
