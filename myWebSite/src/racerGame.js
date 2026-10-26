/* ==========================================================================
 * SYNTHWAVE RACER — 直接运行在主页面的真 3D 场景里
 *
 * 不再创建独立场景 / 相机 / 渲染器：
 *  - 赛道、虚线、赛车放进主 scene，共享主相机与主渲染器的 Bloom + VHS
 *  - 点击 WELCOME：两条霓虹跑道从远处的落日下延伸到近处，镜头拉远升高，
 *    赛车从画面外驶向落日，随后切到追逐视角并直接进入游戏
 *  - 主循环通过 update(dt, elapsed) 驱动；退出时把相机还回作品集
 * ========================================================================== */

import * as THREE from 'three'

const HISCORE_KEY = 'synthwave-racer-hiscore'

const ROAD_HALF = 8
const ROAD_LENGTH = 130
const ROAD_FAR_Z = -96
/* 白色虚线：加大每段虚线之间的前后间距（段长仍为 3.4） */
const DASH_COUNT = 13
const DASH_SPACING = 10.5
const DASH_START_LOCAL = 126
const PLAYER_Z = 0
const ROAD_ROWS = 65
const SEG_LEN = ROAD_LENGTH / (ROAD_ROWS - 1)

/* 四车道并行：总路宽不变，单车道 4 宽，车道中心 -6 / -2 / 2 / 6 */
const LANE_COUNT = 4
const LANE_WIDTH = (ROAD_HALF * 2) / LANE_COUNT
const LANE_X = Array.from(
  { length: LANE_COUNT },
  (_, i) => -ROAD_HALF + LANE_WIDTH * (i + 0.5),
)
const DASH_LINES = Array.from(
  { length: LANE_COUNT - 1 },
  (_, i) => -ROAD_HALF + LANE_WIDTH * (i + 1),
)

const PLAYER_MIN_X = -ROAD_HALF + 1.1
const PLAYER_MAX_X = ROAD_HALF - 1.1
const START_X = LANE_X[2]
const ENEMY_SPAWN_Z = -72
const ENEMY_POOL = 7
const MAX_ENEMIES = 5

/* 入场：① 霓虹道路展开 + 镜头同步抬到低角度俯视 → ② 赛车从镜头后方驶入 → ③ 平滑过渡到尾随 */
const INTRO_ROAD_END = 1.0
const INTRO_CAR_START = 1.2
const INTRO_CAR_SETTLE = 2.8
const INTRO_CAR_START_Z = 30
const INTRO_CAR_SETTLE_Z = 4
const INTRO_SECONDS = 4.2
const EXIT_SECONDS = 0.85

/* 低角度俯视机位：贴着路面、略微下压看向前方 */
const OVERHEAD_CAM_Y = 6.5
const OVERHEAD_CAM_Z = 26
const OVERHEAD_LOOK_Y = 0.6
const OVERHEAD_LOOK_Z = -34

/* 更贴近车尾的追逐机位 */
const CHASE_Y = 2.35
const CHASE_Z = 7.0
const CHASE_LOOK_Z = -18

/* 点开始游戏时，镜头与跑道展开同步进行 */

/* 超车连击：短时间内连续超车会叠加倍率 */
const COMBO_WINDOW = 3.2
const COMBO_STEP = 0.2
const COMBO_MAX = 3
const OVERTAKE_BONUS = 40
const CLOSE_OVERTAKE_BONUS = 90
const CLOSE_OVERTAKE_GAP = 2.6
/* 超车判定：横向范围放宽到约 1.5 个车身宽 */
const OVERTAKE_MAX_LATERAL = 3.6
/* 玩家碰撞箱：比车身实际尺寸收一圈，擦身而过不再直接判定撞车 */
const PLAYER_HIT_HALF_Z = 2.9
const PLAYER_HIT_HALF_X = 1.5

/* 火箭加速：持续时间与冷却按所选车辆属性取值；每次超车冷却缩短 0.5 秒 */
const OVERTAKE_BOOST_CD_REWARD = 0.5
/* 冲刺期间完成近距离超车，额外延长 0.5 秒冲刺时间 */
const CLOSE_OVERTAKE_BOOST_EXTEND = 0.5
const BOOST_MULT = 1.7
const BOOST_FOV = 18

const clamp01 = (value) => Math.min(1, Math.max(0, value))
const lerp = (from, to, t) => from + (to - from) * t
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const formatScore = (value) => String(Math.max(0, Math.floor(value))).padStart(6, '0')

/* -------------------------------------------------------------------------- */
/* 低多边形赛车                                                                */
/* -------------------------------------------------------------------------- */
let glowTexture = null
function getGlowTexture() {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.18)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(canvas)
  return glowTexture
}

/* 赛博代码字符图集：8 × 4 格，每格一个像素化字符 */
const CODE_COLS = 8
const CODE_ROWS = 4
const CODE_GLYPHS = [
  '0', '1', '2', '7', '<', '>', '/', '\\',
  '{', '}', '[', ']', '+', '=', '#', '*',
  '$', '%', '&', '!', '?', ':', 'X', 'Z',
  '0', '1', 'E', 'F', 'A', 'C', 'D', 'B',
]
let codeTexture = null
function getCodeTexture() {
  if (codeTexture) return codeTexture
  const cell = 24
  const canvas = document.createElement('canvas')
  canvas.width = cell * CODE_COLS
  canvas.height = cell * CODE_ROWS
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 19px "Courier New", monospace'
  CODE_GLYPHS.forEach((glyph, i) => {
    const col = i % CODE_COLS
    const row = Math.floor(i / CODE_COLS)
    ctx.fillText(glyph, col * cell + cell / 2, row * cell + cell / 2 + 1)
  })
  codeTexture = new THREE.CanvasTexture(canvas)
  codeTexture.flipY = false
  codeTexture.magFilter = THREE.NearestFilter
  codeTexture.minFilter = THREE.NearestFilter
  codeTexture.generateMipmaps = false
  return codeTexture
}

function buildCar({ bodyColor, trimColor, tailColor, glowColor }) {
  const car = new THREE.Group()
  const bodyColorObj = new THREE.Color(bodyColor)

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.55,
    roughness: 0.34,
    emissive: bodyColorObj.clone().multiplyScalar(0.16),
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a16,
    metalness: 0.4,
    roughness: 0.75,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x041321,
    metalness: 0.9,
    roughness: 0.18,
    emissive: 0x002235,
  })
  const trimMat = new THREE.MeshBasicMaterial({ color: trimColor })
  const tailMat = new THREE.MeshBasicMaterial({ color: tailColor })

  const addEdges = (mesh, color, opacity = 0.85) => {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    )
    mesh.add(edges)
    return mesh
  }

  const chassis = addEdges(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.38, 4.4), bodyMat), trimColor)
  chassis.position.y = 0.46
  car.add(chassis)

  const nose = addEdges(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.3), bodyMat), trimColor, 0.6)
  nose.position.set(0, 0.4, -2.35)
  car.add(nose)

  const hood = addEdges(new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.13, 1.5), bodyMat), trimColor, 0.5)
  hood.position.set(0, 0.72, -1.05)
  car.add(hood)

  const cabin = addEdges(new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 1.62), glassMat), trimColor, 0.8)
  cabin.position.set(0, 0.86, -0.15)
  car.add(cabin)

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 1.32), bodyMat)
  roof.position.set(0, 1.11, -0.15)
  car.add(roof)

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.09, 0.34), darkMat)
  spoiler.position.set(0, 1.0, 2.0)
  car.add(spoiler)
  ;[-0.82, 0.82].forEach((x) => {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.2), darkMat)
    support.position.set(x, 0.86, 2.0)
    car.add(support)
  })

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 0.07), tailMat)
  tail.position.set(0, 0.62, 2.23)
  car.add(tail)

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.2, 0.4), darkMat)
  diffuser.position.set(0, 0.28, 2.08)
  car.add(diffuser)

  ;[-0.62, 0.62].forEach((x) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), tailMat)
    lamp.position.set(x, 0.52, 2.22)
    car.add(lamp)
  })

  const headMat = new THREE.MeshBasicMaterial({ color: 0xdffaff })
  ;[-0.62, 0.62].forEach((x) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.07), headMat)
    lamp.position.set(x, 0.5, -3.0)
    car.add(lamp)
  })

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 14)
  ;[
    [-1.02, 0.4, -1.35],
    [1.02, 0.4, -1.35],
    [-1.02, 0.4, 1.35],
    [1.02, 0.4, 1.35],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, y, z)
    car.add(wheel)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16), trimMat)
    rim.position.set(x, y, z)
    rim.rotation.y = Math.PI / 2
    car.add(rim)
  })

  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 7.2),
    new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: glowColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  underglow.rotation.x = -Math.PI / 2
  underglow.position.y = 0.05
  car.add(underglow)

  return car
}

/* -------------------------------------------------------------------------- */
/* 车辆外观：0 = 初始车，1~3 = 车库解锁车                                      */
/* -------------------------------------------------------------------------- */
const CAR_STYLES = [
  { bodyColor: 0x18d8ff, trimColor: 0x9ef6ff, tailColor: 0xff3f86, glowColor: 0xff2a6d },
  { bodyColor: 0x2effa6, trimColor: 0xd6ffe9, tailColor: 0xffb03a, glowColor: 0x22ff9a },
  { bodyColor: 0x9a5cff, trimColor: 0xeed9ff, tailColor: 0xff49d2, glowColor: 0x8a3bff },
  { bodyColor: 0xff8f2e, trimColor: 0xffe3b0, tailColor: 0xfff05a, glowColor: 0xff5f1f },
]

/* 车辆属性：解锁难度越高，极速 / 转向 / 加速越强 */
const CAR_STATS = [
  { topSpeed: 64, baseSpeed: 26, accelTime: 1.5, turn: 1.0, boostDuration: 3.0, boostCooldown: 5.0, boostRamp: 2.0 },
  { topSpeed: 72, baseSpeed: 27, accelTime: 1.25, turn: 1.1, boostDuration: 3.2, boostCooldown: 4.6, boostRamp: 2.2 },
  { topSpeed: 80, baseSpeed: 28, accelTime: 1.0, turn: 1.2, boostDuration: 3.4, boostCooldown: 4.2, boostRamp: 2.4 },
  { topSpeed: 90, baseSpeed: 30, accelTime: 0.8, turn: 1.32, boostDuration: 3.7, boostCooldown: 3.8, boostRamp: 2.7 },
]

/* 车身放样：每站 8 个截面点（右半 → 顶部 → 左半），相邻两站间铺三角面，
 * 截面自带 shoulder 折点，所以车侧 / 引擎盖 / 车顶都是斜面而不是方块。 */
const BODY_RING = 8

const makeLoftGeometry = (stations) => {
  const positions = []
  const indices = []
  stations.forEach((s) => {
    const ring = [
      [0, s.yb],
      [s.wb, s.yb],
      [s.wm, s.ys],
      [s.wt, s.yt],
      [0, s.yt],
      [-s.wt, s.yt],
      [-s.wm, s.ys],
      [-s.wb, s.yb],
    ]
    ring.forEach(([x, y]) => positions.push(x, y, s.z))
  })
  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = i * BODY_RING
    const b = (i + 1) * BODY_RING
    for (let j = 0; j < BODY_RING; j += 1) {
      const j2 = (j + 1) % BODY_RING
      indices.push(a + j, a + j2, b + j2)
      indices.push(a + j, b + j2, b + j)
    }
  }
  const cap = (stationIndex, isFront) => {
    const s = stations[stationIndex]
    const ringStart = stationIndex * BODY_RING
    const centerIndex = positions.length / 3
    positions.push(0, (s.yb + s.yt) / 2, s.z)
    for (let j = 0; j < BODY_RING; j += 1) {
      const j2 = (j + 1) % BODY_RING
      if (isFront) indices.push(centerIndex, ringStart + j2, ringStart + j)
      else indices.push(centerIndex, ringStart + j, ringStart + j2)
    }
  }
  cap(0, true)
  cap(stations.length - 1, false)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const makeQuadGeometry = (p0, p1, p2, p3) => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  return geometry
}

