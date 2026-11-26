import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/dancrrr/ on GitHub Pages.
export default defineConfig({
  base: '/dancrrr/',
  plugins: [react()],
})
