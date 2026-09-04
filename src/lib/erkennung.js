import { inTagen } from "./datum"

// Rein lokale, musterbasierte Erkennung für die Inbox (Sekretär-Prinzip:
// vorbereiten, nicht entscheiden). Kein Sprachverständnis, keine KI, keine
// Cloud – nur ein begrenztes Set gängiger deutscher Zeitphrasen und ein
// einfacher Teilstring-Abgleich gegen bestehende Projektnamen.

// Wortgrenzen mit Unicode-Klassen statt "\b": Das eingebaute "\b" kennt nur
// ASCII-Wortzeichen, vor einem "ü" sieht es deshalb keine Grenze – "\bübermorgen"
// hätte nie getroffen. Reihenfolge zählt: "übermorgen" steht vor "morgen".
const VOR = "(?<![\\p{L}\\p{N}])"
const NACH = "(?![\\p{L}\\p{N}])"
const wort = (muster) => new RegExp(`${VOR}(?:${muster})${NACH}`, "iu")

const ZEITPHRASEN = [
  { muster: wort("heute"), tage: 0 },
  { muster: wort("übermorgen"), tage: 2 },
  { muster: wort("morgen"), tage: 1 },
  { muster: wort("nächste woche|in einer woche"), tage: 7 },
  { muster: wort("in (\\d+) wochen"), tage: (m) => Number(m[1]) * 7 },
  { muster: wort("in (\\d+) tagen"), tage: (m) => Number(m[1]) },
  { muster: wort("nächsten monat|in einem monat"), tage: 30 },
  { muster: wort("in (\\d+) monaten"), tage: (m) => Number(m[1]) * 30 },
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
