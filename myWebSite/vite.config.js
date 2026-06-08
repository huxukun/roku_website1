import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  css: {
    // 禁用 lightningcss，改用传统的 CSS 处理方式
    lightningcss: false,
    // 确保使用传统的 CSS 处理
    devSourcemap: true,
    // CSS 模块配置
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // 确保正确处理静态资源
  publicDir: 'public',
  // 优化依赖
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls']
  },
  // 构建配置
  build: {
    // 使用传统的 CSS 压缩
    cssMinify: 'esbuild',
    // 禁用源代码映射的警告
    sourcemap: false,
    // 目标浏览器
    target: 'es2015',
    // 取消 chunk 分割以减少构建问题
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
