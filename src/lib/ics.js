// iCalendar-Interop (RFC 5545): macht die Termin-Infrastruktur mit
// Google Kalender & Co. verknüpfbar. Export erzeugt eine .ics-Datei,
// die Google direkt importieren/abonnieren kann; Import liest
// .ics-Exporte (z. B. aus Google Kalender) ein.
//
// Mapping Termin ↔ VEVENT:
//   titel         ↔ SUMMARY
//   datum (+zeit) ↔ DTSTART  (VALUE=DATE bei ganztags)
//   dauer         ↔ DURATION (PT…M) bzw. DTEND
//   wiederholung  ↔ RRULE:FREQ=DAILY|WEEKLY|MONTHLY|YEARLY
//   bis           ↔ RRULE …;UNTIL=JJJJMMTT
//   id            ↔ UID os-<id>@studentos

const FREQ = {
  taeglich: "DAILY",
  woechentlich: "WEEKLY",
  monatlich: "MONTHLY",
  jaehrlich: "YEARLY",
}
const FREQ_ZURUECK = Object.fromEntries(
  Object.entries(FREQ).map(([k, v]) => [v, k])
)

const kompakt = (datum) => datum.replaceAll("-", "")

function dtstart(t) {
  if (!t.zeit || t.ganztags) return `DTSTART;VALUE=DATE:${kompakt(t.datum)}`
  const [h, m] = t.zeit.split(":")
  return `DTSTART:${kompakt(t.datum)}T${h}${m}00`
}

function escapeText(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

export function alsICS(termine) {
  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudentOS//Kalender//DE",
  ]
  for (const t of termine) {
    zeilen.push("BEGIN:VEVENT")
    zeilen.push(`UID:os-${t.id}@studentos`)
    zeilen.push(`SUMMARY:${escapeText(t.titel)}`)
    zeilen.push(dtstart(t))
    if (t.zeit && !t.ganztags && t.dauer) zeilen.push(`DURATION:PT${t.dauer}M`)
    if (t.wiederholung && FREQ[t.wiederholung]) {
      let rrule = `RRULE:FREQ=${FREQ[t.wiederholung]}`
      if (t.bis) rrule += `;UNTIL=${kompakt(t.bis)}`
      zeilen.push(rrule)
    }
    zeilen.push("END:VEVENT")
  }
  zeilen.push("END:VCALENDAR")
  return zeilen.join("\r\n")
}

// Entfaltet gefaltete Zeilen (RFC 5545: Folgezeilen beginnen mit Space/Tab).
function entfalte(text) {
  return text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/)
}

function parseDatum(wert) {
  // "20260721" oder "20260721T101500(Z)" → { datum, zeit }
  const m = wert.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/)
  if (!m) return null
  return {
    datum: `${m[1]}-${m[2]}-${m[3]}`,
    zeit: m[4] ? `${m[4]}:${m[5]}` : "",
  }
}

function minutenAusDuration(wert) {
  // "PT90M", "PT1H30M", "P1D" → Minuten
  const m = wert.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/)
  if (!m) return null
  const tage = Number(m[1] ?? 0)
  const std = Number(m[2] ?? 0)
  const min = Number(m[3] ?? 0)
  const gesamt = tage * 24 * 60 + std * 60 + min
  return gesamt > 0 ? gesamt : null
}

function minutenZwischen(startZeit, endeZeit) {
  const [sh, sm] = startZeit.split(":").map(Number)
  const [eh, em] = endeZeit.split(":").map(Number)
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

export function parseICS(text) {
  const termine = []
  let ev = null

  for (const zeile of entfalte(text)) {
    if (zeile === "BEGIN:VEVENT") {
      ev = {}
      continue
    }
    if (zeile === "END:VEVENT") {
      if (ev?.titel && ev?.datum) {
        termine.push({
          titel: ev.titel,
          datum: ev.datum,
          zeit: ev.ganztags ? "" : (ev.zeit ?? ""),
          dauer: ev.dauer ?? (ev.zeit && !ev.ganztags ? 60 : null),
          ganztags: !!ev.ganztags,
          wiederholung: ev.wiederholung ?? "",
          bis: ev.bis ?? "",
        })
      }
      ev = null
      continue
    }
    if (!ev) continue

    const i = zeile.indexOf(":")
    if (i < 0) continue
    const kopf = zeile.slice(0, i)
    const wert = zeile.slice(i + 1)
    const [name, ...params] = kopf.split(";")

    if (name === "SUMMARY") {
      ev.titel = wert
        .replace(/\\n/g, " ")
        .replace(/\\([;,\\])/g, "$1")
        .trim()
    } else if (name === "DTSTART") {
      const d = parseDatum(wert)
      if (d) {
        ev.datum = d.datum
        ev.zeit = d.zeit
        if (params.some((p) => p === "VALUE=DATE")) ev.ganztags = true
      }
    } else if (name === "DTEND") {
      const d = parseDatum(wert)
      if (d?.zeit && ev.zeit) ev.dauer = minutenZwischen(ev.zeit, d.zeit)
    } else if (name === "DURATION") {
      ev.dauer = minutenAusDuration(wert)
    } else if (name === "RRULE") {
      for (const teil of wert.split(";")) {
        const [k, v] = teil.split("=")
        if (k === "FREQ" && FREQ_ZURUECK[v]) ev.wiederholung = FREQ_ZURUECK[v]
        if (k === "UNTIL") {
          const d = parseDatum(v)
          if (d) ev.bis = d.datum
        }
      }
    }
  }
  return termine
}
