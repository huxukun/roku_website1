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
      'collection': '互联网收藏',
      'collection-upload': '⬆️ 上传图片',
      'collection-subtitle': '这里是我从互联网上捡到的图片收藏。',
      'collection-empty': '还没有收藏，去互联网上捡点图吧。',
      'collection-delete': '删除',
      'collection-like': '点赞',
      'collection-title': '🖼️ 互联网收藏',
      'collection-deleted': '已删除',
      'collection-delete-failed': '删除失败：{msg}',
      'collection-like-failed': '点赞失败：{msg}',
      'collection-upload-login': '请先登录管理员再上传',
      'collection-uploading': '正在上传 {i}/{n}…',
      'collection-upload-done': '已上传 {n} 张',
      'collection-upload-partial': '上传完成：成功 {ok} 张，失败 {fail} 张{detail}',
      'collection-upload-local': '云端未配置，{n} 张已存入本地预览（仅本机可见）',
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
      'skills-add': '添加技能',
      'skills-name': '技能名称',
      'skills-level': '熟练度',
      'skills-edit': '编辑技能',
      'skills-empty': '还没有技能，登录管理员后添加。',
      'default-bio': '欢迎来到赛博网格！\n\n我是一名数字艺术家和创意开发者，专注于3D视觉化、互动体验以及复古未来主义设计。\n\n凭借对像素艺术、霓虹灯和合成波美学的热爱，我将数字梦境变成现实。',
      
      // 作品展示
      'gallery-title': '我的作品',
      'project-close': '返回',
      
      // 博客
      'blog-title': '📝 Blog 博客',
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
      'guestbook-title': '📜 数字留言板',
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
      'show-more-messages': '展开更多留言',
      'show-less-messages': '收起留言',
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
      
      // 励志语录
      'daily-inspiration': '💪 每日励志',
      'refresh-quote': '🔄 换一条',
      'quote-source': '来源',
      
      // 展示框标题
      'box-title-1': '人物模型',
      'box-title-2': '场景建模',
      'box-title-3': '游戏设计',
      'box-title-4': '视频剪辑',

      // 作品展示传送门
      'works-portal-sub': '点击穿过传送门 · 进入 3D 作品检视',

      // 今晚的天空
      'sky': '今晚的天空',
      'sky-title': '🌌 今晚的天空',
      'sky-empty': '今天的天空暂时看不到',
      'sky-apod-missing': '今日天文图暂缺',
      'sky-video-hint': '点击观看 NASA 视频',
      'sky-image-failed': '图片加载失败',
      'sky-explanation': 'NASA 原文说明（英文）',
      'sky-sunrise': '日出',
      'sky-sunset': '日落',
      'sky-sun-missing': '日出日落数据暂缺',
      'sky-moon-illum': '照亮 {n}%',
      'sky-guide': '观星指南',
      'sky-guide-sub': '日落后 – 05:00 · {place}',
      'sky-no-planets': '今晚没有肉眼可见的行星',
      'sky-location-placeholder': '城市名，或 纬度,经度',
      'sky-location-apply': '应用',
      'sky-location-locate': '自动定位',
      'sky-location-locating': '定位中…',
      'sky-location-notfound': '没找到这个地方，可输入 纬度,经度',
      'sky-location-failed': '定位失败，请手动输入',
      'sky-location-reset': '恢复南京',
      'sky-location-polar': '极昼 / 极夜：今日无日出日落',
      'sky-next-event': '🌠 下一场：',
      'sky-peak-tonight': '今晚极大',
      'sky-peak-tomorrow': '明晚极大',
      'sky-days-after': '{n} 天后',

      // 确认对话框按钮
      'confirm-yes': '确定',
      'confirm-no': '取消',
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
      'collection': 'Web Finds',
      'collection-upload': '⬆️ Upload',
      'collection-subtitle': 'Images I collected around the internet.',
      'collection-empty': 'Nothing collected yet.',
      'collection-delete': 'Delete',
      'collection-like': 'Like',
      'collection-title': '🖼️ Web Finds',
      'collection-deleted': 'Deleted',
      'collection-delete-failed': 'Delete failed: {msg}',
      'collection-like-failed': 'Like failed: {msg}',
      'collection-upload-login': 'Log in as admin before uploading',
      'collection-uploading': 'Uploading {i}/{n}…',
      'collection-upload-done': 'Uploaded {n} image(s)',
      'collection-upload-partial': 'Upload finished: {ok} succeeded, {fail} failed{detail}',
      'collection-upload-local': 'Cloud not configured; {n} image(s) saved locally (this device only)',
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
      'skills-add': 'Add skill',
      'skills-name': 'Skill name',
      'skills-level': 'Proficiency',
      'skills-edit': 'Edit skill',
      'skills-empty': 'No skills yet. Log in as admin to add some.',
      'default-bio': 'Welcome to Cyber Grid!\n\nI am a digital artist and creative developer, specializing in 3D visualization, interactive experiences, and retro-futuristic design.\n\nWith a passion for pixel art, neon lights, and synthwave aesthetics, I turn digital dreams into reality.',
      
      // Gallery
      'gallery-title': 'My Works',
      'project-close': 'Back',
      
      // Blog
      'blog-title': '📝 Blog',
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
      'guestbook-title': '📜 Digital Guestbook',
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
      'show-more-messages': 'Show more',
      'show-less-messages': 'Show less',
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
      
      // Motivation Quotes
      'daily-inspiration': '💪 Daily Inspiration',
      'refresh-quote': '🔄 New Quote',
      'quote-source': 'Source',
      
      // Display Box Titles
      'box-title-1': 'Character Modeling',
      'box-title-2': 'Scene Modeling',
      'box-title-3': 'Game Design',
      'box-title-4': 'Video Editing',

      // Works portal
      'works-portal-sub': 'Click to pass the portal · 3D works viewer',

      // Tonight's sky
      'sky': "Tonight's Sky",
      'sky-title': "🌌 Tonight's Sky",
      'sky-empty': "Tonight's sky is unavailable",
      'sky-apod-missing': 'No astronomy picture today',
      'sky-video-hint': 'Watch the NASA video',
      'sky-image-failed': 'Image failed to load',
      'sky-explanation': 'NASA description (English)',
      'sky-sunrise': 'Sunrise',
      'sky-sunset': 'Sunset',
      'sky-sun-missing': 'Sunrise/sunset data unavailable',
      'sky-moon-illum': '{n}% illuminated',
      'sky-guide': 'Stargazing Guide',
      'sky-guide-sub': 'After sunset – 05:00 · {place}',
      'sky-no-planets': 'No planets visible to the naked eye tonight',
      'sky-location-placeholder': 'City name, or lat,lng',
      'sky-location-apply': 'Apply',
      'sky-location-locate': 'Locate me',
      'sky-location-locating': 'Locating…',
      'sky-location-notfound': 'Place not found — try lat,lng',
      'sky-location-failed': 'Location failed — type it instead',
      'sky-location-reset': 'Back to Nanjing',
      'sky-location-polar': 'Polar day/night: no sunrise or sunset today',
      'sky-next-event': '🌠 Next up: ',
      'sky-peak-tonight': 'peaks tonight',
      'sky-peak-tomorrow': 'peaks tomorrow night',
      'sky-days-after': 'in {n} days',

      // Confirm dialog
      'confirm-yes': 'OK',
      'confirm-no': 'Cancel',
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
      'collection': 'ウェブコレクション',
      'collection-upload': '⬆️ アップロード',
      'collection-subtitle': 'インターネットで拾った画像コレクション。',
      'collection-empty': 'まだコレクションがありません。',
      'collection-delete': '削除',
      'collection-like': 'いいね',
      'collection-title': '🖼️ ウェブコレクション',
      'collection-deleted': '削除しました',
      'collection-delete-failed': '削除に失敗しました：{msg}',
      'collection-like-failed': 'いいねに失敗しました：{msg}',
      'collection-upload-login': 'アップロードするには管理者ログインが必要です',
      'collection-uploading': 'アップロード中 {i}/{n}…',
      'collection-upload-done': '{n} 枚アップロードしました',
      'collection-upload-partial': 'アップロード完了：成功 {ok} 枚、失敗 {fail} 枚{detail}',
      'collection-upload-local': 'クラウド未設定、{n} 枚をローカル保存（この端末のみ表示）',
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
      'skills-add': 'スキルを追加',
      'skills-name': 'スキル名',
      'skills-level': '熟練度',
      'skills-edit': 'スキルを編集',
      'skills-empty': 'スキルがまだありません。管理者ログイン後に追加できます。',
      'default-bio': 'サイバーグリッドへようこそ！\n\n私はデジタルアーティストであり、クリエイティブ開発者です。3Dビジュアライゼーション、インタラクティブ体験、レトロフューチャーデザインを専門としています。\n\nピクセルアート、ネオンライト、シンセウェーブ美学への情熱を持って、デジタルの夢を現実に変えています。',
      
      // 作品展示
      'gallery-title': '私の作品',
      'project-close': '戻る',
      
      // ブログ
      'blog-title': '📝 ブログ',
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
      'guestbook-title': '📜 デジタルゲストブック',
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
      'show-more-messages': 'もっと見る',
      'show-less-messages': '折りたたむ',
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
      
      // 励志语录
      'daily-inspiration': '💪 今日の名言',
      'refresh-quote': '🔄 次の名言',
      'quote-source': '提供者',
      
      // 展示框标题
      'box-title-1': 'キャラクターモデル',
      'box-title-2': 'シーンモデリング',
      'box-title-3': 'ゲームデザイン',
      'box-title-4': '動画編集',

      // 作品展示ポータル
      'works-portal-sub': 'ポータルを抜けて 3D 作品ビューアへ',

      // 今夜の空
      'sky': '今夜の空',
      'sky-title': '🌌 今夜の空',
      'sky-empty': '今夜の空は表示できません',
      'sky-apod-missing': '本日の天文画像はありません',
      'sky-video-hint': 'NASA の動画を見る',
      'sky-image-failed': '画像の読み込みに失敗しました',
      'sky-explanation': 'NASA 原文説明（英語）',
      'sky-sunrise': '日の出',
      'sky-sunset': '日の入り',
      'sky-sun-missing': '日の出・日の入りデータなし',
      'sky-moon-illum': '照度 {n}%',
      'sky-guide': '星空ガイド',
      'sky-guide-sub': '日没後 – 05:00 · {place}',
      'sky-no-planets': '今夜肉眼で見える惑星はありません',
      'sky-location-placeholder': '都市名、または 緯度,経度',
      'sky-location-apply': '適用',
      'sky-location-locate': '現在地を取得',
      'sky-location-locating': '測位中…',
      'sky-location-notfound': '場所が見つかりません。緯度,経度 で試してください',
      'sky-location-failed': '測位に失敗しました。手動で入力してください',
      'sky-location-reset': '南京に戻す',
      'sky-location-polar': '極昼・極夜：本日の日の出・日の入りはありません',
      'sky-next-event': '🌠 次回：',
      'sky-peak-tonight': '今夜が極大',
      'sky-peak-tomorrow': '明夜が極大',
      'sky-days-after': '{n}日後',

      // 確認ダイアログ
      'confirm-yes': 'OK',
      'confirm-no': 'キャンセル',
    }
  }
};

