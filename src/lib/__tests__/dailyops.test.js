import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import {
  erledigteSchritte,
  faelltAn,
  rhythmusLabel,
  routineFortschritt,
  routineStreak,
  routinenAmTag,
  schrittUmschalten,
  tagesBilanz,
  verlauf,
  wochentagIndex,
} from "../dailyops"

const JETZT = new Date(2026, 8, 4, 12, 0, 0) // Freitag
const FREITAG = "2026-09-04"
const SAMSTAG = "2026-09-05"

const routine = (extra = {}) => ({
  id: 1,
  name: "Morgenroutine",
  zeit: "morgen",
  rhythmus: "taeglich",
  schritte: [
    { id: 11, text: "Wasser trinken" },
    { id: 12, text: "Tagesplan lesen" },
  ],
  ...extra,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("wochentagIndex", () => {
  it("zählt ab Montag = 0", () => {
    expect(wochentagIndex("2026-08-31")).toBe(0) // Montag
    expect(wochentagIndex(FREITAG)).toBe(4)
    expect(wochentagIndex("2026-09-06")).toBe(6) // Sonntag
  })
})

describe("faelltAn", () => {
  it("täglich: an jedem Tag", () => {
    expect(faelltAn(routine(), FREITAG)).toBe(true)
    expect(faelltAn(routine(), SAMSTAG)).toBe(true)
  })

  it("werktags: Montag bis Freitag", () => {
    const r = routine({ rhythmus: "werktags" })
    expect(faelltAn(r, FREITAG)).toBe(true)
    expect(faelltAn(r, SAMSTAG)).toBe(false)
  })

  it("Wochenende: Samstag und Sonntag", () => {
    const r = routine({ rhythmus: "wochenende" })
    expect(faelltAn(r, FREITAG)).toBe(false)
    expect(faelltAn(r, SAMSTAG)).toBe(true)
  })

  it("an bestimmten Tagen: nur die gewählten", () => {
    const r = routine({ rhythmus: "tage", tage: [0, 4] }) // Mo + Fr
    expect(faelltAn(r, FREITAG)).toBe(true)
    expect(faelltAn(r, "2026-09-03")).toBe(false) // Donnerstag
  })

  it("ohne gewählten Tag steht sie nie an", () => {
    expect(faelltAn(routine({ rhythmus: "tage" }), FREITAG)).toBe(false)
  })
})

describe("routinenAmTag", () => {
  it("zeigt nur anstehende Routinen, sortiert nach Tageszeit", () => {
    const routinen = [
      routine({ id: 1, zeit: "abend" }),
      routine({ id: 2, zeit: "morgen" }),
      routine({ id: 3, zeit: "tag", rhythmus: "wochenende" }),
    ]
    expect(routinenAmTag(routinen, FREITAG).map((r) => r.id)).toEqual([2, 1])
  })
})

describe("Abhaken", () => {
  it("hakt einen Schritt für genau diesen Tag an und wieder ab", () => {
    const eins = schrittUmschalten({}, 1, 11, FREITAG)
    expect(erledigteSchritte(eins, 1, FREITAG)).toEqual([11])
    expect(erledigteSchritte(eins, 1, SAMSTAG)).toEqual([])

    const zurueck = schrittUmschalten(eins, 1, 11, FREITAG)
    expect(erledigteSchritte(zurueck, 1, FREITAG)).toEqual([])
  })

  it("räumt leere Tage und Routinen wieder aus dem Protokoll", () => {
    const eins = schrittUmschalten({}, 1, 11, FREITAG)
    expect(schrittUmschalten(eins, 1, 11, FREITAG)).toEqual({})
  })

  it("lässt das bisherige Protokoll unverändert", () => {
    const vorher = {}
    schrittUmschalten(vorher, 1, 11, FREITAG)
    expect(vorher).toEqual({})
  })
})

describe("routineFortschritt", () => {
  it("zählt die erledigten Schritte des Tages", () => {
    const protokoll = { 1: { [FREITAG]: [11] } }
    expect(routineFortschritt(routine(), protokoll, FREITAG)).toEqual({
      erledigt: 1,
      gesamt: 2,
      prozent: 50,
      fertig: false,
    })
  })

  it("ist fertig, wenn alle Schritte stehen", () => {
    const protokoll = { 1: { [FREITAG]: [11, 12] } }
    expect(routineFortschritt(routine(), protokoll, FREITAG).fertig).toBe(true)
  })

  it("ignoriert Haken auf gelöschten Schritten", () => {
    const protokoll = { 1: { [FREITAG]: [11, 99] } }
    expect(routineFortschritt(routine(), protokoll, FREITAG).erledigt).toBe(1)
  })

  it("gilt ohne Schritte nicht als fertig", () => {
    expect(routineFortschritt(routine({ schritte: [] }), {}, FREITAG).fertig).toBe(false)
  })
})

describe("tagesBilanz", () => {
  it("fasst alle anstehenden Routinen des Tages zusammen", () => {
    const routinen = [
      routine({ id: 1 }),
      routine({ id: 2, schritte: [{ id: 21, text: "Aufräumen" }] }),
      routine({ id: 3, rhythmus: "wochenende" }), // steht freitags nicht an
    ]
    const protokoll = { 1: { [FREITAG]: [11, 12] } }
    expect(tagesBilanz(routinen, protokoll, FREITAG)).toEqual({
      routinen: 2,
      fertigeRoutinen: 1,
      erledigt: 2,
      gesamt: 3,
      prozent: 67,
    })
  })

  it("ist an einem Tag ohne Routine leer statt fehlerhaft", () => {
    expect(tagesBilanz([], {}, FREITAG)).toMatchObject({ routinen: 0, prozent: 0 })
  })
})

describe("routineStreak", () => {
  const alleSchritte = (tag) => ({ 1: { [tag]: [11, 12] } })

  it("zählt vollständige Tage bis heute", () => {
    const protokoll = {
      1: { "2026-09-04": [11, 12], "2026-09-03": [11, 12], "2026-09-02": [11, 12] },
    }
    expect(routineStreak([routine()], protokoll)).toBe(3)
  })

  it("bricht der noch offene heutige Tag die Serie nicht", () => {
    const protokoll = { 1: { "2026-09-03": [11, 12], "2026-09-02": [11, 12] } }
    expect(routineStreak([routine()], protokoll)).toBe(2)
  })

  it("endet an einem unvollständigen Tag", () => {
    const protokoll = { 1: { "2026-09-04": [11, 12], "2026-09-03": [11] } }
    expect(routineStreak([routine()], protokoll)).toBe(1)
  })

  it("überspringt Tage ohne anstehende Routine", () => {
    // Werktags-Routine: das Wochenende dazwischen darf die Serie nicht brechen.
    const werktags = routine({ rhythmus: "werktags" })
    const protokoll = {
      1: {
        "2026-09-04": [11, 12], // Fr
        "2026-09-03": [11, 12], // Do
        "2026-09-02": [11, 12], // Mi
        "2026-09-01": [11, 12], // Di
        "2026-08-31": [11, 12], // Mo
        "2026-08-28": [11, 12], // Fr davor
      },
    }
    expect(routineStreak([werktags], protokoll)).toBe(6)
  })

  it("ist ohne Routinen 0", () => {
    expect(routineStreak([], {})).toBe(0)
    expect(routineStreak([routine()], alleSchritte("2026-01-01"))).toBe(0)
  })
})

describe("verlauf", () => {
  it("liefert die letzten Tage, ältester zuerst", () => {
    const tage = verlauf([routine()], { 1: { [FREITAG]: [11, 12] } }, 7)
    expect(tage).toHaveLength(7)
    expect(tage[0].datum).toBe("2026-08-29")
    expect(tage[6]).toMatchObject({ datum: FREITAG, erledigt: 2, gesamt: 2 })
  })
})

describe("rhythmusLabel", () => {
  it("beschreibt den Rhythmus kurz", () => {
    expect(rhythmusLabel(routine())).toBe("Täglich")
    expect(rhythmusLabel(routine({ rhythmus: "werktags" }))).toBe("Werktags (Mo–Fr)")
    expect(rhythmusLabel(routine({ rhythmus: "tage", tage: [4, 0] }))).toBe("Mo, Fr")
    expect(rhythmusLabel(routine({ rhythmus: "tage", tage: [] }))).toBe("Kein Tag gewählt")
  })
})
