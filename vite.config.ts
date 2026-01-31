import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    include: ['phaser'],
  },
  build: {
    target: 'es2020',
  },
})
