// Hilfsfunktionen und Stammdaten für den Lebensbereich „Finanzen".
//
// Datenhaltung (alle über useStored, also lokal + Cloud-Sync):
//   finanzen_konten        [{ id, name, typ, startsaldo, farbe, erstelltAm }]
//   finanzen_transaktionen [{ id, art, betrag, kategorie, kontoId, datum, notiz, erstelltAm }]
//   finanzen_budgets       [{ id, kategorie, betrag }]           – Monatsbudget je Kategorie
//   finanzen_sparziele     [{ id, name, ziel, aktuell, faelligkeit, farbe }]
//   finanzen_einstellung   { waehrung }                          – Anzeigewährung

// ── Geldbeträge ───────────────────────────────────────────────────────────

// Standard-Währung; kann in den Finanzen-Einstellungen geändert werden.
export const WAEHRUNGEN = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CHF", symbol: "CHF", label: "Schweizer Franken" },
  { code: "USD", symbol: "$", label: "US-Dollar" },
  { code: "GBP", symbol: "£", label: "Britisches Pfund" },
]

// Betrag als Währung formatieren (deutsche Schreibweise, z. B. „1.234,56 €").
export function geld(betrag, waehrung = "EUR") {
  const zahl = Number(betrag) || 0
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: waehrung,
      maximumFractionDigits: 2,
    }).format(zahl)
  } catch {
    return `${zahl.toFixed(2)} ${waehrung}`
  }
}

// Kompakte Darstellung mit Vorzeichen (z. B. „+1.200,00 €" / „−340,00 €").
export function geldMitZeichen(betrag, waehrung = "EUR") {
  const zahl = Number(betrag) || 0
  const vorzeichen = zahl > 0 ? "+" : zahl < 0 ? "−" : ""
  return `${vorzeichen}${geld(Math.abs(zahl), waehrung)}`
}

// Eingabe „1.234,56" oder „1234.56" robust in eine Zahl wandeln.
export function parseBetrag(text) {
  if (typeof text === "number") return text
  const norm = String(text ?? "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const zahl = Number.parseFloat(norm)
  return Number.isFinite(zahl) ? zahl : 0
}

// ── Kategorien ──────────────────────────────────────────────────────────────

export const AUSGABE_KATEGORIEN = [
  { key: "wohnen", label: "Wohnen", emoji: "🏠", farbe: "blue" },
  { key: "lebensmittel", label: "Lebensmittel", emoji: "🛒", farbe: "emerald" },
  { key: "transport", label: "Transport", emoji: "🚗", farbe: "cyan" },
  { key: "gastro", label: "Restaurant & Café", emoji: "🍽️", farbe: "amber" },
  { key: "freizeit", label: "Freizeit", emoji: "🎉", farbe: "violet" },
  { key: "shopping", label: "Shopping", emoji: "🛍️", farbe: "rose" },
  { key: "abos", label: "Abos & Verträge", emoji: "🔁", farbe: "violet" },
  { key: "gesundheit", label: "Gesundheit", emoji: "💊", farbe: "emerald" },
  { key: "bildung", label: "Bildung", emoji: "📚", farbe: "blue" },
  { key: "reisen", label: "Reisen", emoji: "✈️", farbe: "cyan" },
  { key: "sparen", label: "Sparen & Anlage", emoji: "🐖", farbe: "emerald" },
  { key: "sonstiges", label: "Sonstiges", emoji: "💸", farbe: "gray" },
]

export const EINNAHME_KATEGORIEN = [
  { key: "gehalt", label: "Gehalt", emoji: "💼", farbe: "emerald" },
  { key: "nebenjob", label: "Nebenjob", emoji: "🧑‍💻", farbe: "cyan" },
  { key: "erstattung", label: "Erstattung", emoji: "↩️", farbe: "blue" },
  { key: "zinsen", label: "Zinsen & Dividenden", emoji: "📈", farbe: "violet" },
  { key: "geschenk", label: "Geschenk", emoji: "🎁", farbe: "rose" },
  { key: "sonstiges", label: "Sonstiges", emoji: "💰", farbe: "gray" },
]

// Kategorie-Metadaten je nach Buchungsart nachschlagen.
export function kategorieVon(art, key) {
  const liste = art === "einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN
  return liste.find((k) => k.key === key) ?? liste[liste.length - 1]
}

// ── Konten ──────────────────────────────────────────────────────────────────

export const KONTO_TYPEN = [
  { key: "giro", label: "Girokonto", emoji: "🏦" },
  { key: "spar", label: "Sparkonto", emoji: "🐖" },
  { key: "bar", label: "Bargeld", emoji: "💵" },
  { key: "depot", label: "Depot", emoji: "📈" },
  { key: "kredit", label: "Kreditkarte", emoji: "💳" },
]

export function kontoTypVon(key) {
  return KONTO_TYPEN.find((t) => t.key === key) ?? KONTO_TYPEN[0]
}

// Aktueller Saldo eines Kontos = Startsaldo + Einnahmen − Ausgaben.
export function kontoSaldo(kontoId, startsaldo, transaktionen) {
  return transaktionen
    .filter((t) => t.kontoId === kontoId)
    .reduce(
      (summe, t) =>
        summe + (t.art === "einnahme" ? Number(t.betrag) : -Number(t.betrag)),
      Number(startsaldo) || 0
    )
}

// ── Zeit ────────────────────────────────────────────────────────────────────

// Monats-Schlüssel „JJJJ-MM" aus einem Datum „JJJJ-MM-TT".
export function monatsSchluessel(datum) {
  return (datum ?? "").slice(0, 7)
}

export function aktuellerMonat() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const MONATSNAMEN = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

export const MONATSKURZ = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
]

