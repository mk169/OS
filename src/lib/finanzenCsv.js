// CSV-Interop für Finanz-Buchungen – zum Auswerten in Excel/Numbers/
// Google Tabellen und zum Einlesen von Kontoauszügen.
//
// Format (Kopfzeile): Datum;Art;Betrag;Kategorie;Konto;Notiz
//   Datum     JJJJ-MM-TT (Import akzeptiert auch TT.MM.JJJJ)
//   Art       Einnahme | Ausgabe
//   Betrag    deutsche Schreibweise „24,90" (Import versteht auch „24.90")
//   Kategorie Klartext-Label; unbekannte landen unter „Sonstiges"
//   Konto     Kontoname; unbekannte Konten werden beim Import angelegt
//   Notiz     Freitext

import {
  AUSGABE_KATEGORIEN,
  EINNAHME_KATEGORIEN,
  kategorieVon,
} from "./finanzen"

// Betrag aus beliebigem CSV robust parsen: „letztes Trennzeichen ist das
// Dezimalzeichen". Deckt deutsche („1.234,56") und internationale
// („1,234.56" / „2650.00") Schreibweise sowie Vorzeichen ab.
function zuZahl(roh) {
  let s = String(roh ?? "").replace(/[^0-9.,-]/g, "")
  const negativ = s.trim().startsWith("-")
  s = s.replace(/-/g, "")
  if (!s) return 0
  const komma = s.lastIndexOf(",")
  const punkt = s.lastIndexOf(".")
  if (komma > punkt) {
    // Komma ist Dezimalzeichen (Punkte sind Tausender).
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (punkt > komma) {
    // Punkt ist Dezimalzeichen (Kommas sind Tausender).
    s = s.replace(/,/g, "")
  } else {
    // Nur eine Sorte Trennzeichen: als Dezimalzeichen behandeln.
    s = s.replace(",", ".")
  }
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return negativ ? -n : n
}

const KOPF = ["Datum", "Art", "Betrag", "Kategorie", "Konto", "Notiz"]

// ── Export ──────────────────────────────────────────────────────────────────

// Ein CSV-Feld nach RFC 4180 maskieren (Trennzeichen ist Semikolon, damit
// deutsche Excel-Versionen die Spalten direkt erkennen).
function feld(wert) {
  const s = String(wert ?? "")
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Betrag mit Dezimalkomma, ohne Tausenderpunkt (import-sicher).
function betragText(betrag) {
  return (Number(betrag) || 0).toFixed(2).replace(".", ",")
}

export function alsCsv(transaktionen, konten) {
  const kontoName = new Map(konten.map((k) => [k.id, k.name]))
  const zeilen = [KOPF.join(";")]

  const sortiert = [...transaktionen].sort((a, b) =>
    (a.datum ?? "").localeCompare(b.datum ?? "")
  )
  for (const t of sortiert) {
    zeilen.push(
      [
        t.datum ?? "",
        t.art === "einnahme" ? "Einnahme" : "Ausgabe",
        betragText(t.betrag),
        kategorieVon(t.art, t.kategorie).label,
        kontoName.get(t.kontoId) ?? "",
        t.notiz ?? "",
      ]
        .map(feld)
        .join(";")
    )
  }
  // BOM voranstellen, damit Excel UTF-8 (Umlaute) korrekt liest.
  return "﻿" + zeilen.join("\r\n")
}

// ── Import ──────────────────────────────────────────────────────────────────

// Zeichenweiser CSV-Parser: berücksichtigt Anführungszeichen (auch mit
// eingebetteten Trennzeichen/Zeilenumbrüchen und ""-Escaping).
function parseZeilen(text, sep) {
  const zeilen = []
  let feldWert = ""
  let zeile = []
  let inZitat = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inZitat) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          feldWert += '"'
          i++
        } else inZitat = false
      } else feldWert += c
    } else if (c === '"') {
      inZitat = true
    } else if (c === sep) {
      zeile.push(feldWert)
      feldWert = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      zeile.push(feldWert)
      zeilen.push(zeile)
      feldWert = ""
      zeile = []
    } else {
      feldWert += c
    }
  }
  if (feldWert !== "" || zeile.length > 0) {
    zeile.push(feldWert)
    zeilen.push(zeile)
  }
  return zeilen.filter((z) => z.some((f) => f.trim() !== ""))
}

// Datum in „JJJJ-MM-TT" normalisieren; unterstützt „TT.MM.JJJJ".
function normDatum(roh) {
  const s = String(roh ?? "").trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  return null
}

