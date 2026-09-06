// Zwei Seitenbreiten, mehr nicht. Vorher hatte jede Seite ihre eigene
// Entscheidung (2xl, 3xl, 4xl, 5xl) – beim Wechsel von Todos nach Habits
// sprang der Inhalt um 256 Pixel, ohne dass sich am Inhalt etwas geändert
// hätte. Die Regel ist einfach:
//
//   SEITE_LESEN   eine Spalte: Listen, Formulare, Fließtext.
//   SEITE_RASTER  mehrere Spalten: Karten, Kalender, Diagramme.
//
// Die Stil-Varianten der Startseite (Clean Girl, Notion, Arcade …) setzen
// bewusst eigene, engere Breiten – dort ist die Breite Teil des Looks.

export const SEITE_LESEN = "mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10"
export const SEITE_RASTER = "mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10"
