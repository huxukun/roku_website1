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

const clock = new THREE.Clock()

const tick = (time) => {
  animationId = window.requestAnimationFrame(tick)
  const delta = time - prevTime
  prevTime = time
  const elapsedTime = clock.getElapsedTime()

  if (loadedModel) {
    loadedModel.rotation.y = elapsedTime * 0.3
    loadedModel.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2
  }

  if (wireframeIcosahedron) {
    const pulse = 0.7 + 0.3 * Math.sin(elapsedTime * 2)
    wireframeIcosahedron.material.opacity = pulse
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

function onMouseMove(event) {
  mouse.x = (event.clientX / sizes.width) * 2 - 1
  mouse.y = (event.clientY / sizes.height) * 2 - 1
}

window.addEventListener('mousemove', onMouseMove)

function cleanup() {
  if (isCleanedUp) return
  isCleanedUp = true

  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  window.removeEventListener('mousemove', onMouseMove)

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
    if (uiManager) {
      uiManager.showNotification('无法加载音乐文件，请尝试其他文件。');
    } else {
      alert('无法加载音乐文件，请尝试其他文件。');
    }
    throw err;
  });
};

window.loadMusicURL = function(url) {
  musicVisualizer.loadAudio(url).then(() => {
    musicVisualizer.play();
  }).catch(err => {
    console.error('Failed to load music:', err);
    if (uiManager) {
      uiManager.showNotification('无法加载音乐，请检查网络连接。');
    } else {
      alert('无法加载音乐，请检查网络连接。');
    }
  });
};

window.toggleVisualizer = function() {
  musicVisualizer.toggle();
};

// 确保DOM准备好后初始化
let uiManager = null;
const init = async () => {
  console.log('DOM ready, fetching songs from database...');
  
  await musicService.fetchSongs();
  
  console.log('Initializing UIManager...');
  uiManager = new UIManager();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.musicService = musicService;
window.musicVisualizer = musicVisualizer;
