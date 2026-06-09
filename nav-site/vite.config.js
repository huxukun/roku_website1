import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  build: {
    cssMinify: false,
    sourcemap: false,
    target: 'es2015'
  }
})
