import { inTagen } from "./datum"

// Rein lokale, musterbasierte Erkennung für die Inbox (Sekretär-Prinzip:
// vorbereiten, nicht entscheiden). Kein Sprachverständnis, keine KI, keine
// Cloud – nur ein begrenztes Set gängiger deutscher Zeitphrasen und ein
// einfacher Teilstring-Abgleich gegen bestehende Projektnamen.

const ZEITPHRASEN = [
  { muster: /\bheute\b/i, tage: 0 },
  { muster: /\bübermorgen\b/i, tage: 2 },
  { muster: /\bmorgen\b/i, tage: 1 },
  { muster: /\bnächste woche\b|\bin einer woche\b/i, tage: 7 },
  { muster: /\bin (\d+) wochen\b/i, tage: (m) => Number(m[1]) * 7 },
  { muster: /\bin (\d+) tagen\b/i, tage: (m) => Number(m[1]) },
  { muster: /\bnächsten monat\b|\bin einem monat\b/i, tage: 30 },
  { muster: /\bin (\d+) monaten\b/i, tage: (m) => Number(m[1]) * 30 },
]

// Erkennt eine der obigen Zeitphrasen im Text und gibt das entsprechende
// Datum als ISO-String zurück, sonst null.
export function erkenneDatum(text) {
  if (!text) return null
  for (const { muster, tage } of ZEITPHRASEN) {
    const treffer = muster.exec(text)
    if (treffer) {
      return inTagen(typeof tage === "function" ? tage(treffer) : tage)
    }
  }
  return null
}

// Erkennt den Namen eines bestehenden, nicht archivierten Projekts als
// Teilstring im Text (case-insensitiv). Gibt das erste passende Projekt
// zurück, sonst null.
export function erkenneProjekt(text, projekte) {
  if (!text) return null
  const klein = text.toLowerCase()
  return (
    projekte.find(
      (p) => !p.archiviert && p.name && klein.includes(p.name.toLowerCase())
    ) ?? null
  )
}
