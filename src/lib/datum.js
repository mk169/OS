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

export function tageBis(datum) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const ziel = new Date(datum)
  const tage = Math.round((ziel - start) / (1000 * 60 * 60 * 24))
  if (tage < 0) return "vorbei"
  if (tage === 0) return "heute!"
  if (tage === 1) return "morgen"
  return `in ${tage} Tagen`
}
