// 多语言配置
export const languages = {
  'zh': {
    name: '中文',
    flag: '🇨🇳',
    translations: {
      // 通用
      'welcome': '欢迎',
      'about': '关于我',
      'works': '作品展示',
      'guestbook': '留言板',
      'blog': 'Blog',
      'close': '关闭',
      'loading': '加载中...',
      'close-footer': '关闭',
      
      // 关于我
      'about-title': '关于我',
      'change-avatar': '📷 更换头像',
      'bio': '个人介绍',
      'edit': '✏️ 编辑',
      'save': '💾 保存',
      'cancel': '❌ 取消',
      'skills': '技能面板',
      'default-bio': '欢迎来到赛博网格！\n\n我是一名数字艺术家和创意开发者，专注于3D视觉化、互动体验以及复古未来主义设计。\n\n凭借对像素艺术、霓虹灯和合成波美学的热爱，我将数字梦境变成现实。',
      
      // 作品展示
      'gallery-title': '我的作品',
      'project-close': '返回',
      
      // 博客
      'blog-title': '📝 赛博博客',
      'article-list': '📌 文章列表',
      'select-article': '请选择左侧文章进行预览...',
      'add-blog': '➕ 新建',
      'delete-blog': '🗑️ 删除',
      'blog-placeholder-title': '文章标题',
      'blog-placeholder-date': '日期 (YYYY-MM-DD)',
      'blog-placeholder-content': '文章内容 (支持换行)',
      'blog-editor-title': '编辑文章',
      'blog-new-title': '新建文章',
      'blog-delete-confirm': '确定要删除这篇文章吗？',
      
      // 留言板
      'guestbook-title': '📜 赛博留言板',
      'storage-status': '⚡ 检查连接中...',
      'online': '☁️ Supabase 在线',
      'offline': '💾 本地模式',
      'refresh': '🔄 刷新',
      'leave-message': '✍️ 留下你的足迹',
      'name': '昵称（匿名网友）',
      'tag': '标签（可选）',
      'message-hint': '写下你的想法...',
      'send': '发送留言 🚀',
      'no-messages': '暂无留言，成为第一个留言的人吧！ 🌟',
      'history': '💬 历史留言',
      'submitting': '发送中...',
      
      // 音乐控制
      'music': '🎵 上传音乐',
      'upload-music': '🎵 上传音乐',
      'now-playing': '正在播放：',
      'select-music': '选择音乐文件',
      'visualizer': '🎆 可视化',
      'toggle-ui': '🎛️ UI',
      'no-song': '未选择歌曲',
      
      // 管理员
      'admin': '⚙️',
      'admin-title': '🔐 管理员认证',
      'admin-hint': '请输入管理员密码以启用编辑功能',
      'password': '输入密码',
      'login': '🔓 进入管理模式',
      'logout': '🔒 退出管理模式',
      'wrong-password': '密码错误',
      
      // 确认对话框
      'confirm': '确认',
      'confirm-delete': '确认删除',
      'cancel-action': '取消',
      'language-switching': '切换语言中...',
      'language-translating': '正在翻译界面...',
      'loading': '加载中...',
      'opening-about': '正在打开关于我...',
      'opening-guestbook': '正在打开留言板...',
      'opening-works': '正在打开作品展示...',
      'opening-blog': '正在打开博客...',
    }
  },
  'en': {
    name: 'English',
    flag: '🇬🇧',
    translations: {
      // General
      'welcome': 'WELCOME',
      'about': 'About',
      'works': 'Works',
      'guestbook': 'Guestbook',
      'blog': 'Blog',
      'close': 'Close',
      'loading': 'Loading...',
      'close-footer': 'Close',
      
      // About
      'about-title': 'About Me',
      'change-avatar': '📷 Change Avatar',
      'bio': 'Biography',
      'edit': '✏️ Edit',
      'save': '💾 Save',
      'cancel': '❌ Cancel',
      'skills': 'Skills',
      'default-bio': 'Welcome to Cyber Grid!\n\nI am a digital artist and creative developer, specializing in 3D visualization, interactive experiences, and retro-futuristic design.\n\nWith a passion for pixel art, neon lights, and synthwave aesthetics, I turn digital dreams into reality.',
      
      // Gallery
      'gallery-title': 'My Works',
      'project-close': 'Back',
      
      // Blog
      'blog-title': '📝 Cyber Blog',
      'article-list': '📌 Articles',
      'select-article': 'Please select an article on the left...',
      'add-blog': '➕ New',
      'delete-blog': '🗑️ Delete',
      'blog-placeholder-title': 'Article Title',
      'blog-placeholder-date': 'Date (YYYY-MM-DD)',
      'blog-placeholder-content': 'Article Content (supports line breaks)',
      'blog-editor-title': 'Edit Article',
      'blog-new-title': 'New Article',
      'blog-delete-confirm': 'Are you sure you want to delete this article?',
      
      // Guestbook
      'guestbook-title': '📜 Guestbook',
      'storage-status': '⚡ Checking connection...',
      'online': '☁️ Supabase Online',
      'offline': '💾 Local Mode',
      'refresh': '🔄 Refresh',
      'leave-message': '✍️ Leave a message',
      'name': 'Name (Anonymous)',
      'tag': 'Tag (optional)',
      'message-hint': 'Write your message...',
      'send': 'Send 🚀',
      'no-messages': 'No messages yet, be the first! 🌟',
      'history': '💬 History',
      'submitting': 'Sending...',
      
      // Music
      'music': '🎵 Upload Music',
      'upload-music': '🎵 Upload Music',
      'now-playing': 'Now playing:',
      'select-music': 'Select music file',
      'visualizer': '🎆 Visualizer',
      'toggle-ui': '🎛️ UI',
      'no-song': 'No song selected',
      
      // Admin
      'admin': '⚙️',
      'admin-title': '🔐 Admin Login',
      'admin-hint': 'Enter admin password to enable edit mode',
      'password': 'Enter password',
      'login': '🔓 Enter Admin Mode',
      'logout': '🔒 Exit Admin Mode',
      'wrong-password': 'Wrong password',
      
      // 确认对话框
      'confirm': 'Confirm',
      'confirm-delete': 'Confirm Delete',
      'cancel-action': 'Cancel',
      'language-switching': 'Switching language...',
      'language-translating': 'Translating interface...',
      'loading': 'Loading...',
      'opening-about': 'Opening About Me...',
      'opening-guestbook': 'Opening Guestbook...',
      'opening-works': 'Opening Works...',
      'opening-blog': 'Opening Blog...',
    }
  },
  'ja': {
    name: '日本語',
    flag: '🇯🇵',
    translations: {
      // 共通
      'welcome': 'ようこそ',
      'about': '自己紹介',
      'works': '作品展示',
      'guestbook': 'ゲストブック',
      'blog': 'ブログ',
      'close': '閉じる',
      'loading': '読み込み中...',
      'close-footer': '閉じる',
      
      // 自己紹介
      'about-title': '自己紹介',
      'change-avatar': '📷 アバターを変更',
      'bio': '自己紹介',
      'edit': '✏️ 編集',
      'save': '💾 保存',
      'cancel': '❌ キャンセル',
      'skills': 'スキル',
      'default-bio': 'サイバーグリッドへようこそ！\n\n私はデジタルアーティストであり、クリエイティブ開発者です。3Dビジュアライゼーション、インタラクティブ体験、レトロフューチャーデザインを専門としています。\n\nピクセルアート、ネオンライト、シンセウェーブ美学への情熱を持って、デジタルの夢を現実に変えています。',
      
      // 作品展示
      'gallery-title': '私の作品',
      'project-close': '戻る',
      
      // ブログ
      'blog-title': '📝 サイバーブログ',
      'article-list': '📌 記事一覧',
      'select-article': '左の記事を選択してください...',
      'add-blog': '➕ 新規',
      'delete-blog': '🗑️ 削除',
      'blog-placeholder-title': '記事のタイトル',
      'blog-placeholder-date': '日付 (YYYY-MM-DD)',
      'blog-placeholder-content': '記事の内容（改行サポート）',
      'blog-editor-title': '記事を編集',
      'blog-new-title': '新規記事',
      'blog-delete-confirm': 'この記事を削除してもよろしいですか？',
      
      // ゲストブック
      'guestbook-title': '📜 ゲストブック',
      'storage-status': '⚡ 接続確認中...',
      'online': '☁️ Supabase オンライン',
      'offline': '💾 ローカルモード',
      'refresh': '🔄 更新',
      'leave-message': '✍️ メッセージを残す',
      'name': '名前（匿名）',
      'tag': 'タグ（任意）',
      'message-hint': 'メッセージを入力...',
      'send': '送信 🚀',
      'no-messages': 'まだメッセージはありません。最初のメッセージを残してください！ 🌟',
      'history': '💬 履歴',
      'submitting': '送信中...',
      
      // 音楽
      'music': '🎵 音楽をアップロード',
      'upload-music': '🎵 音楽をアップロード',
      'now-playing': '再生中:',
      'select-music': '音楽ファイルを選択',
      'visualizer': '🎆 ビジュアライザー',
      'toggle-ui': '🎛️ UI',
      'no-song': '曲が選択されていません',
      
      // 管理者
      'admin': '⚙️',
      'admin-title': '🔐 管理者認証',
      'admin-hint': '編集モードを有効にするには管理者パスワードを入力してください',
      'password': 'パスワードを入力',
      'login': '🔓 管理者モードに入る',
      'logout': '🔒 管理者モードを終了',
      'wrong-password': 'パスワードが間違っています',
      
      // 確認ダイアログ
      'confirm': '確認',
      'confirm-delete': '削除の確認',
      'cancel-action': 'キャンセル',
      'language-switching': '言語を切り替え中...',
      'language-translating': 'インターフェースを翻訳中...',
      'loading': '読み込み中...',
      'opening-about': '自己紹介を開いています...',
      'opening-guestbook': 'ゲストブックを開いています...',
      'opening-works': '作品展示を開いています...',
      'opening-blog': 'ブログを開いています...',
    }
  }
};

