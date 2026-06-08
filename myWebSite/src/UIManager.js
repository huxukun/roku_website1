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

// Supabase 导入
import { supabase } from './supabase.js';
import { DEFAULT_PROFILE, LOCAL_STORAGE_PROFILE_KEY, getDefaultBio } from './profileConfig.js';
import { 
  ADMIN_PASSWORD, 
  verifyAdminPassword, 
  isAdminAuthenticated, 
  saveAdminAuth, 
  clearAdminAuth 
} from './adminConfig.js';
import { 
  t, 
  getCurrentLang, 
  translateContent, 
  translateObject, 
  translateArray,
  clearTranslationCache
} from './i18n.js';

// 留言板数据 - 使用数组存储从 Supabase 加载的数据
let guestbookMessages = [];

// LocalStorage 键名
const LOCAL_STORAGE_KEY = 'synthwave-guestbook-messages';

// 格式化日期时间
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 从 localStorage 加载留言
function loadMessagesFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
    return [];
  }
}

// 保存留言到 localStorage
function saveMessagesToLocalStorage(messages) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
}

// 从 Supabase 加载留言
async function loadGuestbookMessagesFromSupabase() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('time', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(msg => ({
    id: msg.id,
    name: msg.name,
    tag: msg.tag || '',
    time: msg.time || formatDateTime(new Date()),
    text: msg.text
  }));
}

// 保存留言到 Supabase
async function saveGuestbookMessageToSupabase(message) {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        name: message.name,
        tag: message.tag || null,
        text: message.text,
        time: timeStr
      }
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    tag: data.tag || '',
    time: data.time || timeStr,
    text: data.text
  };
}

// 从 Supabase 加载个人信息
async function loadProfileFromSupabase() {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .limit(1);

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    return data[0];
  }
  
  return null;
}

// 保存个人信息到 Supabase
async function saveProfileToSupabase(profile) {
  const { data, error } = await supabase
    .from('profile')
    .upsert([
      {
        id: 1, // 使用固定的 id 确保只有一条记录
        avatar: profile.avatar,
        bio: profile.bio,
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// 从 localStorage 加载个人信息
function loadProfileFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (stored) {
      const profile = JSON.parse(stored);
      // 如果 bio 为空，使用默认的多语言介绍
      if (!profile.bio) {
        profile.bio = getDefaultBio();
      }
      return profile;
    }
    // 返回带有正确多语言 bio 的默认配置
    return {
      ...DEFAULT_PROFILE,
      bio: getDefaultBio()
    };
  } catch (error) {
    console.error('Error loading profile from localStorage:', error);
    return {
      ...DEFAULT_PROFILE,
      bio: getDefaultBio()
    };
  }
}

// 保存个人信息到 localStorage
function saveProfileToLocalStorage(profile) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving profile to localStorage:', error);
  }
}

// 从 Supabase 加载博客文章
async function loadBlogsFromSupabase() {
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

// 保存博客文章到 Supabase
async function saveBlogToSupabase(blog) {
  const { data, error } = await supabase
    .from('blogs')
    .upsert([blog])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// 从 Supabase 删除博客文章
async function deleteBlogFromSupabase(id) {
  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// LocalStorage 博客存储键名
const LOCAL_STORAGE_BLOG_KEY = 'synthwave_blogs';

// 从 localStorage 加载博客
function loadBlogsFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_BLOG_KEY);
    return stored ? JSON.parse(stored) : blogData;
  } catch (error) {
    console.error('Error loading blogs from localStorage:', error);
    return blogData;
  }
}

// 保存博客到 localStorage
function saveBlogsToLocalStorage(blogs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BLOG_KEY, JSON.stringify(blogs));
  } catch (error) {
    console.error('Error saving blogs to localStorage:', error);
  }
}

export default class UIManager {
  currentProfile = { ...DEFAULT_PROFILE };
  isProfileEditable = false;
  isAdminMode = false;
  currentBlogs = [...blogData];
  currentEditingBlog = null;
  isBlogEditing = false;

  loadSongsFromService() {
    console.log('UIManager: loadSongsFromService called');
    console.log('UIManager: window.musicService exists:', !!window.musicService);
    
    if (window.musicService) {
      const songCount = window.musicService.getSongsCount();
      console.log('UIManager: Songs count from service:', songCount);
      
      if (songCount > 0) {
        const dbSongs = window.musicService.getAllSongs();
        console.log('UIManager: Raw songs from database:', dbSongs);
        
        const result = dbSongs.map(song => ({
          title: song.title,
          url: song.file_path
        }));
        
        console.log('UIManager: Processed songs:', result);
        console.log('UIManager: Loaded songs from database:', result.length);
        return result;
      } else {
        console.warn('UIManager: Music service has no songs');
      }
    } else {
      console.warn('UIManager: window.musicService not available');
    }
    
    console.warn('UIManager: No songs from database, using placeholder songs - please upload local files');
    return [
      { title: '🎵 请上传音乐文件 1', url: '' },
      { title: '🎵 请上传音乐文件 2', url: '' },
      { title: '🎵 请上传音乐文件 3', url: '' },
      { title: '🎵 请上传音乐文件 4', url: '' },
      { title: '🎵 请上传音乐文件 5', url: '' }
    ];
  }

  constructor() {
    this.isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
    this.isLoadingMessages = false;
    this.isSubmitting = false;
    this.isSavingProfile = false;
    this.currentBlogPost = null; // 当前预览的博客

    try {
      this.initElements();
      this.initEventListeners();
      this.initConfirmDialog();
      this.createProjectCards();
      this.initGuestbook();
      this.initProfile();
      this.initAdminMode();
      this.initBlogs();
      
      // 初始化语言切换加载动画文本
      this.initLanguageLoadingText();
      
      // 初始化时更新 UI 文字
      this.updateNavigationTexts();
      this.updateAboutModalTexts();
      this.updateGuestbookTexts();
      this.updateBlogModalTexts();
      this.updateGalleryModalTexts();
      this.updateAdminModalTexts();
      this.updateMusicControlTexts();
      this.updateStorageStatusTexts();
      
      console.log('UIManager initialized successfully');
    } catch (error) {
      console.error('Error initializing UIManager:', error);
    }
  }

  // 初始化语言切换加载动画文本
  initLanguageLoadingText() {
    const loadingTitle = document.querySelector('.language-loading-title');
    const loadingSubtitle = document.querySelector('.language-loading-subtitle');
    
    if (loadingTitle) loadingTitle.textContent = t('language-switching');
    if (loadingSubtitle) loadingSubtitle.textContent = t('language-translating');
  }

  // 更新模态框加载文本
  updateModalLoadingTexts() {
    const loadingTexts = document.querySelectorAll('.modal-loading-text');
    loadingTexts.forEach(el => {
      const key = el.dataset.i18n;
      if (key) {
        el.textContent = t(key);
      }
    });
  }

  // 显示模态框加载动画
  showModalLoading(modalId, loadingKey) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const loadingEl = modal.querySelector('.modal-loading');
    const loadingText = modal.querySelector('.modal-loading-text');
    
