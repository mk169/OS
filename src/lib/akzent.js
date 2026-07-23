// App-weite Akzentfarbe.
//
// Die App nutzt in ihren Tailwind-Klassen die semantische Farbe `accent`
// (bg-accent-500, text-accent-300 …). Deren CSS-Variablen sind in index.css
// mit Indigo-Defaults vordefiniert. Hier liegen die auswählbaren Paletten und
// eine Funktion, die die Variablen zur Laufzeit auf `document.documentElement`
// setzt – dadurch färbt sich die gesamte App sofort um.
//
// Die Hexwerte entsprechen den Tailwind-Standardfarben (Stufen 50–600).

export const AKZENTE = {
  indigo:  { name: "Indigo",  50: "#eef2ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
  violet:  { name: "Violett", 50: "#f5f3ff", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
  blue:    { name: "Blau",    50: "#eff6ff", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
  emerald: { name: "Grün",    50: "#ecfdf5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669" },
  rose:    { name: "Rosé",    50: "#fff1f2", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48" },
  amber:   { name: "Amber",   50: "#fffbeb", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },
  cyan:    { name: "Cyan",    50: "#ecfeff", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
}

export const AKZENT_STANDARD = "indigo"

const STUFEN = [50, 200, 300, 400, 500, 600]

// Setzt die --color-accent-*-Variablen passend zur gewählten Farbe.
// Unbekannte Werte fallen auf den Standard zurück.
export function wendeAkzentAn(schluessel) {
  const palette = AKZENTE[schluessel] ?? AKZENTE[AKZENT_STANDARD]
  const wurzel = document.documentElement
  for (const stufe of STUFEN) {
    wurzel.style.setProperty(`--color-accent-${stufe}`, palette[stufe])
  }
}

// Liest die gespeicherte Akzentfarbe direkt aus localStorage (für den
// synchronen Aufruf beim App-Start, noch vor dem ersten Rendern).
export function gespeicherterAkzent() {
  try {
    const roh = localStorage.getItem("einstellungen")
    const wert = roh ? JSON.parse(roh)?.akzent : null
    return AKZENTE[wert] ? wert : AKZENT_STANDARD
  } catch {
    return AKZENT_STANDARD
  }
}
