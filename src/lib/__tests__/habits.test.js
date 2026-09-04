import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import {
  alsKettenListe,
  bereichVon,
  disziplinAmTag,
  disziplinStreak,
  edgeScore,
  erledigtInWoche,
  tagNummer,
  wochenStreakVon,
  wochenZielErreicht,
} from "../habits"

const JETZT = new Date(2026, 8, 4, 12, 0, 0) // Freitag
const TAG = 86_400_000
// Habit-IDs sind Erstell-Zeitstempel; alt genug, um an allen Testtagen zu zählen.
const ALT = new Date(2026, 0, 1).getTime()

const habit = (extra = {}) => ({ id: ALT, erledigtAn: [], ...extra })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("bereichVon", () => {
  it("findet den Bereich eines Habits", () => {
    const bereiche = [{ id: "koerper", name: "Körper", farbe: "emerald" }]
    expect(bereichVon(habit({ bereichId: "koerper" }), bereiche).name).toBe("Körper")
  })

  it("fällt auf Allgemein zurück, wenn der Bereich fehlt", () => {
    expect(bereichVon(habit({ bereichId: "weg" }), []).name).toBe("Allgemein")
  })
})

describe("alsKettenListe", () => {
  it("hängt gestackte Habits an ihren Anker", () => {
    const a = habit({ id: 1, name: "Aufstehen" })
    const b = habit({ id: 2, name: "Wasser", stackNachId: 1 })
    const c = habit({ id: 3, name: "Lesen" })
    const ketten = alsKettenListe([a, b, c])
    expect(ketten.map((k) => k.map((h) => h.name))).toEqual([
      ["Aufstehen", "Wasser"],
      ["Lesen"],
    ])
  })

  it("behandelt einen Anker, den es nicht mehr gibt, als eigene Kette", () => {
    const verwaist = habit({ id: 2, name: "Wasser", stackNachId: 999 })
    expect(alsKettenListe([verwaist])).toEqual([[verwaist]])
  })
})

describe("disziplinAmTag", () => {
  it("rechnet erledigt/gesamt und Prozent", () => {
    const habits = [
      habit({ id: ALT, erledigtAn: ["2026-09-04"] }),
      habit({ id: ALT + 1, erledigtAn: [] }),
    ]
    expect(disziplinAmTag(habits, new Date(2026, 8, 4))).toMatchObject({
      erledigt: 1,
      gesamt: 2,
      prozent: 50,
      vollstaendig: false,
    })
  })

  it("zählt einen Tag ohne Habits nicht als vollständig", () => {
    expect(disziplinAmTag([], new Date(2026, 8, 4))).toMatchObject({
      gesamt: 0,
      prozent: 0,
      vollstaendig: false,
    })
  })

  it("lässt frisch angelegte Habits vergangene Tage nicht brechen", () => {
    const neu = habit({ id: JETZT.getTime(), erledigtAn: [] })
    expect(disziplinAmTag([neu], new Date(2026, 8, 1)).gesamt).toBe(0)
  })
})

describe("disziplinStreak", () => {
  const tageZurueck = (n) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(JETZT.getTime() - i * TAG)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    })

  it("zählt lückenlos vollständige Tage", () => {
    expect(disziplinStreak([habit({ erledigtAn: tageZurueck(3) })])).toBe(3)
  })

  it("bricht der laufende Tag die Serie nicht", () => {
    // Gestern und vorgestern vollständig, heute noch offen.
    const ohneHeute = tageZurueck(3).slice(1)
    expect(disziplinStreak([habit({ erledigtAn: ohneHeute })])).toBe(2)
  })

  it("akzeptiert eingefrorene Tage", () => {
    const gefroren = new Set(["2026-09-03"])
    const mitLuecke = ["2026-09-04", "2026-09-02"]
    expect(disziplinStreak([habit({ erledigtAn: mitLuecke })], gefroren)).toBe(3)
  })
})

describe("edgeScore", () => {
  it("mittelt die Disziplin der letzten sieben Tage", () => {
    // Vier von sieben Tagen erledigt → 4/7 ≈ 57 %.
    const h = habit({
      erledigtAn: ["2026-09-04", "2026-09-03", "2026-09-02", "2026-09-01"],
    })
    expect(edgeScore([h])).toBe(57)
  })

  it("ist ohne Habits 0", () => {
    expect(edgeScore([])).toBe(0)
  })
})

describe("tagNummer", () => {
  it("zählt ab dem ältesten Habit, beginnend bei 1", () => {
    const start = new Date(2026, 8, 1).getTime()
    expect(tagNummer([habit({ id: start })])).toBe(4)
  })

  it("ist ohne Habits Tag 1", () => {
    expect(tagNummer([])).toBe(1)
  })

  it("ignoriert IDs, die keine Zeitstempel sind (z. B. aus Importen)", () => {
    // Eine kleine Zähler-ID wäre als Datum 1970 – das ergäbe Tag 20701.
    expect(tagNummer([habit({ id: 1 }), habit({ id: 2 })])).toBe(1)
  })

  it("nimmt bei gemischten IDs den ältesten plausiblen Zeitstempel", () => {
    const start = new Date(2026, 8, 1).getTime()
    expect(tagNummer([habit({ id: 3 }), habit({ id: start })])).toBe(4)
  })
})

describe("Wochenziele", () => {
  const montag = new Date(2026, 7, 31)

  it("zählt Erledigungen innerhalb der Woche", () => {
    const h = habit({ erledigtAn: ["2026-08-31", "2026-09-02", "2026-09-08"] })
    expect(erledigtInWoche(h, montag)).toBe(2)
  })

  it("ist erreicht, sobald das Wochenziel erfüllt ist (Standard 3)", () => {
    const fast = habit({ erledigtAn: ["2026-08-31", "2026-09-01"] })
    const voll = habit({ erledigtAn: ["2026-08-31", "2026-09-01", "2026-09-02"] })
    expect(wochenZielErreicht(fast, montag)).toBe(false)
    expect(wochenZielErreicht(voll, montag)).toBe(true)
  })

  it("beachtet ein eigenes Wochenziel", () => {
    const h = habit({ wochenZiel: 1, erledigtAn: ["2026-09-01"] })
    expect(wochenZielErreicht(h, montag)).toBe(true)
  })

  it("zählt aufeinanderfolgende erreichte Wochen", () => {
    const h = habit({
      wochenZiel: 1,
      erledigtAn: ["2026-09-01", "2026-08-25", "2026-08-18"],
    })
    expect(wochenStreakVon(h)).toBe(3)
  })

  it("bricht die laufende, noch offene Woche die Serie nicht", () => {
    const h = habit({ wochenZiel: 1, erledigtAn: ["2026-08-25"] })
    expect(wochenStreakVon(h)).toBe(1)
  })
})
