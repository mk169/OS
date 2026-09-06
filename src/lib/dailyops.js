// Lebensbereich „Daily Operations": der tägliche Betrieb.
//
// Eine Routine ist eine benannte Checkliste mit einem Rhythmus (täglich,
// werktags, am Wochenende oder an festen Wochentagen) und einer Tageszeit.
// Abgehakt wird pro Tag – erledigt ist erledigt, aber nur für diesen Tag.
//
// Datenhaltung (über useStored, also lokal + Cloud-Sync):
//   dailyops_routinen  [{ id, name, zeit, rhythmus, tage: [0–6], farbe,
//                         schritte: [{ id, text }], erstelltAm }]
//   dailyops_protokoll { "<routineId>": { "JJJJ-MM-TT": [schrittId, …] } }

import { heute, inTagen } from "./datum"
import { WOCHENTAGE } from "./datum"

export const TAGESZEITEN = [
  { key: "morgen", label: "Morgen", emoji: "🌅" },
  { key: "tag", label: "Tagsüber", emoji: "☀️" },
  { key: "abend", label: "Abend", emoji: "🌙" },
]

export function tageszeitVon(key) {
  return TAGESZEITEN.find((z) => z.key === key) ?? TAGESZEITEN[0]
}

export const RHYTHMEN = [
  { key: "taeglich", label: "Täglich" },
  { key: "werktags", label: "Werktags (Mo–Fr)" },
  { key: "wochenende", label: "Wochenende" },
  { key: "tage", label: "An bestimmten Tagen" },
]

// Wochentage in der Reihenfolge der Anzeige; 0 = Montag.
// Dieselbe Liste wie in datum.js – hier nur unter dem Namen weitergereicht,
// unter dem der Alltags-Bereich sie kennt.
export const WOCHENTAGE_KURZ = WOCHENTAGE

// Wochentag eines Datums als 0 (Montag) bis 6 (Sonntag).
export function wochentagIndex(datum) {
  return (new Date(datum).getDay() + 6) % 7
}

// Steht die Routine an diesem Tag an?
export function faelltAn(routine, datum = heute()) {
  const tag = wochentagIndex(datum)
  switch (routine.rhythmus ?? "taeglich") {
    case "werktags":
      return tag <= 4
    case "wochenende":
      return tag >= 5
    case "tage":
      return (routine.tage ?? []).includes(tag)
    default:
      return true
  }
}

// Die an einem Tag anstehenden Routinen, sortiert nach Tageszeit.
export function routinenAmTag(routinen = [], datum = heute()) {
  const rang = (r) => TAGESZEITEN.findIndex((z) => z.key === (r.zeit ?? "morgen"))
  return routinen
    .filter((r) => faelltAn(r, datum))
    .sort((a, b) => rang(a) - rang(b) || (a.erstelltAm ?? a.id) - (b.erstelltAm ?? b.id))
}

// Abgehakte Schritte einer Routine an einem Tag.
export function erledigteSchritte(protokoll, routineId, datum = heute()) {
  return protokoll?.[routineId]?.[datum] ?? []
}

// Schritt an- oder abhaken. Liefert ein neues Protokoll; leere Tage und
// leere Routinen werden aufgeräumt, damit der Speicher nicht zuwächst.
export function schrittUmschalten(protokoll, routineId, schrittId, datum = heute()) {
  const bisher = erledigteSchritte(protokoll, routineId, datum)
  const neu = bisher.includes(schrittId)
    ? bisher.filter((id) => id !== schrittId)
    : [...bisher, schrittId]

  const tage = { ...(protokoll?.[routineId] ?? {}) }
  if (neu.length === 0) delete tage[datum]
  else tage[datum] = neu

  const alles = { ...(protokoll ?? {}) }
  if (Object.keys(tage).length === 0) delete alles[routineId]
  else alles[routineId] = tage
  return alles
}

// Fortschritt einer Routine an einem Tag.
export function routineFortschritt(routine, protokoll, datum = heute()) {
  const schritte = routine.schritte ?? []
  const erledigt = erledigteSchritte(protokoll, routine.id, datum).filter((id) =>
    schritte.some((s) => s.id === id)
  ).length
  return {
    erledigt,
    gesamt: schritte.length,
    prozent: schritte.length === 0 ? 0 : Math.round((erledigt / schritte.length) * 100),
    fertig: schritte.length > 0 && erledigt === schritte.length,
  }
}

// Tagesbilanz über alle anstehenden Routinen.
export function tagesBilanz(routinen = [], protokoll = {}, datum = heute()) {
  const anstehend = routinenAmTag(routinen, datum)
  const werte = anstehend.map((r) => routineFortschritt(r, protokoll, datum))
  const erledigt = werte.reduce((s, w) => s + w.erledigt, 0)
  const gesamt = werte.reduce((s, w) => s + w.gesamt, 0)
  return {
    routinen: anstehend.length,
    fertigeRoutinen: werte.filter((w) => w.fertig).length,
    erledigt,
    gesamt,
    prozent: gesamt === 0 ? 0 : Math.round((erledigt / gesamt) * 100),
  }
}

// Serie vollständiger Tage bis heute. Der laufende Tag bricht die Serie
// nicht – er zählt erst, wenn er vollständig ist (wie bei den Habits).
// Tage ohne anstehende Routine überspringt die Zählung, statt sie als
// Bruch zu werten: An einem freien Tag gibt es nichts zu erledigen.
export function routineStreak(routinen = [], protokoll = {}, maxTage = 365) {
  const vollstaendig = (datum) => {
    const b = tagesBilanz(routinen, protokoll, datum)
    return b.gesamt > 0 && b.erledigt === b.gesamt
  }
  let zaehler = 0
  let start = 0
  if (!vollstaendig(heute())) start = 1

  for (let i = start; i < maxTage; i++) {
    const datum = inTagen(-i)
    const bilanz = tagesBilanz(routinen, protokoll, datum)
    if (bilanz.gesamt === 0) continue // freier Tag – kein Bruch
    if (bilanz.erledigt === bilanz.gesamt) zaehler++
    else break
  }
  return zaehler
}

// Die letzten `n` Tage als Verlauf für den Wochenstreifen (ältester zuerst).
export function verlauf(routinen = [], protokoll = {}, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const datum = inTagen(-(n - 1 - i))
    return { datum, ...tagesBilanz(routinen, protokoll, datum) }
  })
}

// Kurzlabel des Rhythmus für die Anzeige an der Routine.
export function rhythmusLabel(routine) {
  const rhythmus = routine.rhythmus ?? "taeglich"
  if (rhythmus !== "tage") {
    return RHYTHMEN.find((r) => r.key === rhythmus)?.label ?? "Täglich"
  }
  const tage = [...(routine.tage ?? [])].sort((a, b) => a - b)
  if (tage.length === 0) return "Kein Tag gewählt"
  return tage.map((t) => WOCHENTAGE_KURZ[t]).join(", ")
}
