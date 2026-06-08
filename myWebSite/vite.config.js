import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    }
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls']
  },
  build: {
    cssMinify: 'esbuild',
    cssCodeSplit: false,
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