// 当前语言
let currentLang = 'zh';

// 翻译缓存：内存 + localStorage 持久化，切回已翻译过的语言时即时生效
const TRANSLATION_CACHE_KEY = 'synthwave-translation-cache-v1';
const CACHE_MAX_ENTRIES = 300;
const CACHE_MAX_TEXT_LENGTH = 2000;

function loadTranslationCache() {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? new Map(Object.entries(parsed)) : new Map();
  } catch (error) {
    return new Map();
  }
}

const translationCache = loadTranslationCache();
let cachePersistTimer = null;

function persistTranslationCache() {
  clearTimeout(cachePersistTimer);
  cachePersistTimer = setTimeout(() => {
    try {
      // 只持久化不太长的文本，避免占满 localStorage
      const entries = [...translationCache.entries()]
        .filter(([, value]) => typeof value === 'string' && value.length <= CACHE_MAX_TEXT_LENGTH)
        .slice(-CACHE_MAX_ENTRIES);
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (error) {
      // localStorage 满了就放弃持久化，不影响当前会话使用
    }
  }, 400);
}

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

// 带占位符的 UI 文案：tf('collection-like-failed', { msg: error.message })
export function tf(key, vars = {}) {
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    t(key)
  )
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
  
  // 缓存结果（内存 + localStorage，切回该语言时即时返回）
  translationCache.set(cacheKey, translated);
  persistTranslationCache();
  
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
  // 方案1：使用免费的翻译API（如MyMemory），长文本分段处理
  try {
    // 按段落或长度分段翻译，避免单次请求过长
    const segments = splitTextForTranslation(text);
    const translatedSegments = [];
    
    for (const segment of segments) {
      if (!segment.trim()) {
        translatedSegments.push(segment);
        continue;
      }
      
      try {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(segment)}&langpair=zh-CN|${languageCodes[targetLang]}`
        );
        
        if (!response.ok) throw new Error('API response not ok');
        
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
          translatedSegments.push(data.responseData.translatedText);
        } else {
          // API 响应异常，使用本地翻译
          translatedSegments.push(simpleTranslate(segment, targetLang));
        }
        
        // 避免请求过快被限流
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (apiError) {
        // 单个段落翻译失败，使用本地翻译作为后备
        translatedSegments.push(simpleTranslate(segment, targetLang));
      }
    }
    
    const result = translatedSegments.join('\n');
    if (result && result.trim()) {
      return result;
    }
  } catch (e) {
    console.log('API翻译失败，使用本地翻译', e);
  }

  // 方案2：本地翻译（演示用），增强对长文本的支持
  return simpleTranslate(text, targetLang);
}

// 将长文本分割为适合翻译的段落
function splitTextForTranslation(text) {
  if (text.length <= 500) {
    return [text];
  }
  
  // 尝试按段落分割（空行分隔）
  let segments = text.split(/\n\s*\n/);
  
  // 如果段落太大，再按句子分割
  const result = [];
  const maxSegmentLength = 500;
  
  for (const segment of segments) {
    if (segment.length <= maxSegmentLength) {
      result.push(segment);
    } else {
      // 按句子或逗号进一步分割
      const sentences = segment.match(/[^.!?。！？]+[.!?。！？]?\s*/g) || [segment];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxSegmentLength) {
          currentChunk += sentence;
        } else {
          if (currentChunk.trim()) {
            result.push(currentChunk.trim());
          }
          currentChunk = sentence;
        }
      }
      
      if (currentChunk.trim()) {
        result.push(currentChunk.trim());
      }
    }
  }
  
  return result.length > 0 ? result : [text];
}

// 本地简单翻译（演示用）- 增强版，支持更多通用词汇
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
      .replace(/关闭/g, 'Close')
      // 通用词汇增强翻译
      .replace(/入门教程/g, 'Getting Started Tutorial')
      .replace(/基础入门/g, 'basic introduction')
      .replace(/这是一篇关于/g, 'This is an article about')
      .replace(/的基础/g, 'basics of')
      .replace(/讲解如何/g, 'explaining how to')
      .replace(/创建第一个/g, 'to create your first')
      .replace(/场景/g, 'scene')
      .replace(/准备工作/g, 'Preparation')
      .replace(/首先/g, 'First')
      .replace(/你需要/g, 'you need to')
      .replace(/安装/g, 'install')
      .replace(/接下来/g, 'Next')
      .replace(/我们来/g, 'let us')
      .replace(/探讨/g, 'explore')
      .replace(/设计元素/g, 'design elements')
      .replace(/包括/g, 'including')
      .replace(/深色背景/g, 'dark backgrounds')
      .replace(/网格纹理/g, 'grid textures')
      .replace(/复古未来主义字体/g, 'retro-futuristic fonts')
      .replace(/学习如何/g, 'Learn how to')
      .replace(/使用/g, 'use')
      .replace(/节点/g, 'nodes')
      .replace(/生成/g, 'generate')
      .replace(/逼真的/g, 'realistic')
      .replace(/地形/g, 'terrain')
      .replace(/分享/g, 'Share')
      .replace(/开发经验/g, 'development experience')
      .replace(/最佳实践/g, 'best practices')
      .replace(/和/g, 'and')
      .replace(/的/g, '\'s')
      .replace(/是/g, 'is')
      .replace(/在/g, 'in')
      .replace(/我/g, 'I')
      .replace(/你/g, 'you');
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
      .replace(/关闭/g, '閉じる')
      // 通用词汇增强翻译
      .replace(/入门教程/g, '入門チュートリアル')
      .replace(/基础入门/g, '基本入門')
      .replace(/这是一篇关于/g, 'これは')
      .replace(/的基础/g, 'の基礎')
      .replace(/讲解如何/g, '方法を説明します')
      .replace(/创建第一个/g, '最初の')
      .replace(/场景/g, 'シーン')
      .replace(/准备工作/g, '準備')
      .replace(/首先/g, 'まず')
      .replace(/你需要/g, '必要です')
      .replace(/安装/g, 'インストール')
      .replace(/接下来/g, '次に')
      .replace(/我们来/g, 'みましょう')
      .replace(/探讨/g, '検討します')
      .replace(/设计元素/g, 'デザイン要素')
      .replace(/包括/g, '含む')
      .replace(/深色背景/g, '暗い背景')
      .replace(/网格纹理/g, 'グリッドテクスチャ')
      .replace(/复古未来主义字体/g, 'レトロフューチャーフォント')
      .replace(/学习如何/g, '学びます')
      .replace(/使用/g, '使用')
      .replace(/节点/g, 'ノード')
      .replace(/生成/g, '生成')
      .replace(/逼真的/g, 'リアルな')
      .replace(/地形/g, '地形')
      .replace(/分享/g, '共有')
      .replace(/开发经验/g, '開発経験')
      .replace(/最佳实践/g, 'ベストプラクティス');
  }
  
  return text;
}

// =============================================
// 固定词条翻译 —— 天文数据里的月相/行星/方位/流星雨名称
// 这些词来自 public/daily/latest.json（脚本生成的中文），
// 词表固定，本地字典直接映射，切换语言时无需任何网络请求。
// =============================================

const skyTerms = {
  en: {
    // 月相
    '新月': 'New Moon',
    '蛾眉月': 'Waxing Crescent',
    '上弦': 'First Quarter',
    '盈凸月': 'Waxing Gibbous',
    '满月': 'Full Moon',
    '亏凸月': 'Waning Gibbous',
    '下弦': 'Last Quarter',
    '残月': 'Waning Crescent',
    // 行星
    '水星': 'Mercury',
    '金星': 'Venus',
    '火星': 'Mars',
    '木星': 'Jupiter',
    '土星': 'Saturn',
    // 方位
    '北': 'N',
    '东北': 'NE',
    '东': 'E',
    '东南': 'SE',
    '南': 'S',
    '西南': 'SW',
    '西': 'W',
    '西北': 'NW',
    // 流星雨
    '象限仪座流星雨': 'Quadrantids',
    '天琴座流星雨': 'Lyrids',
    '宝瓶座η流星雨': 'Eta Aquariids',
    '英仙座流星雨': 'Perseids',
    '猎户座流星雨': 'Orionids',
    '狮子座流星雨': 'Leonids',
    '双子座流星雨': 'Geminids',
    '小熊座流星雨': 'Ursids'
  },
  ja: {
    // 月相
    '新月': '新月',
    '蛾眉月': '三日月',
    '上弦': '上弦',
    '盈凸月': '十三夜月',
    '满月': '満月',
    '亏凸月': '寝待月',
    '下弦': '下弦',
    '残月': '有明の月',
    // 行星
    '水星': '水星',
    '金星': '金星',
    '火星': '火星',
    '木星': '木星',
    '土星': '土星',
    // 方位
    '北': '北',
    '东北': '北東',
    '东': '東',
    '东南': '南東',
    '南': '南',
    '西南': '南西',
    '西': '西',
    '西北': '北西',
    // 流星雨
    '象限仪座流星雨': 'しぶんぎ座流星群',
    '天琴座流星雨': 'こと座流星群',
    '宝瓶座η流星雨': 'みずがめ座η流星群',
    '英仙座流星雨': 'ペルセウス座流星群',
    '猎户座流星雨': 'オリオン座流星群',
    '狮子座流星雨': 'しし座流星群',
    '双子座流星雨': 'ふたご座流星群',
    '小熊座流星雨': 'こぐま座流星群'
  }
};

// 同步翻译固定词条（无网络请求，可在同步渲染路径里直接调用）
export function translateTerm(text) {
  const value = String(text ?? '');
  if (!value || currentLang === 'zh') return value;
  const table = skyTerms[currentLang];
  return (table && table[value]) || value;
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
  try {
    localStorage.removeItem(TRANSLATION_CACHE_KEY);
  } catch (error) {
    // 忽略
  }
}
