// Blöcke einer Projekt-Seite: Zugriff auf die Blockliste und die gemeinsame
// ID-Quelle. Der Block-Editor (components/BlockEditor.jsx) zeigt sie an;
// erzeugt und gelesen werden Blöcke aber auch anderswo – etwa beim Anlegen
// einer Seite aus einer Vorlage. Deshalb liegt beides hier.

// Liefert die Blockliste einer Quelle (Projekt oder eigener Bereich).
// Migration: ein altes Freitext-Feld wird zu einem einzelnen Text-Block.
export function bloeckeVon(quelle, textFeld = "uebersicht") {
  if (Array.isArray(quelle?.bloecke)) return quelle.bloecke
  const text = quelle?.[textFeld]
  if (typeof text === "string" && text.trim()) {
    return [{ id: 1, typ: "text", text }]
  }
  return []
}

// Fortlaufende Block-IDs aus einer Quelle, damit nichts kollidiert –
// egal ob ein Block im Editor oder aus einer Vorlage entsteht.
let idZaehler = Date.now()

export function neueBlockId() {
  idZaehler += 1
  return idZaehler
}
