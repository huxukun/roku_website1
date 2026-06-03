// 管理员密码配置
export const ADMIN_PASSWORD = '123456hxk';

// 本地存储键名
export const ADMIN_AUTH_KEY = 'synthwave_admin_auth';
export const ADMIN_AUTH_EXPIRY = 24 * 60 * 60 * 1000; // 24小时有效期

// 验证密码
export function verifyAdminPassword(password) {
  return password === ADMIN_PASSWORD;
}

// 检查是否已认证
export function isAdminAuthenticated() {
  try {
    const auth = localStorage.getItem(ADMIN_AUTH_KEY);
    if (!auth) return false;
    
    const { timestamp } = JSON.parse(auth);
    const now = Date.now();
    
    if (now - timestamp > ADMIN_AUTH_EXPIRY) {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return false;
  }
}

// 保存认证状态
export function saveAdminAuth() {
  const auth = {
    timestamp: Date.now()
  };
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth));
}

// 清除认证状态
export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}
