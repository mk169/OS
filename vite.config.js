import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative Basis, damit die App auch unter einem Unterpfad läuft
  // (z. B. GitHub Pages: username.github.io/OS/).
  base: "./",
  plugins: [react(), tailwindcss()],
})
