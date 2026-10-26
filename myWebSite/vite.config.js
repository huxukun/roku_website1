import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Three.js 只被按需加载的 3D 场景使用，单独成 chunk 便于延迟下载
          if (id.includes('node_modules/three')) return 'three'
        }
      }
    }
  }
})
