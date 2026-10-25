import { supabase, isSupabaseConfigured } from './supabase.js';
import { t } from './i18n.js';

const TABLE = 'skills_items';
const LOCAL_STORAGE_KEY = 'synthwave-skills';
const SEED_FLAG_KEY = 'synthwave-skills-seeded';

const DEFAULT_SKILLS = [
  { name: 'Blender', level: 90 },
  { name: 'Maya', level: 85 },
  { name: 'ZBrush', level: 80 },
  { name: 'Substance Painter', level: 88 },
  { name: 'Three.js', level: 92 },
  { name: 'Unreal Engine', level: 75 },
  { name: 'Unity', level: 82 },
  { name: 'Houdini', level: 70 }
];

let items = [];
let initialized = false;
let editingId = null;

const el = (id) => document.getElementById(id);

function isAdmin() {
  return document.body.classList.contains('admin-mode');
}

function notify(message) {
  let toast = document.getElementById('ui-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ui-notification';
    toast.className = 'ui-notification hidden';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(notify._timer);
  notify._timer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SKILLS.map((skill, index) => ({
        id: `local-${index + 1}`,
        name: skill.name,
        level: skill.level,
        sort_order: index
      }));
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLocal(next) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
}

async function seedDefaults() {
  const rows = DEFAULT_SKILLS.map((skill, index) => ({
    name: skill.name,
    level: skill.level,
    sort_order: index
  }));

  if (!isSupabaseConfigured) {
    const local = rows.map((row, index) => ({ ...row, id: `local-${index + 1}` }));
    writeLocal(local);
    return local;
  }

  if (localStorage.getItem(SEED_FLAG_KEY) === '1') return null;

  const { data, error } = await supabase.from(TABLE).insert(rows).select();
  if (error) {
    console.warn('技能默认数据写入失败，使用本地回退：', error.message);
    return rows.map((row, index) => ({ ...row, id: `local-${index + 1}` }));
  }
  localStorage.setItem(SEED_FLAG_KEY, '1');
  return data || [];
}

async function loadItems() {
  if (!isSupabaseConfigured) {
    items = readLocal();
    return items;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('技能表读取失败，使用本地回退：', error.message);
    items = readLocal();
    return items;
  }

  if (!data || data.length === 0) {
    items = (await seedDefaults()) || [];
    return items;
  }

  items = data;
  return items;
}

async function addSkill(name, level) {
  if (!isSupabaseConfigured || items.some(item => String(item.id).startsWith('local-'))) {
    const item = {
      id: `local-${Date.now()}`,
      name,
      level,
      sort_order: items.length
    };
    const next = [...items, item];
    writeLocal(next);
    items = next;
    return item;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ name, level, sort_order: items.length }])
    .select()
    .single();
  if (error) throw error;
  items.push(data);
  return data;
}

