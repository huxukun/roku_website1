import * as THREE from 'three'

export default class Renderer {
  constructor(canvas, sizes) {
    this.canvas = canvas
    this.sizes = sizes

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  render(scene, camera) {
    this.instance.render(scene, camera)
  }

  dispose() {
    this.instance.dispose()
  }
}
