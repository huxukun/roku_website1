import * as THREE from 'three'

export const projectsData = [
  {
    id: 1,
    title: 'CYBER CITY',
    description: 'A futuristic cyberpunk cityscape built in Blender with procedural generation techniques. Features dynamic neon lighting and rain effects.',
    tags: ['Blender', 'Cycles', 'Substance Painter'],
    image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop',
    color: 0x00FFFF
  },
  {
    id: 2,
    title: 'NEON RIDER',
    description: 'Character design for a synthwave racing game. Created with focus on retro-futuristic aesthetics and vibrant color gradients.',
    tags: ['Cinema 4D', 'Octane Render'],
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
    color: 0xFF00FF
  },
  {
    id: 3,
    title: 'GRID RUNNER',
    description: 'Infinite runner game concept with procedural terrain generation. Features dynamic difficulty scaling and retro visual style.',
    tags: ['Unity', 'C#', 'HLSL Shader'],
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
    color: 0xFFFF00
  },
  {
    id: 4,
    title: 'DATA STREAM',
    description: 'Interactive data visualization project showcasing real-time streaming analytics with WebGL acceleration.',
    tags: ['Three.js', 'WebGL', 'D3.js'],
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
    color: 0x00FF00
  },
  {
    id: 5,
    title: 'VOID WALKER',
    description: 'VR experience exploring abstract dimensional spaces. Navigate through minimalist geometric environments.',
    tags: ['A-Frame', 'WebXR', 'GLSL'],
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&h=600&fit=crop',
    color: 0xFF6600
  }
]

export default class ProjectGallery {
  constructor(scene, camera, canvas) {
    this.scene = scene
    this.camera = camera
    this.canvas = canvas
    this.cards = []
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.hoveredCard = null
    this.selectedCard = null
    
    this.cardWidth = 3
    this.cardHeight = 2
    this.spacing = 5
    this.startZ = -30
    
    this.init()
    this.setupEventListeners()
  }

  init() {
    projectsData.forEach((project, index) => {
      const card = this.createCard(project, index)
      this.cards.push(card)
      this.scene.add(card.group)
    })
  }

  createCard(project, index) {
    const group = new THREE.Group()
    
    const geometry = new THREE.PlaneGeometry(this.cardWidth, this.cardHeight)
    const material = new THREE.MeshBasicMaterial({
      color: project.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    
    const plane = new THREE.Mesh(geometry, material)
    plane.userData.projectId = project.id
    group.add(plane)
    
    const borderGeometry = new THREE.EdgesGeometry(geometry)
    const borderMaterial = new THREE.LineBasicMaterial({
      color: project.color,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    })
    const border = new THREE.LineSegments(borderGeometry, borderMaterial)
    group.add(border)
    
    const loader = new THREE.TextureLoader()
    loader.load(project.image, (texture) => {
      texture.minFilter = THREE.LinearFilter
      const imageGeometry = new THREE.PlaneGeometry(this.cardWidth * 0.9, this.cardHeight * 0.9)
      const imageMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8
      })
      const imagePlane = new THREE.Mesh(imageGeometry, imageMaterial)
      imagePlane.position.z = 0.01
      group.add(imagePlane)
    }, undefined, (error) => {
      console.warn('Failed to load image for project', project.title)
    })
    
    const angle = (index / projectsData.length) * Math.PI * 0.3 - Math.PI * 0.15
    const radius = 15
    group.position.x = Math.sin(angle) * radius
    group.position.z = this.startZ - index * this.spacing
    group.position.y = 0.5
    
    group.lookAt(this.camera.position)
    
    return {
      group,
      plane,
      border,
      material,
      borderMaterial,
      project,
      originalScale: 1,
      targetScale: 1
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.canvas.addEventListener('click', (e) => this.onClick(e))
  }

  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    const cardPlanes = this.cards.map(c => c.plane)
    const intersects = this.raycaster.intersectObjects(cardPlanes)
    
    if (intersects.length > 0) {
      const intersectedPlane = intersects[0].object
      const card = this.cards.find(c => c.plane === intersectedPlane)
      
      if (card && this.hoveredCard !== card) {
        if (this.hoveredCard) {
          this.hoveredCard.targetScale = 1
          this.hoveredCard.borderMaterial.opacity = 0.9
        }
        
        this.hoveredCard = card
        card.targetScale = 1.15
        card.borderMaterial.opacity = 1
        this.canvas.style.cursor = 'pointer'
        
        this.onCardHover(card)
      }
    } else {
      if (this.hoveredCard) {
        this.hoveredCard.targetScale = 1
        this.hoveredCard.borderMaterial.opacity = 0.9
        this.hoveredCard = null
        this.canvas.style.cursor = 'default'
      }
    }
  }

  onClick(event) {
    if (this.hoveredCard) {
      this.selectedCard = this.hoveredCard
      this.onCardClick(this.hoveredCard)
    }
  }

  onCardHover(card) {
    const event = new CustomEvent('projectHover', {
      detail: { project: card.project }
    })
    window.dispatchEvent(event)
  }

  onCardClick(card) {
    const event = new CustomEvent('projectClick', {
      detail: { project: card.project }
    })
    window.dispatchEvent(event)
  }

  update(time) {
    this.cards.forEach(card => {
      const currentScale = card.group.scale.x
      const targetScale = card.targetScale
      const newScale = currentScale + (targetScale - currentScale) * 0.1
      card.group.scale.set(newScale, newScale, newScale)
      
      const pulse = 0.7 + 0.3 * Math.sin(time / 1000 * 2 + card.project.id)
      if (card !== this.hoveredCard) {
        card.material.opacity = 0.3 * pulse
      } else {
        card.material.opacity = 0.5 * pulse
      }
      
      card.group.lookAt(this.camera.position)
    })
  }

  dispose() {
    this.cards.forEach(card => {
      this.scene.remove(card.group)
      card.plane.geometry.dispose()
      card.plane.material.dispose()
      card.border.geometry.dispose()
      card.border.material.dispose()
    })
    
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('click', this.onClick)
  }
}
