import { supabase, isSupabaseConfigured } from './supabase.js';
import { t } from './i18n.js';

const TABLE = 'collection_items';
const BUCKET = 'collection-images';
const LOCAL_STORAGE_KEY = 'synthwave-collection-items';
const LOCAL_BUDGET = 3 * 1024 * 1024;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_EDGE = 2000;

let items = [];
let initialized = false;
let lightbox = null;

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

async function uploadFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('不是图片文件');
  if (file.size > MAX_FILE_SIZE) throw new Error('单张图片不能超过 15MB');

  const optimized = await compressImage(file);
  const now = Date.now();
  const safeName = optimized.name.replace(/[^\w.-]+/g, '_').slice(-60);
  const path = `${now}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

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
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ title: file.name, image_url: urlData.publicUrl, storage_path: path }])
    .select()
    .single();
  if (error) throw error;
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
    await supabase.storage.from(BUCKET).remove([item.storage_path]);
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
    img.src = item.image_url;
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
        setStatus('已删除', 'success');
      } catch (error) {
        console.error('删除图片失败:', error);
        setStatus(`删除失败：${error.message}`, 'error');
      }
    });

    card.append(img, caption, del);
    card.addEventListener('click', () => openLightbox(item));
    grid.appendChild(card);
  });
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (!isAdmin()) {
    setStatus('请先登录管理员再上传', 'error');
    return;
  }

  setStatus(`正在上传 1/${files.length}…`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    try {
      await uploadFile(files[i]);
      success += 1;
    } catch (error) {
      failed += 1;
      console.error('上传图片失败:', error);
    }
    setStatus(`正在上传 ${i + 1}/${files.length}…`);
  }

  await refreshImageCollection();

  if (isSupabaseConfigured) {
    setStatus(
      failed ? `上传完成：成功 ${success} 张，失败 ${failed} 张` : `已上传 ${success} 张`,
      failed ? 'error' : 'success'
    );
  } else {
    setStatus(`云端未配置，${success} 张已存入本地预览（仅本机可见）`, 'error');
  }
}

export async function refreshImageCollection() {
  const grid = el('collection-grid');
  if (!grid) return;
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

  // 管理员模式切换时重绘，控制删除按钮显隐
  const observer = new MutationObserver(() => render());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
