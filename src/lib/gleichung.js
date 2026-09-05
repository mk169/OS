// „Dein Leben ist eine Gleichung." – die übergeordnete Ebene.
//
// Ein Nordstern (was du gerade wirklich willst) plus Gewichte je Bereich:
//   Momentum = Σ(gewicht_i · form_i) / Σ gewicht_i         (y = gewichtete x's)
//
// „form_i" ist die jüngste Form eines Sensors (0–100), abgeleitet aus den
// letzten 7 Tagen – kein Lebenszeit-Fortschritt, sondern „wie stark läuft der
// Bereich gerade". Bewusst heuristisch und ehrlich benannt.

import { inTagen } from "./datum"
import { istFaellig } from "./spacedRepetition"
import { durchschnitt, istAusgefuellt } from "./vitalitaet"

// Die Bereiche der Gleichung = dieselben Sensoren wie im Mentor.
export const GLEICHUNG_BEREICHE = [
  { key: "vitalitaet", label: "Vitalität", emoji: "❤️", seite: "dailyops" },
  { key: "habits", label: "Habits", emoji: "🔁", seite: "habits" },
  { key: "fokus", label: "Fokus", emoji: "🎯", seite: "deepwork" },
  { key: "aufgaben", label: "Aufgaben", emoji: "✅", seite: "todos" },
  { key: "lernen", label: "Lernen", emoji: "🧠", seite: "sammeln" },
  { key: "finanzen", label: "Finanzen", emoji: "💶", seite: "finanzen" },
]

// Standard: Selbstverbesserungs-Kern betont, Finanzen aus (Gewicht 0).
export const STANDARD_GLEICHUNG = {
  nordstern: "",
  gewichte: {
    vitalitaet: 30,
    habits: 25,
    fokus: 25,
    aufgaben: 15,
    lernen: 5,
    finanzen: 0,
  },
}

const clamp = (x, min = 0, max = 100) => Math.max(min, Math.min(max, x))

function tage(n, offset = 0) {
  return new Set(Array.from({ length: n }, (_, i) => inTagen(-(i + offset))))
}

// Jüngste Form je Bereich als 0–100 (oder null = keine Datenbasis).
export function bereichForm(key, daten) {
  const {
    todos = [],
    habits = [],
    deepwork = [],
    transaktionen = [],
    vitalitaet = [],
    karten = [],
  } = daten ?? {}
  const letzte7 = tage(7)
  const davor7 = tage(7, 7)

  switch (key) {
    case "vitalitaet": {
      const eintr = vitalitaet.filter(
        (e) => letzte7.has(e.datum) && istAusgefuellt(e)
      )
      const avg = durchschnitt(eintr, "energie")
      if (avg == null) return null
      return clamp(((avg - 1) / 4) * 100)
    }
    case "habits": {
      if (habits.length === 0) return null
      const erl = habits.reduce(
        (a, h) => a + (h.erledigtAn ?? []).filter((d) => letzte7.has(d)).length,
        0
      )
      return clamp((erl / (habits.length * 7)) * 100)
    }
    case "fokus": {
      if (deepwork.length === 0) return null
      const min = deepwork
        .filter((s) => letzte7.has(s.datum))
        .reduce((a, s) => a + (Number(s.minuten) || 0), 0)
      // Zielmarke: 300 Min. (5 h) konzentrierte Arbeit pro Woche = 100 %.
      return clamp((min / 300) * 100)
    }
    case "aufgaben": {
      if (todos.length === 0) return null
      const heuteKey = inTagen(0)
      const ueberfaellig = todos.filter(
        (t) => !t.erledigt && t.datum && t.datum < heuteKey
      ).length
      return clamp(100 - ueberfaellig * 12)
    }
    case "lernen": {
      if (karten.length === 0) return null
      const faellig = karten.filter(istFaellig).length
      return clamp(100 - faellig * 8)
    }
    case "finanzen": {
      if (transaktionen.length === 0) return null
      const summe = (menge) =>
        transaktionen
          .filter((t) => t.art === "ausgabe" && menge.has(t.datum))
          .reduce((a, t) => a + (Number(t.betrag) || 0), 0)
      const jetzt = summe(letzte7)
      const vorher = summe(davor7)
      if (vorher === 0) return jetzt === 0 ? null : 50
      // Weniger als Vorwoche = besser (max ±50 % um die neutrale Mitte).
      return clamp(50 + ((vorher - jetzt) / vorher) * 50)
    }
    default:
      return null
  }
}

// Gesamt-Momentum + Beiträge je Bereich. Bereiche ohne Gewicht (0) oder ohne
// Datenbasis fließen nicht ins gewichtete Mittel ein, werden aber gelistet.
export function berechneGleichung(gleichung, daten) {
  const gewichte = gleichung?.gewichte ?? STANDARD_GLEICHUNG.gewichte
  const beitraege = GLEICHUNG_BEREICHE.map((b) => {
    const gewicht = Number(gewichte[b.key]) || 0
    const form = bereichForm(b.key, daten)
    return { ...b, gewicht, form }
  })

  const wirksam = beitraege.filter((b) => b.gewicht > 0 && b.form != null)
  const summeGewicht = wirksam.reduce((a, b) => a + b.gewicht, 0)
  const gesamt =
    summeGewicht > 0
      ? Math.round(
          wirksam.reduce((a, b) => a + b.gewicht * b.form, 0) / summeGewicht
        )
      : null

  // Anteil jedes Bereichs am Gesamt-Momentum (für die Balken).
  const beitraegeMitAnteil = beitraege.map((b) => ({
    ...b,
    anteil:
      summeGewicht > 0 && b.gewicht > 0 && b.form != null
        ? Math.round((b.gewicht / summeGewicht) * 100)
        : 0,
  }))

  return {
    nordstern: gleichung?.nordstern ?? "",
    gesamt, // 0–100 oder null
    summeGewicht,
    beitraege: beitraegeMitAnteil,
    aktiv: (gleichung?.nordstern ?? "").trim() !== "" || summeGewicht > 0,
  }
}

// Kurzes verbales Etikett für einen Momentum-Wert.
export function momentumLabel(gesamt) {
  if (gesamt == null) return "–"
  if (gesamt >= 80) return "Stark"
  if (gesamt >= 60) return "Solide"
  if (gesamt >= 40) return "Wackelig"
  return "Schwach"
}
