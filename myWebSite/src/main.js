import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import Scene from './Scene.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import ModelLoader from './ModelLoader.js'
import UIManager from './UIManager.js'
import MovingGridFloor from './MovingGridFloor.js'
import SynthwaveSun from './SynthwaveSun.js'
import ElectronicDust from './ElectronicDust.js'
import WireframeMountain from './WireframeMountain.js'
import VirtualAvatar from './VirtualAvatar.js'
import PinkOzoneFog from './PinkOzoneFog.js'
import MusicVisualizer from './MusicVisualizer.js'
import musicService from './MusicService.js'
import { loadSavedLang, setCurrentLang, getLanguageList, getCurrentLang, t } from './i18n.js'

// 励志语录初始化
let motivationQuoteModule = null;
let currentQuote = null;

async function initMotivationQuotes() {
  try {
    const triggerBtn = document.getElementById('quote-trigger-btn');
    const modalOverlay = document.getElementById('quote-modal-overlay');
    const modalContent = document.getElementById('quote-modal-content');
    const closeBtn = document.getElementById('quote-close-btn');
    const refreshBtn = document.getElementById('modal-refresh-btn');
    const quoteTextEl = document.getElementById('modal-quote-text');
    const quoteAuthorEl = document.getElementById('modal-quote-author');
    
    if (!triggerBtn || !modalOverlay || !closeBtn || !refreshBtn || !quoteTextEl || !quoteAuthorEl) {
      console.warn('Motivation quote elements not found, skipping initialization');
      return;
    }
    
    // 动态导入语录模块
    motivationQuoteModule = await import('./motivationQuotes.js');
    const { getDailyQuote, getRandomQuote, getQuoteInLanguage } = motivationQuoteModule;
    
    // 显示语录
    const displayQuote = (quote) => {
      currentQuote = quote;
      const currentLang = getCurrentLang();
      quoteTextEl.textContent = getQuoteInLanguage(quote, currentLang);
      quoteAuthorEl.textContent = `- ${quote.author}`;
    };
    
    // 打开模态框
    const openModal = () => {
      modalOverlay.classList.remove('hidden');
      modalOverlay.style.opacity = '1';
      modalOverlay.style.visibility = 'visible';
      
      // 如果还没有语录，显示今日语录
      if (!currentQuote) {
        const todayQuote = getDailyQuote();
        displayQuote(todayQuote);
      }
    };
    
    // 关闭模态框
    const closeModal = () => {
      modalOverlay.style.opacity = '0';
      modalOverlay.style.visibility = 'hidden';
      setTimeout(() => {
        modalOverlay.classList.add('hidden');
      }, 300);
    };
    
    // 点击触发按钮
    triggerBtn.addEventListener('click', openModal);
    
    // 点击关闭按钮
    closeBtn.addEventListener('click', closeModal);
    
    // 点击蒙版关闭（但不是内容区域）
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
    
    // 刷新按钮
    refreshBtn.addEventListener('click', () => {
      const randomQuote = getRandomQuote();
      displayQuote(randomQuote);
    });
    
    // 监听语言切换事件
    document.addEventListener('languageChange', () => {
      if (motivationQuoteModule && currentQuote) {
        displayQuote(currentQuote);
      }
      // 更新展示框文字
      updateDisplayBoxText();
    });
    
    // 添加悬停效果
    triggerBtn.addEventListener('mouseenter', () => {
      triggerBtn.style.transform = 'scale(1.1)';
      triggerBtn.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.6)';
    });
    
    triggerBtn.addEventListener('mouseleave', () => {
      triggerBtn.style.transform = 'scale(1)';
      triggerBtn.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
    });
    
    // 刷新按钮悬停效果
    refreshBtn.addEventListener('mouseenter', () => {
      refreshBtn.style.background = 'rgba(0, 255, 255, 0.1)';
      refreshBtn.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
      refreshBtn.style.transform = 'rotate(180deg) scale(1.1)';
    });
    
    refreshBtn.addEventListener('mouseleave', () => {
      refreshBtn.style.background = 'transparent';
      refreshBtn.style.boxShadow = 'none';
      refreshBtn.style.transform = 'rotate(0deg) scale(1)';
    });
    
    // 关闭按钮悬停效果
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 0, 255, 0.1)';
      closeBtn.style.boxShadow = '0 0 10px rgba(255, 0, 255, 0.5)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
      closeBtn.style.boxShadow = 'none';
    });
    
  } catch (error) {
    console.error('Error initializing motivation quotes:', error);
  }
}

const canvas = document.querySelector('canvas.webgl')

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const scene = new Scene()
const camera = new Camera(sizes)
const renderer = new Renderer(canvas, sizes)

const modelLoader = new ModelLoader()
let loadedModel = null
let wireframeIcosahedron = null

// 多面体缩放状态
let isGalleryMode = false
let targetScale = 1
let currentScale = 1

// 画廊模式遮罩平面
let galleryOverlayPlane = null

// 展示框数组
let displayBoxes = []
let icoVertices = []
let boxTargetIndices = [] // 存储每个展示框的目标顶点索引
let boxSwitchProgress = [] // 存储每个展示框的切换进度（0-1）
let lastSwitchTime = [] // 记录每个框上次切换的时间，防止频繁闪烁
let raycaster = null // 用于点击检测的射线投射器
let clickedBoxIndex = -1 // 当前点击的展示框索引
let clickAnimationTime = 0 // 点击动画时间

