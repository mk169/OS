import { describe, expect, it } from "vitest"
import { lebensZeilen } from "../lebensueberblick"
import { inTagen } from "../datum"

const HEUTE = "2026-09-06"

describe("lebensZeilen", () => {
  it("zeigt nichts, wenn nichts gepflegt ist", () => {
    expect(lebensZeilen({}, HEUTE)).toEqual([])
  })

  it("fasst Vermögen und Monatssaldo zusammen", () => {
    const [finanzen] = lebensZeilen(
      {
        konten: [{ id: 1, startsaldo: 1000 }],
        transaktionen: [
          { kontoId: 1, art: "ausgabe", betrag: 200, datum: "2026-09-02" },
          { kontoId: 1, art: "einnahme", betrag: 500, datum: "2026-09-01" },
          // Vormonat zählt nicht in den Monatssaldo, wohl aber ins Vermögen.
          { kontoId: 1, art: "ausgabe", betrag: 100, datum: "2026-08-30" },
        ],
      },
      HEUTE
    )
    expect(finanzen.key).toBe("finanzen")
    expect(finanzen.ziel).toBe("finanzen")
    // 1000 − 200 + 500 − 100 = 1200
    expect(finanzen.label).toContain("1.200")
    expect(finanzen.wert).toContain("+")
    expect(finanzen.ton).toBe("gut")
  })

  it("warnt, wenn diesen Monat mehr raus- als reingeht", () => {
    const [finanzen] = lebensZeilen(
      {
        konten: [{ id: 1, startsaldo: 0 }],
        transaktionen: [
          { kontoId: 1, art: "ausgabe", betrag: 80, datum: "2026-09-03" },
        ],
      },
      HEUTE
    )
    expect(finanzen.ton).toBe("achtung")
  })

  it("nennt die nächste Bewerbungsfrist", () => {
    const zeilen = lebensZeilen(
      {
        bewerbungen: [
          { id: 1, firma: "Acme", status: "notiert", frist: inTagen(1) },
          { id: 2, firma: "Später", status: "notiert", frist: inTagen(9) },
        ],
      },
      HEUTE
    )
    const beruf = zeilen.find((z) => z.key === "beruf")
    expect(beruf.label).toBe("Acme")
    expect(beruf.wert).toBe("in 1 Tag")
    expect(beruf.ton).toBe("achtung")
  })

  it("fällt bei Bewerbungen ohne Frist auf die laufende Anzahl zurück", () => {
    const zeilen = lebensZeilen(
      { bewerbungen: [{ id: 1, firma: "Acme", status: "notiert" }] },
      HEUTE
    )
    const beruf = zeilen.find((z) => z.key === "beruf")
    expect(beruf.label).toBe("1 Bewerbung")
    expect(beruf.wert).toBe("laufen gerade")
  })

  it("zeigt die laufende Fokus-Periode mit Restlaufzeit", () => {
    const zeilen = lebensZeilen(
      {
        zyklen: [
          { id: 1, titel: "Abschluss", start: inTagen(-10), ende: inTagen(5) },
          { id: 2, titel: "Vorbei", start: inTagen(-40), ende: inTagen(-20) },
        ],
      },
      HEUTE
    )
    const periode = zeilen.find((z) => z.key === "periode")
    expect(periode.label).toBe("Abschluss")
    expect(periode.wert).toBe("noch 5 Tage")
  })

  it("erinnert an den offenen Körper-Check-in", () => {
    const zeilen = lebensZeilen(
      { vitalitaet: [{ datum: "2026-09-05", energie: 4 }] },
      HEUTE
    )
    const koerper = zeilen.find((z) => z.key === "vitalitaet")
    expect(koerper.label).toBe("Check-in offen")
    expect(koerper.ziel).toBe("dailyops")
  })

  it("zeigt den ausgefüllten Check-in von heute", () => {
    const zeilen = lebensZeilen(
      { vitalitaet: [{ datum: HEUTE, schlaf: 7, energie: 4 }] },
      HEUTE
    )
    const koerper = zeilen.find((z) => z.key === "vitalitaet")
    expect(koerper.label).toBe("7 h Schlaf")
    expect(koerper.wert).toBe("Energie 4/5")
  })

  it("nennt, was gerade läuft – und wie viel sonst noch", () => {
    const zeilen = lebensZeilen(
      {
        medien: [
          { id: 1, titel: "Dune", status: "dabei" },
          { id: 2, titel: "Solaris", status: "dabei" },
          { id: 3, titel: "Ungelesen", status: "geplant" },
        ],
      },
      HEUTE
    )
    const leisure = zeilen.find((z) => z.key === "leisure")
    expect(leisure.label).toBe("Dune")
    expect(leisure.wert).toBe("und 1 weitere")
  })

  it("hält die Reihenfolge Finanzen → Beruf → Periode → Körper → Leisure", () => {
    const zeilen = lebensZeilen(
      {
        konten: [{ id: 1, startsaldo: 10 }],
        bewerbungen: [{ id: 1, firma: "Acme", status: "notiert" }],
        zyklen: [{ id: 1, titel: "Jetzt", start: inTagen(-1), ende: inTagen(9) }],
        vitalitaet: [{ datum: HEUTE, energie: 3 }],
        medien: [{ id: 1, titel: "Dune", status: "dabei" }],
      },
      HEUTE
    )
    expect(zeilen.map((z) => z.key)).toEqual([
      "finanzen",
      "beruf",
      "periode",
      "vitalitaet",
      "leisure",
    ])
  })
})