    if (loadingEl) {
      if (loadingText && loadingKey) {
        loadingText.dataset.i18n = loadingKey;
        loadingText.textContent = t(loadingKey);
      }
      loadingEl.classList.remove('hidden');
    }
  }

  // 隐藏模态框加载动画
  hideModalLoading(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const loadingEl = modal.querySelector('.modal-loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
  }

  // 初始化确认对话框
  initConfirmDialog() {
    this.confirmModal = document.getElementById('confirm-modal');
    this.confirmMessage = document.getElementById('confirm-message');
    this.confirmYesBtn = document.getElementById('confirm-yes');
    this.confirmNoBtn = document.getElementById('confirm-no');
    this.confirmCallback = null;

    if (this.confirmYesBtn) {
      this.confirmYesBtn.addEventListener('click', () => {
        this.handleConfirm(true);
      });
    }

    if (this.confirmNoBtn) {
      this.confirmNoBtn.addEventListener('click', () => {
        this.handleConfirm(false);
      });
    }
  }

  // 显示确认对话框
  showConfirm(message) {
    return new Promise((resolve) => {
      this.confirmCallback = resolve;
      if (this.confirmMessage) {
        this.confirmMessage.textContent = message;
      }
      if (this.confirmModal) {
        this.confirmModal.classList.remove('hidden');
      }
    });
  }

  // 处理确认结果
  handleConfirm(result) {
    if (this.confirmModal) {
      this.confirmModal.classList.add('hidden');
    }
    if (this.confirmCallback) {
      this.confirmCallback(result);
      this.confirmCallback = null;
    }
  }

  initElements() {
    this.aboutBtn = document.getElementById('about-btn');
    this.worksBtn = document.getElementById('works-btn');
    this.blogBtn = document.getElementById('blog-btn');
    this.guestbookBtn = document.getElementById('guestbook-btn');
    this.musicBtn = document.getElementById('music-btn');
    this.musicIcon = document.getElementById('music-icon');
    this.nextBtn = document.getElementById('next-btn');
    this.nowPlayingEl = document.getElementById('now-playing');
    this.songTitleEl = document.getElementById('song-title');
    this.audioFileInput = document.getElementById('audio-file');
    this.toggleUiBtn = document.getElementById('toggle-ui-btn');
    this.toggleUiIcon = document.getElementById('toggle-ui-icon');
    this.notificationDot = document.querySelector('.notification-dot');
    this.musicControlElements = document.querySelectorAll('.music-controls');
    this.isMusicUiVisible = false; // 默认隐藏
    console.log('audioFileInput:', !!this.audioFileInput);
    
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
    this.currentSongIndex = 0;
    // 优先使用云端数据库的歌曲，没有则使用默认歌曲
    this.songs = this.loadSongsFromService();
    this.isAudioInitialized = false;
    // 播放队列：确保5轮内不重复
    this.playlist = [];
    this.lastPlayedSongs = []; // 记录最近播放的歌曲索引
    this.initPlaylist();
    
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
    this.refreshBtn = document.getElementById('refresh-messages');
    this.storageStatus = document.getElementById('storage-status');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorMessage = document.getElementById('error-message');
    
    // 个人信息编辑相关元素
    this.editProfileBtn = document.getElementById('edit-profile-btn');
    this.saveProfileBtn = document.getElementById('save-profile-btn');
    this.cancelProfileBtn = document.getElementById('cancel-profile-btn');
    
    // 管理员模式相关元素
    this.adminModal = document.getElementById('admin-modal');
    this.adminToggleBtn = document.getElementById('admin-toggle-btn');
    this.blogAdminToggleBtn = document.getElementById('blog-admin-toggle-btn');
    this.adminPasswordInput = document.getElementById('admin-password-input');
    this.adminLoginBtn = document.getElementById('admin-login-btn');
    this.closeAdminModalBtn = document.getElementById('close-admin-modal');
    
    // 博客管理相关元素
    this.addBlogBtn = document.getElementById('add-blog-btn');
    this.blogEditor = document.getElementById('blog-editor');
    this.blogPreview = document.getElementById('blog-preview');
    this.blogTitleInput = document.getElementById('blog-title-input');
    this.blogDateInput = document.getElementById('blog-date-input');
    this.blogContentTextarea = document.getElementById('blog-content-textarea');
    this.saveBlogBtn = document.getElementById('save-blog-btn');
    this.deleteBlogBtn = document.getElementById('delete-blog-btn');
    this.cancelBlogEditBtn = document.getElementById('cancel-blog-edit-btn');
    
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
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.handleNextSong());
    }
    if (this.toggleUiBtn) {
      this.toggleUiBtn.addEventListener('click', () => this.toggleMusicUI());
    }
    if (this.audioFileInput) {
      this.audioFileInput.addEventListener('change', (e) => this.handleAudioFileSelect(e));
    }
    if (this.playVisualizerBtn) {
      console.log('Adding click listener to playVisualizerBtn');
      console.log('Button rect:', this.playVisualizerBtn.getBoundingClientRect());
      this.playVisualizerBtn.addEventListener('click', (e) => {
        console.log('playVisualizerBtn clicked!', e);
        this.handlePlayVisualizer();
      });
    } else {
      console.error('playVisualizerBtn is null!');
    }
    
    document.addEventListener('click', (e) => {
      console.log('Document clicked, target:', e.target.tagName, e.target.id);
    }, true);
    
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
    
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.refreshMessages());
    }
    
    if (this.avatarUploadBtn && this.avatarUpload) {
      this.avatarUploadBtn.addEventListener('click', () => this.avatarUpload.click());
      this.avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }
    
    // 个人信息编辑事件监听器
    if (this.editProfileBtn) {
      this.editProfileBtn.addEventListener('click', () => this.toggleProfileEdit());
    }
    if (this.saveProfileBtn) {
      this.saveProfileBtn.addEventListener('click', () => this.saveProfile());
    }
    if (this.cancelProfileBtn) {
      this.cancelProfileBtn.addEventListener('click', () => this.cancelProfileEdit());
    }
    
    // 管理员模式事件监听器
    if (this.adminToggleBtn) {
      this.adminToggleBtn.addEventListener('click', () => this.handleAdminToggle());
    }
    if (this.blogAdminToggleBtn) {
      this.blogAdminToggleBtn.addEventListener('click', () => this.handleAdminToggle());
    }
    if (this.adminLoginBtn) {
      this.adminLoginBtn.addEventListener('click', () => this.handleAdminLogin());
    }
    if (this.adminPasswordInput) {
      this.adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleAdminLogin();
      });
    }
    if (this.closeAdminModalBtn) {
      this.closeAdminModalBtn.addEventListener('click', () => this.closeAdminModal());
    }
    
    // 博客管理事件监听器
    if (this.addBlogBtn) {
      this.addBlogBtn.addEventListener('click', () => this.addNewBlog());
    }
    if (this.saveBlogBtn) {
      this.saveBlogBtn.addEventListener('click', () => this.saveBlog());
    }
    if (this.deleteBlogBtn) {
      this.deleteBlogBtn.addEventListener('click', () => this.deleteBlog());
    }
    if (this.cancelBlogEditBtn) {
      this.cancelBlogEditBtn.addEventListener('click', () => this.cancelBlogEdit());
    }
    
    document.addEventListener('languageChange', async (e) => {
      await this.handleLanguageChange(e.detail.lang);
    });
  }
  
  async handleLanguageChange(lang) {
    // 显示语言切换加载动画
    const languageLoading = document.getElementById('language-loading');
    const loadingTitle = languageLoading?.querySelector('.language-loading-title');
    const loadingSubtitle = languageLoading?.querySelector('.language-loading-subtitle');
    
    // 先用当前语言设置标题，然后立即切换
    if (loadingTitle) loadingTitle.textContent = t('language-switching');
    if (loadingSubtitle) loadingSubtitle.textContent = t('language-translating');
    
    if (languageLoading) {
      languageLoading.classList.remove('hidden');
    }
    
    try {
      // 清空翻译缓存，确保切换语言时重新翻译
      clearTranslationCache();
      
      // 模拟一个小延迟，让用户看到加载动画
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 更新 UI 文字
      this.updateNavigationTexts();
      this.updateAboutModalTexts();
      this.updateGuestbookTexts();
      this.updateBlogModalTexts();
      this.updateGalleryModalTexts();
      this.updateAdminModalTexts();
      this.updateMusicControlTexts();
      this.updateStorageStatusTexts();
      
      // 更新模态框加载文本
      this.updateModalLoadingTexts();
      
      // 重新翻译数据库内容
      await this.renderProfile();
      
      // 如果博客模态框是打开的
      if (this.isBlogModalOpen && this.blogModal) {
        // 先显示模态框内的加载动画
        this.showModalLoading('blog-modal', 'opening-blog');
        
        // 稍微等待动画可见
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 重新翻译博客列表
        await this.createBlogList();
        
        // 如果有正在预览的博客，也重新翻译
        const activeBlogItem = this.blogModal.querySelector('.blog-item.active');
        if (activeBlogItem && this.currentBlogPost) {
          await this.renderBlogPost(this.currentBlogPost, null);
        }
        
        // 隐藏加载动画
        this.hideModalLoading('blog-modal');
      }
      
      // 重新翻译留言板
      if (guestbookMessages.length > 0) {
        await this.renderMessages(guestbookMessages);
      }
      
      // 更新加载动画文字为新语言
      if (loadingTitle) loadingTitle.textContent = t('language-switching');
      if (loadingSubtitle) loadingSubtitle.textContent = t('language-translating');
      
    } finally {
      // 隐藏语言切换加载动画，添加短暂延迟确保动画效果可见
      if (languageLoading) {
        setTimeout(() => {
          languageLoading.classList.add('hidden');
        }, 500);
      }
    }
  }
  
  updateNavigationTexts() {
    const aboutBtn = document.querySelector('.about-btn-text');
    const worksBtn = document.querySelector('.works-btn-text');
    const guestbookBtn = document.querySelector('.guestbook-btn-text');
    const blogBtn = document.querySelector('.blog-btn-text');
    // Welcome 标题不需要翻译，保持 "WELCOME"
    
    if (aboutBtn) aboutBtn.textContent = t('about');
    if (worksBtn) worksBtn.textContent = t('works');
    if (guestbookBtn) guestbookBtn.textContent = t('guestbook');
    if (blogBtn) blogBtn.textContent = t('blog');
  }
  
  updateMusicControlTexts() {
    const uploadMusicText = document.querySelector('.upload-music-text');
    const nowPlayingLabel = document.querySelector('.now-playing-label');
    
    if (uploadMusicText) uploadMusicText.textContent = t('upload-music');
    if (nowPlayingLabel) nowPlayingLabel.textContent = t('now-playing');
  }
  
  updateAboutModalTexts() {
    const aboutTitle = document.querySelector('#about-modal .modal-title');
    const bioLabel = document.querySelector('#about-modal .bio-label');
    const editBtn = document.querySelector('#about-modal .edit-bio-btn .edit-text');
    const saveBtn = document.querySelector('#about-modal .save-bio-btn .save-text');
    const cancelBtn = document.querySelector('#about-modal .cancel-bio-btn .cancel-text');
    const changeAvatarBtn = document.querySelector('#about-modal .change-avatar-text');
    const skillsLabel = document.querySelector('#about-modal .skills-label');
    const closeFooter = document.querySelector('#about-modal .close-footer-text');
    
    if (aboutTitle) aboutTitle.textContent = t('about-title');
    if (bioLabel) bioLabel.textContent = t('bio');
    if (editBtn) editBtn.textContent = t('edit');
    if (saveBtn) saveBtn.textContent = t('save');
    if (cancelBtn) cancelBtn.textContent = t('cancel');
    if (changeAvatarBtn) changeAvatarBtn.textContent = t('change-avatar');
    if (skillsLabel) skillsLabel.textContent = t('skills');
    if (closeFooter) closeFooter.textContent = t('close-footer');
  }
  
  updateGuestbookTexts() {
    const guestbookTitle = document.querySelector('#guestbook-modal .modal-title');
    const storageStatusText = document.querySelector('#guestbook-modal .storage-status-text');
    const refreshText = document.querySelector('#guestbook-modal .refresh-text');
    const leaveMessageLabel = document.querySelector('#guestbook-modal .leave-message-label');
    const nameInput = document.getElementById('guest-name');
    const tagInput = document.getElementById('guest-tag');
    const messageInput = document.querySelector('#guestbook-modal .message-input');
    const sendText = document.querySelector('#guestbook-modal .send-text');
    const noMessages = document.querySelector('#guestbook-modal .no-messages');
    const historyLabel = document.querySelector('#guestbook-modal .history-label');
    const loadingIndicator = document.querySelector('#guestbook-modal .loading-indicator-text');
    const closeFooter = document.querySelector('#guestbook-modal .close-guestbook-footer-text');
    
    if (guestbookTitle) guestbookTitle.textContent = t('guestbook-title');
    if (storageStatusText) storageStatusText.textContent = t('storage-status');
    if (refreshText) refreshText.textContent = t('refresh');
    if (leaveMessageLabel) leaveMessageLabel.textContent = t('leave-message');
    if (nameInput) nameInput.placeholder = t('name');
    if (tagInput) tagInput.placeholder = t('tag');
    if (messageInput) messageInput.placeholder = t('message-hint');
    if (sendText) sendText.textContent = t('send');
    if (noMessages) noMessages.textContent = t('no-messages');
    if (historyLabel) historyLabel.textContent = t('history');
    if (loadingIndicator) loadingIndicator.textContent = t('loading');
    if (closeFooter) closeFooter.textContent = t('close-footer');
  }
  
  updateBlogModalTexts() {
    const blogTitle = document.querySelector('#blog-modal .modal-title');
    const articleListLabel = document.querySelector('#blog-modal .article-list-label');
    const selectArticleHint = document.querySelector('#blog-modal .select-article-hint');
    const addBlogBtn = document.querySelector('#blog-modal .add-blog-text');
    const deleteBlogBtn = document.querySelector('#blog-modal .delete-blog-text');
    const saveBlogBtn = document.querySelector('#blog-modal .save-blog-text');
    const cancelBlogBtn = document.querySelector('#blog-modal .cancel-blog-text');
    const titleInput = document.getElementById('blog-title-input');
    const dateInput = document.getElementById('blog-date-input');
    const contentTextarea = document.getElementById('blog-content-textarea');
    const closeFooter = document.querySelector('#blog-modal .close-blog-footer-text');
    
    if (blogTitle) blogTitle.textContent = t('blog-title');
    if (articleListLabel) articleListLabel.textContent = t('article-list');
    if (selectArticleHint) selectArticleHint.textContent = t('select-article');
    if (addBlogBtn) addBlogBtn.textContent = t('add-blog');
    if (deleteBlogBtn) deleteBlogBtn.textContent = t('delete-blog');
    if (saveBlogBtn) saveBlogBtn.textContent = t('save');
    if (cancelBlogBtn) cancelBlogBtn.textContent = t('cancel');
    if (titleInput) titleInput.placeholder = t('blog-placeholder-title');
    if (dateInput) dateInput.placeholder = t('blog-placeholder-date');
    if (contentTextarea) contentTextarea.placeholder = t('blog-placeholder-content');
    if (closeFooter) closeFooter.textContent = t('close-footer');
  }
  
  updateGalleryModalTexts() {
    const galleryTitle = document.querySelector('#gallery-modal .modal-title');
    const closeBtn = document.querySelector('#project-modal .project-close-text');
    
    if (galleryTitle) galleryTitle.textContent = t('gallery-title');
    if (closeBtn) closeBtn.textContent = t('project-close');
  }
  
  updateAdminModalTexts() {
    const adminTitle = document.querySelector('#admin-modal .modal-title');
    const adminHint = document.querySelector('#admin-modal .admin-hint-text');
    const passwordInput = document.querySelector('#admin-modal .password-input');
    const loginBtn = document.querySelector('#admin-modal .login-btn-text');
    
    if (adminTitle) adminTitle.textContent = t('admin-title');
    if (adminHint) adminHint.textContent = t('admin-hint');
    if (passwordInput) passwordInput.placeholder = t('password');
    if (loginBtn) loginBtn.textContent = t('login');
  }
  
  updateStorageStatusTexts() {
    const storageStatus = document.getElementById('storage-status');
    if (!storageStatus) return;
    
    const isOnline = storageStatus.classList.contains('online');
    const isOffline = storageStatus.classList.contains('offline');
    const statusText = storageStatus.querySelector('.storage-status-text');
    
    if (statusText) {
      if (isOnline) {
        statusText.textContent = t('online');
      } else if (isOffline) {
        statusText.textContent = t('offline');
      } else {
        statusText.textContent = t('storage-status');
      }
    }
  }

  // 更新存储状态显示
  updateStorageStatus(online) {
    if (!this.storageStatus) return;
    
    this.storageStatus.classList.remove('online', 'offline');
    if (online) {
      this.storageStatus.classList.add('online');
      this.storageStatus.textContent = '☁️ Supabase 在线';
    } else {
      this.storageStatus.classList.add('offline');
      this.storageStatus.textContent = '💾 本地模式';
    }
  }

  // 显示/隐藏加载指示器
  showLoading(show) {
    if (!this.loadingIndicator) return;
    if (show) {
      this.loadingIndicator.classList.remove('hidden');
    } else {
      this.loadingIndicator.classList.add('hidden');
    }
  }

  // 显示错误信息
  showError(message) {
    if (!this.errorMessage) return;
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
    
    setTimeout(() => {
      this.errorMessage.classList.add('hidden');
    }, 5000);
  }

  // 隐藏错误信息
  hideError() {
    if (!this.errorMessage) return;
    this.errorMessage.classList.add('hidden');
  }

  async openAboutModal() {
    try {
      // 先更新所有文字内容，确保语言是最新的
      this.updateAboutModalTexts();
      
      this.closeAllModals();
      // 确保在 closeAllModals 完成后再执行后续操作
      await new Promise(resolve => setTimeout(resolve, 10));
      
      this.isAboutModalOpen = true;
      if (this.aboutModal) {
        // 先显示模态框
        this.aboutModal.classList.remove('hidden');
        
        // 显示加载动画
        this.showModalLoading('about-modal', 'opening-about');
        
        // 等待动画可见，确保用户能看到加载效果
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 加载数据
        this.renderSkills();
        await this.renderProfile();
        
        // 隐藏加载动画
        this.hideModalLoading('about-modal');
      }
    } catch (error) {
      console.error('Error opening about modal:', error);
      this.hideModalLoading('about-modal');
    }
  }

  async openGalleryModal() {
    try {
      // 切换画廊模式
      const isActive = window.toggleGalleryMode();
      
      // 如果切换到非画廊模式，确保关闭所有模态框
      if (!isActive) {
        this.closeAllModals();
      }
    } catch (error) {
      console.error('Error toggling gallery mode:', error);
    }
  }

  async openBlogModal() {
    try {
      // 先更新所有文字内容，确保语言是最新的
      this.updateBlogModalTexts();
      
      this.closeAllModals();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      this.isBlogModalOpen = true;
      if (this.blogModal) {
        // 先显示模态框
        this.blogModal.classList.remove('hidden');
        
        // 显示加载动画
        this.showModalLoading('blog-modal', 'opening-blog');
        
        // 等待动画可见，确保用户能看到加载效果
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 重置当前博客状态
        this.currentBlogPost = null;
        
        // 渲染博客列表
        await this.createBlogList();
        
        // 重置预览区域为默认提示
        if (this.blogPreviewContainer) {
          // 获取博客预览加载元素
          const blogPreviewLoading = document.getElementById('blog-preview-loading');
          
          // 清空预览区域
          this.blogPreviewContainer.innerHTML = '';
          
          // 重新添加加载动画容器
          if (blogPreviewLoading) {
            this.blogPreviewContainer.appendChild(blogPreviewLoading);
          }
          
          // 添加提示文字
          const hint = document.createElement('p');
          hint.className = 'select-article-hint';
          hint.textContent = t('select-article');
          hint.dataset.i18n = 'select-article';
          this.blogPreviewContainer.appendChild(hint);
        }
        
        // 隐藏加载动画
        this.hideModalLoading('blog-modal');
      }
    } catch (error) {
      console.error('Error opening blog modal:', error);
      this.hideModalLoading('blog-modal');
    }
  }

  async openGuestbookModal() {
    try {
      // 先更新所有文字内容，确保语言是最新的
      this.updateGuestbookTexts();
      
      this.closeAllModals();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      this.isGuestbookModalOpen = true;
      if (this.guestbookModal) {
        // 先显示模态框
        this.guestbookModal.classList.remove('hidden');
        
        // 显示加载动画
        this.showModalLoading('guestbook-modal', 'opening-guestbook');
        
        // 等待动画可见，确保用户能看到加载效果
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 加载留言数据
        await this.loadMessagesFromSupabase();
        
        // 隐藏加载动画
        this.hideModalLoading('guestbook-modal');
      }
    } catch (error) {
      console.error('Error opening guestbook modal:', error);
      this.hideModalLoading('guestbook-modal');
    }
  }

  closeAllModals() {
    try {
      // 先取消任何可能存在的定时器，避免冲突
      if (this.modalCloseTimeout) {
        clearTimeout(this.modalCloseTimeout);
      }
      
      // 立即隐藏所有模态框，不再使用延迟
      [this.aboutModal, this.galleryModal, this.blogModal, this.guestbookModal, this.projectModal].forEach(modal => {
        if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('visible');
        }
      });
      
      // 如果当前处于画廊模式，也退出画廊模式
      if (window.isGalleryModeActive && window.isGalleryModeActive()) {
        window.toggleGalleryMode();
      }
      
      // 重置所有状态标志
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
      projectsData.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card content-fade-in';
        // 设置延迟动画，让每个卡片依次淡入
        card.style.animationDelay = `${index * 0.15}s`;
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

  async createBlogList() {
    if (!this.blogListContainer) return;
    
    try {
      this.blogListContainer.innerHTML = '';
      const currentLang = getCurrentLang();
      
      // 并行翻译所有博客标题，提升效率
      const translatedPosts = await Promise.all(
        blogData.map(post => translateObject(post, ['title'], currentLang))
      );
      
      translatedPosts.forEach((translatedPost, index) => {
        const originalPost = blogData[index];
        const item = document.createElement('div');
        item.className = 'blog-item';
        item.innerHTML = `
          ${translatedPost.title}
          <span class="blog-item-date">${originalPost.date}</span>
        `;
        item.addEventListener('click', (e) => this.renderBlogPost(originalPost, e));
        this.blogListContainer.appendChild(item);
      });
      
      // 确保没有任何项目被选中
      const allItems = this.blogListContainer.querySelectorAll('.blog-item');
      allItems.forEach(item => item.classList.remove('active'));
    } catch (error) {
      console.error('Error creating blog list:', error);
    }
  }

  // 初始化留言板
  async initGuestbook() {
    this.hideError();
    this.updateStorageStatus(this.isSupabaseConfigured);
    
    if (this.isSupabaseConfigured) {
      await this.loadMessagesFromSupabase();
    } else {
      console.warn('Supabase is not configured. Using localStorage.');
      guestbookMessages = loadMessagesFromLocalStorage();
      this.renderMessages(guestbookMessages);
    }
  }

  // 从 Supabase 加载消息
  async loadMessagesFromSupabase() {
    if (this.isLoadingMessages) return;
    
    this.isLoadingMessages = true;
    this.showLoading(true);
    this.hideError();

    try {
      guestbookMessages = await loadGuestbookMessagesFromSupabase();
      this.renderMessages(guestbookMessages);
      this.updateStorageStatus(true);
    } catch (error) {
      console.error('Error loading from Supabase, falling back to localStorage:', error);
      this.updateStorageStatus(false);
      guestbookMessages = loadMessagesFromLocalStorage();
      this.renderMessages(guestbookMessages);
      this.showError(`连接 Supabase 失败: ${error.message || '未知错误'}\n已切换到本地存储模式`);
    } finally {
      this.isLoadingMessages = false;
      this.showLoading(false);
    }
  }

  // 刷新消息
  async refreshMessages() {
    if (this.isSupabaseConfigured) {
      await this.loadMessagesFromSupabase();
    } else {
      guestbookMessages = loadMessagesFromLocalStorage();
      this.renderMessages(guestbookMessages);
    }
  }

  async renderBlogPost(post, e) {
    if (!this.blogPreviewContainer) return;
    
    try {
      const allItems = document.querySelectorAll('.blog-item');
      allItems.forEach(el => el.classList.remove('active'));
      if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
      }
      
      // 保存当前博客引用，用于语言切换时重新翻译
      this.currentBlogPost = post;
      
      // 获取博客预览加载元素
      const blogPreviewLoading = document.getElementById('blog-preview-loading');
      
      // 显示加载动画
      if (blogPreviewLoading) {
        blogPreviewLoading.classList.remove('hidden');
      }
      
      // 稍微延迟让动画可见，同时模拟加载过程
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const currentLang = getCurrentLang();
      const translatedPost = await translateObject(post, ['title', 'content'], currentLang);
      
      // 添加内容淡入动画前先清理加载动画
      if (blogPreviewLoading) {
        blogPreviewLoading.classList.add('hidden');
      }
      
      // 清除现有内容，然后添加新内容
      this.blogPreviewContainer.innerHTML = '';
      
      // 添加加载动画容器回去
      if (blogPreviewLoading) {
        this.blogPreviewContainer.appendChild(blogPreviewLoading);
      }
      
      // 添加内容淡入动画
      const contentDiv = document.createElement('div');
      contentDiv.className = 'content-fade-in';
      contentDiv.innerHTML = `
        <h3 class="blog-title">${translatedPost.title}</h3>
        <div class="blog-meta">📅 ${translatedPost.date}</div>
        <div class="blog-markdown">${translatedPost.content.replace(/\n/g, '<br>')}</div>
      `;
      this.blogPreviewContainer.appendChild(contentDiv);
      
      // 动画结束后移除 class
      setTimeout(() => {
        contentDiv.classList.remove('content-fade-in');
      }, 500);
    } catch (error) {
      console.error('Error rendering blog post:', error);
      // 发生错误也要移除加载动画
      const blogPreviewLoading = document.getElementById('blog-preview-loading');
      if (blogPreviewLoading) {
        blogPreviewLoading.classList.add('hidden');
      }
    }
  }

  async renderMessages(messages) {
    if (!this.messagesContainer) return;
    
    try {
      this.messagesContainer.innerHTML = '';
      if (messages.length === 0) {
        this.messagesContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--neon-cyan); opacity: 0.6;" class="content-fade-in">
            ${t('no-messages')}
          </div>
        `;
        return;
      }
      
      const currentLang = getCurrentLang();
      const translatedMessages = await translateArray(messages, ['name', 'text'], currentLang);
      
      translatedMessages.forEach((msg, index) => {
        const item = document.createElement('div');
        item.className = 'message-item content-fade-in';
        // 设置延迟动画，让每条留言依次淡入
        item.style.animationDelay = `${index * 0.1}s`;
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

  async handleMessageSubmit() {
    if (this.isSubmitting) return;
    
    try {
      const nameInput = document.getElementById('guest-name');
      const tagInput = document.getElementById('guest-tag');
      const messageInput = document.getElementById('guest-message');
      
      const name = nameInput?.value?.trim() || '匿名网友';
      const tag = tagInput?.value?.trim() || '';
      const text = messageInput?.value?.trim();
      
      if (!text) {
        this.showNotification('请输入留言内容！');
        return;
      }

      this.isSubmitting = true;
      this.hideError();
      this.submitMessageBtn.classList.add('loading');

      const newMessage = { name, tag, text };
      
      if (this.isSupabaseConfigured) {
        try {
          const savedMessage = await saveGuestbookMessageToSupabase(newMessage);
          guestbookMessages.unshift(savedMessage);
          this.renderMessages(guestbookMessages);
        } catch (error) {
          console.error('Supabase save failed, using localStorage:', error);
          this.saveLocalMessage(newMessage);
          this.showError(`保存到云端失败: ${error.message || '未知错误'}\n已保存到本地`);
        }
      } else {
        this.saveLocalMessage(newMessage);
      }
      
      if (nameInput) nameInput.value = '';
      if (tagInput) tagInput.value = '';
      if (messageInput) messageInput.value = '';
      
    } catch (error) {
      console.error('Error submitting message:', error);
      this.showError(`发送失败: ${error.message || '未知错误'}`);
    } finally {
      this.isSubmitting = false;
      this.submitMessageBtn.classList.remove('loading');
    }
  }

  // 保存消息到本地
  saveLocalMessage(message) {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const localMessage = {
      id: Date.now(),
      ...message,
      time: timeStr
    };
    
    guestbookMessages.unshift(localMessage);
    saveMessagesToLocalStorage(guestbookMessages);
    this.renderMessages(guestbookMessages);
  }

  renderSkills() {
    if (!this.skillsContainer) return;
    
    try {
      this.skillsContainer.innerHTML = '';
      skillsData.forEach((skill, index) => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-item content-fade-in';
        // 设置延迟动画，让每个技能依次淡入
        skillItem.style.animationDelay = `${index * 0.1}s`;
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
        
        // 添加内容淡入动画
        const projectDialog = this.projectModal.querySelector('.project-dialog');
        if (projectDialog) {
          projectDialog.classList.add('content-fade-in');
        }
        
        setTimeout(() => {
          this.projectModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening project modal:', error);
    }
  }

  // 显示正在播放的歌曲
  showNowPlaying(songTitle) {
    if (this.songTitleEl) {
      this.songTitleEl.textContent = songTitle;
    }
    if (this.nowPlayingEl) {
      this.nowPlayingEl.classList.remove('hidden');
      this.nowPlayingEl.classList.add('visible');
    }
  }

  // 切换音乐相关控制元素的显示/隐藏
  toggleMusicUI() {
    this.isMusicUiVisible = !this.isMusicUiVisible;
    
    // 控制所有音乐相关元素
    this.musicControlElements.forEach(el => {
      if (this.isMusicUiVisible) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
    
    // 控制红点显示：隐藏的时候显示红点，显示的时候隐藏红点
    if (this.notificationDot) {
      if (this.isMusicUiVisible) {
        this.notificationDot.classList.add('hidden');
      } else {
        this.notificationDot.classList.remove('hidden');
      }
    }
    
    if (this.toggleUiIcon) {
      this.toggleUiIcon.textContent = this.isMusicUiVisible ? '🎛️' : '🔇';
    }
    
    if (this.toggleUiBtn) {
      if (this.isMusicUiVisible) {
        this.toggleUiBtn.classList.remove('is-primary');
        this.toggleUiBtn.classList.add('is-success');
        this.toggleUiBtn.style.opacity = '1';
      } else {
        this.toggleUiBtn.classList.remove('is-success');
        this.toggleUiBtn.classList.add('is-primary');
        this.toggleUiBtn.style.opacity = '0.5';
      }
    }
    
    console.log('音乐 UI 显示状态:', this.isMusicUiVisible ? '显示' : '隐藏');
  }

  // 隐藏正在播放
  hideNowPlaying() {
    if (this.nowPlayingEl) {
      this.nowPlayingEl.classList.remove('visible');
      this.nowPlayingEl.classList.add('hidden');
    }
  }

  // 初始化播放队列（Fisher-Yates 洗牌算法）
  initPlaylist() {
    this.playlist = [];
    for (let i = 0; i < this.songs.length; i++) {
      this.playlist.push(i);
    }
    // 随机打乱播放队列
    for (let i = this.playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
    this.lastPlayedSongs = [];
  }

  // 获取下一首歌曲索引（确保5轮内不重复）
  getNextSongIndex() {
    console.log('getNextSongIndex called');
    console.log('Current playlist:', this.playlist);
    
    // 如果播放队列为空，重新初始化
    if (this.playlist.length === 0) {
      console.log('Playlist is empty, reinitializing...');
      this.initPlaylist();
      console.log('New playlist:', this.playlist);
    }
    
    // 从队列中取出一首
    const songIndex = this.playlist.shift();
    console.log('Selected song index:', songIndex);
    
    // 记录最近播放的歌曲（最多保留4首）
    this.lastPlayedSongs.push(songIndex);
    if (this.lastPlayedSongs.length > 4) {
      this.lastPlayedSongs.shift();
    }
    
    return songIndex;
  }

  // 初始化音频播放器
  initAudioPlayer() {
    if (this.isAudioInitialized) return;
    
    this.audio = new Audio();
    this.audio.volume = 0.5;
    
    // 监听歌曲结束，播放随机下一首
    this.audio.addEventListener('ended', () => {
      this.playRandomNextSong();
    });
    
    // 监听加载错误
    this.audio.addEventListener('error', (e) => {
      console.warn('歌曲加载失败，尝试下一首...');
      this.playRandomNextSong();
    });
    
    this.isAudioInitialized = true;
  }

  // 随机播放下一首
  playRandomNextSong() {
    this.currentSongIndex = this.getNextSongIndex();
    this.playCurrentSong();
  }

  // 验证并清理 URL
  validateAndCleanUrl(url) {
    if (!url || url.trim() === '') {
      return { valid: false, url: '', error: 'URL 为空' };
    }
    
    let cleanUrl = url
      .replace(/[`'"]/g, '')
      .trim();
    
    try {
      new URL(cleanUrl);
    } catch (e) {
      return { valid: false, url: cleanUrl, error: 'URL 格式无效' };
    }
    
    return { valid: true, url: cleanUrl, error: null };
  }

  // 播放当前歌曲
  async playCurrentSong() {
    const currentSong = this.songs[this.currentSongIndex];
    console.log('UIManager: playCurrentSong called, song:', currentSong);
    
    // 检查 URL 是否为空
    if (!currentSong.url || currentSong.url.trim() === '') {
      this.showNowPlaying(currentSong.title + ' - 请点击"上传音乐"');
      console.warn('UIManager: URL 为空，建议用户上传文件');
      return;
    }
    
    // 验证和清理 URL
    const urlValidation = this.validateAndCleanUrl(currentSong.url);
    console.log('UIManager: URL 验证结果:', urlValidation);
    
    if (!urlValidation.valid) {
      this.showNowPlaying(`${currentSong.title} - ${urlValidation.error}`);
      console.error('UIManager: URL 无效:', urlValidation.error);
      return;
    }
    
    const cleanUrl = urlValidation.url;
    console.log('UIManager: 原始 URL:', currentSong.url);
    console.log('UIManager: 使用清理后的 URL:', cleanUrl);
    
    try {
      if (window.musicVisualizer) {
        console.log('UIManager: Using musicVisualizer to play');
        this.showNowPlaying(currentSong.title + ' - 加载中...');
        
        await window.musicVisualizer.loadAudio(cleanUrl);
        await window.musicVisualizer.play();
        
        this.showNowPlaying(currentSong.title);
        this.isMusicPlaying = true;
        if (this.musicIcon) {
          this.musicIcon.textContent = '⏸';
        }
        if (this.musicBtn) {
          this.musicBtn.classList.remove('is-primary');
          this.musicBtn.classList.add('is-success');
        }
        if (window.setColorChanging) {
          window.setColorChanging(true);
        }
      } else {
        console.log('UIManager: Using fallback audio player');
        if (!this.audio) {
          this.initAudioPlayer();
        }
        
        this.showNowPlaying(currentSong.title + ' - 加载中...');
        this.audio.src = cleanUrl;
        
        await this.audio.play();
        
        this.showNowPlaying(currentSong.title);
        this.isMusicPlaying = true;
        if (this.musicIcon) {
          this.musicIcon.textContent = '⏸';
        }
        if (this.musicBtn) {
          this.musicBtn.classList.remove('is-primary');
          this.musicBtn.classList.add('is-success');
        }
        if (window.setColorChanging) {
          window.setColorChanging(true);
        }
      }
    } catch (error) {
      console.error('UIManager: 播放失败:', error);
      const errorMessage = error.message || '加载失败';
      this.showNowPlaying(`${currentSong.title} - ${errorMessage}`);
      
      // 自动尝试下一首歌曲
      console.log('UIManager: 自动尝试下一首歌曲');
      setTimeout(() => {
        this.playRandomNextSong();
      }, 2000);
    }
  }

  toggleMusic() {
    try {
      console.log('toggleMusic called, isMusicPlaying:', this.isMusicPlaying);
      
      if (!this.isAudioInitialized) {
        this.initAudioPlayer();
      }
      
      if (this.isMusicPlaying) {
        // 暂停
        console.log('Pausing music');
        if (window.musicVisualizer) {
          window.musicVisualizer.pause();
        } else if (this.audio) {
          this.audio.pause();
        }
        this.isMusicPlaying = false;
        if (this.musicIcon) {
          this.musicIcon.textContent = '▶';
        }
        if (this.musicBtn) {
          this.musicBtn.classList.remove('is-success');
          this.musicBtn.classList.add('is-primary');
        }
        if (window.setColorChanging) {
          window.setColorChanging(false);
        }
      } else {
        // 播放
        console.log('Playing music');
        
        // 检查是否已有上传的本地文件在播放
        if (window.musicVisualizer && window.musicVisualizer.audioElement && 
            window.musicVisualizer.audioElement.src && 
            window.musicVisualizer.audioElement.src.startsWith('blob:')) {
          console.log('Resuming local file playback');
          window.musicVisualizer.play().then(() => {
            this.isMusicPlaying = true;
            if (this.musicIcon) {
              this.musicIcon.textContent = '⏸';
            }
            if (this.musicBtn) {
              this.musicBtn.classList.remove('is-primary');
              this.musicBtn.classList.add('is-success');
            }
            if (window.setColorChanging) {
              window.setColorChanging(true);
            }
          }).catch((e) => {
            console.error('继续播放失败:', e);
            this.playCurrentSong();
          });
        } else {
          // 默认播放当前选择的歌曲
          console.log('Playing default song');
          this.playCurrentSong();
        }
      }
    } catch (error) {
      console.error('Error toggling music:', error);
    }
  }

  handleNextSong() {
    try {
      console.log('handleNextSong called');
      console.log('Songs count:', this.songs.length);
      console.log('Current song index:', this.currentSongIndex);
      console.log('Playlist length:', this.playlist.length);
      
      if (!this.isAudioInitialized) {
        console.log('Initializing audio player...');
        this.initAudioPlayer();
      }
      
      if (this.songs.length === 0) {
        console.error('No songs available!');
        return;
      }
      
      console.log('Playing next song...');
      this.playRandomNextSong();
    } catch (error) {
      console.error('Error handling next song:', error);
    }
  }

  handleAudioFileSelect(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
        this.showNotification('请选择 MP3 音乐文件！');
        return;
      }
      
      if (window.loadMusicFile) {
        window.loadMusicFile(file).then(() => {
          this.showNowPlaying(file.name.replace('.mp3', ''));
          this.isMusicPlaying = true;
          if (this.musicIcon) {
            this.musicIcon.textContent = '⏸';
          }
          if (this.musicBtn) {
            this.musicBtn.classList.remove('is-primary');
            this.musicBtn.classList.add('is-success');
          }
          if (window.setColorChanging) {
            window.setColorChanging(true);
          }
        }).catch(error => {
          console.error('播放失败:', error);
        });
      }
    } catch (error) {
      console.error('Error selecting audio file:', error);
    }
  }

  handlePlayVisualizer() {
    try {
      if (window.loadMusicURL && this.songs.length > 0) {
        const randomSong = this.songs[Math.floor(Math.random() * this.songs.length)];
        window.loadMusicURL(randomSong.url);
        this.showNowPlaying(randomSong.title);
      }
    } catch (error) {
      console.error('Error playing visualizer:', error);
    }
  }

  // 初始化个人信息
  async initProfile() {
    try {
      await this.loadProfile();
    } catch (error) {
      console.error('Error initializing profile:', error);
    }
  }

  // 加载个人信息
  async loadProfile() {
    if (this.isSupabaseConfigured) {
      try {
        const profile = await loadProfileFromSupabase();
        if (profile) {
          this.currentProfile = {
            avatar: profile.avatar || DEFAULT_PROFILE.avatar,
            bio: profile.bio || DEFAULT_PROFILE.bio
          };
          await this.renderProfile();
          return;
        }
      } catch (error) {
        console.error('Error loading profile from Supabase, falling back to localStorage:', error);
      }
    }
    
    // 回退到 localStorage
    this.currentProfile = loadProfileFromLocalStorage();
    await this.renderProfile();
  }

  // 渲染个人信息
  async renderProfile() {
    if (this.profileAvatar) {
      this.profileAvatar.src = this.currentProfile.avatar;
    }
    const bioEl = document.getElementById('profile-bio');
    if (bioEl) {
      // 获取当前语言
      const currentLang = getCurrentLang();
      
      // 添加淡入动画
      bioEl.classList.add('content-fade-in');
      
      // 检查是否是默认个人简介（通过检查是否包含中文关键词）
      const isDefaultBio = this.isDefaultProfileBio(this.currentProfile.bio);
      
      if (isDefaultBio) {
        // 直接使用 i18n 中预定义的多语言版本
        bioEl.textContent = t('default-bio');
      } else if (this.currentProfile.bio) {
        // 用户自定义个人简介，进行翻译
        bioEl.textContent = await translateContent(this.currentProfile.bio, currentLang);
      }
      
      // 动画结束后移除 class
      setTimeout(() => {
        bioEl.classList.remove('content-fade-in');
      }, 500);
    }
  }

  // 判断是否是默认个人简介
  isDefaultProfileBio(bio) {
    if (!bio) return true;
    const defaultBioZh = '欢迎来到赛博网格';
    const defaultBioEn = 'Welcome to Cyber Grid';
    const defaultBioJa = 'サイバーグリッドへようこそ';
    
    return bio.includes(defaultBioZh) || 
           bio.includes(defaultBioEn) || 
           bio.includes(defaultBioJa) ||
           bio === 'default-bio' || 
           bio === 'DEFAULT_BIO';
  }

  // 切换编辑模式
  toggleProfileEdit() {
    this.isProfileEditable = !this.isProfileEditable;
    this.updateProfileEditUI();
  }

  // 更新编辑模式的 UI
  updateProfileEditUI() {
    const bioTextarea = document.getElementById('profile-bio-textarea');
    const bioDisplay = document.getElementById('profile-bio');
    const editBtn = document.getElementById('edit-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');

    if (this.isProfileEditable) {
      if (bioTextarea) {
        bioTextarea.value = this.currentProfile.bio;
        bioTextarea.classList.remove('hidden');
      }
      if (bioDisplay) {
        bioDisplay.classList.add('hidden');
      }
      if (editBtn) editBtn.classList.add('hidden');
      if (saveBtn) saveBtn.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.remove('hidden');
    } else {
      if (bioTextarea) bioTextarea.classList.add('hidden');
      if (bioDisplay) bioDisplay.classList.remove('hidden');
      if (editBtn) editBtn.classList.remove('hidden');
      if (saveBtn) saveBtn.classList.add('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }
  }

  // 保存个人信息
  async saveProfile() {
    if (this.isSavingProfile) return;

    const bioTextarea = document.getElementById('profile-bio-textarea');
    if (!bioTextarea) return;

    this.isSavingProfile = true;
    const newBio = bioTextarea.value;

    // 更新当前数据
    this.currentProfile.bio = newBio;

    // 保存
    try {
      if (this.isSupabaseConfigured) {
        await saveProfileToSupabase(this.currentProfile);
      }
      saveProfileToLocalStorage(this.currentProfile);
      
      // 重新渲染并退出编辑模式
      await this.renderProfile();
      this.isProfileEditable = false;
      this.updateProfileEditUI();
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showNotification('保存失败，请稍后重试');
    } finally {
      this.isSavingProfile = false;
    }
  }

  // 取消编辑
  cancelProfileEdit() {
    this.isProfileEditable = false;
    this.updateProfileEditUI();
  }

  // 处理头像上传（同时保存到本地和 Supabase）
  async handleAvatarUpload(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        this.showNotification('请选择图片文件！');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const avatarData = e.target.result;
        
        // 更新头像显示
        if (this.profileAvatar) {
          this.profileAvatar.src = avatarData;
        }
        
        // 更新当前数据
        this.currentProfile.avatar = avatarData;
        
        // 保存
        try {
          if (this.isSupabaseConfigured) {
            await saveProfileToSupabase(this.currentProfile);
          }
          saveProfileToLocalStorage(this.currentProfile);
        } catch (error) {
          console.error('Error saving avatar:', error);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  }

  // ========== 管理员模式相关方法 ==========
  
  // 初始化管理员模式
  initAdminMode() {
    if (isAdminAuthenticated()) {
      this.enableAdminMode();
    }
  }

  // 处理管理员切换按钮
  handleAdminToggle() {
    if (this.isAdminMode) {
      // 退出管理模式
      this.disableAdminMode();
      clearAdminAuth();
    } else {
      // 打开密码输入弹窗
      this.openAdminModal();
    }
  }

  // 打开管理员密码弹窗
  openAdminModal() {
    if (this.adminModal) {
      this.adminModal.classList.remove('hidden');
      setTimeout(() => {
        this.adminModal.classList.add('visible');
      }, 10);
      // 清空并聚焦密码输入框
      if (this.adminPasswordInput) {
        this.adminPasswordInput.value = '';
        this.adminPasswordInput.focus();
      }
    }
  }

  // 关闭管理员密码弹窗
  closeAdminModal() {
    if (this.adminModal) {
      this.adminModal.classList.remove('visible');
      setTimeout(() => {
        this.adminModal.classList.add('hidden');
      }, 300);
    }
  }

  // 处理管理员登录
  handleAdminLogin() {
    const password = this.adminPasswordInput ? this.adminPasswordInput.value : '';
    if (verifyAdminPassword(password)) {
      saveAdminAuth();
      this.enableAdminMode();
      this.closeAdminModal();
      this.showNotification('✅ 已进入管理模式！');
    } else {
      this.showNotification('❌ 密码错误！');
    }
  }

  // 启用管理员模式
  enableAdminMode() {
    this.isAdminMode = true;
    // 给 body 添加 admin-mode 类
    document.body.classList.add('admin-mode');
    // 更新按钮文字
    this.updateAdminButtons();
  }

  // 禁用管理员模式
  disableAdminMode() {
    this.isAdminMode = false;
    document.body.classList.remove('admin-mode');
    this.updateAdminButtons();
  }

  // 更新管理员按钮状态
  updateAdminButtons() {
    if (this.adminToggleBtn) {
      this.adminToggleBtn.textContent = this.isAdminMode ? '🔒' : '⚙️';
    }
    if (this.blogAdminToggleBtn) {
      this.blogAdminToggleBtn.textContent = this.isAdminMode ? '🔒' : '⚙️';
    }
  }

  // ========== 博客管理相关方法 ==========

  // 初始化博客
  async initBlogs() {
    await this.loadBlogs();
    await this.createBlogList();
  }

  // 加载博客文章
  async loadBlogs() {
    if (this.isSupabaseConfigured) {
      try {
        const blogs = await loadBlogsFromSupabase();
        if (blogs && blogs.length > 0) {
          this.currentBlogs = blogs;
          return;
        }
      } catch (error) {
        console.error('Error loading blogs from Supabase, falling back to localStorage:', error);
      }
    }
    // 回退到 localStorage
    this.currentBlogs = loadBlogsFromLocalStorage();
  }

  // 重写 createBlogList 方法
  async createBlogList() {
    if (!this.blogListContainer) return;
    
    try {
      this.blogListContainer.innerHTML = '';
      
      const currentLang = getCurrentLang();
      const translatedBlogs = await translateArray(this.currentBlogs, ['title'], currentLang);
      
      translatedBlogs.forEach((blog, index) => {
        const item = document.createElement('div');
        item.className = 'blog-item';
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${blog.title}</span>
            ${this.isAdminMode ? `<button class="edit-blog-icon" data-index="${index}" style="background: none; border: none; cursor: pointer; font-size: 0.8rem;">✏️</button>` : ''}
          </div>
          <span class="blog-item-date">${blog.date}</span>
        `;
        item.addEventListener('click', (e) => {
          // 检查是否点击了编辑按钮
          if (e.target.classList.contains('edit-blog-icon')) {
            e.stopPropagation();
            this.editBlog(index);
          } else {
            this.renderBlogPost(this.currentBlogs[index], e);
          }
        });
        this.blogListContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Error creating blog list:', error);
    }
  }

  // 添加新博客
  addNewBlog() {
    const today = new Date().toISOString().split('T')[0];
    this.currentEditingBlog = {
      id: Date.now(),
      title: '',
      date: today,
      content: ''
    };
    this.isBlogEditing = true;
    this.showBlogEditor();
  }

  // 编辑博客
  editBlog(index) {
    const blog = this.currentBlogs[index];
    this.currentEditingBlog = { ...blog, _index: index };
    this.isBlogEditing = true;
    this.showBlogEditor();
  }

  // 显示博客编辑器
  showBlogEditor() {
    if (this.blogPreview) {
      this.blogPreview.classList.add('hidden');
    }
    if (this.blogEditor) {
      this.blogEditor.classList.remove('hidden');
    }
    
    // 填充编辑器内容
    if (this.blogTitleInput && this.currentEditingBlog) {
      this.blogTitleInput.value = this.currentEditingBlog.title || '';
    }
    if (this.blogDateInput && this.currentEditingBlog) {
      this.blogDateInput.value = this.currentEditingBlog.date || '';
    }
    if (this.blogContentTextarea && this.currentEditingBlog) {
      this.blogContentTextarea.value = this.currentEditingBlog.content || '';
    }
  }

  // 隐藏博客编辑器
  hideBlogEditor() {
    if (this.blogPreview) {
      this.blogPreview.classList.remove('hidden');
    }
    if (this.blogEditor) {
      this.blogEditor.classList.add('hidden');
    }
    this.isBlogEditing = false;
    this.currentEditingBlog = null;
  }

  // 保存博客
  async saveBlog() {
    if (!this.currentEditingBlog) return;
    
    const title = this.blogTitleInput ? this.blogTitleInput.value.trim() : '';
    const date = this.blogDateInput ? this.blogDateInput.value.trim() : '';
    const content = this.blogContentTextarea ? this.blogContentTextarea.value.trim() : '';
    
    if (!title || !date || !content) {
      alert('请填写完整的博客信息！');
      return;
    }
    
    // 更新当前编辑的博客
    const updatedBlog = {
      ...this.currentEditingBlog,
      title,
      date,
      content
    };
    
    try {
      if ('_index' in updatedBlog) {
        // 更新现有博客
        this.currentBlogs[updatedBlog._index] = {
          id: updatedBlog.id,
          title,
          date,
          content
        };
      } else {
        // 添加新博客
        this.currentBlogs.unshift({
          id: updatedBlog.id,
          title,
          date,
          content
        });
      }
      
      // 保存到存储
      if (this.isSupabaseConfigured) {
        await saveBlogToSupabase({
          id: updatedBlog.id,
          title,
          date,
          content
        });
      }
      saveBlogsToLocalStorage(this.currentBlogs);
      
      // 刷新列表
      await this.createBlogList();
      this.hideBlogEditor();
      this.showNotification('✅ 博客保存成功！');
    } catch (error) {
      console.error('Error saving blog:', error);
      this.showNotification('❌ 保存失败！');
    }
  }

  // 删除博客
  async deleteBlog() {
    if (!this.currentEditingBlog) {
      return;
    }
    
    // 使用自定义确认对话框
    const confirmed = await this.showConfirm('确定要删除这篇博客吗？');
    if (!confirmed) {
      return;
    }
    
    try {
      if ('_index' in this.currentEditingBlog) {
        // 从数组中删除
        this.currentBlogs.splice(this.currentEditingBlog._index, 1);
        
        // 从 Supabase 删除
        if (this.isSupabaseConfigured) {
          await deleteBlogFromSupabase(this.currentEditingBlog.id);
        }
        saveBlogsToLocalStorage(this.currentBlogs);
        
        // 刷新列表
        await this.createBlogList();
        this.hideBlogEditor();
        this.showNotification('✅ 博客已删除！');
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      this.showNotification('❌ 删除失败！');
    }
  }

  // 取消博客编辑
  cancelBlogEdit() {
    this.hideBlogEditor();
  }

  // 更新 openBlogModal 方法
  async openBlogModal() {
    try {
      this.closeAllModals();
      this.isBlogModalOpen = true;
      if (this.blogModal) {
        // 重新加载博客列表
        await this.createBlogList();
        this.blogModal.classList.remove('hidden');
        setTimeout(() => {
          this.blogModal.classList.add('visible');
        }, 10);
      }
    } catch (error) {
      console.error('Error opening blog modal:', error);
    }
  }
}
