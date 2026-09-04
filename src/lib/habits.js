// Habit-Logik: Datenzugriff, Streaks und das Disziplin-Modell.
//
// Die Habits werden nicht nur auf der Habits-Seite gebraucht, sondern auch
// im Dashboard, in der Locked-In-Kommandozentrale und im Wochenbericht.
// Deshalb liegt die Rechnung hier in der lib und nicht in der Seite – die
// Komponenten zeigen nur noch an.

import useStored from "./useStored"
import { heute, montagVon, schluessel, wochenSchluessel } from "./datum"

export const STANDARD_BEREICHE = [
  { id: "koerper", name: "Körper", farbe: "emerald" },
  { id: "bildung", name: "Bildung", farbe: "blue" },
  { id: "arbeit", name: "Arbeit", farbe: "violet" },
  { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
]

export const STANDARD_WOCHENZIEL = 3

export function useHabitDaten() {
  const [habits, setHabits] = useStored("habits", [])
  const [bereiche, setBereiche] = useStored("habitBereiche", STANDARD_BEREICHE)
  return { habits, setHabits, bereiche, setBereiche }
}

export function bereichVon(habit, bereiche) {
  return (
    bereiche.find((b) => b.id === habit.bereichId) ?? {
      name: "Allgemein",
      farbe: "gray",
    }
  )
}

export function alsKettenListe(habits) {
  const ketten = []
  const kinderVon = (id) => habits.filter((h) => h.stackNachId === id)

  function sammle(habit, kette) {
    kette.push(habit)
    for (const kind of kinderVon(habit.id)) sammle(kind, kette)
  }

  for (const h of habits) {
    const hatAnker = habits.some((x) => x.id === h.stackNachId)
    if (!hatAnker) {
      const kette = []
      sammle(h, kette)
      ketten.push(kette)
    }
  }
  return ketten
}

// ──────────────────────────────────────────────────────────────
// Locked In – Disziplin-Modell (tagesbasiert)
//
// Anders als der wochenbasierte Standard bewertet dieser Stil jeden Tag
// kompromisslos: Disziplin = Anteil der an dem Tag existierenden Habits, die
// erledigt wurden. Die Habit-`id` ist der Erstell-Zeitstempel (Date.now) und
// dient als Existenz-Nachweis, damit frisch angelegte Habits vergangene Tage
// nicht rückwirkend „brechen".
// ──────────────────────────────────────────────────────────────

export function existierteAm(habit, grenze) {
  return typeof habit.id !== "number" || habit.id <= grenze
}

// Habits, die an diesem Tag bereits existierten.
export function habitsAmTag(habits, datum) {
  const d = new Date(datum)
  d.setHours(23, 59, 59, 999)
  const grenze = d.getTime()
  return habits.filter((h) => existierteAm(h, grenze))
}

// Disziplin eines Tages: erledigt / gesamt + Prozent + Vollständigkeit.
export function disziplinAmTag(habits, datum) {
  const relevant = habitsAmTag(habits, datum)
  const key = schluessel(datum)
  const erledigt = relevant.filter((h) => h.erledigtAn.includes(key)).length
  const gesamt = relevant.length
  return {
    erledigt,
    gesamt,
    prozent: gesamt === 0 ? 0 : Math.round((erledigt / gesamt) * 100),
    vollstaendig: gesamt > 0 && erledigt === gesamt,
  }
}

// Tages-Streak: Anzahl aufeinanderfolgender vollständiger (oder eingefrorener)
// Tage bis heute. Der laufende Tag bricht die Serie nicht – er zählt erst,
// wenn er vollständig ist (Reset erst um Mitternacht).
export function disziplinStreak(habits, gefroren = new Set()) {
  let zaehler = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  if (!disziplinAmTag(habits, cursor).vollstaendig) {
    cursor.setDate(cursor.getDate() - 1)
  }
  for (let i = 0; i < 3650; i++) {
    const status = disziplinAmTag(habits, cursor)
    if (status.gesamt === 0) break
    if (status.vollstaendig || gefroren.has(schluessel(cursor))) {
      zaehler++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return zaehler
}

// Edge Score: Durchschnittliche Disziplin der letzten 7 Tage mit Habits.
export function edgeScore(habits) {
  let summe = 0
  let tage = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const s = disziplinAmTag(habits, cursor)
    if (s.gesamt > 0) {
      summe += s.prozent
      tage++
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return tage === 0 ? 0 : Math.round(summe / tage)
}

// Tag-Nummer seit dem ältesten angelegten Habit (Onboarding-Gefühl „DAY N").
export function tagNummer(habits) {
  const zeiten = habits
    .map((h) => (typeof h.id === "number" ? h.id : null))
    .filter((z) => z != null)
  if (zeiten.length === 0) return 1
  const start = new Date(Math.min(...zeiten))
  start.setHours(0, 0, 0, 0)
  const heuteD = new Date()
  heuteD.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((heuteD - start) / 86_400_000) + 1)
}

export function wochenSpalten(n) {
  const spalten = []
  const cursor = montagVon(new Date())
  for (let i = 0; i < n; i++) {
    spalten.unshift(new Date(cursor))
    cursor.setDate(cursor.getDate() - 7)
  }
  return spalten
}

export function wochenZielVon(habit) {
  return habit.wochenZiel ?? STANDARD_WOCHENZIEL
}

export function erledigtInWoche(habit, wocheMontag) {
  const zielSchluessel = schluessel(wocheMontag)
  return habit.erledigtAn.filter(
    (tag) => wochenSchluessel(new Date(tag)) === zielSchluessel
  ).length
}

export function wochenZielErreicht(habit, wocheMontag) {
  return erledigtInWoche(habit, wocheMontag) >= wochenZielVon(habit)
}

export function wochenStreakVon(habit) {
  let zaehler = 0
  const cursor = montagVon(new Date())
  if (!wochenZielErreicht(habit, cursor)) cursor.setDate(cursor.getDate() - 7)
  while (wochenZielErreicht(habit, cursor)) {
    zaehler++
    cursor.setDate(cursor.getDate() - 7)
  }
  return zaehler
}

export function nutzeHabitToggle(habits, setHabits) {
  const heuteKey = heute()
  return (habit) => {
    const dran = habit.erledigtAn.includes(heuteKey)
    setHabits(
      habits.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              erledigtAn: dran
                ? h.erledigtAn.filter((d) => d !== heuteKey)
                : [...h.erledigtAn, heuteKey],
            }
          : h
      )
    )
  }
}
