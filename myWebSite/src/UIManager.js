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
import { refreshSkills } from './skillsManager.js';
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
  translateArray
} from './i18n.js';

// 留言板数据 - 使用数组存储从 Supabase 加载的数据
let guestbookMessages = [];

// LocalStorage 键名
const LOCAL_STORAGE_KEY = 'synthwave-guestbook-messages';
const VOLUME_STORAGE_KEY = 'synthwave-music-volume';
const DEFAULT_VOLUME = 0.5;

// 留言板默认只展示最近 4 条，其余折叠
const MESSAGE_COLLAPSE_LIMIT = 4;

// ===== 作品集上传 =====
const PORTFOLIO_TABLE = 'portfolio_items';
const PORTFOLIO_BUCKET = 'portfolio-files';
const PORTFOLIO_LOCAL_KEY = 'synthwave-portfolio-items';
const PORTFOLIO_MAX_FILE_SIZE = 120 * 1024 * 1024;
const PORTFOLIO_DB_NAME = 'synthwave-portfolio';
const PORTFOLIO_DB_STORE = 'files';
const PORTFOLIO_IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;
const PORTFOLIO_VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)$/i;
const PORTFOLIO_MODEL_EXT = /\.(glb|gltf|fbx|obj|stl|ply|usdz|blend)$/i;

// 判断上传文件属于图片 / 视频 / 3D 模型
function detectPortfolioKind(file) {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '');
  if (mime.startsWith('image/') || PORTFOLIO_IMAGE_EXT.test(name)) return 'image';
  if (mime.startsWith('video/') || PORTFOLIO_VIDEO_EXT.test(name)) return 'video';
  if (PORTFOLIO_MODEL_EXT.test(name)) return 'model';
  return null;
}

/* 作品集图片上传前压缩：最长边 2000px、WebP 0.85。
   GIF 交给 canvas 会丢掉动画帧，保持原文件。 */
const PORTFOLIO_MAX_EDGE = 2000;

function compressPortfolioImage(file) {
  if (!String(file?.type || '').startsWith('image/') && !PORTFOLIO_IMAGE_EXT.test(String(file?.name || ''))) {
    return Promise.resolve(file);
  }
  if (/\.gif$/i.test(file.name)) return Promise.resolve(file);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, PORTFOLIO_MAX_EDGE / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 1024 * 1024) {
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const name = `${file.name.replace(/\.[^.]+$/, '')}.${ext}`;
        resolve(new File([blob], name, { type: blob.type }));
      }, 'image/webp', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// 用户输入会拼进 innerHTML，统一转义，避免 XSS
function escapePortfolioHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// 只接受 http(s) 链接，并自动补全协议
function normalizePortfolioLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch (error) {
    return '';
  }
  return '';
}

