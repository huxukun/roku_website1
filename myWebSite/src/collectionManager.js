import { supabase, isSupabaseConfigured } from './supabase.js';
import { t, tf, getCurrentLang } from './i18n.js';

const TABLE = 'collection_items';
const BUCKET = 'collection-images';
const LOCAL_STORAGE_KEY = 'synthwave-collection-items';
const LIKED_STORAGE_KEY = 'synthwave-liked-items';
/* 云端列表的只读快照：先渲染上次结果，再后台拉最新，避免首屏空白等待 */
const CLOUD_CACHE_KEY = 'synthwave-collection-cloud-cache';
const LOCAL_BUDGET = 3 * 1024 * 1024;
const MAX_FILE_SIZE = 30 * 1024 * 1024;
const MAX_EDGE = 2000;
/* 卡片用的小图尺寸：480px 宽的高质量缩略图，列表滚动时不必下载原图 */
const THUMB_EDGE = 480;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;

let items = [];
let initialized = false;
let lightbox = null;
let likedIds = readLikedIds();

const el = (id) => document.getElementById(id);

function isAdmin() {
  return document.body.classList.contains('admin-mode');
}

function setStatus(text, type = 'info') {
  const status = el('collection-upload-status');
  if (!status) return;
  if (!text) {
    status.textContent = '';
    status.classList.add('hidden');
    return;
  }
  status.classList.remove('hidden');
  status.textContent = text;
  status.dataset.type = type;
}

function readLocalItems() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function readCloudCache() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_CACHE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveCloudCache(list) {
  try {
    localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(list));
  } catch (error) {
    /* 配额不足时忽略 */
  }
}

// 本设备已点过赞的图片，避免同一浏览器重复计数
function readLikedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) || '[]'));
  } catch (error) {
    return new Set();
  }
}

function saveLikedIds() {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...likedIds]));
  } catch (error) {
    console.error('保存点赞记录失败:', error);
  }
}

async function likeItem(item) {
  if (!isSupabaseConfigured) {
    const local = readLocalItems();
    const target = local.find((entry) => String(entry.id) === String(item.id));
    if (target) {
      target.likes = (target.likes || 0) + 1;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
    }
    item.likes = (item.likes || 0) + 1;
    return item.likes;
  }

  const targetId = Number(item.id);
  const { data, error } = await supabase.rpc('like_collection_item', {
    target_id: targetId
  });

  if (!error) {
    item.likes = typeof data === 'number' ? data : (item.likes || 0) + 1;
    return item.likes;
  }

  // 数据库里还没执行 like_collection_item 函数时（schema cache 找不到），
  // 降级为「读当前值 + 写回」，保证点赞仍然可用。
  if (!isMissingRpc(error)) throw error;

  console.warn(
    'like_collection_item 函数不存在，已降级为读取+写回。' +
    '建议在 Supabase SQL Editor 执行建函数语句后再刷新 schema cache。'
  );

  const { data: row, error: readError } = await supabase
    .from(TABLE)
    .select('likes')
    .eq('id', targetId)
    .single();
  if (readError) throw readError;

  const next = Number(row?.likes || 0) + 1;
  const { error: updateError } = await supabase
    .from(TABLE)
    .update({ likes: next })
    .eq('id', targetId);
  if (updateError) throw updateError;

  item.likes = next;
  return next;
}

