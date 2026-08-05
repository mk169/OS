// Der „Mentor": ein regelbasierter Rechenkern, der quer über alle Sensoren
// (Vitalität, Habits, Fokus, Finanzen, Aufgaben, Lernen) liest und daraus
// Befunde ableitet – Trends, Muster/Korrelationen und Hinweise.
//
// Leitidee der Vorlage: „Dein Leben ist eine Gleichung." Jeder Bereich ist
// ein x, das in einen Store schreibt; hier werden die x'e zueinander in
// Beziehung gesetzt. Es steckt kein LLM dahinter – nur ehrliche Statistik
// über die eigenen Daten, mit konservativen Schwellen, damit bei dünner
// Datenlage nichts Erfundenes behauptet wird.

import { inTagen, heute } from "./datum"
import { istFaellig } from "./spacedRepetition"
import { geld } from "./finanzen"
import {
  durchschnitt,
  eineStelle,
  istAusgefuellt,
  SCHLAF_GUT,
  SCHLAF_KNAPP,
} from "./vitalitaet"

// Reihenfolge/Gewichtung der Befund-Arten (kleiner = weiter oben).
const ART_RANG = { muster: 0, trend: 1, hinweis: 2, positiv: 3, info: 4 }

// Liste von Datums-Schlüsseln „JJJJ-MM-TT" für n Tage, `offset` Tage zurück.
// tageZurueck(7) → heute … vor 6 Tagen. tageZurueck(7, 7) → die 7 Tage davor.
function tageZurueck(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => inTagen(-(i + offset)))
}

function summe(liste) {
  return liste.reduce((a, b) => a + b, 0)
}

// ── Aggregate je Sensor über eine Tagesmenge ────────────────────────────────

function fokusMinuten(deepwork, tage) {
  const set = new Set(tage)
  return summe(
    deepwork.filter((s) => set.has(s.datum)).map((s) => Number(s.minuten) || 0)
  )
}

function habitErledigungen(habits, tage) {
  const set = new Set(tage)
  return summe(
    habits.map((h) => (h.erledigtAn ?? []).filter((d) => set.has(d)).length)
  )
}

function vitalDurchschnitt(vitalitaet, tage, feld) {
  const set = new Set(tage)
  return durchschnitt(
    vitalitaet.filter((e) => set.has(e.datum)),
    feld
  )
}

function ausgabenSumme(transaktionen, tage) {
  const set = new Set(tage)
  return summe(
    transaktionen
      .filter((t) => t.art === "ausgabe" && set.has(t.datum))
      .map((t) => Number(t.betrag) || 0)
  )
}

// Längste aktuelle Streak (aufeinanderfolgende Tage) über alle Habits.
// Startet heute oder – falls heute noch offen – gestern.
function besteAktuelleStreak(habits) {
  let best = null
  for (const h of habits) {
    const done = new Set(h.erledigtAn ?? [])
    let start = done.has(heute()) ? 0 : 1
    let streak = 0
    for (let i = start; i < 400; i++) {
      if (done.has(inTagen(-i))) streak++
      else break
    }
    if (streak >= 3 && (!best || streak > best.streak)) {
      best = { name: h.name, streak }
    }
  }
  return best
}

// Durchschnitt eines Vitalitäts-Feldes, aufgeteilt nach einer Bedingung.
// Gibt { ja, nein, nJa, nNein } mit Mittelwerten oder null zurück.
function geteilterSchnitt(eintraege, feld, bedingung) {
  const ja = []
  const nein = []
  for (const e of eintraege) {
    const v = e[feld]
    if (typeof v !== "number" || !Number.isFinite(v)) continue
    ;(bedingung(e) ? ja : nein).push(v)
  }
  const mittel = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  return { ja: mittel(ja), nein: mittel(nein), nJa: ja.length, nNein: nein.length }
}

// ── Befunde ─────────────────────────────────────────────────────────────────