function readPortfolioFromLocal() {
  try {
    const stored = JSON.parse(localStorage.getItem(PORTFOLIO_LOCAL_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error('读取本地作品集失败:', error);
    return [];
  }
}

function writePortfolioToLocal(items) {
  try {
    localStorage.setItem(PORTFOLIO_LOCAL_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('保存本地作品集失败:', error);
  }
}

/* 云端作品集的只读快照：启动时先用它渲染，再后台请求最新列表。
   与 PORTFOLIO_LOCAL_KEY 分开存，避免和本地 IndexedDB 模式的数据混在一起。 */
const PORTFOLIO_CLOUD_CACHE_KEY = 'synthwave-portfolio-cloud-cache';

function readPortfolioCloudCache() {
  try {
    const stored = JSON.parse(localStorage.getItem(PORTFOLIO_CLOUD_CACHE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function writePortfolioCloudCache(items) {
  try {
    localStorage.setItem(PORTFOLIO_CLOUD_CACHE_KEY, JSON.stringify(items));
  } catch (error) {
    /* 配额不足时忽略，不影响线上数据 */
  }
}

/* 未配置 Supabase 时，文件本身放在 IndexedDB（视频/3D 文件通常远超 localStorage 配额），
   元数据仍放 localStorage，刷新后可以重新拼回 blob URL。 */
function openPortfolioDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('当前浏览器不支持本地文件存储'));
      return;
    }
    const request = indexedDB.open(PORTFOLIO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PORTFOLIO_DB_STORE)) {
        db.createObjectStore(PORTFOLIO_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开本地文件库失败'));
  });
}

async function savePortfolioBlob(id, file) {
  const db = await openPortfolioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PORTFOLIO_DB_STORE, 'readwrite');
    transaction.objectStore(PORTFOLIO_DB_STORE).put(file, id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function getPortfolioBlob(id) {
  const db = await openPortfolioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PORTFOLIO_DB_STORE, 'readonly');
    const request = transaction.objectStore(PORTFOLIO_DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function deletePortfolioBlob(id) {
  const db = await openPortfolioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PORTFOLIO_DB_STORE, 'readwrite');
    transaction.objectStore(PORTFOLIO_DB_STORE).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}


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

    /* 主场景歌单优先读取 storage 的 MainSynthBGM 文件夹 */
    const mainBgm = window.musicService?.getMainBgmSongs?.() || [];
    if (mainBgm.length > 0) {
      console.log('UIManager: Loaded MainSynthBGM songs:', mainBgm.length);
      return mainBgm;
    }
    console.warn('UIManager: MainSynthBGM 为空或读取失败，回退 songs 表');
    
    if (window.musicService) {
      const songCount = window.musicService.getSongsCount();
      console.log('UIManager: Songs count from service:', songCount);
      
      if (songCount > 0) {
        const dbSongs = window.musicService.getAllSongs();
        console.log('UIManager: Raw songs from database:', dbSongs);
        
        const result = dbSongs.map(song => ({
          title: song.title,
          url: song.file_path,
          /* 歌单归属：数据库 playlist 列，缺省归入主歌单 */
          playlist: String(song.playlist || 'main').toLowerCase(),
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
      { title: '🎵 请上传音乐文件 1', url: '', playlist: 'main' },
      { title: '🎵 请上传音乐文件 2', url: '', playlist: 'main' },
      { title: '🎵 请上传音乐文件 3', url: '', playlist: 'main' },
      { title: '🎵 请上传音乐文件 4', url: '', playlist: 'main' },
      { title: '🎵 请上传音乐文件 5', url: '', playlist: 'main' }
    ];
  }

  /* 从 MusicService 重建歌单：主场景 / 游戏 / 当前激活 */
  applySongLibrary() {
    const allSongs = this.loadSongsFromService();
    const mainSongs = allSongs.filter(song => song.playlist !== 'game');
    const dbGameSongs = allSongs.filter(song => song.playlist === 'game');
    /* 游戏歌单优先读取 storage 的 GameSynthBGM 文件夹，未配置时回退到数据库 playlist = game */
    const bgmSongs = window.musicService?.getGameBgmSongs?.() || [];
    this.gameSongs = bgmSongs.length > 0 ? bgmSongs : dbGameSongs;
    this.songs = mainSongs.length > 0 ? mainSongs : allSongs;
    this.activeSongs = this.isGameMode ? this.gameSongs : this.songs;
    this.initPlaylist();
  }

  /* 远端歌单在后台加载完成后调用：
     UI 与点击事件已经先绑定好，这里只负责补齐歌曲，
     用户若在歌单到达前就点了播放，则拿到真实音源后自动接着播。 */
  syncMusicLibrary() {
    this.applySongLibrary();
    if (this.playlist.length > 0) {
      this.currentSongIndex = this.playlist.shift();
    }
    const hasPlayable = (this.activeSongs || []).some(song => song.url);
    if (hasPlayable && this.musicRequested && !this.isMusicPlaying) {
      this.playCurrentSong();
    }
  }

  constructor() {
    this.isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
    this.isLoadingMessages = false;
    this.isSubmitting = false;
    this.isSavingProfile = false;
    this.currentBlogPost = null; // 当前预览的博客
    // 作品集状态
    this.portfolioItems = [];
    this.portfolioInsertIndex = null;
    this.portfolioSelectedFile = null;
    this.portfolioPreviewUrl = '';
    this.portfolioBlobUrls = [];
    this.portfolioCloudReady = this.isSupabaseConfigured;
    this.isPortfolioSaving = false;

    try {
      this.initElements();
      this.initEventListeners();
      // 初始就按 isMusicUiVisible 同步一次，避免图标 🎛️ 与实际隐藏状态不一致
      this.syncMusicUiState();
      this.initConfirmDialog();
      this.createProjectCards();
      this.initGuestbook();
      this.initProfile();
      this.initAdminMode();
      this.initBlogs();
      this.initPortfolio();
      
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
    this.volumeBtn = document.getElementById('volume-btn');
    this.volumeIcon = document.getElementById('volume-icon');
    this.volumeSlider = document.getElementById('volume-slider');
    this.messagesExpanded = false;
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

    // 内容面板（SHEET 层）：底部抽屉，默认露出顶部 1/5
    this.contentSheet = document.getElementById('content-sheet');
    this.sheetPanel = document.querySelector('.sheet-panel');
    this.sheetScrim = document.getElementById('sheet-scrim');
    this.sheetScroll = document.getElementById('sheet-scroll');
    this.sheetNav = document.getElementById('sheet-nav');
    this.sheetNavBtns = document.querySelectorAll('.sheet-nav-btn');
    this.isSheetOpen = false;
    this.sheetProgress = 0;   // 0 = 只露 1/5，1 = 完全展开
    this.sheetTarget = 0;
    this.pendingSheetSection = null;
    this._sheetAnimRaf = null;
    
    this.isMusicPlaying = false;
    this.audio = null;
    this.currentSongIndex = 0;
    // 当前激活的歌单：默认歌单 / 游戏歌单
    this.isGameMode = false;
    this.musicRequested = false;
    this.playFailures = 0;
    this.songRequestId = 0;
    /* 播放器复用同一个 <audio>，播完事件只绑定一次，避免重复监听导致连续切歌 */
    if (window.musicVisualizer) {
      window.musicVisualizer.onEnded = () => this.playRandomNextSong();
    }
    this.isAudioInitialized = false;
    // 播放队列：确保一轮内完全不重复（每轮都是全新随机顺序）
    this.playlist = [];
    this.lastPlayedSongs = []; // 记录最近播放的歌曲索引
    // 优先使用云端数据库的歌曲，没有则使用默认歌曲
    this.applySongLibrary();
    // 第一次播放时从随机播放列表中取一首作为起始，而不是固定从 index=0 开始
    if (this.playlist.length > 0) {
      this.currentSongIndex = this.playlist.shift();
    }
    
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

    // 作品集上传相关元素
    this.portfolioGrid = document.getElementById('portfolio-grid');
    this.portfolioEmpty = document.getElementById('portfolio-empty');
    this.portfolioCount = document.getElementById('portfolio-count');
    this.portfolioUploadBtn = document.getElementById('portfolio-upload-btn');
    this.portfolioModal = document.getElementById('portfolio-upload-modal');
    this.closePortfolioModalBtn = document.getElementById('close-portfolio-modal');
    this.portfolioStepLabel = document.getElementById('portfolio-step-label');
    this.portfolioPositionStep = document.getElementById('portfolio-step-position');
    this.portfolioDetailsStep = document.getElementById('portfolio-step-details');
    this.portfolioPositionList = document.getElementById('portfolio-position-list');
    this.portfolioFileInput = document.getElementById('portfolio-file-input');
    this.portfolioFilePickerText = document.getElementById('portfolio-file-picker-text');
    this.portfolioFilePreview = document.getElementById('portfolio-file-preview');
    this.portfolioTitleInput = document.getElementById('portfolio-title-input');
    this.portfolioDescInput = document.getElementById('portfolio-desc-input');
    this.portfolioLinkInput = document.getElementById('portfolio-link-input');
    this.portfolioUploadStatus = document.getElementById('portfolio-upload-status');
    this.portfolioBackBtn = document.getElementById('portfolio-back-btn');
    this.portfolioSaveBtn = document.getElementById('portfolio-save-btn');
    
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
      this.worksBtn.addEventListener('click', () => this.openWorksSheet());
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
    // 回到顶部：收起内容面板，回到 3D 场景（按钮显隐由 body.sheet-open 控制）
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => this.closeContentSheet());
    }
    if (this.audioFileInput) {
      this.audioFileInput.addEventListener('change', (e) => this.handleAudioFileSelect(e));
    }
    this.initVolumeControl();
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
        if (this.isSheetOpen) {
          this.closeContentSheet();
        }
        this.closeAllModals();
      }
    });

    // 内容面板（SHEET）事件
    if (this.sheetNav) {
      this.sheetNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.sheet-nav-btn');
        if (btn && btn.dataset.section) {
          this.openContentSheet(btn.dataset.section);
        }
      });
    }
    const enterGalleryBtn = document.getElementById('enter-gallery-btn');
    if (enterGalleryBtn) {
      enterGalleryBtn.addEventListener('click', () => {
        this.closeContentSheet();
        setTimeout(() => {
          if (window.toggleGalleryMode && !window.isGalleryModeActive?.()) {
            window.toggleGalleryMode();
          }
        }, 260);
      });
    }
    this.initSheetScrollSpy();
    this.initSheetReveal();
    this.initSheetDrawer();
    this.initScrollReveal();
    
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

    // 作品集上传事件
    if (this.portfolioUploadBtn) {
      this.portfolioUploadBtn.addEventListener('click', () => this.openPortfolioUploadModal());
    }
    if (this.closePortfolioModalBtn) {
      this.closePortfolioModalBtn.addEventListener('click', () => this.closePortfolioUploadModal());
    }
    if (this.portfolioModal) {
      this.portfolioModal.addEventListener('click', (e) => {
        if (e.target === this.portfolioModal) this.closePortfolioUploadModal();
      });
    }
    if (this.portfolioFileInput) {
      this.portfolioFileInput.addEventListener('change', (e) => this.handlePortfolioFileSelect(e));
    }
    if (this.portfolioBackBtn) {
      this.portfolioBackBtn.addEventListener('click', () => this.showPortfolioStep('position'));
    }
    if (this.portfolioSaveBtn) {
      this.portfolioSaveBtn.addEventListener('click', () => this.handlePortfolioSave());
    }
    if (this.portfolioGrid) {
      this.portfolioGrid.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.portfolio-delete-btn');
        if (deleteBtn) {
          e.preventDefault();
          this.deletePortfolioItem(deleteBtn.dataset.id);
        }
      });
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
      // 翻译缓存按语言分 key，切换语言时无需清空（切回旧语言可秒开）。
      // 清空反而会让每次切换都重新请求翻译接口，容易触发限流。
      
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
      this.updateSheetTexts();
      
      // 更新模态框加载文本
      this.updateModalLoadingTexts();
      
      // 重新翻译数据库内容
      await this.renderProfile();
      
      // 博客列表在内容面板里常驻，无论面板是否“打开”都要重绘，
      // 否则切语言后小框标题仍停留在上一个语言
      await this.createBlogList();
      
      // 如果有正在预览的博客，也重新翻译
      const activeBlogItem = document.querySelector('#sheet-blog .blog-item.active');
      if (this.currentBlogPost) {
        await this.renderBlogPost(this.currentBlogPost, null, { keepActive: Boolean(activeBlogItem) });
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
    // 顶部标题固定为 "WELCOME"，不参与翻译
    
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
    const aboutTitle = document.querySelector('#sheet-about .modal-title');
    const bioLabel = document.querySelector('#sheet-about .bio-label');
    const editBtn = document.querySelector('#sheet-about .edit-bio-btn .edit-text');
    const saveBtn = document.querySelector('#sheet-about .save-bio-btn .save-text');
    const cancelBtn = document.querySelector('#sheet-about .cancel-bio-btn .cancel-text');
    const changeAvatarBtn = document.querySelector('#sheet-about .change-avatar-text');
    const skillsLabel = document.querySelector('#sheet-about .skills-label');
    const closeFooter = document.querySelector('#sheet-about .close-footer-text');
    
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
    const guestbookTitle = document.querySelector('#sheet-guestbook .modal-title');
    const storageStatusText = document.querySelector('#sheet-guestbook .storage-status-text');
    const refreshText = document.querySelector('#sheet-guestbook .refresh-text');
    const leaveMessageLabel = document.querySelector('#sheet-guestbook .leave-message-label');
    const nameInput = document.getElementById('guest-name');
    const tagInput = document.getElementById('guest-tag');
    const messageInput = document.querySelector('#sheet-guestbook .message-input');
    const sendText = document.querySelector('#sheet-guestbook .send-text');
    const noMessages = document.querySelector('#sheet-guestbook .no-messages');
    const historyLabel = document.querySelector('#sheet-guestbook .history-label');
    const loadingIndicator = document.querySelector('#sheet-guestbook .loading-indicator-text');
    const closeFooter = document.querySelector('#sheet-guestbook .close-guestbook-footer-text');
    
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
    const blogTitle = document.querySelector('#sheet-blog .modal-title');
    const articleListLabel = document.querySelector('#sheet-blog .article-list-label');
    const selectArticleHint = document.querySelector('#sheet-blog .select-article-hint');
    const addBlogBtn = document.querySelector('#sheet-blog .add-blog-text');
    const deleteBlogBtn = document.querySelector('#sheet-blog .delete-blog-text');
    const saveBlogBtn = document.querySelector('#sheet-blog .save-blog-text');
    const cancelBlogBtn = document.querySelector('#sheet-blog .cancel-blog-text');
    const titleInput = document.getElementById('blog-title-input');
    const dateInput = document.getElementById('blog-date-input');
    const contentTextarea = document.getElementById('blog-content-textarea');
    const closeFooter = document.querySelector('#sheet-blog .close-blog-footer-text');
    
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
    } else {
      this.storageStatus.classList.add('offline');
    }
    // 使用翻译函数更新文本
    this.updateStorageStatusTexts();
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
            <div class="crt-screen">
              <img src="${project.image}" alt="${project.title}">
              <span class="crt-scanlines" aria-hidden="true"></span>
            </div>
            <span class="crt-glass" aria-hidden="true"></span>
            <span class="crt-vignette" aria-hidden="true"></span>
            <span class="crt-bezel" aria-hidden="true"></span>
          </div>
          <div class="project-card-content">
            <h3 class="project-card-title">${project.title}</h3>
            <div class="project-card-tags">
              ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          this.closeContentSheet();
          setTimeout(() => {
            if (window.toggleGalleryMode && !window.isGalleryModeActive?.()) {
              window.toggleGalleryMode();
            }
          }, 260);
        });
        this.projectCardsContainer.appendChild(card);
      });
    } catch (error) {
      console.error('Error creating project cards:', error);
    }
  }

  // ========== 作品集上传 ==========

  async initPortfolio() {
    // 有云端快照时先秒开，再请求最新列表
    if (this.isSupabaseConfigured) {
      const cached = readPortfolioCloudCache();
      if (cached.length > 0) {
        this.portfolioItems = cached;
        this.portfolioCloudReady = true;
        await this.renderPortfolio();
      }
    }
    await this.loadPortfolio();
    await this.renderPortfolio();
  }

  async loadPortfolio() {
    if (this.isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from(PORTFOLIO_TABLE)
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        this.portfolioItems = data || [];
        this.portfolioCloudReady = true;
        writePortfolioCloudCache(this.portfolioItems);
        return;
      } catch (error) {
        console.error('从 Supabase 加载作品集失败，已切换为本地存储:', error);
        this.portfolioCloudReady = false;
      }
    }
    this.portfolioItems = readPortfolioFromLocal();
  }

  revokePortfolioBlobUrls() {
    this.portfolioBlobUrls.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (error) { /* ignore */ }
    });
    this.portfolioBlobUrls = [];
  }

  async renderPortfolio() {
    if (!this.portfolioGrid) return;
    this.revokePortfolioBlobUrls();
    this.portfolioGrid.innerHTML = '';

    const items = this.portfolioItems || [];
    if (this.portfolioEmpty) {
      this.portfolioEmpty.classList.toggle('hidden', items.length > 0);
    }
    if (this.portfolioCount) {
      this.portfolioCount.textContent = items.length ? `共 ${items.length} 件作品` : '';
    }

    for (const item of items) {
      let mediaUrl = item.file_url || '';
      if (item.local && !mediaUrl) {
        try {
          const blob = await getPortfolioBlob(item.id);
          if (blob) {
            mediaUrl = URL.createObjectURL(blob);
            this.portfolioBlobUrls.push(mediaUrl);
          }
        } catch (error) {
          console.error('读取本地作品文件失败:', error);
        }
      }
      this.portfolioGrid.appendChild(this.createPortfolioCard(item, mediaUrl));
    }
  }

  createPortfolioCard(item, mediaUrl) {
    const kind = item.file_type || 'image';
    const title = item.title || '未命名作品';
    const description = item.description || '';
    const link = normalizePortfolioLink(item.link);
    const fileName = item.file_name || '';
    const extension = (fileName.split('.').pop() || kind).toUpperCase();
    const mediaHtml = this.buildPortfolioMediaHtml(kind, mediaUrl, title, extension);
    const typeLabel = kind === 'image' ? '照片' : kind === 'video' ? '视频' : '3D 模型';
    const linkHtml = link
      ? `<a class="portfolio-card-link" href="${escapePortfolioHtml(link)}" target="_blank" rel="noopener noreferrer">🔗 作品链接</a>`
      : '';
    const fileHtml = mediaUrl
      ? `<a class="portfolio-card-file" href="${escapePortfolioHtml(mediaUrl)}" target="_blank" rel="noopener noreferrer"${kind === 'model' ? ' download' : ''}>${kind === 'model' ? '⬇️ 下载模型' : '↗ 打开原文件'}</a>`
      : '';

    const card = document.createElement('article');
    card.className = 'portfolio-card';
    card.dataset.id = String(item.id);
    card.innerHTML = `
      <div class="portfolio-card-media">${mediaHtml}</div>
      <div class="portfolio-card-body">
        <div class="portfolio-card-meta">
          <span class="portfolio-type-badge" data-kind="${escapePortfolioHtml(kind)}">${typeLabel}</span>
        </div>
        <h3 class="portfolio-card-title">${escapePortfolioHtml(title)}</h3>
        ${description ? `<p class="portfolio-card-desc">${escapePortfolioHtml(description)}</p>` : ''}
        <div class="portfolio-card-actions">
          ${linkHtml}
          ${fileHtml}
          <button class="portfolio-delete-btn admin-only" data-id="${escapePortfolioHtml(String(item.id))}" type="button">🗑️ 删除</button>
        </div>
      </div>
    `;
    return card;
  }

  buildPortfolioMediaHtml(kind, mediaUrl, title, extension) {
    if (!mediaUrl) {
      return `<div class="portfolio-model-preview"><span class="portfolio-model-ext">${escapePortfolioHtml(extension)}</span><span class="portfolio-model-label">文件不可用</span></div>`;
    }
    if (kind === 'video') {
      return `<video src="${escapePortfolioHtml(mediaUrl)}" controls preload="metadata" playsinline></video>`;
    }
    if (kind === 'model') {
      return `
        <div class="portfolio-model-preview">
          <span class="portfolio-model-ext">${escapePortfolioHtml(extension)}</span>
          <span class="portfolio-model-label">3D MODEL</span>
        </div>
      `;
    }
    return `<img src="${escapePortfolioHtml(mediaUrl)}" alt="${escapePortfolioHtml(title)}" loading="lazy">`;
  }

  openPortfolioUploadModal() {
    if (!document.body.classList.contains('admin-mode')) {
      this.showNotification('请先进入管理模式');
      return;
    }
    this.resetPortfolioUploadForm();
    this.renderPortfolioPositions();
    this.showPortfolioStep('position');
    this.portfolioModal?.classList.remove('hidden');
  }

  closePortfolioUploadModal() {
    if (!this.portfolioModal) return;
    this.portfolioModal.classList.add('hidden');
    this.portfolioModal.classList.remove('visible');
    this.resetPortfolioUploadForm();
  }

  resetPortfolioUploadForm() {
    this.portfolioInsertIndex = null;
    this.portfolioSelectedFile = null;
    if (this.portfolioPreviewUrl) {
      try { URL.revokeObjectURL(this.portfolioPreviewUrl); } catch (error) { /* ignore */ }
      this.portfolioPreviewUrl = '';
    }
    if (this.portfolioFileInput) this.portfolioFileInput.value = '';
    if (this.portfolioFilePickerText) {
      this.portfolioFilePickerText.textContent = '📁 选择文件（图片 / 视频 / 3D 模型）';
    }
    if (this.portfolioFilePreview) {
      this.portfolioFilePreview.innerHTML = '';
      this.portfolioFilePreview.classList.add('hidden');
    }
    if (this.portfolioTitleInput) this.portfolioTitleInput.value = '';
    if (this.portfolioDescInput) this.portfolioDescInput.value = '';
    if (this.portfolioLinkInput) this.portfolioLinkInput.value = '';
    this.setPortfolioStatus('', 'info');
  }

  showPortfolioStep(step) {
    const isPosition = step === 'position';
    this.portfolioPositionStep?.classList.toggle('hidden', !isPosition);
    this.portfolioDetailsStep?.classList.toggle('hidden', isPosition);
    if (this.portfolioStepLabel) {
      if (isPosition) {
        const total = (this.portfolioItems || []).length;
        this.portfolioStepLabel.textContent = `STEP 1 / 2 · 选择插入位置（当前 ${total} 个作品）`;
      } else {
        const index = this.portfolioInsertIndex ?? 0;
        this.portfolioStepLabel.textContent = `STEP 2 / 2 · 将插入到第 ${index + 1} 位`;
      }
    }
  }

  renderPortfolioPositions() {
    const list = this.portfolioPositionList;
    if (!list) return;
    list.innerHTML = '';

    const items = this.portfolioItems || [];
    const total = items.length;
    const options = [];

    if (total === 0) {
      options.push({ index: 0, label: '第 1 个作品', hint: '作品集为空，新作品会排在第一位' });
    } else {
      options.push({
        index: 0,
        label: '放在最前',
        hint: `位于「${items[0].title || '未命名作品'}」之前`
      });
      for (let i = 1; i < total; i += 1) {
        options.push({
          index: i,
          label: `第 ${i + 1} 位`,
          hint: `「${items[i - 1].title || '未命名作品'}」之后、「${items[i].title || '未命名作品'}」之前`
        });
      }
      options.push({
        index: total,
        label: '放在最后',
        hint: `位于「${items[total - 1].title || '未命名作品'}」之后`
      });
    }

    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'portfolio-position-option';
      button.innerHTML = `
        <span class="portfolio-position-index">${option.index + 1}</span>
        <span class="portfolio-position-text">
          <strong>${escapePortfolioHtml(option.label)}</strong>
          <small>${escapePortfolioHtml(option.hint)}</small>
        </span>
      `;
      button.addEventListener('click', () => {
        this.portfolioInsertIndex = option.index;
        this.showPortfolioStep('details');
      });
      list.appendChild(button);
    });
  }

  handlePortfolioFileSelect(event) {
    const file = event.target.files?.[0];
    this.portfolioSelectedFile = null;
    if (this.portfolioPreviewUrl) {
      try { URL.revokeObjectURL(this.portfolioPreviewUrl); } catch (error) { /* ignore */ }
      this.portfolioPreviewUrl = '';
    }
    if (this.portfolioFilePreview) {
      this.portfolioFilePreview.innerHTML = '';
      this.portfolioFilePreview.classList.add('hidden');
    }
    if (!file) return;

    const kind = detectPortfolioKind(file);
    if (!kind) {
      this.setPortfolioStatus('❌ 不支持的文件类型，请选择图片、视频或 3D 模型文件', 'error');
      if (this.portfolioFileInput) this.portfolioFileInput.value = '';
      return;
    }
    if (file.size > PORTFOLIO_MAX_FILE_SIZE) {
      this.setPortfolioStatus('❌ 文件超过 120MB，请压缩后再上传', 'error');
      if (this.portfolioFileInput) this.portfolioFileInput.value = '';
      return;
    }

    this.portfolioSelectedFile = file;
    this.setPortfolioStatus('', 'info');
    if (this.portfolioFilePickerText) {
      this.portfolioFilePickerText.textContent = `📄 ${file.name}`;
    }
    if (this.portfolioTitleInput && !this.portfolioTitleInput.value.trim()) {
      this.portfolioTitleInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
    }

    const extension = (file.name.split('.').pop() || kind).toUpperCase();
    const sizeMb = (file.size / (1024 * 1024)).toFixed(file.size < 1024 * 1024 ? 2 : 1);
    this.portfolioPreviewUrl = URL.createObjectURL(file);

    if (this.portfolioFilePreview) {
      this.portfolioFilePreview.classList.remove('hidden');
      if (kind === 'image') {
        this.portfolioFilePreview.innerHTML = `<img src="${this.portfolioPreviewUrl}" alt="预览">`;
      } else if (kind === 'video') {
        this.portfolioFilePreview.innerHTML = `<video src="${this.portfolioPreviewUrl}" controls muted playsinline></video>`;
      } else {
        this.portfolioFilePreview.innerHTML = `
          <div class="portfolio-model-preview">
            <span class="portfolio-model-ext">${escapePortfolioHtml(extension)}</span>
            <span class="portfolio-model-label">${escapePortfolioHtml(`${sizeMb} MB · 上传后将显示为 3D 模型卡片`)}</span>
          </div>
        `;
      }
    }
  }

  setPortfolioStatus(text, type = 'info') {
    if (!this.portfolioUploadStatus) return;
    if (!text) {
      this.portfolioUploadStatus.textContent = '';
      this.portfolioUploadStatus.classList.add('hidden');
      return;
    }
    this.portfolioUploadStatus.classList.remove('hidden');
    this.portfolioUploadStatus.textContent = text;
    this.portfolioUploadStatus.dataset.type = type;
  }

  async handlePortfolioSave() {
    if (this.isPortfolioSaving) return;
    const file = this.portfolioSelectedFile;
    if (!file) {
      this.setPortfolioStatus('❌ 请先选择要上传的文件', 'error');
      return;
    }
    if (this.portfolioInsertIndex === null) {
      this.setPortfolioStatus('❌ 请先选择插入位置', 'error');
      return;
    }

    const kind = detectPortfolioKind(file);
    if (!kind) {
      this.setPortfolioStatus('❌ 不支持的文件类型', 'error');
      return;
    }

    const rawLink = this.portfolioLinkInput?.value || '';
    const link = normalizePortfolioLink(rawLink);
    if (rawLink.trim() && !link) {
      this.setPortfolioStatus('❌ 链接格式不正确，请填写 http:// 或 https:// 开头的地址', 'error');
      return;
    }

    const title = (this.portfolioTitleInput?.value || '').trim().slice(0, 80)
      || file.name.replace(/\.[^.]+$/, '').slice(0, 80)
      || '未命名作品';
    const description = (this.portfolioDescInput?.value || '').trim().slice(0, 500);

    this.isPortfolioSaving = true;
    if (this.portfolioSaveBtn) this.portfolioSaveBtn.disabled = true;

    try {
      // 图片先压缩再上传，避免把手机原图整张传上去
      let uploadFile = file;
      if (kind === 'image') {
        this.setPortfolioStatus('⏳ 正在压缩图片...', 'info');
        uploadFile = await compressPortfolioImage(file);
      }

      this.setPortfolioStatus('⏳ 正在上传，请稍候...', 'info');
      const item = await this.createPortfolioItem(uploadFile, kind, { title, description, link });
      const insertIndex = this.portfolioInsertIndex;
      this.portfolioItems.splice(insertIndex, 0, item);
      if (item.local) {
        writePortfolioToLocal(this.portfolioItems);
      }
      await this.renderPortfolio();
      this.closePortfolioUploadModal();
      this.showNotification(item.local ? '✅ 作品已保存到本机（云端未配置）' : '✅ 作品上传成功');
    } catch (error) {
      console.error('上传作品失败:', error);
      this.setPortfolioStatus(`❌ 上传失败：${error.message || '未知错误'}`, 'error');
    } finally {
      this.isPortfolioSaving = false;
      if (this.portfolioSaveBtn) this.portfolioSaveBtn.disabled = false;
    }
  }

  async createPortfolioItem(file, kind, meta) {
    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const index = this.portfolioInsertIndex ?? 0;

    if (this.portfolioCloudReady) {
      const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-60);
      const path = `portfolio/${now}-${random}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(path, file, { cacheControl: '31536000', upsert: false });
      if (uploadError) {
        throw new Error(`文件上传失败：${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path);

      // 把插入点之后的条目统一后移一位，给新作品腾出位置
      const shifted = (this.portfolioItems || []).slice(index);
      await Promise.all(shifted.map((entry, offset) => {
        const nextPosition = Number(entry.position ?? (index + offset)) + 1;
        return supabase.from(PORTFOLIO_TABLE).update({ position: nextPosition }).eq('id', entry.id);
      }));

      const { data, error } = await supabase
        .from(PORTFOLIO_TABLE)
        .insert([{
          title: meta.title,
          description: meta.description,
          link: meta.link || null,
          file_type: kind,
          file_url: urlData.publicUrl,
          storage_path: path,
          position: index
        }])
        .select()
        .single();

      if (error) {
        await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
        throw new Error(`保存作品信息失败：${error.message}`);
      }
      return data;
    }

    // 本地模式：文件进 IndexedDB，元数据进 localStorage
    const id = `local-${now}-${random}`;
    await savePortfolioBlob(id, file);
    return {
      id,
      title: meta.title,
      description: meta.description,
      link: meta.link || '',
      file_type: kind,
      file_url: '',
      storage_path: '',
      position: index,
      file_name: file.name,
      local: true,
      created_at: new Date().toISOString()
    };
  }

  async deletePortfolioItem(id) {
    if (!document.body.classList.contains('admin-mode')) return;
    const item = (this.portfolioItems || []).find((entry) => String(entry.id) === String(id));
    if (!item) return;
    if (!window.confirm(`确定删除作品「${item.title || '未命名作品'}」？`)) return;

    try {
      if (item.local || !this.portfolioCloudReady) {
        await deletePortfolioBlob(item.id);
        this.portfolioItems = this.portfolioItems.filter((entry) => String(entry.id) !== String(id));
        writePortfolioToLocal(this.portfolioItems);
      } else {
        if (item.storage_path) {
          await supabase.storage.from(PORTFOLIO_BUCKET).remove([item.storage_path]);
        }
        const { error } = await supabase.from(PORTFOLIO_TABLE).delete().eq('id', item.id);
        if (error) throw error;
        this.portfolioItems = this.portfolioItems.filter((entry) => String(entry.id) !== String(id));
      }
      await this.renderPortfolio();
      this.showNotification('🗑️ 已删除作品');
    } catch (error) {
      console.error('删除作品失败:', error);
      this.showNotification(`删除失败：${error.message || '未知错误'}`);
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
      // 先渲染上次缓存的留言，云端结果回来后再覆盖，避免进页面时留言区空白
      const cached = loadMessagesFromLocalStorage();
      if (cached.length > 0) {
        guestbookMessages = cached;
        this.renderMessages(cached);
      }
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
      // 写入本地缓存，下次启动可先秒开
      saveMessagesToLocalStorage(guestbookMessages);
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

  async renderBlogPost(post, e, options = {}) {
    if (!this.blogPreviewContainer) return;
    
    try {
      const allItems = document.querySelectorAll('.blog-item');
      allItems.forEach(el => el.classList.remove('active'));
      if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
      } else if (options.keepActive && this.blogListContainer) {
        // 语言切换重绘列表后，把选中态还给对应文章
        const index = this.currentBlogs.findIndex(
          blog => String(blog.id) === String(post.id)
        );
        const item = index >= 0
          ? this.blogListContainer.querySelectorAll('.blog-item')[index]
          : null;
        if (item) item.classList.add('active');
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

      // 超过 4 条时折叠，只保留最近 4 条，点击按钮展开/收起
      const items = Array.from(this.messagesContainer.querySelectorAll('.message-item'));
      if (items.length > MESSAGE_COLLAPSE_LIMIT) {
        const hiddenCount = items.length - MESSAGE_COLLAPSE_LIMIT;
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'messages-toggle-btn';

        const applyCollapseState = () => {
          items.forEach((item, index) => {
            item.classList.toggle(
              'message-collapsed',
              !this.messagesExpanded && index >= MESSAGE_COLLAPSE_LIMIT
            );
          });
          toggleBtn.textContent = this.messagesExpanded
            ? t('show-less-messages')
            : `${t('show-more-messages')} (+${hiddenCount})`;
        };

        toggleBtn.addEventListener('click', () => {
          this.messagesExpanded = !this.messagesExpanded;
          applyCollapseState();
        });

        applyCollapseState();
        this.messagesContainer.appendChild(toggleBtn);
      }
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
    refreshSkills();
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

  // 按 isMusicUiVisible 同步音乐控件的 DOM 表现（初始化与归位时统一调用）
  syncMusicUiState() {
    this.musicControlElements.forEach(el => {
      el.classList.toggle('hidden', !this.isMusicUiVisible);
    });

    // 隐藏时显示红点提示，显示时隐藏红点
    if (this.notificationDot) {
      this.notificationDot.classList.toggle('hidden', this.isMusicUiVisible);
    }

    if (this.toggleUiIcon) {
      this.toggleUiIcon.textContent = this.isMusicUiVisible ? '🎛️' : '🔇';
    }

    if (this.toggleUiBtn) {
      /* 与语言按钮统一为透明圆形按钮，这里只区分隐藏状态的暗淡效果 */
      this.toggleUiBtn.style.opacity = this.isMusicUiVisible ? '' : '0.5';
    }
  }

  // 切换音乐相关控制元素的显示/隐藏
  toggleMusicUI() {
    this.isMusicUiVisible = !this.isMusicUiVisible;
    this.syncMusicUiState();
    console.log('音乐 UI 显示状态:', this.isMusicUiVisible ? '显示' : '隐藏');
  }

  // 回到 3D 场景时复位为收起状态：
  // 面板打开期间音乐控件被遮住但状态可能仍是「显示」，
  // 不复位的话用户点一下 toggle 反而会变成隐藏，表现为「点了没出现」。
  resetMusicUiOnScene() {
    if (!this.isMusicUiVisible) return;
    this.isMusicUiVisible = false;
    this.syncMusicUiState();
  }

  // 隐藏正在播放
  hideNowPlaying() {
    if (this.nowPlayingEl) {
      this.nowPlayingEl.classList.remove('visible');
      this.nowPlayingEl.classList.add('hidden');
    }
  }

  // 初始化播放队列（Fisher-Yates 洗牌算法 + crypto 随机种子）
  initPlaylist() {
    this.playlist = [];
    const list = this.activeSongs || this.songs;
    for (let i = 0; i < list.length; i++) {
      this.playlist.push(i);
    }
    // 使用 crypto.getRandomValues 增强随机性，防止 Math.random 规律性导致固定首曲
    const random = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0] / (0xFFFFFFFF + 1);
      }
      return Math.random();
    };
    // Fisher-Yates 洗牌
    for (let i = this.playlist.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
    this.lastPlayedSongs = [];
  }

  // 获取下一首歌曲索引（播放列表空了立即重新洗牌，确保每轮完全不重复）
  getNextSongIndex() {
    // 播放列表为空 → 立即重新生成全新随机顺序
    if (this.playlist.length === 0) {
      this.initPlaylist();
    }

    // 从队列中取出一首
    const songIndex = this.playlist.shift();

    // 记录最近播放的歌曲（最多保留 4 首）
    this.lastPlayedSongs.push(songIndex);
    if (this.lastPlayedSongs.length > 4) {
      this.lastPlayedSongs.shift();
    }

    return songIndex;
  }

  // 音量控制：读取上次设置，滑动实时生效，点击喇叭静音/恢复
  initVolumeControl() {
    if (!this.volumeSlider || !this.volumeBtn) return;

    const saved = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
    this.volume = Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_VOLUME;
    this.lastVolume = this.volume > 0 ? this.volume : DEFAULT_VOLUME;
    this.volumeSlider.value = String(Math.round(this.volume * 100));

    this.volumeSlider.addEventListener('input', () => {
      this.volume = Number(this.volumeSlider.value) / 100;
      if (this.volume > 0) this.lastVolume = this.volume;
      localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
      this.applyVolume();
    });

    this.volumeBtn.addEventListener('click', () => this.toggleMute());

    this.applyVolume();
  }

  // 同步音量到可视化播放器与降级播放器，并更新图标
  applyVolume() {
    const volume = this.volume ?? DEFAULT_VOLUME;

    if (this.audio) {
      this.audio.volume = volume;
    }
    if (window.musicVisualizer && window.musicVisualizer.audioElement) {
      window.musicVisualizer.audioElement.volume = volume;
    }

    if (this.volumeIcon) {
      this.volumeIcon.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
    }
    if (this.volumeBtn) {
      this.volumeBtn.classList.toggle('is-muted', volume === 0);
    }
  }

  toggleMute() {
    if (!this.volumeSlider) return;

    this.volume = this.volume > 0 ? 0 : (this.lastVolume || DEFAULT_VOLUME);
    this.volumeSlider.value = String(Math.round(this.volume * 100));
    localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
    this.applyVolume();
  }

  // 统一维护播放/暂停的按钮状态，避免各处重复代码
  setMusicPlayingState(isPlaying) {
    this.isMusicPlaying = isPlaying;
    if (this.musicIcon) {
      this.musicIcon.textContent = isPlaying ? '⏸' : '▶';
    }
    if (this.musicBtn) {
      this.musicBtn.classList.toggle('is-primary', !isPlaying);
      this.musicBtn.classList.toggle('is-success', isPlaying);
    }
    if (window.setColorChanging) {
      window.setColorChanging(isPlaying);
    }
  }

  // 初始化音频播放器
  initAudioPlayer() {
    if (this.isAudioInitialized) return;
    
    this.audio = new Audio();
    // 默认不预下载整首，点播时再切 auto
    this.audio.preload = 'metadata';
    this.audio.volume = this.volume ?? DEFAULT_VOLUME;
    
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
    const list = this.activeSongs || this.songs
    if (!list || list.length === 0) return
    this.currentSongIndex = this.getNextSongIndex()
    this.playCurrentSong()
  }

  // 游戏开始自动播放：切换到 GameBGM 歌单随机选一首，之后继续随机循环
  playGameMusic() {
    const list = this.gameSongs || []
    /* 没有配置游戏歌单时不打断当前音乐 */
    if (list.length === 0) return
    /* 已经在播游戏歌单时不用重启当前歌曲 */
    if (this.activeSongs === list && this.isMusicPlaying) return
    this.isGameMode = true
    this.activeSongs = list
    this.initPlaylist()
    this.currentSongIndex = this.getNextSongIndex()
    this.playCurrentSong()
  }

  // 退出游戏后切回默认歌单；正在播游戏曲目时立刻换成主歌单
  restoreDefaultPlaylist() {
    this.isGameMode = false
    if (this.activeSongs === this.songs) return
    const wasPlaying = this.isMusicPlaying
    this.activeSongs = this.songs
    this.initPlaylist()
    if (!wasPlaying || this.songs.length === 0) return
    this.currentSongIndex = this.getNextSongIndex()
    this.playCurrentSong()
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
    const list = this.activeSongs || this.songs;
    const currentSong = list[this.currentSongIndex];
    console.log('UIManager: playCurrentSong called, song:', currentSong);

    if (!currentSong) {
      console.warn('UIManager: 当前歌单没有可播放的歌曲');
      return;
    }

    /* 每次播放请求递增编号：新一轮请求会让旧的加载/播放回调自动作废 */
    const requestId = (this.songRequestId = (this.songRequestId || 0) + 1);
    
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
        
        const loaded = await window.musicVisualizer.loadAudio(cleanUrl);
        if (loaded === false || requestId !== this.songRequestId) return;
        this.applyVolume();
        await window.musicVisualizer.play();
        if (requestId !== this.songRequestId) return;
        
        this.showNowPlaying(currentSong.title);
        this.isMusicPlaying = true;
        this.playFailures = 0;
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
        this.audio.preload = 'auto';
        this.audio.src = cleanUrl;
        
        await this.audio.play();
        
        this.showNowPlaying(currentSong.title);
        this.isMusicPlaying = true;
        this.playFailures = 0;
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
      /* 已经被更新的播放请求取代时直接忽略，避免重复切歌 */
      if (requestId !== this.songRequestId) return;
      console.error('UIManager: 播放失败:', error);
      const errorMessage = error.message || '加载失败';
      this.showNowPlaying(`${currentSong.title} - ${errorMessage}`);

      this.playFailures += 1;
      /* 连续失败过多时停下，避免把整张歌单无限跳完还一直消耗流量 */
      if (this.playFailures >= 3) {
        this.playFailures = 0;
        this.isMusicPlaying = false;
        this.showNowPlaying('音乐加载失败，请检查网络或上传本地音乐');
        return;
      }

      // 自动尝试下一首歌曲
      console.log('UIManager: 自动尝试下一首歌曲');
      window.setTimeout(() => {
        this.playRandomNextSong();
      }, 1500);
    }
  }

  /* 移动端关键：iOS/Android 只允许在用户手势的调用栈里启动播放。
     先用一段静音 WAV 把 <audio> 解锁，之后再换正式音源就不会被拦截。 */
  unlockAudio() {
    if (this._unlockPromise) return this._unlockPromise;

    const visualizer = window.musicVisualizer;
    const audio = visualizer?.audioElement;
    const context = visualizer?.audioContext;
    if (context && context.state === 'suspended') {
      const resume = context.resume();
      if (resume && typeof resume.catch === 'function') resume.catch(() => {});
    }
    if (!audio) return (this._unlockPromise = Promise.resolve());

    /* 已经加载过正式音源，说明该元素已被解锁过 */
    if (audio.src && !audio.src.startsWith('data:audio/wav')) {
      return (this._unlockPromise = Promise.resolve());
    }

    const silent =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    this._unlockPromise = new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio.removeEventListener('playing', finish);
        /* 只有仍是静音源时才清理，避免把随后加载的正式音源清掉 */
        if (audio.src.startsWith('data:audio/wav')) {
          audio.pause();
          audio.removeAttribute('src');
        }
        resolve();
      };
      audio.addEventListener('playing', finish);
      audio.src = silent;
      const promise = audio.play();
      if (promise && typeof promise.then === 'function') {
        promise.then(finish).catch(finish);
      } else {
        finish();
      }
      window.setTimeout(finish, 400);
    });
    return this._unlockPromise;
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
        // 播放：若已有加载好的音源且播放过，原地继续，而不是从头开始
        console.log('Playing music');
        /* 记录用户意图：歌单可能还在后台加载，到达后由 syncMusicLibrary 接着播 */
        this.musicRequested = true;

        const start = () => {
          const visualizerAudio = window.musicVisualizer && window.musicVisualizer.audioElement;
          const canResumeVisualizer = !!(visualizerAudio && visualizerAudio.src && visualizerAudio.currentTime > 0);
          const canResumeFallback = !window.musicVisualizer && !!(this.audio && this.audio.src && this.audio.currentTime > 0);

          if (canResumeVisualizer) {
            console.log('Resuming current playback');
            window.musicVisualizer.play().then(() => {
              this.setMusicPlayingState(true);
            }).catch((e) => {
              console.error('继续播放失败:', e);
              this.playCurrentSong();
            });
          } else if (canResumeFallback) {
            console.log('Resuming fallback playback');
            this.audio.play().then(() => {
              this.setMusicPlayingState(true);
            }).catch((e) => {
              console.error('继续播放失败:', e);
              this.playCurrentSong();
            });
          } else {
            // 还没有音源，播放当前选择的歌曲
            this.playCurrentSong();
          }
        };

        /* 第一次播放必须在用户手势内解锁 <audio>，否则移动端会点了没反应 */
        this.unlockAudio().then(start);
      }
    } catch (error) {
      console.error('Error toggling music:', error);
    }
  }

  handleNextSong() {
    try {
      console.log('handleNextSong called');
      console.log('Songs count:', this.activeSongs.length);
      console.log('Current song index:', this.currentSongIndex);
      console.log('Playlist length:', this.playlist.length);
      
      if (!this.isAudioInitialized) {
        console.log('Initializing audio player...');
        this.initAudioPlayer();
      }
      
      if (this.activeSongs.length === 0) {
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
          this.applyVolume();
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
    /* 本地缓存先作为基线：即使云端不可用或返回默认值，也不会丢用户资料 */
    const local = loadProfileFromLocalStorage();
    let remote = null;

    if (this.isSupabaseConfigured) {
      try {
        remote = await loadProfileFromSupabase();
      } catch (error) {
        console.warn('加载云端个人信息失败，使用本地缓存:', error);
      }
    }

    if (!remote) {
      this.currentProfile = local;
      await this.renderProfile();
      return;
    }

    /* 逐字段合并：只有云端确实存了「非默认」内容才覆盖本地，
       避免远端默认头像 / 默认简介把用户自定义资料冲掉 */
    const merged = { ...local };
    const remoteIsDefaultAvatar = !remote.avatar || remote.avatar === DEFAULT_PROFILE.avatar;
    if (!remoteIsDefaultAvatar) {
      merged.avatar = remote.avatar;
    }
    if (remote.bio && !this.isDefaultProfileBio(remote.bio)) {
      merged.bio = remote.bio;
    }

    this.currentProfile = merged;
    saveProfileToLocalStorage(merged);
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
      /* 先写本地：云端失败时用户资料也不会丢 */
      saveProfileToLocalStorage(this.currentProfile);

      if (this.isSupabaseConfigured) {
        try {
          await saveProfileToSupabase(this.currentProfile);
        } catch (error) {
          console.warn('个人信息同步到云端失败，已保存到本地:', error);
          this.showNotification('已保存到本地，云端同步失败');
        }
      }

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
        /* 先压到 256px 的 JPEG：原图 base64 很容易撑爆 localStorage 配额，
           那会让头像“保存后在下次打开时消失” */
        const avatarData = await this.compressAvatar(e.target.result);
        
        // 更新头像显示
        if (this.profileAvatar) {
          this.profileAvatar.src = avatarData;
        }
        
        // 更新当前数据
        this.currentProfile.avatar = avatarData;
        
        // 保存：本地优先，云端同步失败不影响本地头像
        saveProfileToLocalStorage(this.currentProfile);
        if (this.isSupabaseConfigured) {
          try {
            await saveProfileToSupabase(this.currentProfile);
          } catch (error) {
            console.warn('头像同步到云端失败，已保存到本地:', error);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  }

  /* 头像压缩：最长边 256px、JPEG 85%，避免 localStorage 配额溢出 */
  compressAvatar(dataUrl) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(dataUrl);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
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

  // 轻量提示条（管理员登录、保存成功等反馈）
  showNotification(message) {
    let toast = document.getElementById('ui-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ui-notification';
      toast.className = 'ui-notification hidden';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._notificationTimer);
    this._notificationTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
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
      const currentLang = getCurrentLang();
      // 翻译期间给列表一个「处理中」的视觉状态，避免看起来像卡在上一个语言
      if (currentLang !== 'zh' && this.blogListContainer.children.length > 0) {
        this.blogListContainer.classList.add('is-translating');
      }

      // 先翻译完再替换 DOM，避免列表在翻译过程中空白一片
      const translatedBlogs = await translateArray(this.currentBlogs, ['title'], currentLang);
      
      this.blogListContainer.innerHTML = '';
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
    } finally {
      this.blogListContainer.classList.remove('is-translating');
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
    const confirmed = await this.showConfirm(t('blog-delete-confirm'));
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

  // ========== 内容面板（SHEET 层）==========

  updateSheetTexts() {
    const setText = (selector, text) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = text;
    };

    // 顶部导航（6 项）
    const navMap = {
      '.sheet-nav-about-text': t('about'),
      '.sheet-nav-works-text': t('works'),
      '.sheet-nav-blog-text': t('blog'),
      '.sheet-nav-sky-text': t('sky'),
      '.sheet-nav-collection-text': t('collection'),
      '.sheet-nav-guestbook-text': t('guestbook')
    };
    Object.entries(navMap).forEach(([selector, text]) => setText(selector, text));

    // 各分区大标题
    const titleMap = {
      '#sheet-about .sheet-section-title': t('about-title'),
      '#sheet-works .sheet-section-title': t('works'),
      '#sheet-blog .sheet-section-title': t('blog-title'),
      '#sheet-sky .sheet-section-title': t('sky-title'),
      '#sheet-collection .sheet-section-title': t('collection-title'),
      '#sheet-guestbook .sheet-section-title': t('guestbook-title')
    };
    Object.entries(titleMap).forEach(([selector, text]) => setText(selector, text));

    // 作品展示传送门
    setText('.works-portal-sub', t('works-portal-sub'));

    // 互联网收藏（卡片内文字由 collectionManager 自己重绘）
    setText('#sheet-collection .collection-subtitle', t('collection-subtitle'));
    setText('#sheet-collection .collection-upload-text', t('collection-upload'));
    setText('#collection-empty', t('collection-empty'));

    // 确认对话框按钮
    setText('.confirm-yes-text', t('confirm-yes'));
    setText('.confirm-no-text', t('confirm-no'));
  }

  // ========== SHEET 底部抽屉（整体上下翻出） ==========

  // 关闭时面板顶部停在视口 90% 处，即只露出顶部 1/10
  getSheetClosedOffset() {
    return window.innerHeight * 0.9;
  }

  applySheetProgress(progress) {
    if (!this.sheetPanel) return;
    const clamped = Math.max(0, Math.min(1, progress));
    this.sheetProgress = clamped;
    const offset = this.getSheetClosedOffset() * (1 - clamped);
    this.sheetPanel.style.transform = `translate(-50%, ${offset}px)`;
    if (this.sheetScrim) {
      this.sheetScrim.style.opacity = (clamped * 0.4).toFixed(3);
    }
  }

  setSheetTarget(progress) {
    const next = Math.max(0, Math.min(1, progress));
    if (next === this.sheetTarget) return;
    this.sheetTarget = next;
    this.startSheetAnimation();
  }

  startSheetAnimation() {
    if (this._sheetAnimRaf) return;
    const tick = () => {
      const diff = this.sheetTarget - this.sheetProgress;
      if (Math.abs(diff) <= 0.002) {
        this.applySheetProgress(this.sheetTarget);
        this._sheetAnimRaf = null;
        this.onSheetSettled();
        return;
      }
      this.applySheetProgress(this.sheetProgress + diff * 0.2);
      this._sheetAnimRaf = requestAnimationFrame(tick);
    };
    this._sheetAnimRaf = requestAnimationFrame(tick);
  }

  onSheetSettled() {
    if (this.sheetProgress >= 0.999) {
      this.contentSheet?.classList.add('sheet-fully-open');
      this.isSheetOpen = true;
      document.body.classList.add('sheet-open');
      // 新一轮打开：允许关闭时再做一次音乐控件复位
      this._sheetMusicResetDone = false;
      if (this.pendingSheetSection) {
        const section = this.pendingSheetSection;
        this.pendingSheetSection = null;
        this.scrollToSheetSection(section);
      }
    } else if (this.sheetProgress <= 0.001) {
      this.contentSheet?.classList.remove('sheet-fully-open');
      this.isSheetOpen = false;
      document.body.classList.remove('sheet-open');
      // 回到 3D 场景：音乐控件复位为收起，保证再点一次 toggle 一定是展开。
      // closeContentSheet 已立即复位过时跳过，否则会把用户刚点开的又关掉。
      if (!this._sheetMusicResetDone) this.resetMusicUiOnScene();
      this._sheetMusicResetDone = false;
    }
  }

  initSheetDrawer() {
    if (!this.sheetPanel) return;
    this.applySheetProgress(this.sheetProgress);
    window.addEventListener('resize', () => this.applySheetProgress(this.sheetProgress));
  }

  // 打开内容面板，并滚动到指定分区
  openContentSheet(section = 'about') {
    if (!this.contentSheet) return;
    if (window.isGalleryModeActive && window.isGalleryModeActive()) {
      window.toggleGalleryMode();
    }
    this.contentSheet.setAttribute('aria-hidden', 'false');
    this.updateSheetTexts();

    /* AERO 是一整页连续滚动，不需要抽屉动画：直接置为全开并滚到目标分区 */
    if (document.documentElement.dataset.style === 'aero') {
      if (this.sheetProgress < 0.999) {
        this.pendingSheetSection = null;
        this.sheetTarget = 1;
        this.applySheetProgress(1);
        this.onSheetSettled();
      }
      this.scrollToSheetSection(section);
      return;
    }

    if (this.sheetProgress >= 0.999) {
      this.scrollToSheetSection(section);
      return;
    }

    this.pendingSheetSection = section;
    this.setSheetTarget(1);
  }

  closeContentSheet() {
    if (!this.contentSheet) return;
    this.contentSheet.setAttribute('aria-hidden', 'true');
    this.contentSheet.classList.remove('sheet-fully-open');
    this.isSheetOpen = false;
    document.body.classList.remove('sheet-open');
    // 立即复位（不等动画 settle），否则用户马上点 toggle 会因旧状态而「点了没出现」
    this.resetMusicUiOnScene();
    this._sheetMusicResetDone = true;
    this.pendingSheetSection = null;
    this.setSheetTarget(0);
    this.isAboutModalOpen = false;
    this.isBlogModalOpen = false;
    this.isGuestbookModalOpen = false;
  }

  scrollToSheetSection(section, smooth = true) {
    if (!this.sheetScroll) return;
    const target = document.getElementById(`sheet-${section}`);
    if (!target) return;
    const top = target.getBoundingClientRect().top - this.sheetScroll.getBoundingClientRect().top + this.sheetScroll.scrollTop;
    this.sheetScroll.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
    this.setActiveSheetNav(section);
  }

  setActiveSheetNav(section) {
    this.sheetNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
  }

  // 滚动时高亮当前分区导航
  initSheetScrollSpy() {
    if (!this.sheetScroll) return;
    this.sheetScroll.addEventListener('scroll', () => {
      if (this._sheetScrollRaf) return;
      this._sheetScrollRaf = requestAnimationFrame(() => {
        this._sheetScrollRaf = null;
        const anchor = this.sheetScroll.getBoundingClientRect().top + 90;
        let current = 'about';
        document.querySelectorAll('.sheet-section').forEach(sec => {
          if (sec.getBoundingClientRect().top <= anchor) {
            current = sec.id.replace('sheet-', '');
          }
        });
        this.setActiveSheetNav(current);
      });
    }, { passive: true });
  }

  // 分区进入视口时淡入上移（滚动触发的入场节奏）
  initSheetReveal() {
    const sections = document.querySelectorAll('.sheet-section');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window) || !this.sheetScroll) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return;
    }

    this.sheetScroll.classList.add('sheet-reveal-ready');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { root: this.sheetScroll, threshold: 0, rootMargin: '0px 0px -4% 0px' });

    sections.forEach((section) => observer.observe(section));
    this.sheetRevealObserver = observer;
  }

  // 首屏：滚轮向下 / 手指上滑 → 整个面板从底部 1/5 处一起向上翻出；
  // 完全展开后内容区正常滚动，回到顶部继续上滑 → 整体向下收回
  initScrollReveal() {
    const wheelSpeed = 1.4;

    window.addEventListener('wheel', (e) => {
      const span = this.getSheetClosedOffset();
      if (!span) return;

      if (this.sheetProgress >= 0.999) {
        const atTop = this.sheetScroll && this.sheetScroll.scrollTop <= 0;
        if (atTop && e.deltaY < 0) {
          this.setSheetTarget(this.sheetProgress + (e.deltaY / span) * wheelSpeed);
        }
        return;
      }

      if (this.sheetProgress <= 0.001 && e.deltaY <= 0) return;
      this.setSheetTarget(this.sheetTarget + (e.deltaY / span) * wheelSpeed);
    }, { passive: true });

    let touchStartY = 0;
    let touchStartProgress = 0;

    window.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      touchStartY = e.touches[0].clientY;
      touchStartProgress = this.sheetProgress;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!e.touches[0]) return;
      const distance = touchStartY - e.touches[0].clientY; // >0 表示手指上滑
      const span = this.getSheetClosedOffset();
      if (!span) return;

      if (this.sheetProgress >= 0.999) {
        const atTop = this.sheetScroll && this.sheetScroll.scrollTop <= 0;
        if (atTop && distance < -40) {
          this.setSheetTarget(this.sheetProgress + (distance / span) * 1.2);
        }
        return;
      }

      if (this.sheetProgress <= 0.001 && distance <= 0) return;
      this.setSheetTarget(touchStartProgress + (distance / span) * 1.2);
    }, { passive: true });
  }

  async openAboutModal() {
    try {
      this.openContentSheet('about');
      this.renderSkills();
      await this.renderProfile();
    } catch (error) {
      console.error('Error opening about sheet:', error);
    }
  }

  async openWorksSheet() {
    try {
      this.openContentSheet('works');
    } catch (error) {
      console.error('Error opening works sheet:', error);
    }
  }

  async openBlogModal() {
    try {
      this.openContentSheet('blog');
      this.isBlogModalOpen = true;
      this.currentBlogPost = null;
      await this.loadBlogs();
      await this.createBlogList();

      if (this.blogPreviewContainer) {
        this.blogPreviewContainer.innerHTML = '';
        const hint = document.createElement('p');
        hint.className = 'select-article-hint';
        hint.textContent = t('select-article');
        this.blogPreviewContainer.appendChild(hint);
      }
      if (this.blogEditor) {
        this.blogEditor.classList.add('hidden');
      }
    } catch (error) {
      console.error('Error opening blog sheet:', error);
    }
  }

  async openGuestbookModal() {
    try {
      this.openContentSheet('guestbook');
      this.isGuestbookModalOpen = true;
      await this.initGuestbook();
    } catch (error) {
      console.error('Error opening guestbook sheet:', error);
    }
  }
}
