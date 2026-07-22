// Bidirektionale Verlinkung zwischen Wissens-Einträgen und Projekten/Areas
// über eine einfache "[[Titel]]"-Wiki-Link-Syntax in reinem Text – keine
// Rich-Text-Struktur nötig, Auflösung per Titel-Vergleich zur Laufzeit.

export const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g

// Alle referenzierten Titel in einem Text, in Vorkommensreihenfolge.
export function extrahiereWikilinks(text) {
  if (!text) return []
  return [...text.matchAll(WIKILINK_REGEX)].map((m) => m[1].trim())
}

// Löst einen Titel zu seinem Ziel auf (Wissen oder Projekt/Area). Case-
// insensitiver Exakt-Vergleich; bei doppelten Titeln gewinnt der erste
// Treffer (akzeptierter Trade-off für eine Einzelnutzer-App).
export function findeZiel(titel, wissen, projekte) {
  const gesucht = titel.trim().toLowerCase()
  const w = wissen.find((x) => x.titel.trim().toLowerCase() === gesucht)
  if (w) return { typ: "wissen", id: w.id, titel: w.titel }
  const p = projekte.find((x) => x.name.trim().toLowerCase() === gesucht)
  if (p) return { typ: "projekt", id: p.id, titel: p.name }
  return null
}

// Alle Wissens-Einträge und Projekte, die per [[titel]] auf den gegebenen
// Titel verweisen (case-insensitiv).
export function sammleBacklinks(titel, wissen, projekte) {
  const gesucht = titel.trim().toLowerCase()
  const treffer = (text) =>
    extrahiereWikilinks(text).some((t) => t.toLowerCase() === gesucht)

  return [
    ...wissen
      .filter((w) => treffer(w.inhalt))
      .map((w) => ({ typ: "wissen", id: w.id, titel: w.titel })),
    ...projekte
      .filter((p) => treffer(p.beschreibung))
      .map((p) => ({ typ: "projekt", id: p.id, titel: p.name })),
  ]
}
