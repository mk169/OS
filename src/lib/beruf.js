// Lebensbereich „Beruf & Karriere": Bewerbungen, Karriereziele und
// Weiterbildung.
//
// Datenhaltung (über useStored, also lokal + Cloud-Sync):
//   beruf_bewerbungen   [{ id, firma, rolle, status, ort, link, frist,
//                          notiz, erstelltAm, verlauf: [{ status, am }] }]
//   beruf_ziele         [{ id, titel, horizont, notiz, schritte: [{ id, text,
//                          erledigt }], erstelltAm }]
//   beruf_weiterbildung [{ id, titel, anbieter, status, stunden, datum,
//                          notiz, erstelltAm }]

import { heute, tageBisZahl } from "./datum"

// ── Bewerbungen ─────────────────────────────────────────────────────────────

// Der Weg einer Bewerbung. „abgesagt" und „zurückgezogen" sind Endpunkte
// neben „angebot" – sie beenden den Vorgang, ohne ihn zu erfüllen.
export const BEWERBUNG_STATUS = [
  { key: "notiert", label: "Notiert", kurz: "Notiert", stil: "bg-gray-100 text-gray-600", punkt: "bg-gray-400", offen: true },
  { key: "beworben", label: "Beworben", kurz: "Beworben", stil: "bg-blue-50 text-blue-700", punkt: "bg-blue-500", offen: true },
  { key: "gespraech", label: "Im Gespräch", kurz: "Gespräch", stil: "bg-violet-50 text-violet-700", punkt: "bg-violet-500", offen: true },
  { key: "angebot", label: "Angebot", kurz: "Angebot", stil: "bg-emerald-50 text-emerald-700", punkt: "bg-emerald-500", offen: false },
  { key: "abgesagt", label: "Abgesagt", kurz: "Abgesagt", stil: "bg-rose-50 text-rose-600", punkt: "bg-rose-500", offen: false },
  { key: "zurueckgezogen", label: "Zurückgezogen", kurz: "Zurückgezogen", stil: "bg-gray-100 text-gray-500", punkt: "bg-gray-300", offen: false },
]

export const BEWERBUNG_STANDARD_STATUS = "notiert"

export function bewerbungStatusVon(key) {
  return (
    BEWERBUNG_STATUS.find((s) => s.key === key) ??
    BEWERBUNG_STATUS.find((s) => s.key === BEWERBUNG_STANDARD_STATUS)
  )
}

export function istOffen(bewerbung) {
  return bewerbungStatusVon(bewerbung.status).offen
}

// Statuswechsel mit Verlauf: Jeder Schritt wird mit Datum festgehalten,
// damit später nachvollziehbar bleibt, wann was passiert ist.
export function setzeStatus(bewerbung, status, am = heute()) {
  if (bewerbung.status === status) return bewerbung
  return {
    ...bewerbung,
    status,
    verlauf: [...(bewerbung.verlauf ?? []), { status, am }],
  }
}

// Kennzahlen der Pipeline. Die Quote misst Angebote an den abgeschlossenen
// Vorgängen (Angebot, Absage, Rückzug) – laufende zählen nicht mit, sonst
// sähe jede frische Bewerbung wie ein Misserfolg aus.
export function bewerbungsKennzahlen(bewerbungen = []) {
  const offen = bewerbungen.filter(istOffen).length
  const gespraeche = bewerbungen.filter((b) => b.status === "gespraech").length
  const angebote = bewerbungen.filter((b) => b.status === "angebot").length
  const abgeschlossen = bewerbungen.length - offen
  return {
    gesamt: bewerbungen.length,
    offen,
    gespraeche,
    angebote,
    abgeschlossen,
    quote: abgeschlossen > 0 ? Math.round((angebote / abgeschlossen) * 100) : null,
  }
}

// Anstehende Fristen offener Bewerbungen, nächste zuerst. `inTagen`
// begrenzt den Blick nach vorn; Überfälliges bleibt immer sichtbar.
export function offeneFristen(bewerbungen = [], inTagen = 14) {
  return bewerbungen
    .filter((b) => b.frist && istOffen(b))
    .map((b) => ({ ...b, tage: tageBisZahl(b.frist) }))
    .filter((b) => b.tage <= inTagen)
    .sort((a, b) => a.frist.localeCompare(b.frist))
}

// ── Karriereziele ───────────────────────────────────────────────────────────

export const ZIEL_HORIZONTE = [
  { key: "jetzt", label: "Dieses Jahr" },
  { key: "mittel", label: "1–3 Jahre" },
  { key: "lang", label: "Langfristig" },
]

export function zielFortschritt(ziel) {
  const schritte = ziel.schritte ?? []
  const erledigt = schritte.filter((s) => s.erledigt).length
  return {
    erledigt,
    gesamt: schritte.length,
    prozent: schritte.length === 0 ? 0 : Math.round((erledigt / schritte.length) * 100),
  }
}

export function zielErreicht(ziel) {
  const { gesamt, erledigt } = zielFortschritt(ziel)
  return gesamt > 0 && erledigt === gesamt
}

// ── Weiterbildung ───────────────────────────────────────────────────────────

export const WEITERBILDUNG_STATUS = [
  { key: "geplant", label: "Geplant", stil: "bg-amber-50 text-amber-700" },
  { key: "laeuft", label: "Läuft", stil: "bg-blue-50 text-blue-700" },
  { key: "fertig", label: "Abgeschlossen", stil: "bg-emerald-50 text-emerald-700" },
]

export function weiterbildungStatusVon(key) {
  return WEITERBILDUNG_STATUS.find((s) => s.key === key) ?? WEITERBILDUNG_STATUS[0]
}

// Summe der Lernstunden – wahlweise nur der abgeschlossenen Einträge.
export function weiterbildungStunden(eintraege = [], nurFertig = false) {
  return eintraege
    .filter((e) => !nurFertig || e.status === "fertig")
    .reduce((summe, e) => summe + (Number(e.stunden) || 0), 0)
}
