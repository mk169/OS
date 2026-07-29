import { heute } from "./datum"

// Fokus-Perioden („Zyklen") nach dem Prinzip eines 90-Day-Year / 12-Week-Year:
// ein klar begrenzter Zeitraum mit eigenem Ziel, in dem einige wenige Projekte
// ganz konkret geplant und umgesetzt werden. Statt einer diffusen Jahresliste
// rotieren so überschaubare Perioden – 14/30/90 Tage, Halbjahr oder Jahr.
//
// Ein Zyklus liegt im Store `zyklen`:
//   { id, titel, ziel, laenge, start, ende, projektIds: [] }
// `ende` wird beim Anlegen aus Start + Länge berechnet (bei „custom" frei
// gewählt) und mitgespeichert, damit die Auswertung ohne Neuberechnung geht.

export const ZYKLUS_LAENGEN = [
  { key: "14", label: "14 Tage", kurz: "14 T", tage: 14 },
  { key: "30", label: "30 Tage", kurz: "30 T", tage: 30 },
  { key: "90", label: "90 Tage", kurz: "90 T", tage: 90 },
  { key: "182", label: "Halbes Jahr", kurz: "½ Jahr", tage: 182 },
  { key: "365", label: "Jahr", kurz: "Jahr", tage: 365 },
  { key: "custom", label: "Eigenes Enddatum", kurz: "individuell", tage: null },
]

export function laengeTage(key) {
  return ZYKLUS_LAENGEN.find((l) => l.key === key)?.tage ?? null
}

export function laengeLabel(key) {
  return ZYKLUS_LAENGEN.find((l) => l.key === key)?.kurz ?? "individuell"
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function verschiebe(datum, tage) {
  const d = new Date(datum)
  d.setDate(d.getDate() + tage)
  return iso(d)
}

// Ganze Tage von a bis b (b − a). Beide im Format "JJJJ-MM-TT".
function tageZwischen(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86_400_000)
}

// Enddatum (letzter aktiver Tag, inklusive) aus Start + Länge. Für „custom"
// wird kein Enddatum berechnet – dort gibt es der Nutzer selbst an.
export function berechneEnde(start, laenge) {
  const tage = laengeTage(laenge)
  if (!start || !tage) return ""
  return verschiebe(start, tage - 1)
}

// Status eines Zyklus relativ zu heute: Gesamtlänge, verbleibende Tage und
// verstrichener Zeitanteil (für den Fortschrittsbalken).
export function zyklusStatus(zyklus) {
  const { start, ende } = zyklus
  const heuteK = heute()
  const tageGesamt = Math.max(1, tageZwischen(start, ende) + 1)
  const bevorstehend = heuteK < start
  const vorbei = heuteK > ende
  const aktiv = !bevorstehend && !vorbei
  const tageUebrig = Math.max(0, tageZwischen(heuteK, ende))
  const tageBisStart = Math.max(0, tageZwischen(heuteK, start))
  const verstrichen = Math.min(
    tageGesamt,
    Math.max(0, tageZwischen(start, heuteK) + 1)
  )
  const prozentZeit = Math.round((verstrichen / tageGesamt) * 100)
  return {
    tageGesamt,
    tageUebrig,
    tageBisStart,
    verstrichen,
    prozentZeit,
    aktiv,
    bevorstehend,
    vorbei,
  }
}

// Verknüpfte Projekte eines Zyklus in einheitlicher Form:
// [{ projektId, ziel, erledigt }]. Migriert verlustfrei die frühere Struktur,
// die nur `projektIds` (ohne eigene Ziele) kannte.
export function zyklusProjekte(zyklus) {
  if (Array.isArray(zyklus.projekte)) return zyklus.projekte
  return (zyklus.projektIds ?? []).map((projektId) => ({
    projektId,
    ziel: "",
    erledigt: false,
  }))
}

// Aktualisiert einen Zyklus und legt dabei die verknüpften Projekte in der
// neuen Struktur ab (entfernt das alte `projektIds`-Feld). `aenderung`
// überschreibt einzelne Felder gezielt.
export function aktualisiereZyklus(zyklus, aenderung = {}) {
  // eslint-disable-next-line no-unused-vars
  const { projektIds, ...rest } = zyklus
  return { ...rest, projekte: zyklusProjekte(zyklus), ...aenderung }
}

// Eigene, projektunabhängige Ziele einer Periode: [{ id, text, erledigt }].
// Konkrete Vorhaben ohne Projektbezug (z. B. „3x pro Woche laufen").
export function zyklusZiele(zyklus) {
  return Array.isArray(zyklus.ziele) ? zyklus.ziele : []
}

// Erreichte Ziele / Gesamtzahl einer Periode – zählt sowohl die
// projektgebundenen Periodenziele als auch die eigenen Ziele.
export function zieleErreicht(zyklus) {
  const alle = [...zyklusProjekte(zyklus), ...zyklusZiele(zyklus)]
  return { erreicht: alle.filter((x) => x.erledigt).length, gesamt: alle.length }
}

// Kurzer Text für die Restlaufzeit eines aktiven Zyklus.
export function restText(tageUebrig) {
  if (tageUebrig <= 0) return "letzter Tag"
  if (tageUebrig === 1) return "noch 1 Tag"
  return `noch ${tageUebrig} Tage`
}