async function updateSkill(id, changes) {
  if (!isSupabaseConfigured || String(id).startsWith('local-')) {
    const next = items.map(item => (item.id === id ? { ...item, ...changes } : item));
    writeLocal(next);
    items = next;
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  items = items.map(item => (item.id === id ? data : item));
}

async function deleteSkill(item) {
  if (!isAdmin()) return;
  if (!window.confirm(`删除技能「${item.name}」？`)) return;

  if (!isSupabaseConfigured || String(item.id).startsWith('local-')) {
    const next = items.filter(i => i.id !== item.id);
    writeLocal(next);
    items = next;
    return;
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', item.id);
  if (error) throw error;
  items = items.filter(i => i.id !== item.id);
}

function updateLevelValue() {
  const range = el('skill-level-input');
  const output = el('skill-level-value');
  if (range && output) output.textContent = `${range.value}%`;
}

function closeEditor() {
  const editor = el('skill-editor');
  if (editor) editor.classList.add('hidden');
  editingId = null;
  const idInput = el('skill-edit-id');
  if (idInput) idInput.value = '';
  const nameInput = el('skill-name-input');
  if (nameInput) nameInput.value = '';
  const range = el('skill-level-input');
  if (range) range.value = '50';
  updateLevelValue();
}

function openEditor(skill = null) {
  if (!isAdmin()) return;
  const editor = el('skill-editor');
  if (!editor) return;

  editingId = skill ? skill.id : null;
  const idInput = el('skill-edit-id');
  const nameInput = el('skill-name-input');
  const range = el('skill-level-input');

  if (idInput) idInput.value = editingId ? String(editingId) : '';
  if (nameInput) nameInput.value = skill ? skill.name : '';
  if (range) range.value = skill ? String(skill.level) : '50';

  updateLevelValue();
  editor.classList.remove('hidden');
  nameInput?.focus();
}

function createSkillActions(skill) {
  const actions = document.createElement('span');
  actions.className = 'skill-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'skill-edit-btn';
  editBtn.title = t('skills-edit');
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => openEditor(skill));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'skill-delete-btn';
  deleteBtn.title = t('collection-delete');
  deleteBtn.textContent = '🗑️';
  deleteBtn.addEventListener('click', async () => {
    try {
      await deleteSkill(skill);
      await refreshSkills();
      notify('已删除');
    } catch (error) {
      console.error('删除技能失败:', error);
      notify(`删除失败：${error.message}`);
    }
  });

  actions.append(editBtn, deleteBtn);
  return actions;
}

function render() {
  const container = el('skills-container');
  if (!container) return;

  container.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'skills-empty';
    empty.textContent = t('skills-empty');
    container.appendChild(empty);
    return;
  }

  const admin = isAdmin();

  items.forEach((skill, index) => {
    const item = document.createElement('div');
    item.className = 'skill-item content-fade-in';
    item.style.animationDelay = `${index * 0.1}s`;

    const label = document.createElement('div');
    label.className = 'skill-label';

    const name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = skill.name;

    const right = document.createElement('span');
    right.className = 'skill-label-right';

    const level = document.createElement('span');
    level.className = 'skill-level';
    level.textContent = `${skill.level}%`;
    right.appendChild(level);

    if (admin) right.appendChild(createSkillActions(skill));

    label.append(name, right);

    const bar = document.createElement('div');
    bar.className = 'skill-bar';
    const fill = document.createElement('div');
    fill.className = 'skill-fill';
    fill.dataset.level = skill.level;
    bar.appendChild(fill);

    item.append(label, bar);
    container.appendChild(item);
  });

  setTimeout(() => {
    container.querySelectorAll('.skill-fill').forEach((fill) => {
      fill.style.width = `${fill.dataset.level}%`;
    });
  }, 80);
}

export async function refreshSkills() {
  const container = el('skills-container');
  if (!container) return;
  try {
    await loadItems();
    render();
  } catch (error) {
    console.error('加载技能失败:', error);
  }
}

function applyTexts() {
  const nameInput = el('skill-name-input');
  if (nameInput) nameInput.placeholder = t('skills-name');

  const levelLabel = document.querySelector('.skill-level-label');
  if (levelLabel) levelLabel.textContent = t('skills-level');

  const addBtn = el('skills-add-btn');
  if (addBtn) addBtn.title = t('skills-add');

  const saveBtn = document.querySelector('.skill-save-btn');
  if (saveBtn) saveBtn.textContent = t('save');

  const cancelBtn = el('skill-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = t('cancel');
}

export function initSkillsManager() {
  if (initialized) return;
  const form = el('skill-editor');
  if (!form) return;
  initialized = true;

  const addBtn = el('skills-add-btn');
  const cancelBtn = el('skill-cancel-btn');
  const range = el('skill-level-input');
  const nameInput = el('skill-name-input');

  addBtn?.addEventListener('click', () => openEditor());

  cancelBtn?.addEventListener('click', closeEditor);

  range?.addEventListener('input', updateLevelValue);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput ? nameInput.value.trim() : '';
    const level = range ? Number(range.value) : 50;

    if (!name) {
      nameInput?.focus();
      notify('请填写技能名称');
      return;
    }

    try {
      if (editingId) {
        await updateSkill(editingId, { name, level });
      } else {
        await addSkill(name, level);
      }
      closeEditor();
      await refreshSkills();
      notify('已保存');
    } catch (error) {
      console.error('保存技能失败:', error);
      notify(`保存失败：${error.message}`);
    }
  });

  applyTexts();
  refreshSkills();

  document.addEventListener('languageChange', () => {
    applyTexts();
    render();
  });

  // 管理员登录/退出时重绘，显示或隐藏每条技能的编辑按钮
  const observer = new MutationObserver(() => render());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
