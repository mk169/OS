// App-weiter Design-Stil der Startseite.
//
// Analog zur Akzentfarbe (lib/akzent.js) wählt der Nutzer in den
// Einstellungen einen Stil. Anders als die Akzentfarbe ist der Stil keine
// CSS-Variable, sondern schaltet auf der Startseite (Dashboard) zwischen mehreren
// unterschiedlich gestalteten Layout-Varianten um. Diese Datei hält nur die
// Metadaten und den Standardwert; die konkrete Darstellung liegt im Dashboard.

export const STILE = [
  {
    id: "todo",
    name: "Standard",
    beschreibung: "Klare Karten, farbige Akzente",
    emoji: "✅",
  },
  {
    id: "gamified",
    name: "Gamified",
    beschreibung: "Level, Fortschritt & Belohnung – wie Habitica",
    emoji: "🎮",
  },
  {
    id: "lifeos",
    name: "Life OS",
    beschreibung: "Dunkles Kommandopult – Gold, Serife & Mono",
    emoji: "📟",
  },
  {
    id: "lockedin",
    name: "Locked In",
    beschreibung: "Kompromisslos & monochrom – Disziplin im Fokus",
    emoji: "🔒",
  },
]

export const STIL_STANDARD = "todo"

// Gültigen Stil-Schlüssel sicherstellen (Fallback auf den Standard).
export function normalisiereStil(schluessel) {
  return STILE.some((s) => s.id === schluessel) ? schluessel : STIL_STANDARD
}
