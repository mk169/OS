import { inTagen } from "./datum"

// Spaced Repetition nach einem optimierten SM-2 (tagesbasiert, wie Anki).
// Jede Karte hat:
//   intervall      – Abstand in Tagen bis zur nächsten Wiederholung
//   ease           – Leichtigkeitsfaktor (Start 2.5, zwischen 1.3 und 2.7)
//   faellig        – Datum der nächsten Wiederholung
//   wiederholungen – Anzahl korrekter Wiederholungen in Folge
//   lapses         – wie oft die Karte vergessen wurde
//
// Bewertungen:
//   nochmal – vergessen: Karte kommt heute gleich wieder, ease sinkt
//   schwer  – gerade so: kleiner Schritt, ease sinkt leicht
//   gut     – normal gewusst: Abstand × ease
//   einfach – mühelos: größerer Sprung, ease steigt

const EASE_MIN = 1.3
const EASE_MAX = 2.7

function begrenzeEase(e) {
  return Math.min(EASE_MAX, Math.max(EASE_MIN, Number(e.toFixed(2))))
}

// Kleine Streuung (±5%) ab 3 Tagen, damit sich Wiederholungen nicht an
// einzelnen Tagen stapeln – der gespeicherte Basis-Intervall bleibt klar.
function mitStreuung(tage) {
  if (tage < 3) return tage
  const spanne = Math.max(1, Math.round(tage * 0.05))
  return tage + Math.floor(Math.random() * (2 * spanne + 1)) - spanne
}

// Adaptive Faktoren: Antwort-Tempo und Konsistenz der Karte fließen in
// das nächste Intervall ein.
//   Tempo:      schnelle richtige Antwort (< 6 s) → Intervall ×1.1,
//               zähe Antwort (> 20 s) → ×0.85 (nur bei „gut"/„einfach").
//   Konsistenz: Fehlerquote > 30 % → ×0.9 und kein Ease-Anstieg;
//               Streak ≥ 5 ohne hohe Fehlerquote → ×1.05.
function tempoFaktor(sekunden) {
  if (sekunden == null) return 1
  if (sekunden < 6) return 1.1
  if (sekunden > 20) return 0.85
  return 1
}

export function bewerteKarte(karte, stufe, antwortSekunden = null) {
  const ease = karte.ease ?? 2.5
  const intervall = karte.intervall ?? 0
  const wiederholungen = karte.wiederholungen ?? 0
  const lapses = karte.lapses ?? 0

  const versuche = wiederholungen + lapses
  const fehlerquote = versuche > 0 ? lapses / versuche : 0
  const wacklig = fehlerquote > 0.3

  let neuesIntervall = intervall
  let neueEase = ease
  let neueWiederholungen = wiederholungen + 1
  let neueLapses = lapses

  if (stufe === "nochmal") {
    neuesIntervall = 0
    neueEase = begrenzeEase(ease - 0.2)
    neueWiederholungen = 0
    neueLapses = lapses + 1
  } else if (stufe === "schwer") {
    // mindestens einen Tag Fortschritt, aber vorsichtiger als „gut"
    neuesIntervall =
      intervall === 0 ? 1 : Math.max(intervall + 1, Math.round(intervall * 1.2))
    neueEase = begrenzeEase(ease - 0.15)
  } else if (stufe === "gut" || stufe === "einfach") {
    const basisEase = stufe === "einfach" ? ease * 1.3 : ease
    const start = stufe === "einfach" ? 4 : 1
    let faktor = tempoFaktor(antwortSekunden)
    if (wacklig) faktor *= 0.9
    else if (wiederholungen >= 5) faktor *= 1.05
    neuesIntervall =
      intervall === 0
        ? start
        : Math.max(intervall + 1, Math.round(intervall * basisEase * faktor))
    if (stufe === "einfach" && !wacklig) neueEase = begrenzeEase(ease + 0.15)
  }

  // Gleitender Schnitt der Antwortzeiten (fürs Lerntempo der Karte).
  const dauerSchnitt =
    antwortSekunden == null
      ? karte.dauerSchnitt
      : karte.dauerSchnitt == null
        ? antwortSekunden
        : Math.round((karte.dauerSchnitt * 2 + antwortSekunden) / 3)

  return {
    intervall: neuesIntervall,
    ease: neueEase,
    wiederholungen: neueWiederholungen,
    lapses: neueLapses,
    dauerSchnitt,
    faellig: inTagen(mitStreuung(neuesIntervall)),
  }
}

// Mischt eine Liste (Fisher-Yates) ohne das Original zu verändern.
export function mische(liste) {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}

export function intervallText(tage) {
  if (tage === 0) return "gleich nochmal"
  if (tage === 1) return "1 Tag"
  if (tage < 30) return `${tage} Tage`
  const monate = Math.round(tage / 30)
  return monate === 1 ? "1 Monat" : `${monate} Monate`
}

// Liest eine Textdatei mit Karten ein. Format: eine Karte pro Zeile,
// Vorder- und Rückseite durch Tab (oder ;, ,, |) getrennt. Kopfzeilen
// beginnen mit „#" (z. B. #separator:tab).
export function parseTxtImport(text) {
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

    // Fällt auf gängige Trennzeichen zurück, wenn kein Tab vorkommt.
    let teile = zeile.split(trenner)
    if (teile.length < 2 && trenner === "\t") {
      for (const t of [";", ",", "|"]) {
        if (zeile.includes(t)) {
          teile = zeile.split(t)
          break
        }
      }
    }
    if (teile.length < 2) continue

    const vorne = bereinige(teile[0])
    const hinten = bereinige(teile.slice(1).join(" "))
    if (vorne && hinten) karten.push({ vorne, hinten })
  }

  return karten
}

// Entfernt HTML-Reste und Anführungszeichen aus importierten Feldern.
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
