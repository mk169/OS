import { schreibeStore } from "./useStored"
import { heute } from "./datum"

// Leichtes Lernprotokoll: zählt pro Tag die Anzahl bewerteter Karten
// (Store „lernprotokoll" = { "JJJJ-MM-TT": anzahl }). Wird bei jeder Bewertung
// erhöht – projektweit und im globalen „Heute lernen".
export function protokolliereWiederholung() {
  schreibeStore("lernprotokoll", {}, (p) => ({
    ...(p ?? {}),
    [heute()]: ((p && p[heute()]) ?? 0) + 1,
  }))
}

export function heuteGelernt(protokoll) {
  return protokoll?.[heute()] ?? 0
}

// ── Tägliches Freischalten pro Projekt ──────────────────────────────────────
// Pro Projekt werden täglich nur so viele Karten zum Lernen freigeschaltet.
// Standard 20/Tag, pro Projekt anpassbar (Store „kartenLimits").
export const STANDARD_TAGESLIMIT = 20

export function tageslimitVon(limits, schluessel) {
  const v = limits?.[schluessel]
  return Number.isFinite(v) && v > 0 ? v : STANDARD_TAGESLIMIT
}

// Menge der Karten-IDs, die für `schluessel` (Projekt-ID oder "ohne") HEUTE
// schon angefasst wurden. Store „lernTag" = { [schluessel]: { datum, karten } }.
export function gelerntHeuteSet(lernTag, schluessel) {
  const e = lernTag?.[schluessel]
  return new Set(e && e.datum === heute() ? e.karten : [])
}

// Vermerkt eine gelernte Karte für heute (idempotent je Karte und Tag).
export function protokolliereKarte(schluessel, kartenId) {
  schreibeStore("lernTag", {}, (lt) => {
    const cur = lt?.[schluessel]
    const karten = cur && cur.datum === heute() ? cur.karten : []
    if (karten.includes(kartenId)) return lt ?? {}
    return {
      ...(lt ?? {}),
      [schluessel]: { datum: heute(), karten: [...karten, kartenId] },
    }
  })
}

// Heutige Lern-Portion eines Stapels: die heute bereits begonnenen (und noch
// fälligen) Karten plus so viele neue fällige, wie das Tageslimit noch zulässt.
// Deterministisch sortiert (fälligstes zuerst), damit die Auswahl stabil ist.
export function tagesPortion(faellig, gelerntSet, limit) {
  const sortiert = [...faellig].sort(
    (a, b) => (a.faellig ?? "").localeCompare(b.faellig ?? "") || a.id - b.id
  )
  const bereits = sortiert.filter((k) => gelerntSet.has(k.id))
  const restNeu = Math.max(0, limit - gelerntSet.size)
  const neue = sortiert.filter((k) => !gelerntSet.has(k.id)).slice(0, restNeu)
  return [...bereits, ...neue]
}
