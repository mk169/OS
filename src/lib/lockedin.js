// Status des Locked-In-Modus.
//
// Ob der Modus läuft, entscheidet nicht nur die Locked-In-Seite: Die App-
// Hülle blendet den Bereich nur dann in die schmale Handy-Tab-Leiste ein,
// solange er wirklich scharf geschaltet ist.

import { heute } from "./datum"

// Läuft der Locked-In-Modus gerade? Scharf geschaltet ist er mit einem Ziel;
// er endet, wenn man ihn beendet oder die Phase abgelaufen ist. Danach ist er
// nur noch ein Bereich unter „Mehr" – die Tab-Leiste bleibt frei.
export function lockedInAktiv(config) {
  if (!config?.ziel?.trim()) return false
  if (config.aktiv === false) return false
  if (config.phaseEnde && config.phaseEnde < heute()) return false
  return true
}
