import * as THREE from 'three'

export default class Camera {
  constructor(sizes) {
    this.sizes = sizes

    this.instance = new THREE.PerspectiveCamera(
      75,
      this.sizes.width / this.sizes.height,
      0.1,
      1000 // 增大远裁剪面
    )
    this.instance.position.set(0, 0, 3)
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
  }
}