const gridFloor = new MovingGridFloor(scene.instance)
const sun = new SynthwaveSun(scene.instance, camera.instance)
const electronicDust = new ElectronicDust(scene.instance)
const leftMountain = new WireframeMountain(scene.instance, 'left')
const rightMountain = new WireframeMountain(scene.instance, 'right')
const virtualAvatar = new VirtualAvatar(scene.instance, camera.instance, canvas)
const pinkOzoneFog = new PinkOzoneFog(scene.instance, camera.instance)
const musicVisualizer = new MusicVisualizer(scene.instance, camera.instance)

let composer
const renderScene = new RenderPass(scene.instance, camera.instance)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  1.2,
  0.5,
  0.05
)
bloomPass.threshold = 0.25
bloomPass.strength = 0.4
bloomPass.radius = 0.4

composer = new EffectComposer(renderer.instance)
composer.addPass(renderScene)
composer.addPass(bloomPass)

const loadingScreen = document.getElementById('loading-screen')
const loadingProgress = document.getElementById('loading-progress')
const loadingText = document.getElementById('loading-text')

let animationId = null
let isCleanedUp = false
let prevTime = 0

const mouse = new THREE.Vector2(0, 0)
const targetRotation = new THREE.Vector2(0, 0)
const currentRotation = new THREE.Vector2(0, 0)
const rotationSmoothness = 0.05
const rotationAmplitude = 0.15

function updateLoadingProgress(progress) {
  const percent = Math.round(progress * 100)
  loadingProgress.value = percent
  loadingText.textContent = `${percent}%`
}

function hideLoadingScreen() {
  loadingScreen.classList.add('hidden')
}

const icoGeometry = new THREE.IcosahedronGeometry(2.5, 0)
const icoEdges = new THREE.EdgesGeometry(icoGeometry)
const icoMaterial = new THREE.LineBasicMaterial({
  color: 0x00FFFF,
  transparent: true,
  opacity: 0.9
})
wireframeIcosahedron = new THREE.LineSegments(icoEdges, icoMaterial)
wireframeIcosahedron.position.y = 0.5
scene.instance.add(wireframeIcosahedron)
loadedModel = wireframeIcosahedron

// 创建画廊模式遮罩平面 - 放在多面体后面遮挡背景
const overlayGeometry = new THREE.PlaneGeometry(100, 100)
const overlayMaterial = new THREE.MeshBasicMaterial({
  color: 0x010104,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide
})
galleryOverlayPlane = new THREE.Mesh(overlayGeometry, overlayMaterial)
galleryOverlayPlane.position.z = -10 // 放在多面体后面
galleryOverlayPlane.renderOrder = 0 // 确保最先渲染
scene.instance.add(galleryOverlayPlane)

// 获取二十面体顶点
const vertices = []
const posAttribute = icoGeometry.attributes.position
for (let i = 0; i < posAttribute.count; i++) {
  vertices.push(new THREE.Vector3(
    posAttribute.getX(i),
    posAttribute.getY(i),
    posAttribute.getZ(i)
  ))
}

// 打印所有顶点的信息，方便调试
console.log('二十面体顶点信息:')
vertices.forEach((v, i) => {
  const scale = 2.5 / (v.z + 5)
  const screenX = v.x * scale
  const screenY = v.y * scale
  console.log(`顶点${i}: 3D=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}), 屏幕=(${screenX.toFixed(2)}, ${screenY.toFixed(2)})`)
})

// 选择四个在固定初始角度下屏幕空间最分散的顶点，暴力搜索真的不会重叠的组合
function getDispersedIndices(count, vertices) {
  const n = vertices.length
  const allCombinations = []
  
  // 暴力搜索所有12个顶点中取4个的组合（共495种）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const indices = [i, j, k, l]
          
          // 计算每个顶点的屏幕投影位置
          const screenPositions = []
          let allBackFacing = true
          let minPairwiseDistances = []
          let maxScreenX = -Infinity
          let minScreenX = Infinity
          
          for (let idx of indices) {
            const v = vertices[idx]
            // 优先背面顶点
            if (v.z < 0) allBackFacing = false // 至少有一个在正面，不太理想但也可以
            
            const scale = 2.5 / (v.z + 5)
            const screenX = v.x * scale
            const screenY = v.y * scale
            const screenPos = new THREE.Vector2(screenX, screenY)
            screenPositions.push(screenPos)
            
            maxScreenX = Math.max(maxScreenX, screenX)
            minScreenX = Math.min(minScreenX, screenX)
          }
          
          // 计算每对顶点的屏幕距离
          let minDistance = Infinity
          let totalDistance = 0
          for (let a = 0; a < 4; a++) {
            for (let b = a + 1; b < 4; b++) {
              const dist = screenPositions[a].distanceTo(screenPositions[b])
              minPairwiseDistances.push(dist)
              minDistance = Math.min(minDistance, dist)
              totalDistance += dist
            }
          }
          
          allCombinations.push({
            indices,
            minDistance, // 最小两两距离（我们要确保这个足够大）
            totalDistance,
            allBackFacing,
            screenPositions,
            maxScreenX,
            minScreenX
          })
        }
      }
    }
  }
  
  // 筛选条件：
  // 1. 最小距离 >= 1.0（不会重叠）
  // 2. 屏幕 x 坐标不要太偏（确保在可视范围内）
  const safeCombinations = allCombinations.filter(combo => {
    // 距离筛选
    if (combo.minDistance < 1.0) return false
    
    // 检查屏幕位置不要太偏
    // 要求：最左边的点不能太左，最右边的点不能太右
    const xRange = combo.maxScreenX - combo.minScreenX
    const avgX = (combo.maxScreenX + combo.minScreenX) / 2
    
    // 排除x范围太小（所有点挤在一起）
    if (xRange < 2.0) return false
    
    // 排除平均x位置偏离中心太多（太靠左或太靠右）
    if (Math.abs(avgX) > 3.5) return false
    
    // 排除最极端的屏幕位置
    if (combo.maxScreenX > 8 || combo.minScreenX < -8) return false
    
    return true
  })
  
  console.log(`找到 ${safeCombinations.length} 个合适的位置组合！`)
  
  if (safeCombinations.length === 0) {
    // 如果没有这么严格的筛选没有结果，降低要求
    console.log('降低筛选要求...')
    const fallbackCombinations = allCombinations.filter(combo => combo.minDistance >= 0.8)
    console.log(`降低要求后找到 ${fallbackCombinations.length} 个组合`)
    safeCombinations.push(...fallbackCombinations)
  }
  
  if (safeCombinations.length === 0) {
    console.error('没有找到足够的组合！')
    return [0, 3, 6, 9] // 最后兜底
  }
  
  // 从所有合适的组合中随机选择，增加随机性
  const randomIdx = Math.floor(Math.random() * safeCombinations.length)
  const selected = safeCombinations[randomIdx]
  
  console.log('选择的组合:', selected.indices, '最小距离:', selected.minDistance.toFixed(2))
  return selected.indices
}

