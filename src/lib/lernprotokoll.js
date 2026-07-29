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
