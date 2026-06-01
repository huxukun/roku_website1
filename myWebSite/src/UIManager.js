const projectsData = [
  {
    id: 1,
    title: '赛博城市',
    description: '使用Blender和程序化生成技术创建的未来科幻城市景观，具有动态霓虹灯和雨效。',
    tags: ['Blender', 'Cycles', 'Substance Painter'],
    image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop'
  },
  {
    id: 2,
    title: '霓虹骑士',
    description: '为合成波赛车游戏设计的角色，专注于复古未来主义美学和鲜艳的色彩渐变。',
    tags: ['Cinema 4D', 'Octane Render'],
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop'
  },
  {
    id: 3,
    title: '网格奔跑者',
    description: '无限跑酷游戏概念，具有程序化地形生成、动态难度缩放和复古视觉风格。',
    tags: ['Unity', 'C#', 'HLSL Shader'],
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop'
  },
  {
    id: 4,
    title: '数据流',
    description: '展示实时流分析的交互式数据可视化项目，使用WebGL加速。',
    tags: ['Three.js', 'WebGL', 'D3.js'],
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop'
  },
  {
    id: 5,
    title: '虚空漫游者',
    description: '探索抽象维度空间的VR体验，在简约几何环境中导航。',
    tags: ['A-Frame', 'WebXR', 'GLSL'],
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&h=600&fit=crop'
  }
];

const skillsData = [
  { name: 'Blender', level: 90 },
  { name: 'Maya', level: 85 },
  { name: 'ZBrush', level: 80 },
  { name: 'Substance Painter', level: 88 },
  { name: 'Three.js', level: 92 },
  { name: 'Unreal Engine', level: 75 },
  { name: 'Unity', level: 82 },
  { name: 'Houdini', level: 70 }
];

const blogData = [
  {
    id: 1,
    title: 'Three.js 入门教程',
    date: '2024-01-15',
    content: '# Three.js 入门教程\n\n这是一篇关于Three.js的基础入门教程，讲解如何创建第一个3D场景...\n\n## 准备工作\n\n首先，你需要安装Three.js...\n\n```javascript\nimport * as THREE from \'three\';\n```\n\n## 创建场景\n\n接下来，我们来创建第一个场景...'
  },
  {
    id: 2,
    title: '赛博朋克风格设计指南',
    date: '2024-01-10',
    content: '# 赛博朋克风格设计指南\n\n探讨赛博朋克风格的设计元素，包括霓虹灯、深色背景和未来感的UI设计...\n\n## 核心视觉元素\n\n- 霓虹灯色彩\n- 深色背景\n- 网格纹理\n- 复古未来主义字体'
  },
  {
    id: 3,
    title: 'Blender 程序化地形生成',
    date: '2024-01-05',
    content: '# Blender 程序化地形生成\n\n学习如何在Blender中使用程序化节点生成逼真的地形...'
  },
  {
    id: 4,
    title: 'WebXR 开发实践',
    date: '2023-12-28',
    content: '# WebXR 开发实践\n\n分享WebXR的开发经验和最佳实践...'
  }
];

const guestbookMessages = [];

export default class UIManager {
  constructor() {
    try {
      this.initElements();
      this.initEventListeners();
      this.createProjectCards();
      this.createBlogList();
      this.createGuestbookMessages();
      this.loadSavedAvatar();
      console.log('UIManager initialized successfully');
    } catch (error) {
      console.error('Error initializing UIManager:', error);
    }
  }

  initElements() {
    this.aboutBtn = document.getElementById('about-btn');
    this.worksBtn = document.getElementById('works-btn');
    this.blogBtn = document.getElementById('blog-btn');
    this.guestbookBtn = document.getElementById('guestbook-btn');
    this.musicBtn = document.getElementById('music-btn');
    this.musicIcon = document.getElementById('music-icon');
    
    this.avatarUpload = document.getElementById('avatar-upload');
    this.avatarUploadBtn = document.getElementById('avatar-upload-btn');
    this.profileAvatar = document.getElementById('profile-avatar');
    
    this.aboutModal = document.getElementById('about-modal');
    this.galleryModal = document.getElementById('gallery-modal');
    this.blogModal = document.getElementById('blog-modal');
    this.guestbookModal = document.getElementById('guestbook-modal');
    this.projectModal = document.getElementById('project-modal');
    
    this.isMusicPlaying = false;
    this.audio = null;
    
    this.closeModalBtns = [
      document.getElementById('close-modal'),
      document.getElementById('close-modal-footer'),
      document.getElementById('close-gallery'),
      document.getElementById('close-blog'),
      document.getElementById('close-blog-footer'),
      document.getElementById('close-guestbook'),
      document.getElementById('close-guestbook-footer'),
      document.getElementById('close-project'),
      document.getElementById('close-project-btn')
    ].filter(btn => btn);
    
    this.projectCardsContainer = document.getElementById('project-cards-container');
    this.skillsContainer = document.getElementById('skills-container');
    this.blogListContainer = document.getElementById('blog-list');
    this.blogPreviewContainer = document.getElementById('blog-preview');
    this.messagesContainer = document.getElementById('guest-messages');
    this.submitMessageBtn = document.getElementById('submit-message');
    
    this.isAboutModalOpen = false;
    this.isGalleryModalOpen = false;
    this.isBlogModalOpen = false;
    this.isGuestbookModalOpen = false;
    this.isProjectModalOpen = false;
  }

