import { inTagen } from "./datum"

// Spaced Repetition nach dem SM-2-Algorithmus (wie Anki, tagesbasiert).
// Jede Karte hat:
//   intervall – Abstand in Tagen bis zur nächsten Wiederholung
//   ease      – Leichtigkeitsfaktor (Start 2.5, nie unter 1.3)
//   faellig   – Datum der nächsten Wiederholung
//
// Bewertungen:
//   nochmal – vergessen: Karte kommt heute gleich wieder, ease sinkt
//   schwer  – gerade so geschafft: kleiner Schritt, ease sinkt leicht
//   gut     – normal gewusst: Abstand × ease
//   einfach – mühelos: größerer Sprung, ease steigt

export function bewerteKarte(karte, stufe) {
  const ease = karte.ease ?? 2.5
  const intervall = karte.intervall ?? 0

  let neuesIntervall = intervall
  let neueEase = ease

  if (stufe === "nochmal") {
    neuesIntervall = 0
    neueEase = Math.max(1.3, ease - 0.2)
  } else if (stufe === "schwer") {
    neuesIntervall = Math.max(1, Math.round(intervall * 1.2))
    neueEase = Math.max(1.3, ease - 0.15)
  } else if (stufe === "gut") {
    neuesIntervall = intervall === 0 ? 1 : Math.round(intervall * ease)
  } else if (stufe === "einfach") {
    neuesIntervall = intervall === 0 ? 4 : Math.round(intervall * ease * 1.3)
    neueEase = ease + 0.15
  }

  return {
    intervall: neuesIntervall,
    ease: neueEase,
    faellig: inTagen(neuesIntervall),
  }
}

export function intervallText(tage) {
  if (tage === 0) return "gleich nochmal"
  if (tage === 1) return "1 Tag"
  if (tage < 30) return `${tage} Tage`
  const monate = Math.round(tage / 30)
  return monate === 1 ? "1 Monat" : `${monate} Monate`
}

// Liest eine Anki-Textexport-Datei ein (Anki: Datei → Exportieren →
// "Notizen als Textdatei"). Format: eine Karte pro Zeile,
// Vorder- und Rückseite durch Tab getrennt, Kopfzeilen beginnen mit "#".
export function parseAnkiExport(text) {
  let trenner = "\t"
  const karten = []

  for (const zeile of text.split(/\r?\n/)) {
    if (!zeile.trim()) continue

    if (zeile.startsWith("#")) {
      const m = zeile.match(/^#separator:(.+)$/i)
      if (m) {
        const wert = m[1].trim().toLowerCase()
        if (wert === "tab") trenner = "\t"
        else if (wert === "semicolon") trenner = ";"
        else if (wert === "comma") trenner = ","
        else if (wert === "pipe") trenner = "|"
        else if (wert.length === 1) trenner = wert
      }
      continue
    }

    const teile = zeile.split(trenner)
    if (teile.length < 2) continue

    const vorne = bereinige(teile[0])
    const hinten = bereinige(teile[1])
    if (vorne && hinten) karten.push({ vorne, hinten })
  }

  return karten
}

// Entfernt HTML-Reste und Anführungszeichen aus Anki-Feldern.
function bereinige(feld) {
  return feld
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/^"|"$/g, "")
    .replace(/""/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}
