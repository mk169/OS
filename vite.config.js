import { readFileSync } from "node:fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Versionsnummer aus der package.json und das Datum des Builds in die App
// geben – daraus baut src/lib/version.js den Versions-Stempel in den
// Einstellungen.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  // Relative Basis, damit die App auch unter einem Unterpfad läuft
  // (z. B. GitHub Pages: username.github.io/OS/).
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATUM__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react(), tailwindcss()],
})
