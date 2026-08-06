// Gruppierung der Hauptnavigation.
//
// Bei vielen aktiven Modulen wird eine flache Liste aus 14 gleichrangigen
// Einträgen schnell unübersichtlich. Deshalb lassen sich die Module in den
// Einstellungen zu Gruppen bündeln und die selteneren Bereiche hinter einer
// Klappe verstecken.
//
// Die Zuordnung Modul → Gruppe ist fest; die Reihenfolge *innerhalb* einer
// Gruppe folgt weiterhin der vom Nutzer in den Einstellungen gewählten
// Reihenfolge (`sichtbareSeiten`).

export const NAV_GRUPPEN = [
  {
    key: "taeglich",
    label: "Täglich",
    keys: ["dashboard", "lockedin", "kalender", "todos", "habits", "dailyops"],
  },
  {
    key: "arbeiten",
    label: "Arbeiten",
    keys: ["deepwork", "projekte", "sammeln", "periode", "beruf"],
  },
  {
    // Bereiche, die man eher wöchentlich als täglich öffnet – sie werden als
    // „sekundär" behandelt und lassen sich einklappen.
    key: "leben",
    label: "Leben",
    keys: ["vitalitaet", "finanzen", "leisure"],
    sekundaer: true,
  },
]

// Auffangbecken für Module, die (noch) keiner Gruppe zugeordnet sind.
export const NAV_GRUPPE_SONSTIGE = {
  key: "sonstige",
  label: "Weiteres",
  keys: [],
  sekundaer: true,
}

const STANDARD = {
  gruppiert: true,
  sekundaerEingeklappt: true,
}

// Navigations-Konfiguration mit Standardwerten (fehlende Schlüssel = an).
export function navConfig(einstellungen) {
  return { ...STANDARD, ...(einstellungen?.navigation ?? {}) }
}

// Gruppe eines Moduls – nie `undefined`, unbekannte Keys landen in „Weiteres".
export function gruppeVon(key) {
  return NAV_GRUPPEN.find((g) => g.keys.includes(key)) ?? NAV_GRUPPE_SONSTIGE
}

export function istSekundaer(key) {
  return gruppeVon(key).sekundaer === true
}

// Navigations-Einträge in Gruppen einsortieren. Leere Gruppen fallen weg.
export function gruppiereNav(items) {
  const gruppen = [...NAV_GRUPPEN, NAV_GRUPPE_SONSTIGE].map((g) => ({
    ...g,
    items: [],
  }))
  const sonstige = gruppen[gruppen.length - 1]
  for (const item of items) {
    const ziel = gruppen.find((g) => g.keys.includes(item.key)) ?? sonstige
    ziel.items.push(item)
  }
  return gruppen.filter((g) => g.items.length > 0)
}

// Abschnitte der Sidebar/des „Mehr"-Sheets aus der Konfiguration ableiten.
// Ergebnis ist immer eine Liste von `{ key, label, sekundaer, items }`:
//
//   • gruppiert            → eine Sektion je Gruppe
//   • nur Klappe           → „Alles Wichtige" flach + Sektion „Weitere Bereiche"
//   • beides aus           → eine einzige Sektion ohne Überschrift
//
// Sektionen ohne `label` bekommen keine Überschrift und sind immer offen.
export function navSektionen(items, config) {
  if (config.gruppiert) return gruppiereNav(items)

  if (config.sekundaerEingeklappt) {
    const primaer = items.filter((i) => !istSekundaer(i.key))
    const sekundaer = items.filter((i) => istSekundaer(i.key))
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
