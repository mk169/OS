import { describe, expect, it } from "vitest"
import {
  ausgabenNachKategorie,
  jahresMonate,
  kategorieVon,
  kontoSaldo,
  monatLabel,
  monatVerschieben,
  monatsSchluessel,
  parseBetrag,
  summeMonat,
} from "../finanzen"

const buchung = (extra) => ({ art: "ausgabe", betrag: 0, kontoId: 1, ...extra })

describe("parseBetrag", () => {
  it("versteht deutsche und englische Schreibweise", () => {
    expect(parseBetrag("1.234,56")).toBeCloseTo(1234.56)
    expect(parseBetrag("12,50")).toBeCloseTo(12.5)
    expect(parseBetrag("1234.56")).toBeCloseTo(123456) // Punkt = Tausendertrenner
    expect(parseBetrag(" 42 ")).toBe(42)
    expect(parseBetrag(7.5)).toBe(7.5)
  })

  it("liefert 0 für Unsinn statt NaN", () => {
    expect(parseBetrag("abc")).toBe(0)
    expect(parseBetrag(null)).toBe(0)
  })
})

describe("kontoSaldo", () => {
  it("rechnet Startsaldo plus Einnahmen minus Ausgaben", () => {
    const transaktionen = [
      buchung({ art: "einnahme", betrag: 1200, kontoId: 1 }),
      buchung({ art: "ausgabe", betrag: 300, kontoId: 1 }),
      buchung({ art: "ausgabe", betrag: 999, kontoId: 2 }), // anderes Konto
    ]
    expect(kontoSaldo(1, 500, transaktionen)).toBe(1400)
  })

  it("kommt ohne Buchungen mit dem Startsaldo aus", () => {
    expect(kontoSaldo(1, 250, [])).toBe(250)
  })
})

describe("Zeiträume", () => {
  it("schneidet den Monat aus einem Datum", () => {
    expect(monatsSchluessel("2026-09-04")).toBe("2026-09")
  })

  it("verschiebt Monate über Jahresgrenzen", () => {
    expect(monatVerschieben("2026-01", -1)).toBe("2025-12")
    expect(monatVerschieben("2026-12", 1)).toBe("2027-01")
  })

  it("schreibt den Monat aus", () => {
    expect(monatLabel("2026-09")).toBe("September 2026")
    expect(monatLabel("kaputt")).toBe("kaputt")
  })
})

describe("Auswertungen", () => {
  const transaktionen = [
    buchung({ betrag: 800, kategorie: "wohnen", datum: "2026-09-01" }),
    buchung({ betrag: 120, kategorie: "lebensmittel", datum: "2026-09-03" }),
    buchung({ betrag: 60, kategorie: "lebensmittel", datum: "2026-09-20" }),
    buchung({ art: "einnahme", betrag: 1400, kategorie: "gehalt", datum: "2026-09-01" }),
    buchung({ betrag: 50, kategorie: "freizeit", datum: "2026-08-12" }),
  ]

  it("summiert je Monat und Buchungsart", () => {
    expect(summeMonat(transaktionen, "2026-09", "ausgabe")).toBe(980)
    expect(summeMonat(transaktionen, "2026-09", "einnahme")).toBe(1400)
    expect(summeMonat(transaktionen, "2026-08", "ausgabe")).toBe(50)
  })

  it("gruppiert Ausgaben je Kategorie, größte zuerst", () => {
    expect(ausgabenNachKategorie(transaktionen, "2026-09")).toEqual([
      { kategorie: "wohnen", betrag: 800 },
      { kategorie: "lebensmittel", betrag: 180 },
    ])
  })

  it("liefert für ein Jahr zwölf Monatswerte", () => {
    const reihe = jahresMonate(transaktionen, "2026")
    expect(reihe).toHaveLength(12)
    expect(reihe[8]).toEqual({ monat: 9, einnahme: 1400, ausgabe: 980 })
  })
})

describe("kategorieVon", () => {
  it("findet Kategorien je Buchungsart", () => {
    expect(kategorieVon("ausgabe", "wohnen").label).toBe("Wohnen")
    expect(kategorieVon("einnahme", "gehalt").label).toBe("Gehalt")
  })

  it("fällt bei unbekannter Kategorie auf Sonstiges zurück", () => {
    expect(kategorieVon("ausgabe", "gibtsnicht").key).toBe("sonstiges")
  })
})
