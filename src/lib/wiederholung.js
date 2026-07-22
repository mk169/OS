// Wiederholungs-Logik für Termine (iCalendar-Semantik, tagesbasiert).
//
// Ein Termin kann zusätzlich tragen:
//   wiederholung – "" | "taeglich" | "woechentlich" | "monatlich" | "jaehrlich"
//   bis          – letztes Datum der Wiederholung ("JJJJ-MM-TT", optional)
//   ganztags     – true für Termine ohne Uhrzeit (z. B. Geburtstage)
//   art          – "geburtstag" für Geburtstage (jährlich, ganztägig)
//
// Das entspricht RRULE FREQ=DAILY|WEEKLY|MONTHLY|YEARLY[;UNTIL=…] und
// lässt sich damit verlustfrei nach iCalendar/Google abbilden.

// Fällt der (ggf. wiederkehrende) Termin auf den Tag `key`?
export function faelltAuf(termin, key) {
  const start = termin.datum
  if (!start) return false
  if (key === start) return true

  const w = termin.wiederholung
  if (!w) return false
  if (key < start) return false
  if (termin.bis && key > termin.bis) return false

  const s = new Date(start)
  const d = new Date(key)

  if (w === "taeglich") return true
  if (w === "woechentlich") return s.getDay() === d.getDay()
  if (w === "monatlich") return s.getDate() === d.getDate()
  if (w === "jaehrlich")
    return s.getDate() === d.getDate() && s.getMonth() === d.getMonth()
  return false
}

export const WIEDERHOLUNGEN = [
  { value: "", label: "Nie" },
  { value: "taeglich", label: "Täglich" },
  { value: "woechentlich", label: "Wöchentlich" },
  { value: "monatlich", label: "Monatlich" },
  { value: "jaehrlich", label: "Jährlich" },
]