  initEventListeners() {
    if (this.aboutBtn) {
      this.aboutBtn.addEventListener('click', () => this.openAboutModal());
    }
    if (this.worksBtn) {
      this.worksBtn.addEventListener('click', () => this.openGalleryModal());
    }
    if (this.blogBtn) {
      this.blogBtn.addEventListener('click', () => this.openBlogModal());
    }
    if (this.guestbookBtn) {
      this.guestbookBtn.addEventListener('click', () => this.openGuestbookModal());
    }
    if (this.musicBtn) {
      this.musicBtn.addEventListener('click', () => this.toggleMusic());
    }
    
    this.closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    
    [this.aboutModal, this.galleryModal, this.blogModal, this.guestbookModal, this.projectModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeAllModals();
          }
        });
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
    
    if (this.submitMessageBtn) {
      this.submitMessageBtn.addEventListener('click', () => this.handleMessageSubmit());
    }
    
    if (this.avatarUploadBtn && this.avatarUpload) {
      this.avatarUploadBtn.addEventListener('click', () => this.avatarUpload.click());
      this.avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }
  }

  openAboutModal() {
    try {
      this.closeAllModals();
      this.isAboutModalOpen = true;
      if (this.aboutModal) {
        this.renderSkills();
        this.aboutModal.classList.remove('hidden');
        setTimeout(() => {
          this.aboutModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening about modal:', error);
    }
  }

  openGalleryModal() {
    try {
      this.closeAllModals();
      this.isGalleryModalOpen = true;
      if (this.galleryModal) {
        this.galleryModal.classList.remove('hidden');
        setTimeout(() => {
          this.galleryModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening gallery modal:', error);
    }
  }

  openBlogModal() {
    try {
      this.closeAllModals();
      this.isBlogModalOpen = true;
      if (this.blogModal) {
        this.blogModal.classList.remove('hidden');
        setTimeout(() => {
          this.blogModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening blog modal:', error);
    }
  }

  openGuestbookModal() {
    try {
      this.closeAllModals();
      this.isGuestbookModalOpen = true;
      if (this.guestbookModal) {
        this.guestbookModal.classList.remove('hidden');
        setTimeout(() => {
          this.guestbookModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening guestbook modal:', error);
    }
  }

  closeAllModals() {
    try {
      [this.aboutModal, this.galleryModal, this.blogModal, this.guestbookModal, this.projectModal].forEach(modal => {
        if (modal) {
          modal.classList.remove('visible');
          setTimeout(() => {
            modal.classList.add('hidden');
          }, 300);
        }
      });
      this.isAboutModalOpen = false;
      this.isGalleryModalOpen = false;
      this.isBlogModalOpen = false;
      this.isGuestbookModalOpen = false;
      this.isProjectModalOpen = false;
    } catch (error) {
      console.error('Error closing modals:', error);
    }
  }

  createProjectCards() {
    if (!this.projectCardsContainer) return;
    
    try {
      this.projectCardsContainer.innerHTML = '';
      projectsData.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
          <div class="project-card-image">
            <img src="${project.image}" alt="${project.title}">
          </div>
          <div class="project-card-content">
            <h3 class="project-card-title">${project.title}</h3>
            <div class="project-card-tags">
              ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          this.closeAllModals();
          setTimeout(() => this.openProjectModal(project), 300);
        });
        this.projectCardsContainer.appendChild(card);
      });
    } catch (error) {
      console.error('Error creating project cards:', error);
    }
  }

  createBlogList() {
    if (!this.blogListContainer) return;
    
    try {
      this.blogListContainer.innerHTML = '';
      blogData.forEach(post => {
        const item = document.createElement('div');
        item.className = 'blog-item';
        item.innerHTML = `
          ${post.title}
          <span class="blog-item-date">${post.date}</span>
        `;
        item.addEventListener('click', (e) => this.renderBlogPost(post, e));
        this.blogListContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Error creating blog list:', error);
    }
  }

  renderBlogPost(post, e) {
    if (!this.blogPreviewContainer) return;
    
    try {
      const allItems = document.querySelectorAll('.blog-item');
      allItems.forEach(el => el.classList.remove('active'));
      if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
      }
      
      this.blogPreviewContainer.innerHTML = `
        <h3 class="blog-title">${post.title}</h3>
        <div class="blog-meta">📅 ${post.date}</div>
        <div class="blog-markdown">${post.content.replace(/\n/g, '<br>')}</div>
      `;
    } catch (error) {
      console.error('Error rendering blog post:', error);
    }
  }

  createGuestbookMessages() {
    if (!this.messagesContainer) return;
    
    try {
      this.renderMessages(guestbookMessages);
    } catch (error) {
      console.error('Error creating guestbook messages:', error);
    }
  }

  renderMessages(messages) {
    if (!this.messagesContainer) return;
    
    try {
      this.messagesContainer.innerHTML = '';
      messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'message-item';
        item.innerHTML = `
          <div class="message-header">
            <span class="message-author">${msg.name}</span>
            ${msg.tag ? `<span class="message-tag">${msg.tag}</span>` : ''}
            <span class="message-time">${msg.time}</span>
          </div>
          <div class="message-text">${msg.text}</div>
        `;
        this.messagesContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Error rendering messages:', error);
    }
  }

  handleMessageSubmit() {
    try {
      const nameInput = document.getElementById('guest-name');
      const tagInput = document.getElementById('guest-tag');
      const messageInput = document.getElementById('guest-message');
      
      const name = nameInput?.value?.trim() || '匿名网友';
      const tag = tagInput?.value?.trim() || '';
      const text = messageInput?.value?.trim();
      
      if (!text) {
        alert('请输入留言内容！');
        return;
      }
      
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newMessage = {
        id: Date.now(),
        name,
        tag,
        time: timeStr,
        text
      };
      
      guestbookMessages.unshift(newMessage);
      this.renderMessages(guestbookMessages);
      
      if (nameInput) nameInput.value = '';
      if (tagInput) tagInput.value = '';
      if (messageInput) messageInput.value = '';
    } catch (error) {
      console.error('Error submitting message:', error);
    }
  }

  renderSkills() {
    if (!this.skillsContainer) return;
    
    try {
      this.skillsContainer.innerHTML = '';
      skillsData.forEach(skill => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-item';
        skillItem.innerHTML = `
          <div class="skill-label">
            <span>${skill.name}</span>
            <span>${skill.level}%</span>
          </div>
          <div class="skill-bar">
            <div class="skill-fill" data-level="${skill.level}"></div>
          </div>
        `;
        this.skillsContainer.appendChild(skillItem);
      });
      
      setTimeout(() => {
        const fills = this.skillsContainer?.querySelectorAll('.skill-fill');
        if (fills) {
          fills.forEach(fill => {
            fill.style.width = fill.dataset.level + '%';
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error rendering skills:', error);
    }
  }

  openProjectModal(project) {
    try {
      this.isProjectModalOpen = true;

      const titleEl = document.getElementById('project-title');
      const imageEl = document.getElementById('project-image');
      const descEl = document.getElementById('project-description');
      const tagsContainer = document.getElementById('project-tags');

      if (titleEl) titleEl.textContent = project.title;
      if (imageEl) imageEl.src = project.image;
      if (descEl) descEl.textContent = project.description;
      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        project.tags.forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.textContent = tag;
          tagsContainer.appendChild(tagSpan);
        });
      }

      if (this.projectModal) {
        this.projectModal.classList.remove('hidden');
        setTimeout(() => {
          this.projectModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening project modal:', error);
    }
  }

  toggleMusic() {
    try {
      if (!this.audio) {
        // 使用一个免费的合成器浪潮音乐
        this.audio = new Audio('https://cdn.pixabay.com/download/audio/2022/10/05/audio_c30a0b5a88.mp3');
        this.audio.loop = true;
        this.audio.volume = 0.5;
      }

      if (this.isMusicPlaying) {
        this.audio.pause();
        this.isMusicPlaying = false;
        if (this.musicIcon) {
          this.musicIcon.textContent = '▶';
        }
        if (this.musicBtn) {
          this.musicBtn.classList.remove('is-success');
          this.musicBtn.classList.add('is-primary');
        }
      } else {
        this.audio.play();
        this.isMusicPlaying = true;
        if (this.musicIcon) {
          this.musicIcon.textContent = '⏸';
        }
        if (this.musicBtn) {
          this.musicBtn.classList.remove('is-primary');
          this.musicBtn.classList.add('is-success');
        }
      }
    } catch (error) {
      console.error('Error toggling music:', error);
    }
  }
  
  handleAvatarUpload(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件！');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.profileAvatar) {
          this.profileAvatar.src = e.target.result;
        }
        // 保存到localStorage
        localStorage.setItem('synthwave-avatar', e.target.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  }
  
  loadSavedAvatar() {
    try {
      const savedAvatar = localStorage.getItem('synthwave-avatar');
      if (savedAvatar && this.profileAvatar) {
        this.profileAvatar.src = savedAvatar;
      }
    } catch (error) {
      console.error('Error loading saved avatar:', error);
    }
  }
}
