import * as THREE from 'three'
import { maxPixelRatio } from './perfConfig.js'

export default class Renderer {
  constructor(canvas, sizes) {
    this.canvas = canvas
    this.sizes = sizes

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio))
  }

  render(scene, camera) {
    this.instance.render(scene, camera)
  }

  dispose() {
    this.instance.dispose()
  }
}