const selectedVertexIndices = getDispersedIndices(4, vertices)

const boxColors = [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF6A00]
const boxTitleKeys = ['box-title-1', 'box-title-2', 'box-title-3', 'box-title-4']

// 文字换行映射 - 为每种语言和每个标题确定换行位置
function splitTextIntoLines(text, titleKey) {
  const titleLineBreaks = {
    'box-title-1': {
      '人物模型': ['人物', '模型'],
      'Character Modeling': ['Character', 'Modeling'],
      'キャラクターモデル': ['キャラクター', 'モデル']
    },
    'box-title-2': {
      '场景建模': ['场景', '建模'],
      'Scene Modeling': ['Scene', 'Modeling'],
      'シーンモデリング': ['シーン', 'モデリング']
    },
    'box-title-3': {
      '游戏设计': ['游戏', '设计'],
      'Game Design': ['Game', 'Design'],
      'ゲームデザイン': ['ゲーム', 'デザイン']
    },
    'box-title-4': {
      '视频剪辑': ['视频', '剪辑'],
      'Video Editing': ['Video', 'Editing'],
      '動画編集': ['動画', '編集']
    }
  }
  
  // 查找对应的换行
  if (titleLineBreaks[titleKey]) {
    const languageBreaks = titleLineBreaks[titleKey]
    for (const [original, lines] of Object.entries(languageBreaks)) {
      if (text === original) {
        return lines
      }
    }
  }
  
  // 如果没有匹配的换行规则，默认按空格或适当位置分割
  if (text.includes(' ')) {
    const words = text.split(' ')
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }
  
  // 对于没有空格的语言（如中文、日文），直接从中间分割
  const mid = Math.ceil(text.length / 2)
  return [text.slice(0, mid), text.slice(mid)]
}

