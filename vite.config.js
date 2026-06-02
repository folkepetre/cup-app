import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Sätt base till '/<repo-namn>/' om du hostar på GitHub Pages i en underkatalog
  // base: '/min-cup/',
})
