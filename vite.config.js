import { readFileSync } from "node:fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    tailwindcss(),
    // Service Worker: Die App ist ohne Server gedacht – dann soll sie auch
    // ohne Netz starten. Der Worker legt den gebauten Stand in den Cache und
    // liefert ihn offline aus; die Daten liegen ohnehin lokal.
    //
    // `autoUpdate` holt eine neue Fassung im Hintergrund und schaltet beim
    // nächsten Öffnen darauf um – ohne Update-Dialog, aber auch ohne dass
    // jemand dauerhaft auf einem alten Stand sitzen bleibt. Der Versions-
    // Stempel in den Einstellungen zeigt, was wirklich geladen ist.
    //
    // `manifest: false`: Das Web-App-Manifest liegt weiterhin von Hand in
    // public/manifest.webmanifest – eine Quelle, kein Duplikat.
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: [
        "favicon.svg",
        "icon.svg",
        "icon-180.png",
        "icon-192.png",
        "icon-512.png",
        "manifest.webmanifest",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        // Einstiegspunkt für jede Route (SPA), damit ein Reload offline
        // nicht ins Leere läuft.
        navigateFallback: "index.html",
      },
      devOptions: { enabled: false },
    }),
  ],
  // Tests laufen gegen die reine Logik in src/lib (Node-Umgebung, kein DOM).
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
})
