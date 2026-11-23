/**
 * 数据星图
 * 悬浮在赛博网格上方的全息数据板：点阵节点、渐隐网格、雷达环、
 * 连接弧与红色脉冲，全部由真实站点数据（技能/留言/作品数量）驱动。
 * 复用主场景、主相机与主渲染器，不新增后处理链。
 */

import * as THREE from 'three'
import { getSnapshot, subscribe } from './hudTelemetry.js'

const PANEL = {
  width: 18,
  height: 7,
  halfW: 9,
  halfH: 3.5
}

const CYAN = new THREE.Color(0x32eaff)
const MAGENTA = new THREE.Color(0xff2bd6)
const AMBIENT = new THREE.Color(0x1a6f82)
const RED = 0xff4646

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function circleGeometry(radius = 1, segments = 96) {
  const points = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

export default class DataConstellation {
  constructor(scene, { mobile = false } = {}) {
    this.scene = scene
    this.mobile = mobile

    this.group = new THREE.Group()
    /* 悬在落日上方的天空区域：既是最视觉中心，又不遮挡地平线与网格 */
    this.group.position.set(0, 10, -20)
    this.group.rotation.x = -0.06
    this.group.renderOrder = 2
    /* 竖屏手机视野更窄，整块缩小并下移，避免贴边溢出 */
    if (mobile) {
      this.group.scale.setScalar(0.72)
      this.group.position.set(0, 7.8, -20)
    }

    this.content = new THREE.Group()
    this.group.add(this.content)

    this.nodeCount = mobile ? 30 : 56
    this.arcCount = mobile ? 0 : 5
    this.radarCount = mobile ? 2 : 3
    this.pulseCount = mobile ? 2 : 3

    this.snapshot = getSnapshot()
    this.signature = ''
    this.layoutDirty = false
    this.layoutCount = 0
    this.lastLayoutAt = 0
    this.anchors = []
    this.arcs = []
    this.pulses = []
    this.radars = []
    this.arcMaterial = null
    this.arcGroup = null
    this.pulseGroup = null
    this.radarGroup = null
    this.dummy = new THREE.Object3D()
    this.tmpColor = new THREE.Color()

    this.buildGrid()
    this.buildNodes()
    this.buildRadars()
    this.buildPulses()
    if (!mobile) this.buildArcGroup()

    scene.add(this.group)
    this.unsubscribe = subscribe((snapshot) => this.onSnapshot(snapshot))
  }

  /* ------------------------------ 构建 ------------------------------ */

  buildGrid() {
    const positions = []
    const step = 0.7
    for (let x = -PANEL.halfW; x <= PANEL.halfW + 0.001; x += step) {
      positions.push(x, -PANEL.halfH, 0, x, PANEL.halfH, 0)
    }
    for (let y = -PANEL.halfH; y <= PANEL.halfH + 0.001; y += step) {
      positions.push(-PANEL.halfW, y, 0, PANEL.halfW, y, 0)
    }

    /* 柔和的暗色背板：压暗背后的落日与地平线，让点阵与节点读得出来，
       边缘用 smoothstep 渐隐，避免出现生硬的矩形块 */
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL.width, PANEL.height),
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.72 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            float d = length(p * vec2(1.0, 1.12));
            float alpha = (1.0 - smoothstep(0.35, 1.0, d)) * uOpacity;
            gl_FragColor = vec4(0.012, 0.035, 0.075, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    backing.position.z = -0.08
    backing.renderOrder = 2
    this.group.add(backing)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: CYAN.clone() },
        uOpacity: { value: 0.85 },
        uHalf: { value: PANEL.halfW * 1.05 }
      },
      vertexShader: `
        varying float vDist;
        void main() {
          vDist = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uHalf;
        varying float vDist;
        void main() {
          float fade = 1.0 - smoothstep(uHalf * 0.7, uHalf, vDist);
          gl_FragColor = vec4(uColor, fade * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const grid = new THREE.LineSegments(geometry, this.gridMaterial)
    grid.frustumCulled = false
    grid.renderOrder = 2
    this.group.add(grid)

    /* 外框：让星图看起来是一块悬浮的全息屏 */
    const framePoints = [
      new THREE.Vector3(-PANEL.halfW, -PANEL.halfH, 0.03),
      new THREE.Vector3(PANEL.halfW, -PANEL.halfH, 0.03),
      new THREE.Vector3(PANEL.halfW, PANEL.halfH, 0.03),
      new THREE.Vector3(-PANEL.halfW, PANEL.halfH, 0.03)
    ]
    const frame = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(framePoints),
      new THREE.LineBasicMaterial({
        color: 0x32eaff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
    frame.frustumCulled = false
    frame.renderOrder = 2
    this.group.add(frame)
  }

  buildNodes() {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.nodes = new THREE.InstancedMesh(geometry, material, this.nodeCount)
    this.nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.nodes.frustumCulled = false
    this.nodes.renderOrder = 2
    this.nodeData = []
    this.content.add(this.nodes)
  }

  buildRadars() {
    this.radarGroup = new THREE.Group()
    this.content.add(this.radarGroup)
    this.radars = []
    for (let i = 0; i < this.radarCount; i += 1) {
      const material = new THREE.LineBasicMaterial({
        color: 0x32eaff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const ring = new THREE.LineLoop(circleGeometry(1), material)
      ring.position.z = 0.02
      ring.frustumCulled = false
      this.radarGroup.add(ring)
      this.radars.push(ring)
    }
  }

  buildPulses() {
    this.pulseGroup = new THREE.Group()
    this.content.add(this.pulseGroup)
    this.pulses = []
    for (let i = 0; i < this.pulseCount; i += 1) {
      const material = new THREE.LineBasicMaterial({
        color: RED,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const ring = new THREE.LineLoop(circleGeometry(0.12), material)
      ring.visible = false
      ring.frustumCulled = false
      this.pulseGroup.add(ring)
      this.pulses.push(ring)
    }
  }

  buildArcGroup() {
    this.arcGroup = new THREE.Group()
    this.content.add(this.arcGroup)
    this.arcMaterial = new THREE.LineBasicMaterial({
      color: 0x32eaff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }

  /* ------------------------------ 数据 ------------------------------ */

  onSnapshot(snapshot) {
    this.snapshot = snapshot
    const signature = JSON.stringify({
      counts: snapshot.counts,
      skills: (snapshot.datasets?.skills || []).map((item) => [item.name, item.level])
    })
    if (signature !== this.signature) {
      this.signature = signature
      this.layoutDirty = true
    }
  }

  rebuildLayout(time) {
    this.layoutDirty = false
    this.lastLayoutAt = time
    this.layoutCount += 1

    const snapshot = this.snapshot || {}
    const skills = snapshot.datasets?.skills || []
    const counts = snapshot.counts || {}
    const seed = 1337 + (counts.messages || 0) * 3 + (counts.portfolio || 0) * 7 +
      (counts.collection || 0) * 11 + (counts.skills || 0) * 13
    const random = mulberry32(seed)

    const skillCount = Math.max(3, Math.min(8, skills.length || 6))
    this.anchors = []
    for (let i = 0; i < skillCount; i += 1) {
      const angle = (i / skillCount) * Math.PI * 2 + 0.35
      const level = skills[i]?.level || Math.round(45 + random() * 45)
      const radius = 1.9 + (1 - clamp(level, 0, 100) / 100) * 3.1
      const x = clamp(Math.cos(angle) * radius * 2.15, -PANEL.halfW + 0.8, PANEL.halfW - 0.8)
      const y = clamp(Math.sin(angle) * radius * 0.95, -PANEL.halfH + 0.5, PANEL.halfH - 0.5)
      this.anchors.push({
        x,
        y,
        level: clamp(level, 0, 100),
        name: skills[i]?.name || ''
      })
    }

    this.buildNodeData(random)
    this.rebuildArcs()
    this.positionPulses()
  }

  buildNodeData(random) {
    const data = []
    const satellites = Math.max(1, Math.floor((this.nodeCount - this.anchors.length) / this.anchors.length))

    this.anchors.forEach((anchor, index) => {
      const color = CYAN.clone().lerp(MAGENTA, (anchor.level / 100) * 0.85)
      data.push({
        x: anchor.x,
        y: anchor.y,
        z: 0.3 + anchor.level * 0.004,
        scale: 1.45,
        color,
        phase: index * 1.7,
        speed: 0.85 + random() * 0.5
      })

      for (let j = 0; j < satellites; j += 1) {
        const angle = random() * Math.PI * 2
        const radius = 0.35 + random() * 1.15
        data.push({
          x: clamp(anchor.x + Math.cos(angle) * radius, -PANEL.halfW + 0.4, PANEL.halfW - 0.4),
          y: clamp(anchor.y + Math.sin(angle) * radius * 0.7, -PANEL.halfH + 0.3, PANEL.halfH - 0.3),
          z: 0.12 + random() * 0.18,
          scale: 0.5 + random() * 0.35,
          color: CYAN.clone().multiplyScalar(0.8),
          phase: random() * Math.PI * 2,
          speed: 0.6 + random() * 0.9
        })
      }
    })

    while (data.length < this.nodeCount) {
      data.push({
        x: (random() * 2 - 1) * (PANEL.halfW - 0.5),
        y: (random() * 2 - 1) * (PANEL.halfH - 0.4),
        z: 0.04,
        scale: 0.28 + random() * 0.25,
        color: AMBIENT.clone(),
        phase: random() * Math.PI * 2,
        speed: 0.5 + random() * 0.8
      })
    }

    this.nodeData = data.slice(0, this.nodeCount)
    this.nodeData.forEach((node, index) => {
      this.nodes.setColorAt(index, node.color)
    })
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true
  }

  rebuildArcs() {
    if (!this.arcGroup) return
    this.arcs.forEach((arc) => arc.geometry.dispose())
    while (this.arcGroup.children.length > 0) {
      this.arcGroup.remove(this.arcGroup.children[0])
    }
    this.arcs = []

    const count = Math.min(this.arcCount, this.anchors.length)
    for (let i = 0; i < count; i += 1) {
      const anchor = this.anchors[i]
      const start = new THREE.Vector3(0, 0, 0.05)
      const end = new THREE.Vector3(anchor.x, anchor.y, 0.16)
      const middle = start.clone().lerp(end, 0.5)
      middle.z += 1.5
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end)
      const points = curve.getPoints(44)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      geometry.setDrawRange(0, 0)
      const line = new THREE.Line(geometry, this.arcMaterial)
      line.frustumCulled = false
      this.arcGroup.add(line)
      this.arcs.push({ geometry, count: points.length })
    }
  }

  positionPulses() {
    this.pulses.forEach((ring, index) => {
      const anchor = this.anchors[index]
      if (!anchor) {
        ring.visible = false
        return
      }
      ring.visible = true
      ring.position.set(anchor.x, anchor.y, 0.14)
    })
  }

  /* ------------------------------ 帧更新 ------------------------------ */

  update(time, delta) {
    if (!this.group.visible) return

    const elapsedSinceLayout = time - this.lastLayoutAt
    const threshold = this.layoutCount < 2 ? 1500 : 10000
    if (this.layoutCount === 0 || (!this.mobile && this.layoutDirty && elapsedSinceLayout >= threshold)) {
      this.rebuildLayout(time)
    }

    this.content.rotation.z += Math.min(delta, 60) * 0.000018

    for (let i = 0; i < this.nodeData.length; i += 1) {
      const node = this.nodeData[i]
      const pulse = 0.85 + Math.sin(time * 0.0016 * node.speed + node.phase) * 0.22
      this.dummy.position.set(
        node.x,
        node.y,
        node.z + Math.sin(time * 0.0011 + node.phase) * 0.035
      )
      this.dummy.rotation.set(0, time * 0.0008 + node.phase, 0)
      this.dummy.scale.setScalar(node.scale * pulse)
      this.dummy.updateMatrix()
      this.nodes.setMatrixAt(i, this.dummy.matrix)
    }
    this.nodes.instanceMatrix.needsUpdate = true

    this.radars.forEach((ring, index) => {
      const progress = ((time + index * 2000) % 6000) / 6000
      const scale = 0.12 + progress * (PANEL.halfW - 0.8)
      ring.scale.set(scale, scale, 1)
      ring.material.opacity = 0.52 * (1 - progress)
    })

    this.arcs.forEach((arc, index) => {
      const cycle = ((time + index * 900) % 5200) / 5200
      const progress = Math.min(1, cycle / 0.32)
      arc.geometry.setDrawRange(0, Math.max(0, Math.floor(progress * arc.count)))
    })

    this.pulses.forEach((ring, index) => {
      if (!ring.visible) return
      const cycle = ((time + index * 700) % 2400) / 2400
      ring.scale.setScalar(1 + cycle * 4.2)
      ring.material.opacity = 0.75 * (1 - cycle)
    })
  }

  setVisible(visible) {
    this.group.visible = !!visible
  }

  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.scene) this.scene.remove(this.group)

    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        } else {
          child.material.dispose()
        }
      }
    })

    this.arcs = []
    this.pulses = []
    this.radars = []
    this.nodeData = []
  }
}
