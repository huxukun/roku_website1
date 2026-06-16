/**
 * ============================================================
 * AR NAV · 配置文件
 * ============================================================
 * 
 * 在这里填入你的 API Key！
 * 
 * 1. 高德地图 API Key（必需）
 *    申请地址: https://console.amap.com/
 *    类型选择: Web端 (JS API)
 * 
 * 2. 高德安全密钥 securityJsCode（v2.0必需）
 *    申请地址同上，创建应用后可以看到
 * 
 * 3. 和风天气 API Key（可选，用于天气显示）
 *    申请地址: https://console.qweather.com/
 * ============================================================
 */

export const CONFIG = {

  // ---- 高德地图配置 ----
  AMAP_KEY: '50f71de5377d5b77290559c916a6f41f',            // 高德 Web 端 JS API Key
  AMAP_SECURITY_CODE: 'e122e60f0f7f81ad1651710fa433022b',  // 高德安全密钥 securityJsCode (v2.0需要)

  // ---- 天气 API 配置（可选）----
  QWEATHER_KEY: '',         // ← 填入你的和风天气 API Key（可选）

  // ---- 导航模式：'riding'(骑行) / 'walking'(步行) / 'driving'(驾车) ----
  NAV_MODE: 'riding',

  // ---- 默认位置（获取定位失败时的兜底位置）----
  DEFAULT_LOCATION: {
    lng: 116.397428,
    lat: 39.90923,
    name: '北京'
  },

  // ---- 模拟数据（没有 Key 时也能看效果）----
  USE_MOCK_DATA: false,     // true=使用模拟数据（演示用），false=真实API

  // ---- 调试模式 ----
  DEBUG_NAV: true,          // true=在控制台输出详细导航日志，false=关闭日志

}
