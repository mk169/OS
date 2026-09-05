// Hilfsfunktionen für Datumswerte im Format "JJJJ-MM-TT" (lokale Zeit).

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
export const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

// Tages-Schlüssel eines Date-Objekts ("JJJJ-MM-TT", lokale Zeit).
// Bewusst nicht toISOString(): das rechnet in UTC und verschiebt den Tag.
export function schluessel(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function heute() {
  return schluessel(new Date())
}

export function inTagen(tage) {
  const d = new Date()
  d.setDate(d.getDate() + tage)
  return schluessel(d)
}

// Ausgeschriebenes Datum: "Mo, 4. September 2026".
export function datumLang(key) {
  const d = new Date(key)
  return `${WOCHENTAGE[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`
}

// Tage bis zum Datum als Zahl (negativ = vorbei). Basis für tageBis
// und für die Dringlichkeits-Farbe von Deadline-Chips.
export function tageBisZahl(datum) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const ziel = new Date(datum)
  return Math.round((ziel - start) / (1000 * 60 * 60 * 24))
}

// Dringlichkeit einer Frist als Ton: "vorbei" | "heute" | "bald" | "fern".
// Damit färben Listen ihre Fristen einheitlich, ohne die Schwellen jedes Mal
// neu zu erfinden. Ohne Datum: null.
export function fristTon(datum) {
  if (!datum) return null
  const tage = tageBisZahl(datum)
  if (tage < 0) return "vorbei"
  if (tage === 0) return "heute"
  if (tage <= 3) return "bald"
  return "fern"
}

export function tageBis(datum) {
  const tage = tageBisZahl(datum)
  // Überfälliges sagt, wie lange es schon liegt: „vorbei" verriet das nicht
  // und klang zudem wie „erledigt".
  if (tage === -1) return "seit gestern"
  if (tage < 0) return `seit ${-tage} Tagen`
  if (tage === 0) return "heute!"
  if (tage === 1) return "morgen"
  return `in ${tage} Tagen`
}

// Montag der Woche, die `d` enthält (Wochenstart = Montag).
export function montagVon(d) {
  const kopie = new Date(d)
  kopie.setDate(kopie.getDate() - ((kopie.getDay() + 6) % 7))
  return kopie
}

// Eindeutiger Wochen-Schlüssel = Datum des Montags dieser Woche
// ("JJJJ-MM-TT"). Bewusst keine ISO-Wochennummer – vermeidet
// Jahreswechsel-Randfälle bei Woche 1/53.
export function wochenSchluessel(d) {
  return schluessel(montagVon(d))
}