export function berechneBefunde(data) {
  const {
    todos = [],
    habits = [],
    deepwork = [],
    transaktionen = [],
    vitalitaet = [],
    karten = [],
    waehrung = "EUR",
  } = data ?? {}

  const befunde = []
  const add = (b) => befunde.push(b)

  const letzte7 = tageZurueck(7)
  const davor7 = tageZurueck(7, 7)
  const vitalGefuellt = vitalitaet.filter(istAusgefuellt)

  // 1) Fokus-Trend (Woche vs. Vorwoche)
  {
    const jetzt = fokusMinuten(deepwork, letzte7)
    const vorher = fokusMinuten(deepwork, davor7)
    if (jetzt > 0 || vorher > 0) {
      const std = (m) => eineStelle(m / 60)
      if (vorher > 0 && jetzt >= vorher * 1.2) {
        add({
          id: "fokus-hoch",
          art: "positiv",
          emoji: "🎯",
          quelle: "fokus",
          titel: "Dein Fokus zieht an",
          text: `${std(jetzt)} h Fokus diese Woche – nach ${std(vorher)} h in der Vorwoche. Weiter so.`,
          staerke: jetzt - vorher,
        })
      } else if (vorher > 0 && jetzt <= vorher * 0.7) {
        add({
          id: "fokus-runter",
          art: "hinweis",
          emoji: "🎯",
          quelle: "fokus",
          titel: "Dein Fokus lässt nach",
          text: `Nur ${std(jetzt)} h Fokus diese Woche – Vorwoche waren es ${std(vorher)} h. Plane dir einen festen Block ein.`,
          staerke: vorher - jetzt,
        })
      } else {
        add({
          id: "fokus-stabil",
          art: "info",
          emoji: "🎯",
          quelle: "fokus",
          titel: "Fokus stabil",
          text: `${std(jetzt)} h konzentrierte Arbeit in den letzten 7 Tagen.`,
          staerke: jetzt,
        })
      }
    }
  }

  // 2) Habit-Konstanz (Woche vs. Vorwoche) + beste Streak
  if (habits.length > 0) {
    const jetzt = habitErledigungen(habits, letzte7)
    const vorher = habitErledigungen(habits, davor7)
    if (jetzt > 0 || vorher > 0) {
      const richtung =
        jetzt > vorher ? "mehr" : jetzt < vorher ? "weniger" : "gleich viele"
      add({
        id: "habit-trend",
        art: "trend",
        emoji: "🔁",
        quelle: "habits",
        titel: "Habit-Konstanz",
        text: `${jetzt} Erledigungen diese Woche (Vorwoche ${vorher}) – ${richtung} als zuvor.`,
        staerke: Math.abs(jetzt - vorher),
      })
    }
    const streak = besteAktuelleStreak(habits)
    if (streak) {
      add({
        id: "habit-streak",
        art: "positiv",
        emoji: "🔥",
        quelle: "habits",
        titel: `${streak.streak} Tage am Stück`,
        text: `„${streak.name}" läuft seit ${streak.streak} Tagen ununterbrochen. Nicht heute brechen.`,
        staerke: streak.streak,
      })
    }
  }

  // 3) Energie-Trend (Woche vs. Vorwoche)
  {
    const jetzt = vitalDurchschnitt(vitalitaet, letzte7, "energie")
    const vorher = vitalDurchschnitt(vitalitaet, davor7, "energie")
    if (jetzt != null && vorher != null && Math.abs(jetzt - vorher) >= 0.5) {
      const rauf = jetzt > vorher
      add({
        id: "energie-trend",
        art: "trend",
        emoji: rauf ? "📈" : "📉",
        quelle: "vitalitaet",
        titel: rauf ? "Deine Energie steigt" : "Deine Energie sinkt",
        text: `Energie im Schnitt ${eineStelle(jetzt)}/5 diese Woche gegenüber ${eineStelle(vorher)}/5 in der Vorwoche.`,
        staerke: Math.abs(jetzt - vorher) * 10,
      })
    }
  }

  // 4) Muster: Schlaf ↔ Energie (Signatur-Befund)
  {
    const g = geteilterSchnitt(
      vitalGefuellt,
      "energie",
      (e) => typeof e.schlaf === "number" && e.schlaf >= SCHLAF_GUT
    )
    // „nein" hier = alle mit Energie, aber nicht ≥ SCHLAF_GUT; wir wollen
    // gezielt die knappen Nächte vergleichen:
    const knapp = geteilterSchnitt(
      vitalGefuellt.filter(
        (e) => typeof e.schlaf === "number" && e.schlaf <= SCHLAF_KNAPP
      ),
      "energie",
      () => true
    )
    if (g.nJa >= 2 && knapp.nJa >= 2 && g.ja != null && knapp.ja != null) {
      const diff = g.ja - knapp.ja
      if (diff >= 0.6) {
        add({
          id: "schlaf-energie",
          art: "muster",
          emoji: "😴",
          quelle: "vitalitaet",
          titel: "Schlaf kauft dir Energie",
          text: `Nach Nächten mit ≥${SCHLAF_GUT} h liegt deine Energie bei ${eineStelle(g.ja)}/5 – nach ≤${SCHLAF_KNAPP} h nur bei ${eineStelle(knapp.ja)}/5. Schütze den Schlaf.`,
          staerke: diff * 12,
        })
      }
    }
  }

  // 5) Muster: Bewegung ↔ Stimmung
  {
    const g = geteilterSchnitt(vitalGefuellt, "stimmung", (e) => e.bewegung === true)
    if (g.nJa >= 2 && g.nNein >= 2 && g.ja != null && g.nein != null) {
      const diff = g.ja - g.nein
      if (diff >= 0.5) {
        add({
          id: "bewegung-stimmung",
          art: "muster",
          emoji: "🏃",
          quelle: "vitalitaet",
          titel: "Bewegung hebt die Stimmung",
          text: `An Tagen mit Bewegung liegt deine Stimmung bei ${eineStelle(g.ja)}/5 – ohne bei ${eineStelle(g.nein)}/5.`,
          staerke: diff * 11,
        })
      }
    }
  }

  // 6) Muster: Fokus ↔ Energie (zwei Module verbunden)
  {
    const fokusTage = new Set(deepwork.map((s) => s.datum))
    const g = geteilterSchnitt(vitalGefuellt, "energie", (e) =>
      fokusTage.has(e.datum)
    )
    if (g.nJa >= 2 && g.nNein >= 2 && g.ja != null && g.nein != null) {
      const diff = g.ja - g.nein
      if (Math.abs(diff) >= 0.5) {
        const hoch = diff > 0
        add({
          id: "fokus-energie",
          art: "muster",
          emoji: "🔗",
          quelle: "fokus",
          titel: hoch
            ? "Fokus-Tage sind Energie-Tage"
            : "Fokus zehrt an deiner Energie",
          text: hoch
            ? `An Tagen mit Fokus-Session liegt deine Energie bei ${eineStelle(g.ja)}/5, sonst bei ${eineStelle(g.nein)}/5.`
            : `An Fokus-Tagen sinkt deine Energie auf ${eineStelle(g.ja)}/5 (sonst ${eineStelle(g.nein)}/5) – gönn dir danach Pausen.`,
          staerke: Math.abs(diff) * 10,
        })
      }
    }
  }

  // 7) Ausgaben-Trend (Woche vs. Vorwoche)
  {
    const jetzt = ausgabenSumme(transaktionen, letzte7)
    const vorher = ausgabenSumme(transaktionen, davor7)
    if (vorher > 0 && jetzt >= vorher * 1.3) {
      add({
        id: "ausgaben-hoch",
        art: "hinweis",
        emoji: "💶",
        quelle: "finanzen",
        titel: "Ausgaben ziehen an",
        text: `${geld(jetzt, waehrung)} diese Woche gegenüber ${geld(vorher, waehrung)} in der Vorwoche.`,
        staerke: jetzt - vorher,
      })
    }
  }

  // 8) Fällige Karteikarten
  {
    const faellig = karten.filter(istFaellig).length
    if (faellig > 0) {
      add({
        id: "karten-faellig",
        art: "hinweis",
        emoji: "🧠",
        quelle: "lernen",
        titel: `${faellig} ${faellig === 1 ? "Karte" : "Karten"} fällig`,
        text: "Kurze Wiederholung hält das Wissen frisch – projektübergreifend in Sammeln → Lernen.",
        staerke: faellig,
      })
    }
  }

  // 9) Überfällige Aufgaben
  {
    const heuteKey = heute()
    const ueberfaellig = todos.filter(
      (t) => !t.erledigt && t.datum && t.datum < heuteKey
    ).length
    if (ueberfaellig > 0) {
      add({
        id: "todos-ueberfaellig",
        art: "hinweis",
        emoji: "⏰",
        quelle: "aufgaben",
        titel: `${ueberfaellig} überfällige ${ueberfaellig === 1 ? "Aufgabe" : "Aufgaben"}`,
        text: "Neu terminieren oder abhaken – Altlasten ziehen den Kopf runter.",
        staerke: ueberfaellig,
      })
    }
  }

  // 10) Nudges rund um Vitalität (nur wenn sonst wenig los ist)
  {
    const heuteEingecheckt = vitalGefuellt.some((e) => e.datum === heute())
    if (!heuteEingecheckt) {
      add({
        id: "checkin-heute",
        art: "info",
        emoji: "❤️",
        quelle: "vitalitaet",
        titel: "Heute noch nicht eingecheckt",
        text: "Ein 10-Sekunden-Check-in in Vitalität gibt dem Mentor die Recovery-Achse.",
        staerke: 0,
      })
    }
    if (vitalGefuellt.length < 4) {
      add({
        id: "vitalitaet-mehr-daten",
        art: "info",
        emoji: "🌱",
        quelle: "vitalitaet",
        titel: "Der Mentor lernt noch",
        text: "Logge ein paar Tage Energie, Stimmung und Schlaf – ab ~4 Tagen tauchen die ersten Muster auf.",
        staerke: -1,
      })
    }
  }

  // Sortierung: erst nach Art (Muster/Trend zuerst), dann nach Stärke.
  befunde.sort(
    (a, b) =>
      (ART_RANG[a.art] ?? 9) - (ART_RANG[b.art] ?? 9) ||
      (b.staerke ?? 0) - (a.staerke ?? 0)
  )
  return befunde
}

// Übersicht, welche Sensoren schon Daten liefern (für die „connected"-Leiste).
export function sensorStatus(data) {
  const {
    todos = [],
    habits = [],
    deepwork = [],
    transaktionen = [],
    vitalitaet = [],
    karten = [],
  } = data ?? {}
  const liste = [
    { key: "vitalitaet", label: "Vitalität", emoji: "❤️", anzahl: vitalitaet.filter(istAusgefuellt).length },
    { key: "habits", label: "Habits", emoji: "🔁", anzahl: habits.length },
    { key: "fokus", label: "Fokus", emoji: "🎯", anzahl: deepwork.length },
    { key: "finanzen", label: "Finanzen", emoji: "💶", anzahl: transaktionen.length },
    { key: "aufgaben", label: "Aufgaben", emoji: "✅", anzahl: todos.length },
    { key: "lernen", label: "Lernen", emoji: "🧠", anzahl: karten.length },
  ]
  return liste.map((s) => ({ ...s, aktiv: s.anzahl > 0 }))
}
