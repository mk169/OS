// Sichtbarer Versions-Stempel der App.
//
// Version und Build-Datum kommen aus dem Build (vite.config.js: `define`),
// die Version selbst aus der package.json. So gibt es nur eine Quelle für
// die Versionsnummer und der Stempel kann nie veralten. Im Dev-Server ohne
// die Werte fällt der Stempel auf „dev" zurück.

/* global __APP_VERSION__, __BUILD_DATUM__ */

export const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"

const BUILD_ISO = typeof __BUILD_DATUM__ === "string" ? __BUILD_DATUM__ : ""

// Build-Datum in deutscher Schreibweise (TT.MM.JJJJ), leer wenn unbekannt.
export const BUILD_DATUM = BUILD_ISO
  ? BUILD_ISO.split("-").reverse().join(".")
  : ""

// Zeile für den Fuß der Einstellungen: „OS · Version 1.0.0 · Stand 04.09.2026".
export function versionsStempel(appName = "OS") {
  const teile = [appName, `Version ${APP_VERSION}`]
  if (BUILD_DATUM) teile.push(`Stand ${BUILD_DATUM}`)
  return teile.join(" · ")
}
