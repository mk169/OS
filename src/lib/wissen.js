// Vorlagen und Datei-Helfer für die Wissensplattform („Sammeln → Wissen").
//
// Ein Wissens-Eintrag im Store `wissen` ist:
//   { id, titel, inhalt, aktualisiertAm,
//     ordnerId?,           – Zuordnung zu einem Ordner (Store `wissenOrdner`)
//     angepinnt?,          – oben angeheftet
//     anhaenge?: [ { id, name, typ, groesse, datenUri } ] }
// Alle Zusatzfelder sind optional – ältere Einträge bleiben gültig.

// Vorlagen geben einem neuen Eintrag sofort Form, statt eines leeren Felds.
export const VORLAGEN = [
  { key: "leer", label: "Leerer Eintrag", emoji: "📝", inhalt: "" },
  {
    key: "buch",
    label: "Buchnotiz",
    emoji: "📚",
    inhalt:
      "## Buch\n**Autor:** \n**Kernidee:** \n\n## Wichtigste Punkte\n- \n\n## Zitate\n> \n\n## Mein Fazit\n",
  },
  {
    key: "idee",
    label: "Idee",
    emoji: "💡",
    inhalt: "## Idee\n\n## Warum spannend\n\n## Nächster Schritt\n- ",
  },
  {
    key: "meeting",
    label: "Meeting",
    emoji: "🗓️",
    inhalt:
      "## Meeting\n**Datum:** \n**Dabei:** \n\n## Notizen\n- \n\n## To-dos\n- ",
  },
  {
    key: "recherche",
    label: "Recherche",
    emoji: "🔎",
    inhalt: "## Frage\n\n## Quellen\n- \n\n## Erkenntnisse\n- ",
  },
]

// Anhänge werden als data-URI (base64) direkt im Store gespeichert – das
// funktioniert offline und synchronisiert über den bestehenden Cloud-Sync.
// Da localStorage begrenzt ist, gilt pro Datei ein Limit.
export const MAX_ANHANG_BYTES = 3 * 1024 * 1024 // 3 MB pro Datei

export function formatBytes(n) {
  if (n == null) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function istBild(typ) {
  return typeof typ === "string" && typ.startsWith("image/")
}

// Liest eine Datei als data-URI ein. Lehnt zu große Dateien ab.
export function leseDateiAlsDataUri(datei) {
  return new Promise((resolve, reject) => {
    if (datei.size > MAX_ANHANG_BYTES) {
      reject(
        new Error(
          `„${datei.name}" ist ${formatBytes(datei.size)} groß – erlaubt sind max. ${formatBytes(MAX_ANHANG_BYTES)}.`
        )
      )
      return
    }
    const leser = new FileReader()
    leser.onload = () =>
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: datei.name,
        typ: datei.type || "application/octet-stream",
        groesse: datei.size,
        datenUri: leser.result,
      })
    leser.onerror = () =>
      reject(new Error(`„${datei.name}" konnte nicht gelesen werden.`))
    leser.readAsDataURL(datei)
  })
}

// Wandelt den Text einer Vorlage in Blöcke für den Projekt-Block-Editor:
// „## Überschrift" wird eine Überschrift, aufeinanderfolgende „- "-Zeilen
// werden eine Checkliste, „> " ein Callout, alles andere ein Textblock. So
// dient dieselbe Vorlage sowohl einer Notiz in Sammeln als auch einer
// eigenen Projektseite.
export function vorlageZuBloecken(inhalt, neueId) {
  const bloecke = []
  let liste = null
  const schliesseListe = () => {
    if (liste) {
      bloecke.push({ id: neueId(), typ: "checkliste", items: liste })
      liste = null
    }
  }
  for (const zeile of (inhalt ?? "").split("\n")) {
    const ueberschrift = zeile.match(/^#{1,3}\s+(.*)$/)
    const punkt = zeile.match(/^\s*[-*]\s+(.*)$/)
    const zitat = zeile.match(/^>\s*(.*)$/)
    if (punkt) {
      liste = liste ?? []
      liste.push({ id: neueId(), text: punkt[1].trim(), erledigt: false })
      continue
    }
    schliesseListe()
    if (ueberschrift) {
      bloecke.push({ id: neueId(), typ: "ueberschrift", text: ueberschrift[1].trim() })
    } else if (zitat) {
      bloecke.push({ id: neueId(), typ: "callout", emoji: "❞", text: zitat[1].trim() })
    } else if (zeile.trim()) {
      bloecke.push({ id: neueId(), typ: "text", text: zeile.trim() })
    }
  }
  schliesseListe()
  return bloecke.length > 0 ? bloecke : [{ id: neueId(), typ: "text", text: "" }]
}
