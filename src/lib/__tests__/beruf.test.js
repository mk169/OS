import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import {
  bewerbungStatusVon,
  bewerbungsKennzahlen,
  istOffen,
  offeneFristen,
  setzeStatus,
  weiterbildungStatusVon,
  weiterbildungStunden,
  zielErreicht,
  zielFortschritt,
} from "../beruf"

const JETZT = new Date(2026, 8, 4, 12, 0, 0)
const bewerbung = (extra) => ({ id: 1, firma: "Acme", rolle: "Werkstudent", ...extra })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("Bewerbungs-Status", () => {
  it("kennt die Stationen der Pipeline", () => {
    expect(bewerbungStatusVon("gespraech").label).toBe("Im Gespräch")
  })

  it("fällt bei unbekanntem Status auf 'notiert' zurück", () => {
    expect(bewerbungStatusVon("quatsch").key).toBe("notiert")
    expect(bewerbungStatusVon(undefined).key).toBe("notiert")
  })

  it("zählt nur laufende Vorgänge als offen", () => {
    expect(istOffen(bewerbung({ status: "beworben" }))).toBe(true)
    expect(istOffen(bewerbung({ status: "gespraech" }))).toBe(true)
    expect(istOffen(bewerbung({ status: "angebot" }))).toBe(false)
    expect(istOffen(bewerbung({ status: "abgesagt" }))).toBe(false)
  })
})

describe("setzeStatus", () => {
  it("hält jeden Wechsel mit Datum im Verlauf fest", () => {
    const neu = setzeStatus(bewerbung({ status: "notiert" }), "beworben")
    expect(neu.status).toBe("beworben")
    expect(neu.verlauf).toEqual([{ status: "beworben", am: "2026-09-04" }])
  })

  it("hängt weitere Wechsel an", () => {
    const erst = setzeStatus(bewerbung({ status: "notiert" }), "beworben")
    const dann = setzeStatus(erst, "gespraech")
    expect(dann.verlauf.map((v) => v.status)).toEqual(["beworben", "gespraech"])
  })

  it("ändert nichts, wenn der Status derselbe ist", () => {
    const vorher = bewerbung({ status: "beworben" })
    expect(setzeStatus(vorher, "beworben")).toBe(vorher)
  })

  it("lässt das Original unangetastet", () => {
    const vorher = bewerbung({ status: "notiert" })
    setzeStatus(vorher, "beworben")
    expect(vorher.status).toBe("notiert")
    expect(vorher.verlauf).toBeUndefined()
  })
})

describe("bewerbungsKennzahlen", () => {
  const liste = [
    bewerbung({ id: 1, status: "beworben" }),
    bewerbung({ id: 2, status: "gespraech" }),
    bewerbung({ id: 3, status: "angebot" }),
    bewerbung({ id: 4, status: "abgesagt" }),
    bewerbung({ id: 5, status: "abgesagt" }),
  ]

  it("zählt Pipeline und Abschlüsse", () => {
    expect(bewerbungsKennzahlen(liste)).toMatchObject({
      gesamt: 5,
      offen: 2,
      gespraeche: 1,
      angebote: 1,
      abgeschlossen: 3,
    })
  })

  it("misst die Quote nur an abgeschlossenen Vorgängen", () => {
    expect(bewerbungsKennzahlen(liste).quote).toBe(33)
  })

  it("lässt die Quote offen, solange nichts abgeschlossen ist", () => {
    expect(bewerbungsKennzahlen([bewerbung({ status: "beworben" })]).quote).toBeNull()
    expect(bewerbungsKennzahlen([]).quote).toBeNull()
  })
})

describe("offeneFristen", () => {
  it("zeigt nahe Fristen offener Bewerbungen, nächste zuerst", () => {
    const liste = [
      bewerbung({ id: 1, status: "beworben", frist: "2026-09-10" }),
      bewerbung({ id: 2, status: "notiert", frist: "2026-09-06" }),
      bewerbung({ id: 3, status: "beworben", frist: "2026-12-01" }), // zu weit weg
      bewerbung({ id: 4, status: "abgesagt", frist: "2026-09-05" }), // nicht mehr offen
      bewerbung({ id: 5, status: "beworben" }), // ohne Frist
    ]
    expect(offeneFristen(liste).map((b) => b.id)).toEqual([2, 1])
  })

  it("behält Überfälliges im Blick", () => {
    const liste = [bewerbung({ status: "beworben", frist: "2026-08-20" })]
    expect(offeneFristen(liste)[0].tage).toBe(-15)
  })
})

describe("Karriereziele", () => {
  it("rechnet den Fortschritt aus den Schritten", () => {
    const ziel = {
      schritte: [{ erledigt: true }, { erledigt: true }, { erledigt: false }],
    }
    expect(zielFortschritt(ziel)).toEqual({ erledigt: 2, gesamt: 3, prozent: 67 })
  })

  it("gilt erst als erreicht, wenn alle Schritte stehen", () => {
    expect(zielErreicht({ schritte: [{ erledigt: true }] })).toBe(true)
    expect(zielErreicht({ schritte: [{ erledigt: false }] })).toBe(false)
  })

  it("ist ohne Schritte weder fertig noch fehlerhaft", () => {
    expect(zielFortschritt({})).toEqual({ erledigt: 0, gesamt: 0, prozent: 0 })
    expect(zielErreicht({})).toBe(false)
  })
})

describe("Weiterbildung", () => {
  const kurse = [
    { titel: "Statistik", status: "fertig", stunden: 20 },
    { titel: "Vortrag", status: "laeuft", stunden: 8 },
    { titel: "Sprachkurs", status: "geplant" },
  ]

  it("summiert Stunden, wahlweise nur abgeschlossene", () => {
    expect(weiterbildungStunden(kurse)).toBe(28)
    expect(weiterbildungStunden(kurse, true)).toBe(20)
  })

  it("kennt die Status und fällt sauber zurück", () => {
    expect(weiterbildungStatusVon("laeuft").label).toBe("Läuft")
    expect(weiterbildungStatusVon("quatsch").key).toBe("geplant")
  })
})
