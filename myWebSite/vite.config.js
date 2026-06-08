import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls']
  }
})
