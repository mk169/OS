import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import { erkenneDatum, erkenneProjekt } from "../erkennung"

const JETZT = new Date(2026, 8, 4, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("erkenneDatum", () => {
  it("versteht die gängigen Zeitangaben", () => {
    expect(erkenneDatum("Abgabe heute")).toBe("2026-09-04")
    expect(erkenneDatum("Abgabe morgen")).toBe("2026-09-05")
    expect(erkenneDatum("Abgabe übermorgen")).toBe("2026-09-06")
    expect(erkenneDatum("Termin nächste Woche")).toBe("2026-09-11")
  })

  it("verwechselt 'übermorgen' nicht mit 'morgen'", () => {
    expect(erkenneDatum("übermorgen")).not.toBe(erkenneDatum("morgen"))
  })

  it("rechnet Zeitspannen mit Zahl aus", () => {
    expect(erkenneDatum("in 3 Tagen abgeben")).toBe("2026-09-07")
    expect(erkenneDatum("in 2 Wochen abgeben")).toBe("2026-09-18")
    expect(erkenneDatum("in 1 Monaten")).toBe("2026-10-04")
  })

  it("achtet nicht auf Groß- und Kleinschreibung", () => {
    expect(erkenneDatum("MORGEN anrufen")).toBe("2026-09-05")
  })

  it("liefert null, wenn nichts drinsteht", () => {
    expect(erkenneDatum("Einfach nur ein Text")).toBeNull()
    expect(erkenneDatum("")).toBeNull()
    expect(erkenneDatum(null)).toBeNull()
  })
})

describe("erkenneProjekt", () => {
  const projekte = [
    { id: 1, name: "Statistik" },
    { id: 2, name: "Altes Projekt", archiviert: true },
  ]

  it("findet ein Projekt am Namen im Text", () => {
    expect(erkenneProjekt("Übung für Statistik rechnen", projekte)?.id).toBe(1)
  })

  it("achtet nicht auf Groß- und Kleinschreibung", () => {
    expect(erkenneProjekt("statistik lernen", projekte)?.id).toBe(1)
  })

  it("überspringt archivierte Projekte", () => {
    expect(erkenneProjekt("Altes Projekt aufräumen", projekte)).toBeNull()
  })

  it("liefert null ohne Treffer", () => {
    expect(erkenneProjekt("Einkaufen gehen", projekte)).toBeNull()
    expect(erkenneProjekt("", projekte)).toBeNull()
  })
})