/* 四辆车的中古跑车轮廓（车头在 -z） */
const CAR_SHAPES = [
  {
    /* STARTER — AE86 风格：方正紧凑的后掀背 */
    track: 0.94,
    lipWidth: 1.88,
    skirtLength: 2.5,
    popups: true,
    wing: { w: 1.9, d: 0.3, h: 0.06, y: 0.86, z: 2.0, supports: false },
    body: [
      { z: -2.35, yb: 0.3, ys: 0.44, yt: 0.56, wb: 0.62, wm: 0.8, wt: 0.7 },
      { z: -1.95, yb: 0.24, ys: 0.5, yt: 0.66, wb: 0.8, wm: 0.96, wt: 0.88 },
      { z: -1.2, yb: 0.22, ys: 0.5, yt: 0.72, wb: 0.84, wm: 1.0, wt: 0.92 },
      { z: -0.35, yb: 0.22, ys: 0.52, yt: 0.78, wb: 0.84, wm: 1.0, wt: 0.9 },
      { z: 1.25, yb: 0.24, ys: 0.52, yt: 0.82, wb: 0.84, wm: 1.0, wt: 0.9 },
      { z: 2.05, yb: 0.26, ys: 0.5, yt: 0.8, wb: 0.82, wm: 0.98, wt: 0.86 },
      { z: 2.38, yb: 0.3, ys: 0.48, yt: 0.72, wb: 0.72, wm: 0.88, wt: 0.78 },
    ],
    cabin: [
      { z: -0.62, yb: 0.62, ys: 0.86, yt: 0.88, wb: 0.78, wm: 0.7, wt: 0.58 },
      { z: 0.52, yb: 0.62, ys: 1.1, yt: 1.22, wb: 0.76, wm: 0.68, wt: 0.54 },
      { z: 1.62, yb: 0.62, ys: 1.1, yt: 1.22, wb: 0.76, wm: 0.68, wt: 0.52 },
      { z: 2.24, yb: 0.62, ys: 0.88, yt: 0.9, wb: 0.74, wm: 0.66, wt: 0.56 },
    ],
  },
  {
    /* AERO-X — RX-7 风格：长车头、楔形低趴 */
    track: 0.96,
    lipWidth: 2.0,
    skirtLength: 2.6,
    popups: true,
    wing: { w: 2.0, d: 0.36, h: 0.06, y: 1.06, z: 2.0, supports: true },
    body: [
      { z: -2.48, yb: 0.3, ys: 0.42, yt: 0.48, wb: 0.52, wm: 0.68, wt: 0.56 },
      { z: -2.05, yb: 0.24, ys: 0.44, yt: 0.56, wb: 0.74, wm: 0.92, wt: 0.82 },
      { z: -1.15, yb: 0.22, ys: 0.46, yt: 0.66, wb: 0.84, wm: 1.02, wt: 0.94 },
      { z: -0.25, yb: 0.22, ys: 0.48, yt: 0.74, wb: 0.86, wm: 1.04, wt: 0.96 },
      { z: 1.15, yb: 0.24, ys: 0.48, yt: 0.8, wb: 0.86, wm: 1.04, wt: 0.96 },
      { z: 2.05, yb: 0.26, ys: 0.46, yt: 0.78, wb: 0.82, wm: 1.0, wt: 0.88 },
      { z: 2.42, yb: 0.3, ys: 0.44, yt: 0.7, wb: 0.68, wm: 0.86, wt: 0.74 },
    ],
    cabin: [
      { z: -0.7, yb: 0.58, ys: 0.82, yt: 0.84, wb: 0.78, wm: 0.7, wt: 0.56 },
      { z: 0.3, yb: 0.58, ys: 1.04, yt: 1.16, wb: 0.74, wm: 0.66, wt: 0.52 },
      { z: 1.35, yb: 0.58, ys: 1.04, yt: 1.16, wb: 0.74, wm: 0.66, wt: 0.5 },
      { z: 2.1, yb: 0.58, ys: 0.8, yt: 0.82, wb: 0.72, wm: 0.64, wt: 0.54 },
    ],
  },
  {
    /* PHANTOM — GTR 风格：宽扁、方正、平直车顶 */
    track: 1.0,
    lipWidth: 2.1,
    skirtLength: 2.5,
    popups: false,
    wing: { w: 2.2, d: 0.44, h: 0.07, y: 1.34, z: 1.98, supports: true },
    body: [
      { z: -2.32, yb: 0.3, ys: 0.48, yt: 0.58, wb: 0.78, wm: 0.94, wt: 0.86 },
      { z: -1.95, yb: 0.26, ys: 0.5, yt: 0.68, wb: 0.86, wm: 1.04, wt: 0.96 },
      { z: -1.15, yb: 0.24, ys: 0.52, yt: 0.72, wb: 0.92, wm: 1.08, wt: 1.0 },
      { z: -0.3, yb: 0.24, ys: 0.54, yt: 0.78, wb: 0.92, wm: 1.08, wt: 1.0 },
      { z: 1.2, yb: 0.26, ys: 0.54, yt: 0.82, wb: 0.92, wm: 1.08, wt: 1.0 },
      { z: 2.02, yb: 0.28, ys: 0.52, yt: 0.8, wb: 0.88, wm: 1.04, wt: 0.94 },
      { z: 2.34, yb: 0.32, ys: 0.5, yt: 0.74, wb: 0.8, wm: 0.96, wt: 0.84 },
    ],
    cabin: [
      { z: -0.58, yb: 0.6, ys: 0.88, yt: 0.9, wb: 0.84, wm: 0.76, wt: 0.62 },
      { z: 0.42, yb: 0.6, ys: 1.14, yt: 1.26, wb: 0.82, wm: 0.74, wt: 0.58 },
      { z: 1.68, yb: 0.6, ys: 1.14, yt: 1.26, wb: 0.82, wm: 0.74, wt: 0.56 },
      { z: 2.22, yb: 0.6, ys: 0.88, yt: 0.9, wb: 0.8, wm: 0.72, wt: 0.6 },
    ],
  },
  {
    /* NOVA — 终极宽体 */
    track: 1.06,
    lipWidth: 2.3,
    skirtLength: 2.6,
    popups: false,
    wing: { w: 2.5, d: 0.5, h: 0.08, y: 1.42, z: 2.02, supports: true },
    body: [
      { z: -2.4, yb: 0.32, ys: 0.5, yt: 0.6, wb: 0.82, wm: 1.0, wt: 0.9 },
      { z: -2.0, yb: 0.26, ys: 0.52, yt: 0.7, wb: 0.96, wm: 1.14, wt: 1.04 },
      { z: -1.2, yb: 0.24, ys: 0.54, yt: 0.74, wb: 1.0, wm: 1.18, wt: 1.08 },
      { z: -0.3, yb: 0.24, ys: 0.56, yt: 0.8, wb: 1.0, wm: 1.18, wt: 1.08 },
      { z: 1.2, yb: 0.26, ys: 0.56, yt: 0.84, wb: 1.0, wm: 1.18, wt: 1.08 },
      { z: 2.06, yb: 0.28, ys: 0.54, yt: 0.82, wb: 0.94, wm: 1.12, wt: 1.0 },
      { z: 2.4, yb: 0.32, ys: 0.52, yt: 0.76, wb: 0.84, wm: 1.02, wt: 0.88 },
    ],
    cabin: [
      { z: -0.62, yb: 0.62, ys: 0.92, yt: 0.94, wb: 0.92, wm: 0.84, wt: 0.68 },
      { z: 0.38, yb: 0.62, ys: 1.2, yt: 1.34, wb: 0.9, wm: 0.82, wt: 0.66 },
      { z: 1.66, yb: 0.62, ys: 1.2, yt: 1.34, wb: 0.9, wm: 0.82, wt: 0.64 },
      { z: 2.22, yb: 0.62, ys: 0.92, yt: 0.94, wb: 0.88, wm: 0.8, wt: 0.68 },
    ],
  },
]


