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
      
      // Confirm dialogs
      'confirm': 'Confirm',
      'confirm-delete': 'Confirm Delete',
      'cancel-action': 'Cancel',
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
    }
  }
};

// 当前语言
let currentLang = 'zh';

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

// 翻译函数
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