// Emoji/Sonderzeichen entfernen, für den Klartext-Vergleich normalisieren.
function schluesselText(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-zäöüß0-9]/g, "")
    .trim()
}

// Kategorie-Klartext (oder key) auf einen gültigen key abbilden.
function kategorieKey(art, roh) {
  const liste = art === "einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN
  const ziel = schluesselText(roh)
  if (!ziel) return "sonstiges"
  const treffer = liste.find(
    (k) => schluesselText(k.key) === ziel || schluesselText(k.label) === ziel
  )
  return treffer?.key ?? "sonstiges"
}

// Kopfzeile? Enthält sie einen bekannten Spaltennamen, wird nach Namen
// zugeordnet – sonst gilt die feste Reihenfolge aus KOPF.
function spaltenIndex(ersteZeile) {
  const zellen = ersteZeile.map(schluesselText)
  const bekannt = ["datum", "art", "typ", "betrag", "kategorie", "konto", "notiz"]
  const istKopf = zellen.some((z) => bekannt.includes(z))
  if (!istKopf) return null
  const finde = (...namen) => zellen.findIndex((z) => namen.includes(z))
  return {
    datum: finde("datum"),
    art: finde("art", "typ"),
    betrag: finde("betrag", "summe", "wert"),
    kategorie: finde("kategorie"),
    konto: finde("konto"),
    notiz: finde("notiz", "beschreibung", "verwendungszweck"),
  }
}

// CSV-Text zu Buchungen parsen. Fehlende Konten werden neu angelegt.
// Rückgabe: { buchungen, neueKonten, uebersprungen }.
export function parseCsv(text, konten) {
  const roh = String(text ?? "").replace(/^﻿/, "")
  if (!roh.trim()) return { buchungen: [], neueKonten: [], uebersprungen: 0 }

  // Trennzeichen bestimmen: Semikolon (DE-Excel) bevorzugt, sonst Komma/Tab.
  const kopfzeile = roh.split(/\r?\n/, 1)[0] ?? ""
  const sep =
    kopfzeile.includes(";") ? ";"
      : kopfzeile.includes("\t") ? "\t"
      : ","

  const zeilen = parseZeilen(roh, sep)
  if (zeilen.length === 0) return { buchungen: [], neueKonten: [], uebersprungen: 0 }

  const spalten = spaltenIndex(zeilen[0])
  const idx = spalten ?? { datum: 0, art: 1, betrag: 2, kategorie: 3, konto: 4, notiz: 5 }
  const daten = spalten ? zeilen.slice(1) : zeilen

  const buchungen = []
  const neueKonten = []
  let uebersprungen = 0

  // Konten nach normalisiertem Namen nachschlagen (inkl. neu angelegter).
  const kontoNach = new Map(konten.map((k) => [schluesselText(k.name), k]))
  const zelle = (z, i) => (i >= 0 && i < z.length ? z[i] : "")
  const basisId = Date.now()

  daten.forEach((z, i) => {
    const datum = normDatum(zelle(z, idx.datum))
    const betragRoh = zuZahl(zelle(z, idx.betrag))
    if (!datum || betragRoh === 0) {
      uebersprungen++
      return
    }

    // Art aus Spalte ableiten – oder, wenn keine Spalte da ist, aus dem
    // Vorzeichen (Kontoauszüge: minus = Ausgabe, plus = Einnahme).
    const artText = schluesselText(zelle(z, idx.art))
    let art
    if (artText.startsWith("ein") || artText === "income" || artText === "gutschrift") {
      art = "einnahme"
    } else if (artText.startsWith("aus") || artText === "expense" || artText === "lastschrift") {
      art = "ausgabe"
    } else {
      art = betragRoh < 0 ? "ausgabe" : "einnahme"
    }

    const betrag = Math.abs(betragRoh)
    const kategorie = kategorieKey(art, zelle(z, idx.kategorie))

    // Konto zuordnen bzw. anlegen.
    let kontoId = null
    const kontoName = zelle(z, idx.konto).trim()
    if (kontoName) {
      const key = schluesselText(kontoName)
      let konto = kontoNach.get(key)
      if (!konto) {
        konto = { id: basisId + 100000 + neueKonten.length, name: kontoName, typ: "giro", startsaldo: 0, erstelltAm: basisId }
        kontoNach.set(key, konto)
        neueKonten.push(konto)
      }
      kontoId = konto.id
    }

    buchungen.push({
      id: basisId + i,
      art,
      betrag,
      kategorie,
      kontoId,
      datum,
      notiz: zelle(z, idx.notiz).trim(),
      erstelltAm: basisId + i,
    })
  })

  return { buchungen, neueKonten, uebersprungen }
}