function buildCarModel(index) {
  const style = CAR_STYLES[index] || CAR_STYLES[0]
  const shape = CAR_SHAPES[index] || CAR_SHAPES[0]
  const car = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({
    color: style.bodyColor,
    metalness: 0.5,
    roughness: 0.32,
    emissive: new THREE.Color(style.bodyColor).multiplyScalar(0.14),
    flatShading: true,
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x08080f,
    metalness: 0.3,
    roughness: 0.8,
    flatShading: true,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1d30,
    metalness: 0.9,
    roughness: 0.16,
    emissive: 0x001a2a,
    side: THREE.DoubleSide,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: style.trimColor,
    metalness: 0.6,
    roughness: 0.28,
    emissive: new THREE.Color(style.trimColor).multiplyScalar(0.35),
    flatShading: true,
  })
  const lineMat = new THREE.MeshBasicMaterial({ color: style.trimColor })
  const tailMat = new THREE.MeshBasicMaterial({ color: style.tailColor })
  const headMat = new THREE.MeshBasicMaterial({ color: 0xe6fbff })

  /* 车身外壳：手工三角面放样，带引擎盖 / 车侧 / 车顶斜面 */
  const bodyGeo = makeLoftGeometry(shape.body)
  car.add(new THREE.Mesh(bodyGeo, bodyMat))
  car.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo, 26),
      new THREE.LineBasicMaterial({
        color: style.trimColor,
        transparent: true,
        opacity: 0.5,
      }),
    ),
  )

  /* 座舱：同样放样，顶部形成前后风挡斜面 */
  const cabinGeo = makeLoftGeometry(shape.cabin)
  car.add(new THREE.Mesh(cabinGeo, bodyMat))
  car.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(cabinGeo, 32),
      new THREE.LineBasicMaterial({
        color: style.trimColor,
        transparent: true,
        opacity: 0.3,
      }),
    ),
  )

  /* 车窗：前风挡 / 后窗 / 两侧，贴合座舱斜面 */
  const c0 = shape.cabin[0]
  const c1 = shape.cabin[1]
  const c2 = shape.cabin[2]
  const c3 = shape.cabin[shape.cabin.length - 1]
  const addGlass = (p0, p1, p2, p3) =>
    car.add(new THREE.Mesh(makeQuadGeometry(p0, p1, p2, p3), glassMat))
  addGlass(
    [-c0.wt, c0.yt, c0.z],
    [c0.wt, c0.yt, c0.z],
    [c1.wt, c1.yt, c1.z],
    [-c1.wt, c1.yt, c1.z],
  )
  addGlass(
    [-c2.wt, c2.yt, c2.z],
    [c2.wt, c2.yt, c2.z],
    [c3.wt, c3.yt, c3.z],
    [-c3.wt, c3.yt, c3.z],
  )
  ;[1, -1].forEach((side) => {
    addGlass(
      [side * c1.wm, c1.ys, c1.z],
      [side * c2.wm, c2.ys, c2.z],
      [side * c2.wb, c2.yb, c2.z],
      [side * c1.wb, c1.yb, c1.z],
    )
  })

  const nose = shape.body[0]
  const tail = shape.body[shape.body.length - 1]

  /* 前唇与侧裙 */
  const lip = new THREE.Mesh(new THREE.BoxGeometry(shape.lipWidth, 0.09, 0.5), accentMat)
  lip.position.set(0, 0.26, nose.z + 0.3)
  car.add(lip)
  ;[-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, shape.skirtLength), darkMat)
    skirt.position.set(side * shape.track, 0.3, 0.1)
    car.add(skirt)
  })

  /* 尾翼 */
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(shape.wing.w, shape.wing.h, shape.wing.d),
    darkMat,
  )
  wing.position.set(0, shape.wing.y, shape.wing.z)
  car.add(wing)
  const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(shape.wing.w, 0.03, 0.05), lineMat)
  wingEdge.position.set(
    0,
    shape.wing.y + shape.wing.h / 2,
    shape.wing.z + shape.wing.d / 2,
  )
  car.add(wingEdge)
  if (shape.wing.supports) {
    const deck = 0.8
    const height = Math.max(0.18, shape.wing.y - deck)
    ;[-0.68, 0.68].forEach((x) => {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.09, height, 0.16), darkMat)
      support.position.set(x, deck + height / 2, shape.wing.z - 0.02)
      car.add(support)
    })
  }

  /* NOVA：发光尾翼 + 向后拉出的拖尾光束 */
  if (index === 3) {
    const wingTop = shape.wing.y + shape.wing.h * 0.5
    /* 拖尾不能太长：追逐机位就在车尾后方，过长会跑到画面下缘之外 */
    const streakLength = 2.2
    /* 顶点色从尾翼端高亮过渡到远端熄灭，叠加混合下远端自然消失；
       用细长方体的光束而不是平面，保证从车后追逐视角也能看见拖尾 */
    const streakGeo = new THREE.BoxGeometry(0.12, 0.12, streakLength)
    streakGeo.translate(0, 0, streakLength / 2)
    const baseColor = new THREE.Color(style.tailColor)
    const positions = streakGeo.attributes.position
    const colors = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i += 1) {
      const t = 1 - Math.min(1, positions.getZ(i) / streakLength)
      const fade = t * t * (0.35 + t * 0.65)
      colors[i * 3] = baseColor.r * fade
      colors[i * 3 + 1] = baseColor.g * fade
      colors[i * 3 + 2] = baseColor.b * fade
    }
    streakGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const streakMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    ;[-1.0, 0, 1.0].forEach((x) => {
      const streak = new THREE.Mesh(streakGeo, streakMat)
      streak.position.set(x, wingTop - 0.02, shape.wing.z + shape.wing.d * 0.5)
      /* 两侧光束向外张开，正面追击视角也能看到拖尾 */
      streak.rotation.y = x * 0.2
      car.add(streak)
    })

    /* 尾翼上表面的一层薄辉光，让翼面整体发光而不糊成一片 */
    const wingLight = new THREE.Mesh(
      new THREE.PlaneGeometry(shape.wing.w, shape.wing.d),
      new THREE.MeshBasicMaterial({
        color: style.tailColor,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    wingLight.rotation.x = -Math.PI / 2
    wingLight.position.set(0, wingTop + 0.005, shape.wing.z)
    car.add(wingLight)

    /* 尾翼后缘的高亮灯条：让尾翼自己发光 */
    const wingBar = new THREE.Mesh(
      new THREE.BoxGeometry(shape.wing.w + 0.18, 0.06, 0.08),
      new THREE.MeshBasicMaterial({ color: style.tailColor }),
    )
    wingBar.position.set(0, wingTop, shape.wing.z + shape.wing.d * 0.5 + 0.02)
    car.add(wingBar)
  }

  /* 头灯：翻灯（AE86 / RX-7）或固定方灯（GTR / NOVA） */
  if (shape.popups) {
    const hood = shape.body[1]
    ;[-0.52, 0.52].forEach((x) => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.34), bodyMat)
      pod.position.set(x, hood.yt - 0.02, nose.z + 0.62)
      pod.rotation.x = -0.06
      car.add(pod)
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.06), headMat)
      lamp.position.set(x, hood.yt + 0.03, nose.z + 0.45)
      car.add(lamp)
    })
  } else {
    ;[-0.5, 0.5].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.08), headMat)
      lamp.position.set(x, 0.56, nose.z + 0.02)
      car.add(lamp)
    })
  }

  /* 尾灯：PHANTOM 用一条贯穿车尾的连体灯带，其余车为左右两段 */
  if (index === 2) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 0.06), tailMat)
    strip.position.set(0, 0.64, tail.z - 0.01)
    car.add(strip)
    /* 两端包角，让灯带贴着车尾轮廓转折 */
    ;[-1, 1].forEach((side) => {
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.34), tailMat)
      wrap.position.set(side * 0.92, 0.64, tail.z - 0.2)
      car.add(wrap)
    })
    /* 灯带外层的霓虹辉光 */
    const tailGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.5),
      new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: style.tailColor,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    tailGlow.position.set(0, 0.64, tail.z + 0.03)
    car.add(tailGlow)
  } else {
    ;[-0.55, 0.55].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.07), tailMat)
      lamp.position.set(x, 0.64, tail.z - 0.02)
      car.add(lamp)
    })
  }

  /* 轮子 */
  const wheelGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.32, 12)
  const rimGeo = new THREE.TorusGeometry(0.2, 0.045, 6, 14)
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.34, 8)
  ;[
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const x = sx * shape.track
    const z = sz * 1.38
    const wheel = new THREE.Mesh(wheelGeo, darkMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.37, z)
    car.add(wheel)
    const rim = new THREE.Mesh(rimGeo, accentMat)
    rim.rotation.y = Math.PI / 2
    rim.position.set(x, 0.37, z)
    car.add(rim)
    const hub = new THREE.Mesh(hubGeo, lineMat)
    hub.rotation.z = Math.PI / 2
    hub.position.set(x, 0.37, z)
    car.add(hub)
  })

  /* 底光 */
  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 7.4),
    new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: style.glowColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  underglow.rotation.x = -Math.PI / 2
  underglow.position.y = 0.05
  car.add(underglow)

  return car
}


/* 换车时释放旧模型（贴图是共享的，不在这里释放） */
function disposeObject(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const list = Array.isArray(child.material) ? child.material : [child.material]
      list.forEach((mat) => mat.dispose())
    }
  })
}