// 创建文字纹理的函数 - 两行排版、放大字体
function createTextTexture(text, color, titleKey) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // 设置画布大小 - 高度增加来支持两行
  canvas.width = 1024
  canvas.height = 512
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 设置字体 - 放大字体，使用细体字
  const fontSize = 140
  ctx.font = `normal ${fontSize}px Microsoft YaHei, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // 大幅减弱发光效果
  ctx.shadowColor = color
  ctx.shadowBlur = 3
  
  // 绘制文字
  ctx.fillStyle = '#ffffff'
  
  // 获取两行文本
  const lines = splitTextIntoLines(text, titleKey)
  const lineHeight = fontSize * 1.3
  
  // 计算垂直居中的起始位置
  const startY = (canvas.height - lineHeight * (lines.length - 1)) / 2
  
  // 绘制每一行
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const y = startY + lineIndex * lineHeight
    
    // 计算这一行的总宽度
    const charSpacing = 10 // 字间距
    let totalWidth = 0
    for (let i = 0; i < line.length; i++) {
      totalWidth += ctx.measureText(line[i]).width
      if (i < line.length - 1) totalWidth += charSpacing
    }
    
    // 从左侧居中开始绘制
    let x = (canvas.width - totalWidth) / 2
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const charWidth = ctx.measureText(char).width
      
      ctx.fillText(char, x + charWidth / 2, y)
      x += charWidth + charSpacing
    }
  }
  
  // 创建纹理
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.needsUpdate = true
  return texture
}

// 创建展示框
for (let i = 0; i < 4; i++) {
  // 16:9 比例的矩形 - 缩小展示框
  const boxWidth = 0.55
  const boxHeight = boxWidth * (9 / 16)
  
  const boxGroup = new THREE.Group()
  boxGroup.renderOrder = 10 // 确保展示框在前面渲染
  
  // 创建一个大的点击检测平面（整个展示框的基础）
  const hitGeometry = new THREE.PlaneGeometry(boxWidth * 1.5, boxHeight * 1.5)
  const hitMaterial = new THREE.MeshBasicMaterial({
    visible: true,
    color: 0x000000,
    transparent: true,
    opacity: 0.01, // 几乎不可见但可以射线检测
    side: THREE.DoubleSide,
    depthWrite: false // 不写入深度，避免遮挡其他展示框
  })
  const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial)
  hitMesh.userData.boxIndex = i // 存储索引信息
  boxGroup.add(hitMesh)
  
  // 黑色打底
  const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, 0.05)
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  const box = new THREE.Mesh(boxGeometry, boxMaterial)
  box.position.z = 0.02
  boxGroup.add(box)
  
  // 霓虹发光边框
  const boxEdges = new THREE.EdgesGeometry(boxGeometry)
  const boxEdgeMaterial = new THREE.LineBasicMaterial({
    color: boxColors[i],
    linewidth: 3,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
  })
  const boxWireframe = new THREE.LineSegments(boxEdges, boxEdgeMaterial)
  boxWireframe.position.z = 0.03
  boxGroup.add(boxWireframe)
  
  // 添加霓虹发光效果（两层发光边框）
  const glowGeometry1 = new THREE.BoxGeometry(boxWidth * 1.05, boxHeight * 1.05, 0.08)
  const glowEdges1 = new THREE.EdgesGeometry(glowGeometry1)
  const glowMaterial1 = new THREE.LineBasicMaterial({
    color: boxColors[i],
    transparent: true,
    opacity: 0.3,
    linewidth: 2,
    depthWrite: false
  })
  const glowBox1 = new THREE.LineSegments(glowEdges1, glowMaterial1)
  glowBox1.position.z = 0.04
  boxGroup.add(glowBox1)
  
  const glowGeometry2 = new THREE.BoxGeometry(boxWidth * 1.1, boxHeight * 1.1, 0.1)
  const glowEdges2 = new THREE.EdgesGeometry(glowGeometry2)
  const glowMaterial2 = new THREE.LineBasicMaterial({
    color: boxColors[i],
    transparent: true,
    opacity: 0.15,
    linewidth: 1,
    depthWrite: false
  })
  const glowBox2 = new THREE.LineSegments(glowEdges2, glowMaterial2)
  glowBox2.position.z = 0.05
  boxGroup.add(glowBox2)
  
  // 添加文字 - 使用翻译
  const textTexture = createTextTexture(t(boxTitleKeys[i]), `#${boxColors[i].toString(16).padStart(6, '0')}`, boxTitleKeys[i])
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  const textGeometry = new THREE.PlaneGeometry(boxWidth * 1.1, boxHeight * 0.85) // 增大文字平面比例以适应两行
  const textMesh = new THREE.Mesh(textGeometry, textMaterial)
  textMesh.position.z = 0.06 // 最前面
  boxGroup.add(textMesh)
  
  scene.instance.add(boxGroup)
  boxGroup.visible = false // 初始隐藏
  displayBoxes.push({
    group: boxGroup,
    vertexIndex: selectedVertexIndices[i],
    color: boxColors[i],
    originalOpacity: {
      box: 0.6,
      wireframe: 0.8,
      glow1: 0.3,
      glow2: 0.15
    },
    isHovered: false, // 悬停状态
    textMesh: textMesh, // 保存文字网格引用
    titleKey: boxTitleKeys[i] // 保存翻译键
  })
  boxTargetIndices.push(selectedVertexIndices[i]) // 初始目标就是当前顶点
  boxSwitchProgress.push(1) // 初始切换完成
  lastSwitchTime.push(0) // 初始切换时间
  icoVertices = vertices
}

// 更新展示框文字的函数
function updateDisplayBoxText() {
  displayBoxes.forEach((boxData) => {
    if (boxData.textMesh && boxData.titleKey) {
      // 重新创建文字纹理
      const textTexture = createTextTexture(t(boxData.titleKey), `#${boxData.color.toString(16).padStart(6, '0')}`, boxData.titleKey)
      // 更新材质的纹理
      if (boxData.textMesh.material) {
        boxData.textMesh.material.map = textTexture
        boxData.textMesh.material.needsUpdate = true
      }
    }
  })
}

// 初始化射线投射器
raycaster = new THREE.Raycaster()
let hoveredBoxIndex = -1 // 当前悬停的展示框

// 鼠标移动事件 - 用于悬停检测
function onMouseMove(event) {
  // 计算归一化设备坐标
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
  // 检查展示框悬停
  if (isGalleryMode) {
    raycaster.setFromCamera(mouse, camera.instance)
    const hitMeshes = displayBoxes.map(box => box.group.children[0])
    const intersects = raycaster.intersectObjects(hitMeshes)
    
    let newHoveredIndex = -1
    if (intersects.length > 0) {
      newHoveredIndex = intersects[0].object.userData.boxIndex
    }
    
    // 更新悬停状态
    if (newHoveredIndex !== hoveredBoxIndex) {
      // 清除旧悬停
      if (hoveredBoxIndex >= 0) {
        const oldBox = displayBoxes[hoveredBoxIndex]
        oldBox.isHovered = false
        oldBox.group.scale.set(1, 1, 1)
        document.body.style.cursor = 'default'
      }
      
      // 设置新悬停
      hoveredBoxIndex = newHoveredIndex
      if (hoveredBoxIndex >= 0) {
        const newBox = displayBoxes[hoveredBoxIndex]
        newBox.isHovered = true
        newBox.group.scale.set(1.1, 1.1, 1.1)
        document.body.style.cursor = 'pointer'
      }
    }
  }
}