// 当前语言
let currentLang = 'zh';

// 翻译缓存
const translationCache = new Map();

// 获取当前语言
export function getCurrentLang() {
  return currentLang;
}

// 设置当前语言
export function setCurrentLang(lang) {
  if (languages[lang]) {
    currentLang = lang;
    localStorage.setItem('synthwave-lang', lang);
  }
}

// 加载保存的语言设置
export function loadSavedLang() {
  const saved = localStorage.getItem('synthwave-lang');
  if (saved && languages[saved]) {
    currentLang = saved;
  }
}

// 翻译函数 - 用于UI文字
export function t(key) {
  const lang = languages[currentLang];
  return lang && lang.translations[key] ? lang.translations[key] : key;
}

// 获取语言列表
export function getLanguageList() {
  return Object.keys(languages).map(key => ({
    code: key,
    name: languages[key].name,
    flag: languages[key].flag
  }));
}

// =============================================
// 内容翻译系统 - 用于数据库内容
// =============================================

// 语言代码映射
const languageCodes = {
  'zh': 'zh-CN',
  'en': 'en',
  'ja': 'ja'
};

// 简易翻译函数（客户端模拟翻译）
// 注意：生产环境应该调用真实的翻译API
export async function translateContent(text, targetLang) {
  if (!text || targetLang === 'zh') {
    return text;
  }

  // 检查缓存 - 使用哈希缩短长文本
  const cacheKey = generateCacheKey(text, targetLang);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // 简单的模拟翻译（生产环境请替换为真实API）
  // 这里我们使用浏览器内置的简单替换作为演示
  // 真实项目应该使用 DeepL, Google Translate 等API
  let translated = await doTranslate(text, targetLang);
  
  // 缓存结果
  translationCache.set(cacheKey, translated);
  
  return translated;
}