/* -------------------------------------------------------------------------- */
/* 主场景插件                                                                  */
/* -------------------------------------------------------------------------- */
export function initRacerMode({ scene, camera, gridFloor, onEnter, onExit }) {
  const modal = document.getElementById('tv-portal')
  if (!modal) return null

  const powerBtn = document.getElementById('tv-power-btn')
  const closeBtn = document.getElementById('tv-portal-close')
  const scoreEl = document.getElementById('racer-score')
  const hiEl = document.getElementById('racer-hiscore')
  const totalEl = document.getElementById('racer-total')
  const overlay = document.getElementById('racer-overlay')
  const overlayTitle = document.getElementById('racer-overlay-title')
  const overlayText = document.getElementById('racer-overlay-text')
  const startBtn = document.getElementById('racer-start-btn')
  const statusEl = document.getElementById('racer-status')
  const garageEl = document.getElementById('racer-garage')
  const garageCanvas = document.getElementById('racer-garage-canvas')
  const garageTotalEl = document.getElementById('racer-garage-total')
  const garageBtn = document.getElementById('racer-garage-btn')
  const garageCloseBtn = document.getElementById('racer-garage-close')
  const garageActions = garageEl
    ? Array.from(garageEl.querySelectorAll('.garage-action'))
    : []
  const garageStats = garageEl
    ? Array.from(garageEl.querySelectorAll('.garage-cell-stats'))
    : []

  const flashEl = document.createElement('span')
  flashEl.className = 'tv-racer-flash'
  flashEl.setAttribute('aria-hidden', 'true')
  modal.appendChild(flashEl)

  /* 复古速度线：外层辐射状线条，强度随车速变化 */
  const speedLinesEl = document.createElement('div')
  speedLinesEl.className = 'racer-speedlines'
  speedLinesEl.setAttribute('aria-hidden', 'true')
  modal.appendChild(speedLinesEl)

  let speedLineValue = -1
  const setSpeedLines = (value) => {
    const clamped = Math.max(0, Math.min(1, value))
    if (Math.abs(clamped - speedLineValue) < 0.01) return
    speedLineValue = clamped
    speedLinesEl.style.opacity = clamped.toFixed(3)
  }

  /* 连击倍率徽标 */
  const comboEl = document.createElement('span')
  comboEl.className = 'racer-combo'
  comboEl.setAttribute('aria-hidden', 'true')
  const comboLabel = document.createElement('span')
  comboLabel.className = 'racer-combo-label'
  comboLabel.textContent = 'COMBO'
  const comboValueEl = document.createElement('span')
  comboValueEl.className = 'racer-combo-value'
  comboValueEl.textContent = 'x1.0'
  comboEl.append(comboLabel, comboValueEl)
  modal.appendChild(comboEl)

  /* 加分 / 倍率的悬浮数字层 */
  const popupLayer = document.createElement('div')
  popupLayer.className = 'racer-popups'
  popupLayer.setAttribute('aria-hidden', 'true')
  modal.appendChild(popupLayer)

  let hiScore = 0
  try {
    hiScore = parseInt(window.localStorage.getItem(HISCORE_KEY) || '0', 10) || 0
  } catch (error) {
    hiScore = 0
  }

  /* 本机累计总分：这台设备上所有对局最终得分之和（localStorage 缓存） */
  const TOTAL_KEY = 'synthwave-racer-total'
  let totalScore = 0
  try {
    totalScore = parseInt(window.localStorage.getItem(TOTAL_KEY) || '0', 10) || 0
  } catch (error) {
    totalScore = 0
  }
  const updateTotalUI = () => {
    if (totalEl) totalEl.textContent = formatScore(totalScore)
  }

  /* 车库：总分不扣除，累计达到门槛即可解锁（同时也作为选车进度） */
  const GARAGE_KEY = 'synthwave-racer-unlocked'
  const SELECTED_KEY = 'synthwave-racer-car'
  const GARAGE_DEFS = [
    { id: 0, name: 'STARTER', cost: 0 },
    { id: 1, name: 'AERO-X', cost: 3000 },
    { id: 2, name: 'PHANTOM', cost: 10000 },
    { id: 3, name: 'NOVA', cost: 30000 },
  ]
  const unlockedCars = new Set([0])
  let selectedCar = 0
  try {
    const stored = JSON.parse(window.localStorage.getItem(GARAGE_KEY) || '[]')
    if (Array.isArray(stored)) {
      stored.forEach((id) => {
        if (Number.isInteger(id) && id > 0 && id < GARAGE_DEFS.length) unlockedCars.add(id)
      })
    }
  } catch (error) {
    /* localStorage 不可用时忽略 */
  }
  try {
    const storedCar = parseInt(window.localStorage.getItem(SELECTED_KEY) || '0', 10) || 0
    if (unlockedCars.has(storedCar)) selectedCar = storedCar
  } catch (error) {
    /* localStorage 不可用时忽略 */
  }
  const saveGarage = () => {
    try {
      window.localStorage.setItem(GARAGE_KEY, JSON.stringify([...unlockedCars]))
      window.localStorage.setItem(SELECTED_KEY, String(selectedCar))
    } catch (error) {
      /* localStorage 不可用时忽略 */
    }
  }

  const refreshGarageUI = () => {
    if (garageTotalEl) garageTotalEl.textContent = formatScore(totalScore)
    garageStats.forEach((el) => {
      const stats = CAR_STATS[parseInt(el.dataset.stats, 10)] || CAR_STATS[0]
      el.textContent = `SPD ${stats.topSpeed} · TRN ${stats.turn.toFixed(2)} · ACC ${stats.accelTime.toFixed(2)}s · BST ${stats.boostDuration.toFixed(1)}s`
    })
    garageActions.forEach((btn) => {
      const id = parseInt(btn.dataset.car, 10)
      const def = GARAGE_DEFS[id]
      if (!def) return
      const unlocked = unlockedCars.has(id)
      btn.classList.toggle('is-selected', id === selectedCar)
      btn.classList.toggle('is-locked', !unlocked)
      btn.disabled = id === selectedCar
      if (id === selectedCar) btn.textContent = '使用中'
      else if (unlocked) btn.textContent = '使用'
      else if (totalScore >= def.cost) btn.textContent = `解锁 ${formatScore(def.cost)}`
      else btn.textContent = `🔒 ${formatScore(def.cost)}`
    })
  }

  /* ---------------- 场景内容 ---------------- */
  const racerGroup = new THREE.Group()
  racerGroup.visible = false
  scene.add(racerGroup)

  const hemiLight = new THREE.HemisphereLight(0x8fe8ff, 0x220033, 1.15)
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
  keyLight.position.set(5, 12, 6)
  racerGroup.add(hemiLight, keyLight)

  /* 跑道：整体以远端（落日处）为轴心，沿 z 轴从 0 拉伸到 1 */
  const runway = new THREE.Group()
  runway.position.z = ROAD_FAR_Z
  runway.scale.z = 0.001
  racerGroup.add(runway)

  /* 随机弯道：以「沿赛道的距离」为自变量的平滑曲线，随路面一起向镜头流动 */
  let curvePhase = [0, 0, 0]
  let roadScroll = 0

  const curveAt = (s) =>
    Math.sin(s * 0.0115 + curvePhase[0]) * 4.2 +
    Math.sin(s * 0.0245 + curvePhase[1]) * 2.2 +
    Math.sin(s * 0.0065 + curvePhase[2]) * 1.4

  const centerAtLocal = (localZ) => curveAt(localZ * runway.scale.z - roadScroll)
  const centerAtWorld = (worldZ) => centerAtLocal(worldZ - ROAD_FAR_Z)

  /* 弯道倾斜（bank）：按曲线横向变化率给路面加横向坡度，
     右转时左缘抬高、左转时右缘抬高，车头/路面一起向弯内倾 */
  const BANK_STRENGTH = 1.6
  const BANK_LIMIT = 0.11
  const bankAt = (s) => {
    const slope = (curveAt(s + 6) - curveAt(s - 6)) / 12
    return Math.max(-BANK_LIMIT, Math.min(BANK_LIMIT, slope * BANK_STRENGTH))
  }
  const bankAtWorld = (worldZ) => bankAt(worldZ - ROAD_FAR_Z - roadScroll)

  /* 路面用可变形条带（ribbon）构建，每帧按曲线重写顶点 */
  const ribbons = []
  const rails = []
  const makeRibbon = (width, y, offset, material, renderOrder = 0) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(ROAD_ROWS * 2 * 3)
    const attr = new THREE.BufferAttribute(positions, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', attr)
    const indices = []
    for (let i = 0; i < ROAD_ROWS - 1; i += 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = renderOrder
    runway.add(mesh)
    ribbons.push({ attr, width, y, offset })
  }

  /* 竖直霓虹带：沿路缘立起的光墙，底边贴地、顶边抬高 */
  const makeRail = (offset, height, material, renderOrder = 0) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(ROAD_ROWS * 2 * 3)
    const uvs = new Float32Array(ROAD_ROWS * 2 * 2)
    for (let i = 0; i < ROAD_ROWS; i += 1) {
      uvs[i * 4] = i / (ROAD_ROWS - 1)
      uvs[i * 4 + 1] = 0
      uvs[i * 4 + 2] = i / (ROAD_ROWS - 1)
      uvs[i * 4 + 3] = 1
    }
    const attr = new THREE.BufferAttribute(positions, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', attr)
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    const indices = []
    for (let i = 0; i < ROAD_ROWS - 1; i += 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = renderOrder
    runway.add(mesh)
    rails.push({ attr, offset, height })
  }

  makeRibbon(
    ROAD_HALF * 2,
    0,
    0,
    new THREE.MeshBasicMaterial({
      color: 0x0a0618,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
    0,
  )

  /* 四块车道板，深浅交替便于分辨车道；整体 80% 不透明度 */
  LANE_X.forEach((laneX, index) => {
    makeRibbon(
      LANE_WIDTH - 0.4,
      0.012,
      laneX,
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0x0b0718 : 0x0e0820,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
      1,
    )
  })

  /* 路缘霓虹带：立起来的光墙 + 顶部亮线，颜色随时间做 RGB 循环 */
  const RAIL_HEIGHT = 1.15
  const railCanvas = document.createElement('canvas')
  railCanvas.width = 8
  railCanvas.height = 64
  const railCtx = railCanvas.getContext('2d')
  const railGradient = railCtx.createLinearGradient(0, 64, 0, 0)
  railGradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  railGradient.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  railGradient.addColorStop(1, 'rgba(255,255,255,0)')
  railCtx.fillStyle = railGradient
  railCtx.fillRect(0, 0, 8, 64)
  const railTexture = new THREE.CanvasTexture(railCanvas)

  const edgeMaterials = []
  const addNeonRail = (offset, hueOffset) => {
    const railMat = new THREE.MeshBasicMaterial({
      map: railTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    makeRail(offset, RAIL_HEIGHT, railMat, 2)

    const coreMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    makeRibbon(0.3, RAIL_HEIGHT, offset, coreMat, 3)

    edgeMaterials.push({ railMat, coreMat, hueOffset })
  }
  addNeonRail(-ROAD_HALF, 0)
  addNeonRail(ROAD_HALF, 0.45)

  let edgeHue = 0
  const edgeColor = new THREE.Color()
  const updateNeonEdges = (dt) => {
    edgeHue = (edgeHue + dt * 0.12) % 1
    for (let i = 0; i < edgeMaterials.length; i += 1) {
      const edge = edgeMaterials[i]
      edgeColor.setHSL((edgeHue + edge.hueOffset) % 1, 1, 0.55)
      edge.railMat.color.copy(edgeColor)
      edge.coreMat.color.copy(edgeColor)
    }
  }
  updateNeonEdges(0)

  /* 白色发光虚线：三条车道分隔线（x = -4 / 0 / 4），本地坐标以跑道远端为 0 */
  const dashDummy = new THREE.Object3D()
  dashDummy.rotation.x = -Math.PI / 2
  const dashZ = []
  const DASH_TOTAL = DASH_COUNT * DASH_LINES.length

  const dashCore = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.24, 3.4),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    DASH_TOTAL,
  )
  const dashGlowMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.8, 3.4),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    DASH_TOTAL,
  )
  dashCore.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  dashGlowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  dashCore.frustumCulled = false
  dashGlowMesh.frustumCulled = false
  runway.add(dashCore, dashGlowMesh)

  for (let i = 0; i < DASH_COUNT; i += 1) {
    dashZ.push(DASH_START_LOCAL - i * DASH_SPACING)
  }

  const writeDashes = () => {
    let index = 0
    for (let line = 0; line < DASH_LINES.length; line += 1) {
      const lineOffset = DASH_LINES[line]
      for (let i = 0; i < DASH_COUNT; i += 1) {
        const localZ = dashZ[i]
        const x = centerAtLocal(localZ) + lineOffset
        const bank = bankAt(localZ * runway.scale.z - roadScroll)
        dashDummy.position.set(x, 0.04 + lineOffset * bank, localZ)
        dashDummy.updateMatrix()
        dashCore.setMatrixAt(index, dashDummy.matrix)
        dashDummy.position.y = 0.035 + lineOffset * bank
        dashDummy.updateMatrix()
        dashGlowMesh.setMatrixAt(index, dashDummy.matrix)
        index += 1
      }
    }
    dashCore.instanceMatrix.needsUpdate = true
    dashGlowMesh.instanceMatrix.needsUpdate = true
  }

  /* 每帧按弯道曲线重写路面顶点 */
  const updateRoadShape = () => {
    const scale = runway.scale.z
    for (let r = 0; r < ribbons.length; r += 1) {
      const ribbon = ribbons[r]
      const arr = ribbon.attr.array
      const half = ribbon.width / 2
      for (let i = 0; i < ROAD_ROWS; i += 1) {
        const localZ = i * SEG_LEN
        const s = localZ * scale - roadScroll
        const x = curveAt(s) + ribbon.offset
        const bank = bankAt(s)
        const base = i * 6
        /* 横向坡度：左右顶点按相对路心的偏移量抬高/压低 */
        arr[base] = x - half
        arr[base + 1] = ribbon.y + (ribbon.offset - half) * bank
        arr[base + 2] = localZ
        arr[base + 3] = x + half
        arr[base + 4] = ribbon.y + (ribbon.offset + half) * bank
        arr[base + 5] = localZ
      }
      ribbon.attr.needsUpdate = true
    }
    for (let r = 0; r < rails.length; r += 1) {
      const rail = rails[r]
      const arr = rail.attr.array
      for (let i = 0; i < ROAD_ROWS; i += 1) {
        const localZ = i * SEG_LEN
        const s = localZ * scale - roadScroll
        const x = curveAt(s) + rail.offset
        const bank = bankAt(s)
        const base = i * 6
        /* 光墙底边贴合倾斜路面，顶边保持相对高度 */
        arr[base] = x
        arr[base + 1] = rail.offset * bank
        arr[base + 2] = localZ
        arr[base + 3] = x
        arr[base + 4] = rail.height + rail.offset * bank
        arr[base + 5] = localZ
      }
      rail.attr.needsUpdate = true
    }
  }

  const updateRoad = () => {
    updateRoadShape()
    writeDashes()
  }

  /* 路面整体向镜头方向推进（虚线回收 + 曲线滚动） */
  const advanceRoad = (amount) => {
    for (let i = 0; i < DASH_COUNT; i += 1) {
      dashZ[i] += amount
      if (dashZ[i] > DASH_START_LOCAL + DASH_SPACING) {
        dashZ[i] -= DASH_COUNT * DASH_SPACING
      }
    }
    roadScroll += amount
  }
  updateRoad()

  /* 车辆：容器保持位置/朝向，内部模型可随车库选车替换 */
  const playerCar = new THREE.Group()
  playerCar.position.set(START_X, 0, PLAYER_Z)
  playerCar.visible = false
  racerGroup.add(playerCar)

  let playerModel = null
  const applyPlayerModel = (index) => {
    if (playerModel) {
      playerCar.remove(playerModel)
      disposeObject(playerModel)
    }
    playerModel = buildCarModel(index)
    playerCar.add(playerModel)
  }
  applyPlayerModel(selectedCar)

  /* 轻微甩尾特效：车尾扬起一点粉色尾迹 */
  const driftGlowMat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: 0xff5aa8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const driftGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), driftGlowMat)
  driftGlow.rotation.x = -Math.PI / 2
  driftGlow.position.set(0, 0.07, 1.4)
  playerCar.add(driftGlow)

  /* 火箭加速时车尾喷出的尾焰 */
  const boostFlameMat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: 0x7ff6ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const boostFlame = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4), boostFlameMat)
  boostFlame.rotation.x = -Math.PI / 2
  boostFlame.position.set(0, 0.09, 3.0)
  playerCar.add(boostFlame)

  /* 加速时两侧尾灯的拖尾光带：从灯位向后拉出的粉色长条 */
  const tailTrailMat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: 0xff3f86,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const tailTrail = new THREE.Group()
  ;[-0.62, 0.62].forEach((x) => {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 5.4), tailTrailMat)
    streak.rotation.x = -Math.PI / 2
    streak.position.set(x, 0.52, 4.9)
    tailTrail.add(streak)
  })
  playerCar.add(tailTrail)

  /* 拖尾 / 甩尾光带的颜色跟随所选车型的尾灯色 */
  const syncTrailColor = (index) => {
    const color = CAR_STYLES[index] ? CAR_STYLES[index].tailColor : CAR_STYLES[0].tailColor
    tailTrailMat.color.setHex(color)
    driftGlowMat.color.setHex(color)
  }
  syncTrailColor(selectedCar)

  /* 加速时从路面往上升腾的像素代码粒子 */
  const PARTICLE_COUNT = 96
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
  const particleDrops = new Float32Array(PARTICLE_COUNT)
  const particleSides = new Float32Array(PARTICLE_COUNT)
  const particleSpread = new Float32Array(PARTICLE_COUNT)
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    particleSides[i] = Math.random() < 0.5 ? -1 : 1
    /* sqrt 分布让粒子更靠近路缘，中间稀疏 */
    particleSpread[i] = 1.5 + 6.5 * Math.sqrt(Math.random())
    particlePositions[i * 3] = particleSides[i] * particleSpread[i]
    /* 高度错开，保证一开始就是持续上升的字符流 */
    particlePositions[i * 3 + 1] = Math.random() * 9
    particlePositions[i * 3 + 2] = -26 + Math.random() * 40
    particleDrops[i] = 0.6 + Math.random() * 0.9
  }
  /* 每个粒子随机取一个代码字符，并混入少量暖色，形成赛博代码流 */
  const particleGlyphs = new Float32Array(PARTICLE_COUNT * 2)
  const particleTints = new Float32Array(PARTICLE_COUNT * 3)
  const assignGlyph = (i) => {
    const glyph = Math.floor(Math.random() * CODE_GLYPHS.length)
    particleGlyphs[i * 2] = glyph % CODE_COLS
    particleGlyphs[i * 2 + 1] = Math.floor(glyph / CODE_COLS)
  }
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    assignGlyph(i)
    const magenta = Math.random() < 0.28
    particleTints[i * 3] = magenta ? 1 : 0.62
    particleTints[i * 3 + 1] = magenta ? 0.55 : 0.96
    particleTints[i * 3 + 2] = 1
  }
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage),
  )
  particleGeometry.setAttribute('aGlyph', new THREE.BufferAttribute(particleGlyphs, 2))
  particleGeometry.setAttribute('aTint', new THREE.BufferAttribute(particleTints, 3))
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: getCodeTexture() },
      uCell: { value: new THREE.Vector2(1 / CODE_COLS, 1 / CODE_ROWS) },
      uOpacity: { value: 0 },
      uSize: { value: 0.46 },
      uScreenH: { value: window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: `
      attribute vec2 aGlyph;
      attribute vec3 aTint;
      uniform float uSize;
      uniform float uScreenH;
      varying vec2 vGlyph;
      varying vec3 vTint;
      void main() {
        vGlyph = aGlyph;
        vTint = aTint;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (uScreenH * 0.5 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uCell;
      uniform float uOpacity;
      varying vec2 vGlyph;
      varying vec3 vTint;
      void main() {
        vec2 uv = gl_PointCoord;
        float mask = texture2D(uMap, (vGlyph + uv) * uCell).a;
        if (mask < 0.2) discard;
        gl_FragColor = vec4(vTint * mask * uOpacity, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const speedParticles = new THREE.Points(particleGeometry, particleMaterial)
  speedParticles.frustumCulled = false
  speedParticles.visible = false
  racerGroup.add(speedParticles)

  const enemies = []
  for (let i = 0; i < ENEMY_POOL; i += 1) {
    const mesh = buildCar({
      bodyColor: 0x2a0a3e,
      trimColor: 0x00e5ff,
      tailColor: 0xff2a6d,
      glowColor: 0xff2a6d,
    })
    mesh.visible = false
    racerGroup.add(mesh)
    enemies.push({ mesh, z: 0, lane: 0, active: false })
  }

  /* ---------------- 状态 ---------------- */
  /* off | intro | running | paused | over | exit */
  let phase = 'off'
  let introTime = 0
  let exitTime = 0
  let score = 0
  let speed = CAR_STATS[0].baseSpeed
  let playerX = START_X
  let playerVX = 0
  let tailYaw = 0
  let introCarZ = INTRO_CAR_START_Z
  let spawnTimer = 1.0
  let shake = 0
  let combo = 0
  let comboTimer = 0
  let shieldTimer = 0 // 满倍率撞车后的短暂无敌
  let shownScore = -1
  let shownHi = -1
  let pointerActive = false
  const input = { left: false, right: false, touch: 0 }

  const savedPos = new THREE.Vector3(0, 0, 3)
  const savedQuat = new THREE.Quaternion()
  const savedLook = new THREE.Vector3(0, 0, -40)
  const exitFromPos = new THREE.Vector3()
  const exitFromQuat = new THREE.Quaternion()
  const forward = new THREE.Vector3()
  let gridSpeedBefore = 0.05

  /* 加速时临时抬高 FOV 制造速度冲击，退出时还原 */
  let baseFov = camera.fov
  let exitFov = camera.fov
  const setCameraFov = (value) => {
    if (Math.abs(camera.fov - value) < 0.01) return
    camera.fov = value
    camera.updateProjectionMatrix()
  }

  /* 当前选车的性能参数：极速 / 加速时间 / 转向灵敏度 / 加速持续与冷却 */
  const currentStats = () => CAR_STATS[selectedCar] || CAR_STATS[0]

  const maxSpeed = () => {
    const stats = currentStats()
    return Math.min(stats.topSpeed, stats.baseSpeed + score * 0.02)
  }

  /* ---------------- HUD ---------------- */
  const updateScoreUI = () => {
    const current = Math.floor(score)
    if (current !== shownScore) {
      shownScore = current
      if (scoreEl) scoreEl.textContent = formatScore(current)
    }
    if (hiScore !== shownHi) {
      shownHi = hiScore
      if (hiEl) hiEl.textContent = formatScore(hiScore)
    }
  }

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text
  }

  /* ---------------- 火箭加速 + 速度表 ---------------- */
  let boostTime = 0
  let boostCooldown = 0
  let boostBlend = 0 // 0→1 的平滑加速权重，用于渐变进退

  /* 加速音效：命中 BOOST 时播放一次，加速结束 / 暂停 / 退出时停止 */
  const boostAudio = new Audio('/audio/boost.mp3')
  boostAudio.preload = 'auto'
  boostAudio.volume = 0.55

  const playBoostSound = () => {
    try {
      boostAudio.pause()
      boostAudio.currentTime = 0
      const promise = boostAudio.play()
      if (promise && typeof promise.catch === 'function') promise.catch(() => {})
    } catch (error) {
      /* 浏览器拦截自动播放时静默忽略 */
    }
  }

  const stopBoostSound = () => {
    try {
      boostAudio.pause()
      boostAudio.currentTime = 0
    } catch (error) {
      /* 忽略 */
    }
  }

  const boostBtn = document.createElement('button')
  boostBtn.className = 'racer-boost is-ready'
  boostBtn.type = 'button'
  boostBtn.setAttribute('aria-label', '火箭加速')
  boostBtn.innerHTML = `
    <svg class="racer-boost-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path class="racer-boost-flame" d="M24 31c4 6 6 10 6 14 0 3-2 5-6 5s-6-2-6-5c0-4 2-8 6-14z" />
      <path class="racer-boost-body" d="M24 4c6 8 9 15 9 21 0 5-3 8-9 8s-9-3-9-8c0-6 3-13 9-21z" />
      <circle class="racer-boost-window" cx="24" cy="21" r="4.2" />
      <path class="racer-boost-fin" d="M15 25l-7 9 8-1zM33 25l7 9-8-1z" />
    </svg>
    <span class="racer-boost-label">BOOST</span>
  `
  const boostTimerEl = document.createElement('span')
  boostTimerEl.className = 'racer-boost-timer'
  boostBtn.appendChild(boostTimerEl)
  modal.appendChild(boostBtn)

  const speedoEl = document.createElement('div')
  speedoEl.className = 'racer-speedo'
  speedoEl.setAttribute('aria-hidden', 'true')
  /* 像素风直方图：并排竖条，从左到右由矮到高，随速度逐格点亮 */
  const SPEEDO_BARS = 18
  speedoEl.innerHTML = `
    <div class="racer-speedo-bars"></div>
    <div class="racer-speedo-readout"><b>000</b><span>KM/H</span></div>
  `
  const speedBarsEl = speedoEl.querySelector('.racer-speedo-bars')
  const speedBars = []
  for (let i = 0; i < SPEEDO_BARS; i += 1) {
    const bar = document.createElement('i')
    const ramp = i / (SPEEDO_BARS - 1)
    bar.style.height = `${(26 + ramp * 74).toFixed(1)}%`
    speedBarsEl.appendChild(bar)
    speedBars.push(bar)
  }
  modal.appendChild(speedoEl)

  const speedValueEl = speedoEl.querySelector('.racer-speedo-readout b')

  /* 速度表标定：按当前车的极速换算，常规极速 → 约 288~400 km/h */
  const speedoMax = () => Math.max(66, currentStats().topSpeed + 2)
  const SPEEDO_KMH = 4.5

  /* HUD 每帧都会刷新，先和上次的值比对再写 DOM，
     避免移动端因反复样式重算产生掉帧 */
  let shownBoostState = ''
  let shownBoostTimer = ''
  let shownBoostProgress = ''
  const refreshBoostUI = () => {
    const stats = currentStats()
    const cooling = boostTime <= 0 && boostCooldown > 0
    const state = boostTime > 0 ? 'boosting' : cooling ? 'cooling' : 'ready'
    if (state !== shownBoostState) {
      shownBoostState = state
      boostBtn.classList.toggle('is-boosting', state === 'boosting')
      boostBtn.classList.toggle('is-cooling', state === 'cooling')
      boostBtn.classList.toggle('is-ready', state === 'ready')
    }
    const progress =
      boostTime > 0
        ? Math.min(1, boostTime / stats.boostDuration)
        : cooling
          ? 1 - boostCooldown / stats.boostCooldown
          : 1
    const progressText = progress.toFixed(2)
    if (progressText !== shownBoostProgress) {
      shownBoostProgress = progressText
      boostBtn.style.setProperty('--boost-progress', progressText)
    }
    const timerText =
      boostTime > 0 ? boostTime.toFixed(1) : cooling ? boostCooldown.toFixed(1) : ''
    if (timerText !== shownBoostTimer) {
      shownBoostTimer = timerText
      boostTimerEl.textContent = timerText
    }
  }

  let shownLit = -1
  let shownBoost = false
  let shownKmh = ''

  const refreshSpeedo = (value, boosting) => {
    const clamped = Math.max(0, Math.min(speedoMax(), value))
    const ratio = clamped / speedoMax()
    const lit = Math.round(ratio * SPEEDO_BARS)
    if (lit !== shownLit) {
      shownLit = lit
      for (let i = 0; i < SPEEDO_BARS; i += 1) {
        speedBars[i].classList.toggle('is-on', i < lit)
      }
    }
    const kmh = String(Math.round(clamped * SPEEDO_KMH)).padStart(3, '0')
    if (kmh !== shownKmh) {
      shownKmh = kmh
      speedValueEl.textContent = kmh
    }
    if (boosting !== shownBoost) {
      shownBoost = boosting
      speedoEl.classList.toggle('is-boosting', boosting)
    }
  }

  const resetBoost = () => {
    boostTime = 0
    boostCooldown = 0
    boostBlend = 0
    stopBoostSound()
    refreshBoostUI()
    refreshSpeedo(0, false)
  }

  const triggerBoost = () => {
    if (phase !== 'running') return
    if (boostTime > 0 || boostCooldown > 0) return
    boostTime = currentStats().boostDuration
    playBoostSound()
    refreshBoostUI()
  }

  boostBtn.addEventListener('click', triggerBoost)
  refreshBoostUI()

  /* ---------------- 超车连击 ---------------- */
  /* 连击：从 1 倍起，每超一辆 +0.2，最高 3 倍；满 3 倍时撞车只清零倍率 */
  const comboMultiplier = () => Math.min(COMBO_MAX, 1 + combo * COMBO_STEP)

  let shownComboState = 'none'
  let shownComboText = ''
  const refreshComboUI = () => {
    if (combo >= 1) {
      const state = `${comboTimer < 1 ? 'fading' : 'active'}${comboMultiplier() >= COMBO_MAX - 0.001 ? ' max' : ''}`
      if (state !== shownComboState) {
        shownComboState = state
        comboEl.classList.add('is-active')
        comboEl.classList.toggle('is-fading', comboTimer < 1)
        comboEl.classList.toggle('is-max', comboMultiplier() >= COMBO_MAX - 0.001)
      }
      const text = `x${comboMultiplier().toFixed(1)}`
      if (text !== shownComboText) {
        shownComboText = text
        comboValueEl.textContent = text
      }
    } else if (shownComboState !== 'none') {
      shownComboState = 'none'
      shownComboText = ''
      comboEl.classList.remove('is-active', 'is-fading', 'is-max')
    }
  }

  const resetCombo = () => {
    combo = 0
    comboTimer = 0
    refreshComboUI()
  }

  const popScore = (gain, multiplier) => {
    const el = document.createElement('span')
    el.className = multiplier > 1.5 ? 'racer-popup is-hot' : 'racer-popup'
    const gainEl = document.createElement('b')
    gainEl.textContent = `+${gain}`
    const multEl = document.createElement('i')
    multEl.textContent = `x${multiplier.toFixed(1)}`
    el.append(gainEl, multEl)
    el.style.left = `${50 + (Math.random() * 8 - 4)}%`
    el.style.top = `${58 + Math.random() * 6}%`
    popupLayer.appendChild(el)
    window.setTimeout(() => el.remove(), 1000)
  }

  const registerOvertake = (gap) => {
    const isClose = gap < CLOSE_OVERTAKE_GAP
    combo = comboTimer > 0 ? combo + 1 : 1
    comboTimer = COMBO_WINDOW
    const multiplier = comboMultiplier()
    const base = isClose ? CLOSE_OVERTAKE_BONUS : OVERTAKE_BONUS
    const gain = Math.round(base * multiplier)
    score += gain
    popScore(gain, multiplier)
    refreshComboUI()
    /* 每次成功超车，火箭加速的剩余冷却缩短 0.5 秒 */
    if (boostCooldown > 0) {
      boostCooldown = Math.max(0, boostCooldown - OVERTAKE_BOOST_CD_REWARD)
      refreshBoostUI()
    }
    /* 冲刺期间完成近距离超车：直接延长 0.5 秒冲刺 */
    if (isClose && boostTime > 0) {
      boostTime += CLOSE_OVERTAKE_BOOST_EXTEND
      refreshBoostUI()
    }
  }

  /* 满连击（最高 3 倍）时的护盾：撞车不结束游戏，只把倍率打回 1 倍 */
  const breakShield = () => {
    resetCombo()
    shieldTimer = 0.9
    shake = 1
    flashEl.classList.add('is-active')
    window.setTimeout(() => flashEl.classList.remove('is-active'), 220)
    const el = document.createElement('span')
    el.className = 'racer-popup is-hot'
    const main = document.createElement('b')
    main.textContent = 'SHIELD BREAK'
    const mult = document.createElement('i')
    mult.textContent = 'x1.0'
    el.append(main, mult)
    el.style.left = '50%'
    el.style.top = '58%'
    popupLayer.appendChild(el)
    window.setTimeout(() => el.remove(), 1100)
  }


  const hideOverlay = () => {
    overlay?.classList.add('is-hidden')
  }

  const showOverlay = (title, text, buttonLabel) => {
    if (overlayTitle) overlayTitle.textContent = title
    if (overlayText) overlayText.textContent = text
    if (startBtn) startBtn.textContent = buttonLabel
    overlay?.classList.remove('is-hidden')
  }

  /* ---------------- 车库：单画布四象限 3D 展示 ---------------- */
  let garageRenderer = null
  let garageScene = null
  let garageCamera = null
  let garageCars = []
  let garageOpen = false
  let garageRaf = 0
  let garageLastTime = 0
  let garageWidth = 0
  let garageHeight = 0

  const initGarageScene = () => {
    if (garageRenderer || !garageCanvas) return

    garageRenderer = new THREE.WebGLRenderer({
      canvas: garageCanvas,
      alpha: true,
      antialias: true,
    })
    garageRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    garageRenderer.setClearColor(0x000000, 0)

    garageScene = new THREE.Scene()
    garageCamera = new THREE.PerspectiveCamera(34, 1.7, 0.1, 60)
    garageCamera.position.set(0, 2.7, 6.4)
    garageCamera.lookAt(0, 0.55, 0)

    const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x1a0726, 1.5)
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(4, 8, 5)
    const rim = new THREE.DirectionalLight(0xff2a6d, 0.9)
    rim.position.set(-5, 3, -6)
    const cyan = new THREE.PointLight(0x00e5ff, 18, 18, 2)
    cyan.position.set(0, 2.4, 4)
    garageScene.add(hemi, key, rim, cyan)

    /* 车位地台光晕 */
    const floorGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 40),
      new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: 0x8a2bff,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    floorGlow.rotation.x = -Math.PI / 2
    floorGlow.position.y = -0.02
    garageScene.add(floorGlow)

    garageCars = GARAGE_DEFS.map((def, index) => {
      const group = new THREE.Group()
      group.add(buildCarModel(def.id))
      group.rotation.y = -0.5 + index * 0.32
      group.visible = false
      garageScene.add(group)
      return group
    })
  }

  const resizeGarage = () => {
    if (!garageRenderer || !garageCanvas) return
    const width = garageCanvas.clientWidth
    const height = garageCanvas.clientHeight
    if (width < 4 || height < 4) return
    garageWidth = width
    garageHeight = height
    garageRenderer.setSize(width, height, false)
    /* 每个象限宽高各占一半，因此相机宽高比就是整体宽高比 */
    garageCamera.aspect = width / height
    garageCamera.updateProjectionMatrix()
  }

  const renderGarageQuadrants = () => {
    if (!garageRenderer || garageWidth < 4 || garageHeight < 4) return
    const halfW = Math.floor(garageWidth / 2)
    const halfH = Math.floor(garageHeight / 2)
    const quads = [
      [0, halfH],
      [halfW, halfH],
      [0, 0],
      [halfW, 0],
    ]
    garageRenderer.setScissorTest(true)
    for (let i = 0; i < garageCars.length; i += 1) {
      garageCars.forEach((car, index) => {
        car.visible = index === i
      })
      const [x, y] = quads[i]
      garageRenderer.setViewport(x, y, halfW, halfH)
      garageRenderer.setScissor(x, y, halfW, halfH)
      garageRenderer.render(garageScene, garageCamera)
    }
    garageRenderer.setScissorTest(false)
  }

  const garageTick = (now) => {
    if (!garageOpen) return
    const dt = garageLastTime ? Math.min(0.06, (now - garageLastTime) / 1000) : 0.016
    garageLastTime = now
    garageCars.forEach((car) => {
      car.rotation.y += dt * 0.55
    })
    renderGarageQuadrants()
    garageRaf = requestAnimationFrame(garageTick)
  }

  const openGarage = () => {
    if (!garageEl) return
    initGarageScene()
    garageOpen = true
    garageEl.classList.add('is-open')
    garageEl.setAttribute('aria-hidden', 'false')
    document.body.classList.add('racer-garage-open')
    refreshGarageUI()
    resizeGarage()
    garageLastTime = 0
    if (!garageRaf) garageRaf = requestAnimationFrame(garageTick)
  }

  const closeGarage = () => {
    if (!garageOpen) return
    garageOpen = false
    garageEl?.classList.remove('is-open')
    garageEl?.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('racer-garage-open')
    if (garageRaf) cancelAnimationFrame(garageRaf)
    garageRaf = 0
    garageCars.forEach((car) => {
      car.visible = false
    })
  }

  /* ---------------- 车辆状态 ---------------- */
  const resetEnemies = () => {
    enemies.forEach((enemy) => {
      enemy.active = false
      enemy.mesh.visible = false
    })
  }

  /* 追逐机位：贴车尾，并稍微顺着弯道摆动 */
  const chaseX = () =>
    playerX * 0.55 + (centerAtWorld(CHASE_LOOK_Z) - centerAtWorld(PLAYER_Z)) * 0.25
  const chaseLookX = () => playerX * 0.6 + centerAtWorld(CHASE_LOOK_Z) * 0.4

  const resetPlayer = () => {
    playerX = centerAtWorld(PLAYER_Z) + START_X
    playerVX = 0
    tailYaw = 0
    input.left = false
    input.right = false
    input.touch = 0
    pointerActive = false
    playerCar.position.set(playerX, 0, PLAYER_Z)
    playerCar.rotation.set(0, 0, 0)
  }

  const startRun = () => {
    closeGarage()
    resetEnemies()
    resetPlayer()
    resetCombo()
    resetBoost()
    score = 0
    speed = currentStats().baseSpeed
    spawnTimer = 1.0
    shake = 0
    shieldTimer = 0
    shownScore = -1
    updateScoreUI()
    phase = 'running'
    modal.classList.add('is-driving')
    hideOverlay()
    setStatus('DRIVING')
    camera.position.set(chaseX(), CHASE_Y, CHASE_Z)
    camera.lookAt(chaseLookX(), 0.9, CHASE_LOOK_Z)
  }

  /* ---------------- 入场 / 出场 ---------------- */
  const enter = () => {
    if (phase !== 'off') return
    closeGarage()

    savedPos.copy(camera.position)
    savedQuat.copy(camera.quaternion)
    camera.getWorldDirection(forward)
    savedLook.copy(camera.position).addScaledVector(forward, 40)
    gridSpeedBefore = gridFloor.speed
    baseFov = camera.fov
    setCameraFov(baseFov)

    phase = 'intro'
    introTime = 0
    score = 0
    speed = currentStats().baseSpeed
    playerVX = 0
    tailYaw = 0
    introCarZ = INTRO_CAR_START_Z
    spawnTimer = 1.0
    shake = 0
    resetCombo()
    resetBoost()
    shownScore = -1

    /* 每局随机生成弯道 */
    curvePhase = [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ]
    roadScroll = 0
    playerX = centerAtWorld(PLAYER_Z) + START_X
    dashZ.length = 0
    for (let i = 0; i < DASH_COUNT; i += 1) {
      dashZ.push(DASH_START_LOCAL - i * DASH_SPACING)
    }

    runway.scale.z = 0.001
    updateRoad()
    racerGroup.visible = true
    playerCar.visible = false
    playerCar.position.set(
      centerAtLocal(INTRO_CAR_START_Z - ROAD_FAR_Z) + START_X,
      0,
      introCarZ,
    )
    playerCar.rotation.set(0, 0, 0)
    resetEnemies()
    updateScoreUI()

    hideOverlay()
    setStatus('LINKING')
    modal.classList.add('is-open')
    modal.setAttribute('aria-hidden', 'false')
    document.body.classList.add('racer-active')
    if (powerBtn) {
      powerBtn.classList.add('is-on')
      powerBtn.setAttribute('aria-expanded', 'true')
    }
    onEnter?.()
  }

  /* 退出第 1 步：游戏组件（道路 / 车辆 / HUD）立即消失，站点元素先还原 */
  const hideGameElements = () => {
    closeGarage()
    racerGroup.visible = false
    runway.scale.z = 0.001
    playerCar.visible = false
    playerVX = 0
    resetEnemies()
    resetCombo()
    resetBoost()
    driftGlowMat.opacity = 0
    boostFlameMat.opacity = 0
    tailTrailMat.opacity = 0
    speedParticles.visible = false
    particleMaterial.uniforms.uOpacity.value = 0
    setSpeedLines(0)
    gridFloor.speed = gridSpeedBefore
    flashEl.classList.remove('is-active')

    modal.classList.remove('is-open', 'is-driving')
    modal.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('racer-active')
    if (powerBtn) {
      powerBtn.classList.remove('is-on')
      powerBtn.setAttribute('aria-expanded', 'false')
    }
    onExit?.()
  }

  const exit = () => {
    if (phase === 'off' || phase === 'exit') return
    exitFromPos.copy(camera.position)
    exitFromQuat.copy(camera.quaternion)
    exitFov = camera.fov
    exitTime = 0
    phase = 'exit'
    hideOverlay()
    hideGameElements()
  }

  /* 退出第 2 步：游戏组件消失后，再把镜头还原回作品集 */
  const finishExit = () => {
    phase = 'off'
    if (powerBtn) powerBtn.focus({ preventScroll: true })
    input.left = false
    input.right = false
    input.touch = 0
    pointerActive = false
  }

  /* ---------------- 游戏逻辑 ---------------- */
  const spawnEnemy = () => {
    const enemy = enemies.find((item) => !item.active)
    if (!enemy) return

    /* 刚出生区域已经占用的车道不再放车，避免叠在一起 */
    const busy = new Set(
      enemies
        .filter((item) => item.active && item.z < ENEMY_SPAWN_Z + 26)
        .map((item) => item.lane),
    )
    const freeLanes = LANE_X.filter((laneX) => !busy.has(laneX))
    if (freeLanes.length === 0) return

    /* 约 3 成概率出现在玩家所在车道附近，其余随机 */
    const playerLane = playerX - centerAtWorld(PLAYER_Z)
    const nearestLane = LANE_X.reduce(
      (best, laneX) =>
        Math.abs(laneX - playerLane) < Math.abs(best - playerLane) ? laneX : best,
      LANE_X[0],
    )
    let lane = nearestLane
    if (Math.random() >= 0.32 || !freeLanes.includes(nearestLane)) {
      lane = freeLanes[Math.floor(Math.random() * freeLanes.length)]
    }

    enemy.active = true
    enemy.z = ENEMY_SPAWN_Z
    enemy.lane = lane
    enemy.mesh.visible = true
    enemy.mesh.position.set(centerAtWorld(ENEMY_SPAWN_Z) + lane, 0, ENEMY_SPAWN_Z)
    enemy.mesh.rotation.set(0, 0, 0)
  }

  const gameOver = () => {
    const finalScore = Math.floor(score)
    if (finalScore > hiScore) {
      hiScore = finalScore
      try {
        window.localStorage.setItem(HISCORE_KEY, String(hiScore))
      } catch (error) {
        /* localStorage 不可用时忽略 */
      }
    }
    shownHi = -1
    /* 本机累计总分：每局结束把最终得分累加并写入本地缓存 */
    totalScore += finalScore
    try {
      window.localStorage.setItem(TOTAL_KEY, String(totalScore))
    } catch (error) {
      /* localStorage 不可用时忽略 */
    }
    updateTotalUI()
    updateScoreUI()
    resetCombo()
    resetBoost()
    setCameraFov(baseFov)
    shake = 1
    phase = 'over'
    flashEl.classList.add('is-active')
    window.setTimeout(() => flashEl.classList.remove('is-active'), 220)
    setStatus('SIGNAL LOST')
    showOverlay(
      'GAME OVER',
      `SCORE ${formatScore(score)} · HI ${formatScore(hiScore)} · TOTAL ${formatScore(totalScore)}`,
      'RETRY',
    )
  }

  const pause = () => {
    if (phase !== 'running') return
    phase = 'paused'
    pointerActive = false
    input.left = false
    input.right = false
    input.touch = 0
    stopBoostSound()
    setStatus('PAUSED')
    showOverlay('PAUSED', '游戏暂停中 · 按 SPACE 继续', 'RESUME')
  }

  const resume = () => {
    if (phase !== 'paused') return
    phase = 'running'
    hideOverlay()
    setStatus('DRIVING')
  }

  /* ---------------- 每帧更新 ---------------- */
  const updateIntro = (dt) => {
    introTime += dt
    const t = introTime

    /* ① 霓虹道路展开：镜头同时抬到低角度俯视机位，不再分两步 */
    const roadProgress = easeOutCubic(clamp01(t / INTRO_ROAD_END))
    runway.scale.z = Math.max(0.001, roadProgress)
    const overhead = roadProgress

    /* ② 赛车从镜头后方（屏幕外）驶入，向远处开 */
    const driveT = clamp01((t - INTRO_CAR_START) / (INTRO_CAR_SETTLE - INTRO_CAR_START))
    const settleT = clamp01((t - INTRO_CAR_SETTLE) / (INTRO_SECONDS - INTRO_CAR_SETTLE))
    if (t >= INTRO_CAR_START) playerCar.visible = true
    introCarZ = lerp(
      lerp(INTRO_CAR_START_Z, INTRO_CAR_SETTLE_Z, easeOutCubic(driveT)),
      PLAYER_Z,
      easeInOutCubic(settleT),
    )
    playerX = centerAtLocal(introCarZ - ROAD_FAR_Z) + START_X
    const introBank = bankAtWorld(introCarZ) * START_X
    playerCar.position.set(playerX, introBank, introCarZ)
    const introYaw = Math.atan2(
      centerAtWorld(introCarZ + 8) - centerAtWorld(introCarZ - 8),
      16,
    )
    playerCar.rotation.y += (introYaw - playerCar.rotation.y) * 0.12
    playerCar.rotation.z += (0 - playerCar.rotation.z) * 0.32

    /* ③ 镜头跟随与赛车入场同时进行：从赛车起步就一路贴到尾随机位 */
    const follow = easeInOutCubic(
      clamp01((t - INTRO_CAR_START) / (INTRO_SECONDS - INTRO_CAR_START)),
    )
    const shotX = centerAtWorld(introCarZ)
    camera.position.set(
      lerp(lerp(savedPos.x, shotX, overhead), chaseX(), follow),
      lerp(lerp(savedPos.y, OVERHEAD_CAM_Y, overhead), CHASE_Y, follow),
      lerp(lerp(savedPos.z, OVERHEAD_CAM_Z, overhead), CHASE_Z, follow),
    )
    camera.lookAt(
      lerp(lerp(savedLook.x, shotX, overhead), chaseLookX(), follow),
      lerp(lerp(savedLook.y, OVERHEAD_LOOK_Y, overhead), 0.9, follow),
      lerp(lerp(savedLook.z, OVERHEAD_LOOK_Z, overhead), CHASE_LOOK_Z, follow),
    )

    if (t >= INTRO_ROAD_END) advanceRoad(8 * dt)
    updateRoad()
    gridFloor.speed = 8 / 1000

    if (t >= INTRO_SECONDS) finishIntro()
  }

  const finishIntro = () => {
    phase = 'running'
    modal.classList.add('is-driving')
    playerVX = 0
    tailYaw = 0
    playerX = centerAtWorld(PLAYER_Z) + START_X
    playerCar.position.set(playerX, 0, PLAYER_Z)
    playerCar.rotation.y = Math.atan2(
      centerAtWorld(PLAYER_Z + 8) - centerAtWorld(PLAYER_Z - 8),
      16,
    )
    playerCar.rotation.z = 0
    /* 硬切到尾随镜头 */
    camera.position.set(chaseX(), CHASE_Y, CHASE_Z)
    camera.lookAt(chaseLookX(), 0.9, CHASE_LOOK_Z)
    hideOverlay()
    setStatus('DRIVING')
    spawnTimer = 1.0
  }

  const updateRunning = (dt, seconds) => {
    /* 火箭加速计时：激活 3 秒，结束进入 5 秒冷却 */
    const stats = currentStats()
    if (boostTime > 0) {
      boostTime = Math.max(0, boostTime - dt)
      if (boostTime === 0) {
        boostCooldown = stats.boostCooldown
        stopBoostSound()
      }
      refreshBoostUI()
    } else if (boostCooldown > 0) {
      boostCooldown = Math.max(0, boostCooldown - dt)
      refreshBoostUI()
    }
    const boosting = boostTime > 0
    /* 平滑加速/减速：加速时间越短的车拉满越快（按 accelTime 换算） */
    const blendRate = boosting ? stats.boostRamp : 2.4
    boostBlend += ((boosting ? 1 : 0) - boostBlend) * Math.min(1, dt * blendRate)
    const scoreMult = 1 + boostBlend
    const targetSpeed = maxSpeed() * (1 + (BOOST_MULT - 1) * boostBlend)
    const accelRate = 2.6 / stats.accelTime
    speed += (targetSpeed - speed) * Math.min(1, dt * accelRate)
    score += dt * speed * 1.6 * scoreMult

    /* 简化漂移手感：转向给一个横向目标速度，松开后缓慢回正 → 车会滑一段 */
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0) + input.touch
    const maxLateral = (8.5 + speed * 0.075) * stats.turn
    const targetVX = steer * maxLateral
    const grip = (steer !== 0 ? 7 : 2.2) * stats.turn
    playerVX += (targetVX - playerVX) * Math.min(1, grip * dt)
    playerX += playerVX * dt

    /* 沿弯道跟随：以玩家所在 z 处的车道中心为基准限制横向范围 */
    const centerNow = centerAtWorld(PLAYER_Z)
    const minX = centerNow + PLAYER_MIN_X
    const maxX = centerNow + PLAYER_MAX_X
    if (playerX < minX) {
      playerX = minX
      playerVX *= -0.25
    } else if (playerX > maxX) {
      playerX = maxX
      playerVX *= -0.25
    }

    /* 车头顺着弯道方向，只保留一点点甩尾角 */
    const roadYaw = Math.atan2(
      centerAtWorld(PLAYER_Z + 8) - centerAtWorld(PLAYER_Z - 8),
      16,
    )
    const targetTail = Math.max(-0.22, Math.min(0.22, playerVX * 0.018))
    tailYaw += (targetTail - tailYaw) * Math.min(1, dt * 6)
    const yawOffset = -tailYaw

    /* 旋转中心在前轮轴（本地 z=-1.35）：绕前轮转，车头位置基本不动 */
    const FRONT_AXLE_Z = -1.35
    const bob = Math.sin(seconds * 22) * 0.012
    /* 车体贴着倾斜路面：按玩家相对路心的偏移量抬升/下压，并随坡度侧倾 */
    const playerBank = bankAtWorld(PLAYER_Z)
    const playerBankOffset = (playerX - centerNow) * playerBank
    playerCar.position.set(
      playerX - Math.sin(yawOffset) * FRONT_AXLE_Z,
      bob + playerBankOffset,
      PLAYER_Z + FRONT_AXLE_Z * (1 - Math.cos(yawOffset)),
    )
    const turn = Math.min(1, dt * 10)
    /* 侧倾比车头转向更跟手：转向时快速压低，松开后更快速回正 */
    const rollTurn = Math.min(1, dt * (steer !== 0 ? 30 : 44))
    playerCar.rotation.y += (roadYaw + yawOffset - playerCar.rotation.y) * turn
    playerCar.rotation.z +=
      (yawOffset * 0.3 + Math.atan(playerBank) - playerCar.rotation.z) * rollTurn

    /* 轻微甩尾特效：横向滑移越大，车尾粉色尾迹越亮 */
    const slip = Math.min(1, Math.abs(playerVX) / 12)
    driftGlowMat.opacity = slip * 0.42
    driftGlow.scale.set(0.85 + slip * 0.35, 0.9 + slip * 0.5, 1)

    /* 加速尾焰：随平滑加速权重淡入淡出 */
    boostFlameMat.opacity =
      boostBlend > 0.01 ? boostBlend * (0.5 + Math.sin(seconds * 36) * 0.14) : 0

    /* 尾灯拖尾：随加速权重亮起，alpha 更足，并随速度轻微伸缩 */
    tailTrailMat.opacity =
      boostBlend > 0.01 ? boostBlend * (1.35 + Math.sin(seconds * 24) * 0.15) : 0
    tailTrail.scale.set(1, 1, 0.8 + boostBlend * 0.35)

    /* 速度粒子：加速时从下往上持续升腾 */
    if (boostBlend > 0.02) {
      speedParticles.visible = true
      particleMaterial.uniforms.uOpacity.value = boostBlend * 0.9
      particleMaterial.uniforms.uScreenH.value =
        window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)
      const rise = dt * (4 + speed * 0.06)
      let glyphChanged = false
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const yi = i * 3 + 1
        particlePositions[yi] += rise * particleDrops[i]
        if (particlePositions[yi] > 9.5) {
          particlePositions[yi] = 0.2 + Math.random() * 1.4
          particlePositions[i * 3 + 2] = -26 + Math.random() * 40
          particleSides[i] = Math.random() < 0.5 ? -1 : 1
          particleSpread[i] = 1.5 + 6.5 * Math.sqrt(Math.random())
          /* 重生时换一个字符，让代码流不断变化 */
          assignGlyph(i)
          glyphChanged = true
        }
        /* 沿当前弯道中心贴在路缘两侧 */
        particlePositions[i * 3] =
          centerAtWorld(particlePositions[i * 3 + 2]) +
          particleSides[i] * particleSpread[i]
      }
      particleGeometry.attributes.position.needsUpdate = true
      if (glyphChanged) particleGeometry.attributes.aGlyph.needsUpdate = true
    } else if (speedParticles.visible) {
      speedParticles.visible = false
      particleMaterial.uniforms.uOpacity.value = 0
    }

    /* 复古速度线：随车速增强，漂移/加速时再加一点 */
    const rush = Math.min(1, Math.max(0, (speed - 26) / 70))
    setSpeedLines(0.07 + rush * 0.3 + slip * 0.1 + boostBlend * 0.1)

    if (Math.abs(playerVX) > 5) score += dt * 12 * scoreMult

    /* 连击窗口倒计时：超时未再超车则倍率清零 */
    if (comboTimer > 0) {
      comboTimer = Math.max(0, comboTimer - dt)
      if (comboTimer === 0) resetCombo()
      else refreshComboUI()
    }

    /* 护盾破裂后的短暂无敌 */
    if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - dt)

    const follow = Math.min(1, dt * 6)
    camera.position.x += (chaseX() - camera.position.x) * follow
    camera.position.y = CHASE_Y + Math.sin(seconds * 9) * 0.02
    camera.position.z = CHASE_Z
    camera.lookAt(chaseLookX(), 0.9, CHASE_LOOK_Z)

    advanceRoad(speed * dt)
    updateRoad()
    gridFloor.speed = Math.max(speed, 18) / 1000

    spawnTimer -= dt
    if (
      spawnTimer <= 0 &&
      enemies.filter((enemy) => enemy.active).length < MAX_ENEMIES
    ) {
      spawnEnemy()
      spawnTimer = Math.max(0.55, 1.35 - speed * 0.013) + Math.random() * 0.3
    }

    const enemyAdvance = dt * speed * 0.95
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i]
      if (!enemy.active) continue

      enemy.z += enemyAdvance
      const enemyX = centerAtWorld(enemy.z) + enemy.lane
      const enemyBank = bankAtWorld(enemy.z)
      enemy.mesh.position.set(
        enemyX,
        Math.sin(seconds * 8 + i) * 0.015 + enemy.lane * enemyBank,
        enemy.z,
      )
      enemy.mesh.rotation.y = Math.atan2(
        centerAtWorld(enemy.z + 6) - centerAtWorld(enemy.z - 6),
        12,
      )
      enemy.mesh.rotation.z += (Math.atan(enemyBank) - enemy.mesh.rotation.z) * 0.2

      if (
        Math.abs(enemy.z - PLAYER_Z) < PLAYER_HIT_HALF_Z &&
        Math.abs(enemyX - playerX) < PLAYER_HIT_HALF_X
      ) {
        enemy.active = false
        enemy.mesh.visible = false
        if (shieldTimer > 0) continue
        /* 满连击（最高 3 倍）撞车：护盾破碎，只重置倍率不结束游戏 */
        if (comboMultiplier() >= COMBO_MAX - 0.001) {
          breakShield()
          continue
        }
        gameOver()
        return
      }

      if (enemy.z > 6) {
        /* 超车判定：横向距离在判定范围内才算真正超越，
           才能获得分数、连击与加速冷却收益；隔着车道飘过去不算 */
        const gap = Math.abs(enemyX - playerX)
        enemy.active = false
        enemy.mesh.visible = false
        if (gap <= OVERTAKE_MAX_LATERAL) registerOvertake(gap)
      }
    }

    refreshSpeedo(speed, boosting || boostBlend > 0.04)
    setCameraFov(baseFov + boostBlend * BOOST_FOV)
    updateScoreUI()
  }

  const updateExit = (dt) => {
    exitTime += dt
    const t = easeInOutCubic(clamp01(exitTime / EXIT_SECONDS))
    camera.position.lerpVectors(exitFromPos, savedPos, t)
    camera.quaternion.copy(exitFromQuat).slerp(savedQuat, t)
    setCameraFov(lerp(exitFov, baseFov, t))
    if (exitTime >= EXIT_SECONDS) finishExit()
  }

  const update = (dt, elapsed) => {
    if (phase === 'off') return false

    const step = Math.min(0.05, dt)
    const seconds = elapsed

    if (shake > 0) shake = Math.max(0, shake - step * 2.6)

    if (phase === 'intro') {
      updateNeonEdges(step)
      updateIntro(step)
    } else if (phase === 'running') {
      updateNeonEdges(step)
      updateRunning(step, seconds)
    } else if (phase === 'paused' || phase === 'over') {
      /* 固定住追逐机位，避免震屏偏移逐帧累积 */
      camera.position.set(chaseX(), CHASE_Y, CHASE_Z)
      camera.lookAt(chaseLookX(), 0.9, CHASE_LOOK_Z)
      gridFloor.speed = 0
      setSpeedLines(0)
    } else if (phase === 'exit') {
      updateExit(step)
    }

    if (phase !== 'off' && phase !== 'exit' && shake > 0) {
      const amount = shake * 0.5
      camera.position.x += (Math.random() * 2 - 1) * amount
      camera.position.y += (Math.random() * 2 - 1) * amount * 0.6
    }

    return phase !== 'off'
  }

  /* ---------------- 事件 ---------------- */
  powerBtn?.addEventListener('click', () => {
    if (phase === 'off') enter()
    else exit()
  })

  closeBtn?.addEventListener('click', exit)

  startBtn?.addEventListener('click', () => {
    if (phase === 'paused') resume()
    else if (phase === 'over') startRun()
  })

  /* 开始界面的「车库」按钮：随时查看车辆与解锁进度 */
  garageBtn?.addEventListener('click', () => {
    if (phase === 'running') return
    openGarage()
  })

  garageCloseBtn?.addEventListener('click', closeGarage)

  garageActions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.car, 10)
      const def = GARAGE_DEFS[id]
      if (!def || id === selectedCar) return
      /* 总分不扣除，只看累计是否达到门槛 */
      if (!unlockedCars.has(id)) {
        if (totalScore < def.cost) return
        unlockedCars.add(id)
      }
      selectedCar = id
      saveGarage()
      applyPlayerModel(selectedCar)
      syncTrailColor(selectedCar)
      refreshGarageUI()
    })
  })

  const onKeyDown = (event) => {
    if (phase === 'off') return
    const key = event.key

    /* 车库打开时只响应 ESC，先关车库再退出游戏 */
    if (garageOpen) {
      if (key === 'Escape') {
        event.preventDefault()
        closeGarage()
      }
      return
    }

    if (key === 'Escape') {
      event.preventDefault()
      exit()
      return
    }
    if (phase === 'intro' || phase === 'exit') return

    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      input.left = true
      event.preventDefault()
      return
    }
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      input.right = true
      event.preventDefault()
      return
    }
    if (key === 'w' || key === 'W' || key === 'ArrowUp') {
      event.preventDefault()
      triggerBoost()
      return
    }
    if (key === ' ' || key === 'Enter') {
      if (phase === 'paused') {
        event.preventDefault()
        resume()
      } else if (phase === 'over') {
        event.preventDefault()
        startRun()
      }
    }
  }

  const onKeyUp = (event) => {
    const key = event.key
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') input.left = false
    if (key === 'ArrowRight' || key === 'd' || key === 'D') input.right = false
  }

  const updatePointer = (event) => {
    const ratio = event.clientX / window.innerWidth
    input.touch = ratio < 0.5 ? -1 : 1
  }

  const endPointer = () => {
    pointerActive = false
    input.touch = 0
  }

  window.addEventListener('pointerdown', (event) => {
    if (phase !== 'running') return
    /* 按钮 / 音量滑块等控件照常响应，不参与转向 */
    if (event.target.closest('button, input, label, a, select')) return
    /* 阻止移动端长按触发文字选中与系统菜单 */
    event.preventDefault()
    pointerActive = true
    updatePointer(event)
  }, { passive: false })

  window.addEventListener('pointermove', (event) => {
    if (!pointerActive || phase !== 'running') return
    updatePointer(event)
  })

  window.addEventListener('pointerup', endPointer)
  window.addEventListener('pointercancel', endPointer)
  window.addEventListener('resize', () => {
    if (garageOpen) resizeGarage()
  })
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
  })

  /* ---------------- 初始 ---------------- */
  updateScoreUI()
  updateTotalUI()

  return {
    enter,
    exit,
    update,
    isActive: () => phase !== 'off',
  }
}
