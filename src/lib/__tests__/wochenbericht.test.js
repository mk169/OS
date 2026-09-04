import { describe, expect, it } from "vitest"
import { baueBericht, fokusText, wochenEndeVon } from "../wochenbericht"

const WOCHE = "2026-08-31" // Montag
const habit = (extra = {}) => ({ id: 1, erledigtAn: [], wochenZiel: 1, ...extra })

describe("wochenEndeVon", () => {
  it("liefert den Sonntag der Woche", () => {
    expect(wochenEndeVon(WOCHE)).toBe("2026-09-06")
  })
})

describe("baueBericht", () => {
  it("nimmt erledigte Todos der Woche auf, offene nicht", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      todos: [
        { id: 1, text: "Abgabe", datum: "2026-09-02", erledigt: true },
        { id: 2, text: "Offen", datum: "2026-09-02", erledigt: false },
        { id: 3, text: "Andere Woche", datum: "2026-09-20", erledigt: true },
      ],
    })
    expect(bericht.todos.map((t) => t.text)).toEqual(["Abgabe"])
  })

  it("nimmt erledigte Todos ohne Datum mit", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      todos: [{ id: 1, text: "Spontan", erledigt: true }],
    })
    expect(bericht.todos).toHaveLength(1)
  })

  it("summiert die Fokuszeit der Woche", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      deepwork: [
        { datum: "2026-09-01", minuten: 50 },
        { datum: "2026-09-03", minuten: 25 },
        { datum: "2026-09-20", minuten: 90 },
      ],
    })
    expect(bericht.fokusMinuten).toBe(75)
    expect(bericht.fokusSessions).toBe(2)
  })

  it("bilanziert die Habits der Woche", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      habits: [
        habit({ id: 1, erledigtAn: ["2026-09-01"] }),
        habit({ id: 2, erledigtAn: [] }),
      ],
    })
    expect(bericht.habits).toEqual({ erreicht: 1, gesamt: 2 })
  })

  it("zählt bewertete Karten und wiederkehrende Termine der Woche", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      lernprotokoll: { "2026-09-01": 12, "2026-09-02": 8, "2026-09-30": 100 },
      termine: [{ datum: "2026-08-31", wiederholung: "taeglich" }],
    })
    expect(bericht.karten).toBe(20)
    expect(bericht.termine).toBe(7)
  })

  it("zählt die Tage, an denen der Betrieb komplett war", () => {
    const routine = {
      id: 1,
      rhythmus: "werktags",
      schritte: [{ id: 11, text: "Aufräumen" }],
    }
    const bericht = baueBericht({
      woche: WOCHE,
      routinen: [routine],
      routineProtokoll: {
        1: {
          "2026-08-31": [11], // Mo – vollständig
          "2026-09-01": [11], // Di – vollständig
          "2026-09-05": [11], // Sa – Routine steht nicht an, zählt nicht
        },
      },
    })
    // Mo–Fr stehen an (5 Tage), zwei davon vollständig.
    expect(bericht.routinen).toEqual({ vollstaendig: 2, tage: 5 })
  })

  it("lässt die Routinen-Bilanz leer, wenn keine Routine anstand", () => {
    expect(baueBericht({ woche: WOCHE }).routinen).toEqual({
      vollstaendig: 0,
      tage: 0,
    })
  })

  it("mittelt die Vitalitäts-Check-ins der Woche", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      vitalitaet: [
        { datum: "2026-09-01", energie: 4, schlaf: 3 },
        { datum: "2026-09-02", energie: 3, schlaf: 4 },
        { datum: "2026-10-01", energie: 1, schlaf: 1 },
      ],
    })
    expect(bericht.vitalitaet).toEqual({ energie: 3.5, schlaf: 3.5, tage: 2 })
  })

  it("lässt Felder ohne Daten leer statt sie mit Nullen zu erfinden", () => {
    const bericht = baueBericht({ woche: WOCHE })
    expect(bericht.vitalitaet).toEqual({ energie: null, schlaf: null, tage: 0 })
    expect(bericht.wochenziel).toBeNull()
    expect(bericht.habits).toEqual({ erreicht: 0, gesamt: 0 })
  })

  it("übernimmt das Wochenziel der passenden Periode", () => {
    const bericht = baueBericht({
      woche: WOCHE,
      zyklen: [
        {
          titel: "Q4",
          wochen: [
            {
              start: WOCHE,
              text: "Kapitel 3 abschließen",
              unterziele: [{ erledigt: true }, { erledigt: false }],
            },
          ],
        },
      ],
    })
    expect(bericht.wochenziel).toMatchObject({
      text: "Kapitel 3 abschließen",
      erledigt: 1,
      gesamt: 2,
      periode: "Q4",
    })
  })
})

describe("fokusText", () => {
  it("schreibt Minuten und Stunden lesbar", () => {
    expect(fokusText(0)).toBeTypeOf("string")
    expect(fokusText(45)).toContain("45")
    expect(fokusText(120)).toContain("2")
  })
})