// 鼠标点击事件
function onMouseClick(event) {
  if (!isGalleryMode) return
  
  // 更新射线位置
  raycaster.setFromCamera(mouse, camera.instance)
  
  // 收集所有可点击的展示框
  const hitMeshes = displayBoxes.map(box => box.group.children[0])
  
  // 检测射线相交
  const intersects = raycaster.intersectObjects(hitMeshes)
  
  if (intersects.length > 0) {
    // 获取第一个相交对象
    const clickedMesh = intersects[0].object
    const boxIndex = clickedMesh.userData.boxIndex
    if (boxIndex !== undefined) {
      clickedBoxIndex = boxIndex
      clickAnimationTime = 0
      console.log(`点击了：${boxTitles[clickedBoxIndex]}`)
    }
  }
}

// 添加事件监听器
window.addEventListener('mousemove', onMouseMove)
window.addEventListener('click', onMouseClick)

updateLoadingProgress(1)

let start = null
const animate = (timestamp) => {
  if (!start) start = timestamp
  const elapsed = timestamp - start
  const duration = 1500
  const progress = Math.min(elapsed / duration, 1)
  
  const c1 = 1.70158
  const c3 = c1 + 1
  const easeOutBack = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2)
  
  const currentScale = 0 + (1 - 0) * easeOutBack
  wireframeIcosahedron.scale.set(currentScale, currentScale, currentScale)
  
  if (progress < 1) {
    requestAnimationFrame(animate)
  } else {
    hideLoadingScreen()
  }
}
requestAnimationFrame(animate)

const clock = new THREE.Clock();
let normalRotationY = 0;
let normalRotationX = 0;
let galleryRotationY = 0;
let galleryRotationX = 0;
let gallerySpeedFactor = 1 // 画廊模式下的速度因子
let prevGalleryMode = false // 记录上一次是否是画廊模式
let galleryModeStartTime = 0 // 记录进入画廊模式的时间，用于禁用自动调整