// Jahr aus einem Datum „JJJJ-MM-TT".
export function jahresSchluessel(datum) {
  return (datum ?? "").slice(0, 4)
}

export function aktuellesJahr() {
  return String(new Date().getFullYear())
}

// „2026-08" → „August 2026".
export function monatLabel(schluessel) {
  const [jahr, monat] = (schluessel ?? "").split("-")
  const idx = Number(monat) - 1
  if (!jahr || idx < 0 || idx > 11) return schluessel ?? ""
  return `${MONATSNAMEN[idx]} ${jahr}`
}

// Nachbarmonat berechnen (schritt = −1 zurück, +1 vor).
export function monatVerschieben(schluessel, schritt) {
  const [jahr, monat] = (schluessel ?? aktuellerMonat()).split("-").map(Number)
  const d = new Date(jahr, monat - 1 + schritt, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// ── Auswertungen ─────────────────────────────────────────────────────────────

// Summe der Beträge einer Buchungsart in einem Zeitraum. Der Präfix wählt
// den Zeitraum: „2026-08" = Monat, „2026" = ganzes Jahr.
export function summeZeitraum(transaktionen, praefix, art) {
  return transaktionen
    .filter((t) => t.art === art && (t.datum ?? "").startsWith(praefix))
    .reduce((s, t) => s + Number(t.betrag), 0)
}

// Summe der Beträge einer Buchungsart in einem Monat („2026-08").
export function summeMonat(transaktionen, monat, art) {
  return summeZeitraum(transaktionen, monat, art)
}

// Ausgaben je Kategorie in einem Zeitraum (Monat oder Jahr), absteigend
// sortiert. Präfix wie bei summeZeitraum.
export function ausgabenNachKategorie(transaktionen, praefix) {
  const summen = new Map()
  for (const t of transaktionen) {
    if (t.art !== "ausgabe" || !(t.datum ?? "").startsWith(praefix)) continue
    summen.set(t.kategorie, (summen.get(t.kategorie) ?? 0) + Number(t.betrag))
  }
  return [...summen.entries()]
    .map(([kategorie, betrag]) => ({ kategorie, betrag }))
    .sort((a, b) => b.betrag - a.betrag)
}

// Ein-/Ausgaben je Monat eines Jahres (12 Einträge, Januar → Dezember).
export function jahresMonate(transaktionen, jahr) {
  const reihe = []
  for (let m = 1; m <= 12; m++) {
    const praefix = `${jahr}-${String(m).padStart(2, "0")}`
    reihe.push({
      monat: m,
      einnahme: summeZeitraum(transaktionen, praefix, "einnahme"),
      ausgabe: summeZeitraum(transaktionen, praefix, "ausgabe"),
    })
  }
  return reihe
}

// Jahre, für die Buchungen existieren – plus das aktuelle Jahr –, absteigend.
export function jahreMitDaten(transaktionen) {
  const jahre = new Set([aktuellesJahr()])
  for (const t of transaktionen) {
    const j = jahresSchluessel(t.datum)
    if (j) jahre.add(j)
  }
  return [...jahre].sort((a, b) => b.localeCompare(a))
}
