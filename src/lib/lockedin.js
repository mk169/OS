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

// Den laufenden Modus als `data-modus="lockedin"` an <html> schreiben.
// Startseite, Todos und Habits haben je nach Stil eine eigene Fassung; alle
// übrigen Bereiche sind für ein helles Layout geschrieben. Solange der Modus
// scharf ist, hängt index.css an diesem Attribut die gesamte Farbpalette auf
// Schwarzweiß um – der Fokus-Modus färbt also die ganze App, nicht nur drei
// Seiten. Endet der Modus, ist alles wieder wie vorher.
export function wendeModusAn(aktiv) {
  const wurzel = document.documentElement
  if (aktiv) wurzel.dataset.modus = "lockedin"
  else delete wurzel.dataset.modus
}

// Läuft der Modus? Direkt aus localStorage gelesen, für den synchronen
// Aufruf beim App-Start (noch vor dem ersten Rendern).
export function gespeicherterLockedInModus() {
  try {
    const roh = localStorage.getItem("lockedInConfig")
    return lockedInAktiv(roh ? JSON.parse(roh) : null)
  } catch {
    return false
  }
}