const tick = (time) => {
  animationId = window.requestAnimationFrame(tick)
  const delta = time - prevTime
  prevTime = time
  const elapsedTime = clock.getElapsedTime()

  // 平滑缩放多面体
  if (wireframeIcosahedron) {
    const scaleSpeed = 0.05
    currentScale += (targetScale - currentScale) * scaleSpeed
    wireframeIcosahedron.scale.set(currentScale, currentScale, currentScale)
  }

  // 检测是否刚进入画廊模式
  if (isGalleryMode !== prevGalleryMode) {
    if (isGalleryMode) {
      // 刚进入画廊模式，保留当前旋转角度
      if (loadedModel) {
        galleryRotationY = loadedModel.rotation.y
        galleryRotationX = loadedModel.rotation.x
      }
      // 重置速度因子
      gallerySpeedFactor = 1
      // 记录进入时间，禁用前3秒的自动调整
      galleryModeStartTime = elapsedTime
      // 确保不重叠 - 使用几何上绝对分散的顶点
      const newIndices = getDispersedIndices(4, icoVertices)
      
      // 打印出最终选择的四个顶点的详细信息
      console.log('=== 最终选择的四个展示框位置 ===')
      newIndices.forEach((idx, i) => {
        const v = icoVertices[idx]
        const scale = 2.5 / (v.z + 5)
        const screenX = v.x * scale
        const screenY = v.y * scale
        console.log(`展示框${i} (顶点${idx}): 3D=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}), 屏幕=(${screenX.toFixed(2)}, ${screenY.toFixed(2)})`)
      })
      
      for (let i = 0; i < displayBoxes.length; i++) {
        displayBoxes[i].vertexIndex = newIndices[i]
        boxTargetIndices[i] = newIndices[i]
        boxSwitchProgress[i] = 1 // 直接设置为完成状态，不需要动画
        lastSwitchTime[i] = -1000 // 确保不会很快触发自动调整
      }
    } else {
      // 退出画廊模式时，同步正常模式的起始位置
      normalRotationY = galleryRotationY
    }
    prevGalleryMode = isGalleryMode
  }
  
  if (loadedModel) {
    if (isGalleryMode) {
      // 展示模式下缓动减速直到停止，保留当前旋转角度
      gallerySpeedFactor = Math.max(0, gallerySpeedFactor - 0.001) // 从0.005改为0.001，拉长5倍时间
      galleryRotationY += 0.0003 * gallerySpeedFactor
      loadedModel.rotation.y = galleryRotationY
      loadedModel.rotation.x = galleryRotationX // 保持x轴角度不变
    } else {
      // 正常模式下的旋转
      normalRotationY = elapsedTime * 0.3
      normalRotationX = Math.sin(elapsedTime * 0.5) * 0.2
      galleryRotationY = normalRotationY // 同步两个模式的起始位置
      galleryRotationX = normalRotationX // 同步x轴角度
      gallerySpeedFactor = 1 // 重置速度因子
      loadedModel.rotation.y = normalRotationY
      loadedModel.rotation.x = normalRotationX
    }
  }

  if (wireframeIcosahedron) {
    const pulse = 0.7 + 0.3 * Math.sin(elapsedTime * 2)
    wireframeIcosahedron.material.opacity = pulse
  }

  // 更新画廊遮罩平面
  if (galleryOverlayPlane) {
    // 让遮罩平面始终面向相机
    galleryOverlayPlane.lookAt(camera.instance.position)
    
    // 平滑过渡透明度
    const targetOpacity = isGalleryMode ? 0.85 : 0
    galleryOverlayPlane.material.opacity += (targetOpacity - galleryOverlayPlane.material.opacity) * 0.05
  }

  // 更新展示框
  if (wireframeIcosahedron && displayBoxes.length > 0 && icoVertices.length > 0) {
    // 只在展示模式下显示
    for (let i = 0; i < displayBoxes.length; i++) {
      displayBoxes[i].group.visible = isGalleryMode
    }
    
    if (isGalleryMode) {
      // 检查是否刚进入画廊模式（前3秒禁用自动调整）
      const timeSinceGalleryStart = elapsedTime - galleryModeStartTime
      const shouldSkipAutoAdjust = timeSinceGalleryStart < 3.0 // 前3秒不自动调整
      
      if (!shouldSkipAutoAdjust) {
        // 先检查所有展示框是否有重叠
        const overlaps = new Set()
        for (let i = 0; i < displayBoxes.length; i++) {
          const boxData = displayBoxes[i]
          const currentVertex = icoVertices[boxData.vertexIndex].clone()
          currentVertex.applyQuaternion(wireframeIcosahedron.quaternion)
          currentVertex.multiplyScalar(currentScale)
          currentVertex.add(wireframeIcosahedron.position)
          const projected = currentVertex.clone().project(camera.instance)
          
          for (let j = i + 1; j < displayBoxes.length; j++) {
            const otherBoxData = displayBoxes[j]
            const otherVertex = icoVertices[otherBoxData.vertexIndex].clone()
            otherVertex.applyQuaternion(wireframeIcosahedron.quaternion)
            otherVertex.multiplyScalar(currentScale)
            otherVertex.add(wireframeIcosahedron.position)
            const otherProjected = otherVertex.clone().project(camera.instance)
            
            // 计算屏幕空间距离
            const screenDistance = Math.sqrt(
              Math.pow(projected.x - otherProjected.x, 2) + 
              Math.pow(projected.y - otherProjected.y, 2)
            )
            
            // 计算深度差
            const depthDiff = Math.abs(currentVertex.z - otherVertex.z)
            
            // 如果屏幕距离很近且深度也很近，说明重叠
            if (screenDistance < 0.3 && depthDiff < 1.5) {
              overlaps.add(i)
              overlaps.add(j)
            }
          }
        }
        
        // 第一轮：为所有需要移动的展示框分配顶点（按优先级排序）
        const moveQueue = []
        for (let i = 0; i < displayBoxes.length; i++) {
          const boxData = displayBoxes[i]
          
          // 检查当前顶点的位置
          const currentVertex = icoVertices[boxData.vertexIndex].clone()
          currentVertex.applyQuaternion(wireframeIcosahedron.quaternion)
          currentVertex.multiplyScalar(currentScale)
          currentVertex.add(wireframeIcosahedron.position)
          
          // 投影到屏幕空间
          const projected = currentVertex.clone().project(camera.instance)
          
          // 检查是否靠近镜头（正面 z < 0）或者过于左右边缘
          const isNearCamera = currentVertex.z < 0 // 正面靠近镜头
          const isTooEdge = Math.abs(projected.x) > 0.75
          const needsMove = isNearCamera || isTooEdge || overlaps.has(i)
          const currentTime = elapsedTime
          
          // 如果需要移动且没有正在切换，并且距离上次切换有足够的冷却时间
          const switchCooldown = 2.0 // 2秒冷却时间
          const canSwitch = boxSwitchProgress[i] >= 1 && (currentTime - lastSwitchTime[i] > switchCooldown)
          
          if (needsMove && canSwitch) {
            // 计算优先级：靠近镜头的优先移动
            const priority = -currentVertex.z // z越小（越靠近镜头），优先级越高
            moveQueue.push({ boxIndex: i, priority })
          }
        }
        
        // 按优先级排序（优先级高的先处理）
        moveQueue.sort((a, b) => b.priority - a.priority)
        
        // 已分配的顶点集合（防止多个展示框选择同一个顶点）
        const allocatedVertices = new Set()
        
        // 为每个正在切换的展示框预留顶点
        for (let i = 0; i < displayBoxes.length; i++) {
          if (boxSwitchProgress[i] < 1) {
            allocatedVertices.add(boxTargetIndices[i])
          }
        }
        
        // 按优先级处理每个需要移动的展示框
        for (const { boxIndex } of moveQueue) {
          const boxData = displayBoxes[boxIndex]
          
          // 寻找最远离镜头的可用顶点
          let bestVertexIndex = boxData.vertexIndex
          let bestScore = -1 // 分数越高越好
          
          // 检查所有顶点，找到最合适的一个
          for (let j = 0; j < icoVertices.length; j++) {
            // 检查是否已经被其他展示框使用（正在使用的或目标位置）
            // 排除正在切换中的展示框的当前顶点，因为它们正在移动
            const isUsedByOther = displayBoxes.some((box, k) => {
              if (k === boxIndex) return false // 跳过自己
              // 跳过正在切换中的其他展示框的当前顶点，因为它们正在移动
              if (boxSwitchProgress[k] < 1) return false
              return box.vertexIndex === j || boxTargetIndices[k] === j
            })
            if (isUsedByOther) continue
            
            // 检查是否已经被本次分配
            if (allocatedVertices.has(j)) continue
            
            // 计算这个顶点的世界位置
            const testVertex = icoVertices[j].clone()
            testVertex.applyQuaternion(wireframeIcosahedron.quaternion)
            testVertex.multiplyScalar(currentScale)
            testVertex.add(wireframeIcosahedron.position)
            
            const testProjected = testVertex.clone().project(camera.instance)
            
            // 计算与其他展示框的距离（避免重叠）
            let minDistanceToOthers = Infinity
            for (let k = 0; k < displayBoxes.length; k++) {
              if (k === boxIndex) continue
              const otherBoxData = displayBoxes[k]
              // 考虑正在切换的展示框的目标位置
              const otherVertexIdx = boxSwitchProgress[k] >= 1 ? otherBoxData.vertexIndex : boxTargetIndices[k]
              const otherVertex = icoVertices[otherVertexIdx].clone()
              otherVertex.applyQuaternion(wireframeIcosahedron.quaternion)
              otherVertex.multiplyScalar(currentScale)
              otherVertex.add(wireframeIcosahedron.position)
              const otherProjected = otherVertex.clone().project(camera.instance)
              const dist = Math.sqrt(
                Math.pow(testProjected.x - otherProjected.x, 2) + 
                Math.pow(testProjected.y - otherProjected.y, 2)
              )
              minDistanceToOthers = Math.min(minDistanceToOthers, dist)
            }
            
            // 评分系统：最重要的是z值（越远越好）
            // z值大的顶点在背面，更适合展示框停留
            const depthScore = (testVertex.z + 3) / 6 // 归一化到 0-1 范围
            const screenDistanceScore = Math.min(1, minDistanceToOthers / 0.35) // 保持间距
            
            // 总分：深度占90%，间距占10%
            let totalScore = depthScore * 0.9 + screenDistanceScore * 0.1
            
            // 额外加分：如果屏幕位置不太靠边
            if (Math.abs(testProjected.x) < 0.8) {
              totalScore += 0.15
            }
            
            if (totalScore > bestScore) {
              bestScore = totalScore
              bestVertexIndex = j
            }
          }
          
          // 切换到新的顶点
          if (bestVertexIndex !== boxTargetIndices[boxIndex]) {
            boxTargetIndices[boxIndex] = bestVertexIndex
            boxSwitchProgress[boxIndex] = 0
            lastSwitchTime[boxIndex] = elapsedTime // 记录切换时间
            allocatedVertices.add(bestVertexIndex) // 标记为已分配
          }
        }
      }
      
      // 更新每个展示框
      for (let i = 0; i < displayBoxes.length; i++) {
        const boxData = displayBoxes[i]
        
        // 更新切换进度
        if (boxSwitchProgress[i] < 1) {
          boxSwitchProgress[i] = Math.min(1, boxSwitchProgress[i] + 0.03)
        }
        
        // 计算当前和目标位置
        const fromVertex = icoVertices[boxData.vertexIndex].clone()
        fromVertex.applyQuaternion(wireframeIcosahedron.quaternion)
        fromVertex.multiplyScalar(currentScale)
        fromVertex.add(wireframeIcosahedron.position)
        
        const toVertex = icoVertices[boxTargetIndices[i]].clone()
        toVertex.applyQuaternion(wireframeIcosahedron.quaternion)
        toVertex.multiplyScalar(currentScale)
        toVertex.add(wireframeIcosahedron.position)
        
        // 插值位置
        let displayPosition
        if (boxSwitchProgress[i] < 0.5) {
          // 前半段：从旧位置淡出
          const fadeFactor = 1 - boxSwitchProgress[i] * 2
          displayPosition = fromVertex.clone()
          boxData.group.children[0].material.opacity = fadeFactor * 0.01 // 点击检测平面
          boxData.group.children[1].material.opacity = fadeFactor * 0.6 // 黑色背景
          boxData.group.children[2].material.opacity = fadeFactor * 0.8 // 主边框
          boxData.group.children[3].material.opacity = fadeFactor * 0.3 // 发光边框1
          boxData.group.children[4].material.opacity = fadeFactor * 0.15 // 发光边框2
          boxData.group.children[5].material.opacity = fadeFactor * 1.0 // 文字
        } else if (boxSwitchProgress[i] < 1) {
          // 后半段：淡入到新位置
          const fadeFactor = (boxSwitchProgress[i] - 0.5) * 2
          displayPosition = toVertex.clone()
          boxData.group.children[0].material.opacity = fadeFactor * 0.01 // 点击检测平面
          boxData.group.children[1].material.opacity = fadeFactor * 0.6 // 黑色背景
          boxData.group.children[2].material.opacity = fadeFactor * 0.8 // 主边框
          boxData.group.children[3].material.opacity = fadeFactor * 0.3 // 发光边框1
          boxData.group.children[4].material.opacity = fadeFactor * 0.15 // 发光边框2
          boxData.group.children[5].material.opacity = fadeFactor * 1.0 // 文字
        } else {
          // 切换完成
          displayPosition = toVertex.clone()
          boxData.vertexIndex = boxTargetIndices[i]
          boxData.group.children[0].material.opacity = 0.01 // 点击检测平面
          boxData.group.children[1].material.opacity = 0.6 // 黑色背景
          boxData.group.children[2].material.opacity = 0.8 // 主边框
          boxData.group.children[3].material.opacity = 0.3 // 发光边框1
          boxData.group.children[4].material.opacity = 0.15 // 发光边框2
          boxData.group.children[5].material.opacity = 1.0 // 文字
        }
        
        // 设置展示框位置
        boxData.group.position.copy(displayPosition)
        
        // 让展示框面向摄像机
        boxData.group.lookAt(camera.instance.position)
        
        // 应用点击动画
        if (clickedBoxIndex === i && boxSwitchProgress[i] >= 1) {
          clickAnimationTime += 0.05
          if (clickAnimationTime < Math.PI) {
            const scale = 1 + 0.2 * Math.sin(clickAnimationTime)
            boxData.group.scale.set(scale, scale, scale)
            // 增加发光效果
            boxData.group.children[2].material.opacity = 1.0
            boxData.group.children[3].material.opacity = 0.6
            boxData.group.children[4].material.opacity = 0.4
          } else {
            clickedBoxIndex = -1
            // 恢复到悬停或正常状态
            if (boxData.isHovered) {
              boxData.group.scale.set(1.1, 1.1, 1.1)
            } else {
              boxData.group.scale.set(1, 1, 1)
            }
          }
        } else if (boxData.isHovered && boxSwitchProgress[i] >= 1) {
          // 悬停状态 - 保持放大
          boxData.group.scale.set(1.1, 1.1, 1.1)
        } else if (boxSwitchProgress[i] >= 1) {
          // 正常状态 - 脉动
          const pulseScale = 1 + 0.1 * Math.sin(elapsedTime * 2 + i)
          boxData.group.scale.set(pulseScale, pulseScale, pulseScale)
        }
      }
    }
  }

  targetRotation.x = mouse.y * rotationAmplitude
  targetRotation.y = -mouse.x * rotationAmplitude

  currentRotation.x += (targetRotation.x - currentRotation.x) * rotationSmoothness
  currentRotation.y += (targetRotation.y - currentRotation.y) * rotationSmoothness

  camera.instance.rotation.x = currentRotation.x
  camera.instance.rotation.y = currentRotation.y

  gridFloor.update(delta)
  sun.update()
  electronicDust.update(time)
  electronicDust.setMouse(mouse.x, mouse.y)
  leftMountain.update(time)
  rightMountain.update(time)
  virtualAvatar.update(time)
  pinkOzoneFog.update(time)
  musicVisualizer.update(time)
  
  composer.render()
}

