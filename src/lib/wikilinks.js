// Bidirektionale Verlinkung zwischen Wissens-Einträgen und Projekten/Areas
// über eine einfache "[[Titel]]"-Wiki-Link-Syntax in reinem Text – keine
// Rich-Text-Struktur nötig, Auflösung per Titel-Vergleich zur Laufzeit.

export const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g

// Alle referenzierten Titel in einem Text, in Vorkommensreihenfolge.
export function extrahiereWikilinks(text) {
  if (!text) return []
  return [...text.matchAll(WIKILINK_REGEX)].map((m) => m[1].trim())
}

// Löst einen Titel zu seinem Ziel auf (Wissen, Projekt/Area oder eine
// einzelne Projekt-Notiz – notizen ist die flache Store aller Notizen aller
// Projekte). Case-insensitiver Exakt-Vergleich; bei doppelten Titeln gewinnt
// der erste Treffer (akzeptierter Trade-off für eine Einzelnutzer-App – bei
// generischen Notiz-Titeln wie "Notizen" oder "TODO", die in mehreren
// Projekten vorkommen können, ist das Kollisionsrisiko höher als bei
// Wissen-/Projekt-Titeln, wird hier aber bewusst nicht extra aufgelöst).
export function findeZiel(titel, wissen, projekte, notizen = []) {
  const gesucht = titel.trim().toLowerCase()
  const w = wissen.find((x) => x.titel.trim().toLowerCase() === gesucht)
  if (w) return { typ: "wissen", id: w.id, titel: w.titel }
  const p = projekte.find((x) => x.name.trim().toLowerCase() === gesucht)
  if (p) return { typ: "projekt", id: p.id, titel: p.name }
  const n = notizen.find((x) => x.titel.trim().toLowerCase() === gesucht)
  if (n)
    return {
      typ: "notiz",
      id: n.id,
      titel: n.titel,
      projektId: n.projektId ?? n.kursId,
    }
  return null
}

// Alle Projektseiten als durchsuchbare Texte: Titel plus Text der Blöcke.
// Grundlage dafür, dass eine Notiz auch sieht, welche Projektseite auf sie
// verweist – sonst wäre die Verknüpfung nur in eine Richtung sichtbar.
export function projektSeitenTexte(projekte = []) {
  return projekte.flatMap((p) =>
    (p.seiten ?? []).map((s) => ({
      projektId: p.id,
      projektName: p.name,
      seiteId: s.id,
      titel: s.titel?.trim() || "Unbenannte Seite",
      text: (s.bloecke ?? [])
        .map((b) => b.text ?? "")
        .filter(Boolean)
        .join("\n"),
    }))
  )
}

// Alle Wissens-Einträge, Projekte, Projekt-Notizen und Projektseiten, die per
// [[titel]] auf den gegebenen Titel verweisen (case-insensitiv).
export function sammleBacklinks(
  titel,
  wissen,
  projekte,
  notizen = [],
  seiten = []
) {
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
    ...notizen
      .filter((n) => treffer(n.inhalt))
      .map((n) => ({
        typ: "notiz",
        id: n.id,
        titel: n.titel,
        projektId: n.projektId ?? n.kursId,
      })),
    ...seiten
      .filter((s) => treffer(s.text))
      .map((s) => ({
        typ: "seite",
        id: s.seiteId,
        titel: `${s.titel} · ${s.projektName}`,
        projektId: s.projektId,
      })),
  ]
}
