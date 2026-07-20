// Hilfsfunktionen für Datumswerte im Format "JJJJ-MM-TT" (lokale Zeit).

export function heute() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function inTagen(tage) {
  const d = new Date()
  d.setDate(d.getDate() + tage)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Tage bis zum Datum als Zahl (negativ = vorbei). Basis für tageBis
// und für die Dringlichkeits-Farbe von Deadline-Chips.
export function tageBisZahl(datum) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const ziel = new Date(datum)
  return Math.round((ziel - start) / (1000 * 60 * 60 * 24))
}

export function tageBis(datum) {
  const tage = tageBisZahl(datum)
  if (tage < 0) return "vorbei"
  if (tage === 0) return "heute!"
  if (tage === 1) return "morgen"
  return `in ${tage} Tagen`
}
