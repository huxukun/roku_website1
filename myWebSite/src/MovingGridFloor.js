import * as THREE from 'three'

export default class MovingGridFloor {
  constructor(scene) {
    this.scene = scene
    this.grid = null
    this.grid2 = null
    this.speed = 0.05
    this.gridSize = 200
    this.phase = 0 // 用于节奏闪烁
    this.init()
  }

  init() {
    // 高饱和度霓虹洋红色
    const gridColor = new THREE.Color(0xFF00FF)

    // 创建网格，使用 LineSegments
    const gridDivisions = 100
    const gridStep = this.gridSize / gridDivisions

    const vertices = []
    const colors = []

    // 水平线条
    for (let i = 0; i <= gridDivisions; i++) {
      const z = -this.gridSize / 2 + i * gridStep
      vertices.push(-this.gridSize / 2, 0, z)
      vertices.push(this.gridSize / 2, 0, z)

      colors.push(gridColor.r, gridColor.g, gridColor.b)
      colors.push(gridColor.r, gridColor.g, gridColor.b)
    }

    // 垂直线条
    for (let i = 0; i <= gridDivisions; i++) {
      const x = -this.gridSize / 2 + i * gridStep
      vertices.push(x, 0, -this.gridSize / 2)
      vertices.push(x, 0, this.gridSize / 2)

      colors.push(gridColor.r, gridColor.g, gridColor.b)
      colors.push(gridColor.r, gridColor.g, gridColor.b)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: 0.8,
      vertexColors: true
    })

    this.grid = new THREE.LineSegments(geometry, material)
    this.grid.position.y = -1.2
    this.scene.add(this.grid)

    // 第二个网格用于无限连续滚动
    const geometry2 = geometry.clone()
    this.grid2 = new THREE.LineSegments(geometry2, material.clone())
    this.grid2.position.y = -1.2
    this.grid2.position.z = -this.gridSize
    this.scene.add(this.grid2)
  }

  update(delta) {
    const movement = this.speed * delta

    this.grid.position.z += movement
    this.grid2.position.z += movement

    // 确保网格是连续的
    if (this.grid.position.z > this.gridSize / 2) {
      this.grid.position.z = this.grid2.position.z - this.gridSize
    }
    if (this.grid2.position.z > this.gridSize / 2) {
      this.grid2.position.z = this.grid.position.z - this.gridSize
    }

    // 节奏闪烁效果
    const beatFreq = 1.5 // 闪烁节奏频率
    this.phase += delta * beatFreq
    const flicker = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.phase * Math.PI * 2))

    // 更新两个网格的透明度来闪烁
    this.grid.material.opacity = 0.4 * flicker + 0.2
    this.grid2.material.opacity = 0.4 * flicker + 0.2
  }

  dispose() {
    if (this.grid) {
      this.scene.remove(this.grid)
      this.grid.geometry.dispose()
      this.grid.material.dispose()
    }
    if (this.grid2) {
      this.scene.remove(this.grid2)
      this.grid2.geometry.dispose()
      this.grid2.material.dispose()
    }
  }
}