// Supabase 未找到 RPC 函数时的错误（未执行建表/函数 SQL）
function isMissingRpc(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST202'
    || code === '42883'
    || /could not find the function/i.test(message)
    || /function .* does not exist/i.test(message);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadItems() {
  if (!isSupabaseConfigured) {
    items = readLocalItems();
    return items;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  items = data || [];
  saveCloudCache(items);
  return items;
}

// 上传前压缩：最长边 2000px，WebP 0.85，显著降低流量与 Storage 占用
function compressImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 1024 * 1024) {
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

// 生成列表用的小缩略图（WebP），失败时返回 null，卡片自动回退到原图
function makeThumbnail(file, maxEdge = THUMB_EDGE) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const name = `${file.name.replace(/\.[^.]+$/, '')}-thumb.webp`;
        resolve(new File([blob], name, { type: 'image/webp' }));
      }, 'image/webp', 0.72);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function uploadFile(file) {
  // 部分系统/手机导出的图片 MIME 为空，用扩展名兜底判断
  if (!file.type.startsWith('image/') && !IMAGE_EXTENSIONS.test(file.name)) {
    throw new Error('不是图片文件');
  }
  if (file.size > MAX_FILE_SIZE) throw new Error('单张图片不能超过 30MB');

  // GIF 交给 canvas 压缩会只剩第一帧，直接上传原文件以保留动画
  const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
  const optimized = isGif ? file : await compressImage(file);
  // 同时生成列表缩略图：GIF 保留原图，其余用 480px WebP
  const thumbFile = isGif ? null : await makeThumbnail(optimized);
  const now = Date.now();
  const safeName = optimized.name.replace(/[^\w.-]+/g, '_').slice(-60);
  const path = `${now}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const thumbPath = thumbFile ? `${path.replace(/\.[^.]+$/, '')}-thumb.webp` : '';

  // 未配置 Supabase 时降级为本地预览，方便先调界面
  if (!isSupabaseConfigured) {
    const dataUrl = await blobToDataUrl(optimized);
    if (dataUrl.length > LOCAL_BUDGET) {
      throw new Error('云端未配置，图片过大无法本地预览');
    }
    const item = {
      id: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name,
      image_url: dataUrl,
      thumb_url: '',
      storage_path: '',
      created_at: new Date().toISOString(),
      local: true
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([item, ...readLocalItems()]));
    return item;
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, optimized, { cacheControl: '31536000', upsert: false });
  if (uploadError) {
    throw new Error(`存储上传失败：${uploadError.message}`);
  }

  let thumbUrl = '';
  if (thumbFile && thumbPath) {
    const { error: thumbError } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumbFile, { cacheControl: '31536000', upsert: false });
    if (thumbError) {
      console.warn('缩略图上传失败，卡片将回退到原图:', thumbError.message);
    } else {
      thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data?.publicUrl || '';
    }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{
      title: file.name,
      image_url: urlData.publicUrl,
      thumb_url: thumbUrl || null,
      storage_path: path
    }])
    .select()
    .single();
  if (error) {
    // 写入记录失败时清理已上传的文件，避免留下孤儿对象
    const removePaths = [path];
    if (thumbUrl && thumbPath) removePaths.push(thumbPath);
    await supabase.storage.from(BUCKET).remove(removePaths);
    throw new Error(`写入数据库失败：${error.message}`);
  }
  return data;
}

async function deleteItem(item) {
  if (!isAdmin()) return;
  if (!window.confirm(`删除这张图片「${item.title || '未命名'}」？`)) return;

  if (item.local || !isSupabaseConfigured) {
    const next = readLocalItems().filter(i => i.id !== item.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    return;
  }

  if (item.storage_path) {
    const removePaths = [item.storage_path];
    // 缩略图与原图同一路径前缀，删除时一并清理
    if (item.thumb_url) {
      removePaths.push(`${item.storage_path.replace(/\.[^.]+$/, '')}-thumb.webp`);
    }
    await supabase.storage.from(BUCKET).remove(removePaths);
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', item.id);
  if (error) throw error;
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.add('hidden');
  document.body.classList.remove('collection-lightbox-open');
}

function openLightbox(item) {
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.className = 'collection-lightbox hidden';
    lightbox.innerHTML = `
      <button type="button" class="collection-lightbox-close" aria-label="关闭">✕</button>
      <img alt="">
      <p class="collection-lightbox-caption"></p>
    `;
    lightbox.querySelector('.collection-lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
    document.body.appendChild(lightbox);
  }
  const img = lightbox.querySelector('img');
  img.src = item.image_url;
  img.alt = item.title || '';
  lightbox.querySelector('.collection-lightbox-caption').textContent = item.title || '';
  lightbox.classList.remove('hidden');
  document.body.classList.add('collection-lightbox-open');
}

function render() {
  const grid = el('collection-grid');
  if (!grid) return;
  const empty = el('collection-empty');

  grid.innerHTML = '';
  if (empty) {
    empty.classList.toggle('hidden', items.length > 0);
    empty.textContent = t('collection-empty');
  }

  items.forEach(item => {
    const card = document.createElement('figure');
    card.className = 'collection-card';

    const img = document.createElement('img');
    // 卡片优先用缩略图，点开灯箱才加载原图
    img.src = item.thumb_url || item.image_url;
    img.alt = item.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.className = 'collection-caption';
    caption.textContent = item.title || '';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'collection-delete admin-only';
    del.title = t('collection-delete');
    del.textContent = '✕';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await deleteItem(item);
        await refreshImageCollection();
        setStatus(t('collection-deleted'), 'success');
      } catch (error) {
        console.error('删除图片失败:', error);
        setStatus(tf('collection-delete-failed', { msg: error.message }), 'error');
      }
    });

    // 匿名点赞：每个浏览器每张图只能点一次
    const likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className = 'collection-like';
    likeBtn.title = t('collection-like');
    likeBtn.setAttribute('aria-label', t('collection-like'));
    const liked = likedIds.has(String(item.id));
    likeBtn.classList.toggle('is-liked', liked);
    likeBtn.setAttribute('aria-pressed', String(liked));
    likeBtn.innerHTML = `<span class="collection-like-heart">♥</span><span class="collection-like-count">${item.likes ?? 0}</span>`;
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = String(item.id);
      if (likedIds.has(key)) return;

      const countEl = likeBtn.querySelector('.collection-like-count');
      const previous = Number(countEl.textContent) || 0;
      countEl.textContent = previous + 1;
      likeBtn.classList.add('is-liked');

      try {
        const next = await likeItem(item);
        countEl.textContent = next;
        likedIds.add(key);
        saveLikedIds();
        likeBtn.setAttribute('aria-pressed', 'true');
      } catch (error) {
        countEl.textContent = previous;
        likeBtn.classList.remove('is-liked');
        setStatus(tf('collection-like-failed', { msg: error.message }), 'error');
        console.error('点赞失败:', error);
      }
    });

    card.append(img, caption, likeBtn, del);
    card.addEventListener('click', () => openLightbox(item));
    grid.appendChild(card);
  });
}

// 只刷新文字（空状态、按钮提示），不重建卡片
function applyTexts() {
  const empty = el('collection-empty');
  if (empty) empty.textContent = t('collection-empty');

  document.querySelectorAll('.collection-like').forEach((btn) => {
    btn.title = t('collection-like');
    btn.setAttribute('aria-label', t('collection-like'));
  });

  document.querySelectorAll('.collection-delete').forEach((btn) => {
    btn.title = t('collection-delete');
  });
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (!isAdmin()) {
    setStatus(t('collection-upload-login'), 'error');
    return;
  }

  setStatus(tf('collection-uploading', { i: 1, n: files.length }));
  let success = 0;
  let failed = 0;
  let lastError = '';

  for (let i = 0; i < files.length; i++) {
    try {
      await uploadFile(files[i]);
      success += 1;
    } catch (error) {
      failed += 1;
      lastError = error.message || String(error);
      console.error('上传图片失败:', error);
    }
    setStatus(tf('collection-uploading', { i: i + 1, n: files.length }));
  }

  await refreshImageCollection();

  if (isSupabaseConfigured) {
    const isZh = getCurrentLang() === 'zh';
    const detail = failed && lastError
      ? (isZh ? `（${lastError}）` : ` (${lastError})`)
      : '';
    setStatus(
      failed
        ? tf('collection-upload-partial', { ok: success, fail: failed, detail })
        : tf('collection-upload-done', { n: success }),
      failed ? 'error' : 'success'
    );
  } else {
    setStatus(tf('collection-upload-local', { n: success }), 'error');
  }
}

export async function refreshImageCollection() {
  const grid = el('collection-grid');
  if (!grid) return;

  // 先用上次的云端快照渲染，网络请求在后台继续
  if (isSupabaseConfigured && items.length === 0) {
    const cached = readCloudCache();
    if (cached.length > 0) {
      items = cached;
      render();
    }
  }

  try {
    await loadItems();
    render();
  } catch (error) {
    console.error('加载图片收藏失败:', error);
    const empty = el('collection-empty');
    if (empty) {
      empty.classList.remove('hidden');
      empty.textContent = '加载失败，请检查云端配置';
    }
  }
}

export function initImageCollection() {
  if (initialized) return;
  const input = el('collection-file-input');
  if (!input) return;
  initialized = true;

  input.addEventListener('change', async () => {
    await handleFiles(input.files);
    input.value = '';
  });

  refreshImageCollection();

  // 切换语言时立即刷新文字，不重建卡片（避免图片重新加载闪烁）
  document.addEventListener('languageChange', () => applyTexts());

  // 管理员模式切换时重绘，控制删除按钮显隐
  const observer = new MutationObserver(() => render());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
