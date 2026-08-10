// Bereiche der Hauptnavigation.
//
// Bei vielen aktiven Modulen wird eine flache Liste aus 14 gleichrangigen
// Einträgen schnell unübersichtlich. Deshalb lassen sich die Module zu
// Bereichen bündeln und selten genutzte Bereiche einklappen. Zuschnitt,
// Namen und Reihenfolge der Bereiche legt der Nutzer in den Einstellungen
// selbst fest; die Vorgabe unten ist nur der Startpunkt.
//
// Die Reihenfolge *innerhalb* eines Bereichs folgt weiterhin der vom Nutzer
// gewählten Modul-Reihenfolge (`sichtbareSeiten`).

export const STANDARD_GRUPPEN = [
  {
    id: "taeglich",
    label: "Täglich",
    keys: ["dashboard", "lockedin", "kalender", "todos", "habits", "dailyops"],
    sekundaer: false,
  },
  {
    id: "arbeiten",
    label: "Arbeiten",
    keys: ["deepwork", "projekte", "sammeln", "periode", "beruf"],
    sekundaer: false,
  },
  {
    // Bereiche, die man eher wöchentlich als täglich öffnet.
    id: "leben",
    label: "Leben",
    keys: ["vitalitaet", "finanzen", "leisure"],
    sekundaer: true,
  },
]

// Auffangbecken für Module, die keinem Bereich zugeordnet sind. Existiert
// nicht in den Einstellungen und lässt sich daher auch nicht löschen.
export const SONSTIGE_GRUPPE = {
  id: "sonstige",
  label: "Weiteres",
  keys: [],
  sekundaer: true,
}

function kopiereGruppen(gruppen) {
  return gruppen.map((g) => ({ ...g, keys: [...g.keys] }))
}

// Gespeicherte Bereiche auf eine saubere Form bringen. Fehlt das Feld ganz
// (oder ist es kaputt), gilt die Vorgabe. Eine *leere* Liste bleibt dagegen
// leer – sonst könnte man den letzten Bereich nie löschen, ohne dass die
// Vorgabe zurückkehrt. Alle Module landen dann unter „Weiteres".
function normalisiereGruppen(gruppen) {
  if (!Array.isArray(gruppen)) return kopiereGruppen(STANDARD_GRUPPEN)
  return gruppen
    .filter((g) => g && g.id !== undefined && g.id !== SONSTIGE_GRUPPE.id)
    .map((g) => ({
      id: String(g.id),
      label: g.label?.trim() || "Bereich",
      keys: Array.isArray(g.keys) ? g.keys : [],
      sekundaer: g.sekundaer === true,
    }))
}

const STANDARD = {
  gruppiert: true,
  sekundaerEingeklappt: true,
}

// Navigations-Konfiguration mit Standardwerten (fehlende Schlüssel = an).
export function navConfig(einstellungen) {
  const roh = einstellungen?.navigation ?? {}
  return {
    ...STANDARD,
    ...roh,
    gruppen: normalisiereGruppen(roh.gruppen),
  }
}

// Bereich eines Moduls – nie `undefined`, unbekannte Keys landen in „Weiteres".
export function gruppeVon(key, gruppen) {
  return gruppen.find((g) => g.keys.includes(key)) ?? SONSTIGE_GRUPPE
}

export function istSekundaer(key, gruppen) {
  return gruppeVon(key, gruppen).sekundaer === true
}

// Ein Modul einem anderen Bereich zuordnen. `zielId === SONSTIGE_GRUPPE.id`
// nimmt es aus allen Bereichen heraus.
export function setzeGruppe(gruppen, key, zielId) {
  return gruppen.map((g) => ({
    ...g,
    keys:
      g.id === zielId
        ? [...g.keys.filter((k) => k !== key), key]
        : g.keys.filter((k) => k !== key),
  }))
}

// Navigations-Einträge in Bereiche einsortieren. Leere Bereiche fallen weg.
export function gruppiereNav(items, gruppen) {
  const sektionen = [...gruppen, SONSTIGE_GRUPPE].map((g) => ({
    ...g,
    key: g.id,
    items: [],
  }))
  const sonstige = sektionen[sektionen.length - 1]
  for (const item of items) {
    const ziel = sektionen.find((g) => g.keys.includes(item.key)) ?? sonstige
    ziel.items.push(item)
  }
  return sektionen.filter((g) => g.items.length > 0)
}

// Abschnitte der Sidebar/des Ansichts-Sheets aus der Konfiguration ableiten.
// Ergebnis ist immer eine Liste von `{ key, label, sekundaer, items }`:
//
//   • gruppiert            → eine Sektion je Bereich
//   • nur Klappe           → alles Wichtige flach + Sektion „Weitere Bereiche"
//   • beides aus           → eine einzige Sektion ohne Überschrift
//
// Sektionen ohne `label` bekommen keine Überschrift und sind immer offen.
export function navSektionen(items, config) {
  if (config.gruppiert) return gruppiereNav(items, config.gruppen)

  if (config.sekundaerEingeklappt) {
    const primaer = items.filter((i) => !istSekundaer(i.key, config.gruppen))
    const sekundaer = items.filter((i) => istSekundaer(i.key, config.gruppen))
    return [
      { key: "primaer", label: null, items: primaer },
      { key: "sekundaer", label: "Weitere Bereiche", sekundaer: true, items: sekundaer },
    ].filter((s) => s.items.length > 0)
  }

  return [{ key: "alle", label: null, items }]
}

// Ist eine Sektion aufgeklappt? Reihenfolge der Regeln:
//   1. Sektionen ohne Überschrift sind immer offen.
//   2. Ein Klick des Nutzers gewinnt – sonst wäre der Kopf ein toter Knopf.
//   3. Enthält die Sektion die aktive Seite, ist sie offen (sonst wäre der
//      aktive Eintrag unsichtbar – z. B. nach einem Sprung aus der Suche).
//   4. Sonst: sekundäre Sektionen zu, wenn die Einstellung aktiv ist.
export function sektionOffen(sektion, { offeneSektionen, aktiveSeite, config }) {
  if (!sektion.label) return true
  const manuell = offeneSektionen?.[sektion.key]
  if (manuell !== undefined) return manuell
  if (sektion.items.some((i) => i.key === aktiveSeite)) return true
  return !(sektion.sekundaer && config.sekundaerEingeklappt)
}