// 生成缓存 key，避免长文本作为 key
function generateCacheKey(text, targetLang) {
  // 对于短文本，直接使用文本+语言
  if (text.length < 100) {
    return `${text}_${targetLang}`;
  }
  
  // 对于长文本，使用简单的哈希算法
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash)}_${targetLang}`;
}

// 实际翻译实现
async function doTranslate(text, targetLang) {
  // 方案1：使用免费的翻译API（如MyMemory）
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${languageCodes[targetLang]}`
    );
    
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    console.log('API翻译失败，使用本地翻译', e);
  }

  // 方案2：本地简单翻译（演示用）
  return simpleTranslate(text, targetLang);
}

// 本地简单翻译（演示用）
function simpleTranslate(text, targetLang) {
  if (targetLang === 'en') {
    return text
      // 博客标题翻译
      .replace(/Three\.js 入门教程/g, 'Three.js Getting Started Tutorial')
      .replace(/赛博朋克风格设计指南/g, 'Cyberpunk Style Design Guide')
      .replace(/Blender 程序化地形生成/g, 'Blender Procedural Terrain Generation')
      .replace(/WebXR 开发实践/g, 'WebXR Development Practice')
      .replace(/📝 赛博博客/g, '📝 Cyber Blog')
      .replace(/赛博博客/g, 'Cyber Blog')
      .replace(/📌 文章列表/g, '📌 Articles')
      .replace(/文章列表/g, 'Articles')
      .replace(/请选择左侧文章进行预览/g, 'Please select an article on the left to preview')
      .replace(/文章标题/g, 'Article Title')
      .replace(/日期 \(YYYY-MM-DD\)/g, 'Date (YYYY-MM-DD)')
      .replace(/文章内容 \(支持换行\)/g, 'Article Content (supports line breaks)')
      .replace(/编辑文章/g, 'Edit Article')
      .replace(/新建文章/g, 'New Article')
      .replace(/确定要删除这篇文章吗？/g, 'Are you sure you want to delete this article?')
      // 个人简介翻译
      .replace(/欢迎来到赛博网格/g, 'Welcome to Cyber Grid')
      .replace(/数字艺术家/g, 'digital artist')
      .replace(/创意开发者/g, 'creative developer')
      .replace(/3D视觉化/g, '3D visualization')
      .replace(/互动体验/g, 'interactive experience')
      .replace(/复古未来主义/g, 'retro-futuristic')
      .replace(/像素艺术/g, 'pixel art')
      .replace(/霓虹灯/g, 'neon lights')
      .replace(/合成波/g, 'synthwave')
      .replace(/美学/g, 'aesthetics')
      .replace(/数字梦境/g, 'digital dreams')
      .replace(/个人介绍/g, 'Biography')
      .replace(/技能面板/g, 'Skills')
      .replace(/关于我/g, 'About Me')
      .replace(/我的作品/g, 'My Works')
      .replace(/作品展示/g, 'Works')
      .replace(/留言板/g, 'Guestbook')
      // 留言板翻译
      .replace(/📜 赛博留言板/g, '📜 Cyber Guestbook')
      .replace(/赛博留言板/g, 'Cyber Guestbook')
      .replace(/检查连接中/g, 'Checking connection')
      .replace(/✍️ 留下你的足迹/g, '✍️ Leave a message')
      .replace(/留下你的足迹/g, 'Leave your message')
      .replace(/昵称/g, 'Name')
      .replace(/匿名网友/g, 'Anonymous')
      .replace(/标签/g, 'Tag')
      .replace(/可选/g, 'optional')
      .replace(/写下你的想法/g, 'Write your message')
      .replace(/发送留言/g, 'Send')
      .replace(/💬 历史留言/g, '💬 History')
      .replace(/历史留言/g, 'History')
      .replace(/暂无留言/g, 'No messages')
      .replace(/成为第一个留言的人/g, 'Be the first to leave a message')
      .replace(/加载中/g, 'Loading')
      .replace(/关闭/g, 'Close');
  }
  
  if (targetLang === 'ja') {
    return text
      // 博客标题翻译
      .replace(/Three\.js 入门教程/g, 'Three.js 入門チュートリアル')
      .replace(/赛博朋克风格设计指南/g, 'サイバーパンクスタイルデザインガイド')
      .replace(/Blender 程序化地形生成/g, 'Blender 手続き型地形生成')
      .replace(/WebXR 开发实践/g, 'WebXR 開発実践')
      .replace(/📝 赛博博客/g, '📝 サイバーブログ')
      .replace(/赛博博客/g, 'サイバーブログ')
      .replace(/📌 文章列表/g, '📌 記事リスト')
      .replace(/文章列表/g, '記事リスト')
      .replace(/请选择左侧文章进行预览/g, '左の記事を選択してプレビューしてください')
      .replace(/文章标题/g, '記事のタイトル')
      .replace(/日期 \(YYYY-MM-DD\)/g, '日付 (YYYY-MM-DD)')
      .replace(/文章内容 \(支持换行\)/g, '記事の内容（改行サポート）')
      .replace(/编辑文章/g, '記事を編集')
      .replace(/新建文章/g, '新規記事')
      .replace(/确定要删除这篇文章吗？/g, 'この記事を削除してもよろしいですか？')
      // 个人简介翻译
      .replace(/欢迎来到赛博网格/g, 'サイバーグリッドへようこそ')
      .replace(/数字艺术家/g, 'デジタルアーティスト')
      .replace(/创意开发者/g, 'クリエイティブ開発者')
      .replace(/3D视觉化/g, '3Dビジュアライゼーション')
      .replace(/互动体验/g, 'インタラクティブ体験')
      .replace(/复古未来主义/g, 'レトロフューチャー')
      .replace(/像素艺术/g, 'ピクセルアート')
      .replace(/霓虹灯/g, 'ネオンライト')
      .replace(/合成波/g, 'シンセウェーブ')
      .replace(/美学/g, '美学')
      .replace(/数字梦境/g, 'デジタルの夢')
      .replace(/个人介绍/g, '自己紹介')
      .replace(/技能面板/g, 'スキル')
      .replace(/关于我/g, '自己紹介')
      .replace(/我的作品/g, '私の作品')
      .replace(/作品展示/g, '作品展示')
      .replace(/留言板/g, 'ゲストブック')
      // 留言板翻译
      .replace(/📜 赛博留言板/g, '📜 サイバーゲストブック')
      .replace(/赛博留言板/g, 'サイバーゲストブック')
      .replace(/检查连接中/g, '接続確認中')
      .replace(/✍️ 留下你的足迹/g, '✍️ メッセージを残す')
      .replace(/留下你的足迹/g, 'メッセージを残す')
      .replace(/昵称/g, '名前')
      .replace(/匿名网友/g, '匿名')
      .replace(/标签/g, 'タグ')
      .replace(/可选/g, '任意')
      .replace(/写下你的想法/g, 'メッセージを入力')
      .replace(/发送留言/g, '送信')
      .replace(/💬 历史留言/g, '💬 履歴')
      .replace(/历史留言/g, '履歴')
      .replace(/暂无留言/g, 'メッセージなし')
      .replace(/成为第一个留言的人/g, '最初のメッセージを残してください')
      .replace(/加载中/g, '読み込み中')
      .replace(/关闭/g, '閉じる');
  }
  
  return text;
}

// 翻译多个字段的辅助函数
export async function translateObject(obj, fields, targetLang) {
  if (targetLang === 'zh') {
    return obj;
  }
  
  const translated = { ...obj };
  
  for (const field of fields) {
    if (translated[field]) {
      translated[field] = await translateContent(translated[field], targetLang);
    }
  }
  
  return translated;
}

// 批量翻译
export async function translateArray(arr, fields, targetLang) {
  if (targetLang === 'zh') {
    return arr;
  }
  
  return Promise.all(
    arr.map(item => translateObject(item, fields, targetLang))
  );
}

// 清空翻译缓存
export function clearTranslationCache() {
  translationCache.clear();
}
