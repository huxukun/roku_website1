// 默认个人信息配置
import { t } from './i18n.js';

export const DEFAULT_PROFILE = {
  avatar: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=200&h=200&fit=crop',
  // bio 会在运行时通过 getDefaultBio() 获取，以便支持多语言
};

// 获取默认的个人介绍（支持多语言）
export function getDefaultBio() {
  return t('default-bio');
}

// LocalStorage 键名
export const LOCAL_STORAGE_PROFILE_KEY = 'synthwave-profile';
