// Schlagworte (#tags) als leichte, thematische Verknüpfung quer über
// Wissen, Projekt-Notizen und Projekte – ergänzend zu den [[Wikilinks]].
// Wie dort werden Tags direkt aus dem Fließtext gelesen (keine eigene
// Datenstruktur nötig): ein „#" gefolgt von Buchstaben/Ziffern, jeweils am
// Wort- oder Zeilenanfang. Groß-/Kleinschreibung wird für Gruppierung und
// Anzeige vereinheitlicht (#Steuer und #steuer sind dasselbe Schlagwort),
// damit die Tag-Liste nicht durch Varianten zerfranst.

// Bindestrich/Unterstrich im Tag erlaubt, führendes Zeichen aber ein
// Buchstabe/Ziffer (so wird „# Überschrift" mit Leerzeichen nicht erfasst).
// Lookbehind auf Zeilen-/Wortanfang – im Ziel-Browser (Chromium) unterstützt.
export const TAG_REGEX = /(?<=^|\s)#([\p{L}\d][\p{L}\d_-]*)/gu

// Zerlegt einen Text zum Rendern in Stücke aus Klartext und Tag-Treffern.
// Ergebnis: [{ typ: "text"|"tag", wert }] in Vorkommensreihenfolge. Das „#"
// bleibt Teil des Tag-Stücks nicht enthalten – die Anzeige ergänzt es selbst.
export function teileMitTags(text) {
  if (!text) return []
  const stuecke = []
  let zuletzt = 0
  for (const m of text.matchAll(TAG_REGEX)) {
    if (m.index > zuletzt) {
      stuecke.push({ typ: "text", wert: text.slice(zuletzt, m.index) })
    }
    stuecke.push({ typ: "tag", wert: m[1] })
    zuletzt = m.index + m[0].length
  }
  if (zuletzt < text.length) {
    stuecke.push({ typ: "text", wert: text.slice(zuletzt) })
  }
  return stuecke
}

// Alle Schlagworte eines Textes, vereinheitlicht (klein) und ohne Dubletten.
export function extrahiereTags(text) {
  if (!text) return []
  const roh = [...text.matchAll(TAG_REGEX)].map((m) => m[1].toLowerCase())
  return [...new Set(roh)]
}

// Vereinheitlichte Schreibweise eines Tags (für Vergleich/Anzeige).
export function normalisiereTag(tag) {
  return tag.trim().replace(/^#/, "").toLowerCase()
}

// Sammelt alle vergebenen Schlagworte über Wissen, Projekt-Notizen und
// Projekte. Rückgabe: absteigend nach Häufigkeit sortierte Liste aus
// { tag, eintraege: [{ typ, id, titel, projektId? }] }. Ein Eintrag taucht
// pro Tag höchstens einmal auf. Tag-Quellen sind die Fließtexte: Wissen und
// Notizen ihr `inhalt`, Projekte ihre `beschreibung` und `ziel`.
export function sammleTags(wissen = [], notizen = [], projekte = []) {
  const karte = new Map() // tag -> Map(schluessel -> eintrag)

  function erfasse(tags, eintrag) {
    for (const tag of tags) {
      if (!karte.has(tag)) karte.set(tag, new Map())
      const schluessel = `${eintrag.typ}-${eintrag.id}`
      karte.get(tag).set(schluessel, eintrag)
    }
  }

  for (const w of wissen) {
    erfasse(extrahiereTags(w.inhalt), {
      typ: "wissen",
      id: w.id,
      titel: w.titel,
    })
  }
  for (const n of notizen) {
    erfasse(extrahiereTags(n.inhalt), {
      typ: "notiz",
      id: n.id,
      titel: n.titel,
      projektId: n.projektId ?? n.kursId,
    })
  }
  for (const p of projekte) {
    if (p.archiviert) continue
    const tags = extrahiereTags(`${p.beschreibung ?? ""}\n${p.ziel ?? ""}`)
    erfasse(tags, {
      typ: "projekt",
      id: p.id,
      titel: p.name,
    })
  }

  return [...karte.entries()]
    .map(([tag, eintraege]) => ({ tag, eintraege: [...eintraege.values()] }))
    .sort(
      (a, b) =>
        b.eintraege.length - a.eintraege.length || a.tag.localeCompare(b.tag)
    )
}