tick(0)

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  camera.resize()
  renderer.resize()
  
  composer.setSize(sizes.width, sizes.height)
  bloomPass.setSize(sizes.width, sizes.height)
})

function cleanup() {
  if (isCleanedUp) return
  isCleanedUp = true

  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  window.removeEventListener('mousemove', originalOnMouseMove)
  window.removeEventListener('click', onMouseClick)

  if (gridFloor) {
    gridFloor.dispose()
  }

  if (sun) {
    sun.dispose()
  }

  if (electronicDust) {
    electronicDust.dispose()
  }

  if (leftMountain) {
    leftMountain.dispose()
  }

  if (rightMountain) {
    rightMountain.dispose()
  }

  if (virtualAvatar) {
    virtualAvatar.dispose()
  }

  if (pinkOzoneFog) {
    pinkOzoneFog.dispose()
  }

  if (musicVisualizer) {
    musicVisualizer.dispose()
  }

  if (scene) {
    scene.dispose()
  }

  if (renderer) {
    renderer.dispose()
  }
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// 全局颜色变化控制
let isColorChangingEnabled = false;

// 画廊模式控制
window.toggleGalleryMode = function() {
  isGalleryMode = !isGalleryMode;
  targetScale = isGalleryMode ? 0.4 : 1;
  
  // 控制各个元素的画廊模式效果
  if (electronicDust) {
    electronicDust.setGalleryMode(isGalleryMode);
  }
  if (gridFloor) {
    gridFloor.setGalleryMode(isGalleryMode);
  }
  if (leftMountain) {
    leftMountain.setGalleryMode(isGalleryMode);
  }
  if (rightMountain) {
    rightMountain.setGalleryMode(isGalleryMode);
  }
  
  return isGalleryMode;
};

// 获取当前画廊模式状态
window.isGalleryModeActive = function() {
  return isGalleryMode;
};

window.toggleColorChanging = function() {
  isColorChangingEnabled = !isColorChangingEnabled;
  gridFloor.setColorChanging(isColorChangingEnabled);
  leftMountain.setColorChanging(isColorChangingEnabled);
  rightMountain.setColorChanging(isColorChangingEnabled);
};

window.setColorChanging = function(enabled) {
  isColorChangingEnabled = enabled;
  gridFloor.setColorChanging(enabled);
  leftMountain.setColorChanging(enabled);
  rightMountain.setColorChanging(enabled);
};

// 音乐可视化全局函数
window.loadMusicFile = function(file) {
  return musicVisualizer.loadLocalAudio(file).then(() => {
    return musicVisualizer.play();
  }).catch(err => {
    console.error('Failed to load music:', err);
    alert('无法加载音乐文件，请尝试其他文件。');
    throw err;
  });
};

window.loadMusicURL = function(url) {
  musicVisualizer.loadAudio(url).then(() => {
    musicVisualizer.play();
  }).catch(err => {
    console.error('Failed to load music:', err);
    alert('无法加载音乐，请检查网络连接。');
  });
};

window.toggleVisualizer = function() {
  musicVisualizer.toggle();
};

// 语言切换功能
function setupLanguageSwitcher() {
  const langBtn = document.getElementById('lang-btn');
  const langDropdown = document.getElementById('lang-dropdown');
  const langOptions = document.querySelectorAll('.lang-option');
  
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('active');
  });
  
  langOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = option.dataset.lang;
      setCurrentLang(lang);
      langDropdown.classList.remove('active');
      document.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }));
    });
  });
  
  document.addEventListener('click', () => {
    langDropdown.classList.remove('active');
  });
}

// 确保DOM准备好后初始化
let uiManager = null;
const init = async () => {
  console.log('DOM ready, fetching songs from database...');
  
  loadSavedLang();
  setupLanguageSwitcher();
  
  await musicService.fetchSongs();
  
  console.log('Initializing UIManager...');
  uiManager = new UIManager();
  
  // 初始化励志语录
  initMotivationQuotes();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.musicService = musicService;
window.musicVisualizer = musicVisualizer;
