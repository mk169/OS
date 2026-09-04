import { describe, expect, it } from "vitest"
import { extrahiereTags, normalisiereTag, sammleTags, teileMitTags } from "../tags"
import { extrahiereWikilinks, findeZiel } from "../wikilinks"

describe("Schlagworte", () => {
  it("liest Tags aus dem Fließtext, vereinheitlicht und ohne Dubletten", () => {
    expect(extrahiereTags("Zu #Steuer und #steuer sowie #wg-kosten")).toEqual([
      "steuer",
      "wg-kosten",
    ])
  })

  it("erkennt keine Markdown-Überschrift als Tag", () => {
    expect(extrahiereTags("# Überschrift")).toEqual([])
  })

  it("verlangt einen Wortanfang vor dem Rautezeichen", () => {
    expect(extrahiereTags("Nr.1#kein-tag")).toEqual([])
  })

  it("zerlegt Text in Klartext- und Tag-Stücke", () => {
    expect(teileMitTags("Miete für #wohnen zahlen")).toEqual([
      { typ: "text", wert: "Miete für " },
      { typ: "tag", wert: "wohnen" },
      { typ: "text", wert: " zahlen" },
    ])
  })

  it("vereinheitlicht einzelne Tags", () => {
    expect(normalisiereTag(" #Steuer ")).toBe("steuer")
  })

  it("sammelt Tags über Wissen, Notizen und Projekte", () => {
    const tags = sammleTags(
      [{ id: 1, titel: "Abgabe", inhalt: "Frist #uni" }],
      [{ id: 2, titel: "Notiz", inhalt: "#uni und #privat", projektId: 9 }],
      [{ id: 3, name: "Archiviert", beschreibung: "#uni", archiviert: true }]
    )
    const uni = tags.find((t) => t.tag === "uni")
    expect(uni.eintraege).toHaveLength(2) // das archivierte Projekt zählt nicht
    expect(tags.map((t) => t.tag)).toContain("privat")
  })
})

describe("Wikilinks", () => {
  it("liest verlinkte Titel in Vorkommensreihenfolge", () => {
    expect(extrahiereWikilinks("Siehe [[Statistik]] und [[ Lernplan ]]")).toEqual([
      "Statistik",
      "Lernplan",
    ])
  })

  it("liefert für Text ohne Links eine leere Liste", () => {
    expect(extrahiereWikilinks("Nichts verlinkt")).toEqual([])
    expect(extrahiereWikilinks("")).toEqual([])
  })

  it("löst Titel auf Wissen, Projekte und Notizen auf", () => {
    const wissen = [{ id: 1, titel: "Bayes" }]
    const projekte = [{ id: 2, name: "Statistik" }]
    const notizen = [{ id: 3, titel: "Merkblatt", projektId: 2 }]
    expect(findeZiel("bayes", wissen, projekte, notizen)).toMatchObject({ typ: "wissen", id: 1 })
    expect(findeZiel("Statistik", wissen, projekte, notizen)).toMatchObject({ typ: "projekt", id: 2 })
    expect(findeZiel(" merkblatt ", wissen, projekte, notizen)).toMatchObject({
      typ: "notiz",
      id: 3,
      projektId: 2,
    })
  })

  it("liefert null für einen unbekannten Titel", () => {
    expect(findeZiel("Nichts", [], [], [])).toBeNull()
  })
})
