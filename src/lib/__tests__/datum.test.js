import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import {
  fristTon,
  schluessel,
  heute,
  inTagen,
  datumLang,
  tageBis,
  tageBisZahl,
  montagVon,
  wochenSchluessel,
} from "../datum"

// Feste 'Jetzt'-Zeit: Freitag, 4. September 2026, 12:00 Uhr Ortszeit.
const JETZT = new Date(2026, 8, 4, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("schluessel", () => {
  it("formatiert als JJJJ-MM-TT mit führenden Nullen", () => {
    expect(schluessel(new Date(2026, 0, 5))).toBe("2026-01-05")
    expect(schluessel(new Date(2026, 11, 31))).toBe("2026-12-31")
  })

  it("rechnet in Ortszeit, nicht in UTC", () => {
    // Kurz vor Mitternacht: toISOString() würde hier auf den Folgetag springen.
    expect(schluessel(new Date(2026, 8, 4, 23, 30))).toBe("2026-09-04")
  })
})

describe("heute / inTagen", () => {
  it("heute liefert den aktuellen Tag", () => {
    expect(heute()).toBe("2026-09-04")
  })

  it("inTagen zählt vorwärts und rückwärts, auch über Monatsgrenzen", () => {
    expect(inTagen(0)).toBe("2026-09-04")
    expect(inTagen(1)).toBe("2026-09-05")
    expect(inTagen(-4)).toBe("2026-08-31")
    expect(inTagen(30)).toBe("2026-10-04")
  })
})

describe("datumLang", () => {
  it("schreibt Wochentag, Tag, Monat und Jahr aus", () => {
    expect(datumLang("2026-09-04")).toBe("Fr, 4. September 2026")
    expect(datumLang("2026-01-01")).toBe("Do, 1. Januar 2026")
  })
})

describe("tageBisZahl / tageBis", () => {
  it("zählt Tage bis zum Datum, negativ für Vergangenes", () => {
    expect(tageBisZahl("2026-09-04")).toBe(0)
    expect(tageBisZahl("2026-09-11")).toBe(7)
    expect(tageBisZahl("2026-09-01")).toBe(-3)
  })

  it("beschreibt die nahe Zukunft in Worten", () => {
    expect(tageBis("2026-09-04")).toBe("heute!")
    expect(tageBis("2026-09-05")).toBe("morgen")
    expect(tageBis("2026-09-07")).toBe("in 3 Tagen")
    expect(tageBis("2026-09-03")).toBe("seit gestern")
    expect(tageBis("2026-08-30")).toBe("seit 5 Tagen")
  })
})

describe("fristTon", () => {
  it("unterscheidet vorbei, heute, bald und fern", () => {
    expect(fristTon("2026-09-03")).toBe("vorbei")
    expect(fristTon("2026-09-04")).toBe("heute")
    expect(fristTon("2026-09-07")).toBe("bald")
    expect(fristTon("2026-09-08")).toBe("fern")
  })

  it("liefert ohne Datum null", () => {
    expect(fristTon(null)).toBeNull()
    expect(fristTon("")).toBeNull()
  })
})

describe("montagVon / wochenSchluessel", () => {
  it("findet den Montag der Woche", () => {
    expect(schluessel(montagVon(new Date(2026, 8, 4)))).toBe("2026-08-31")
  })

  it("lässt einen Montag unverändert", () => {
    expect(schluessel(montagVon(new Date(2026, 7, 31)))).toBe("2026-08-31")
  })

  it("behandelt Sonntag als letzten Tag der Woche", () => {
    expect(wochenSchluessel(new Date(2026, 8, 6))).toBe("2026-08-31")
    expect(wochenSchluessel(new Date(2026, 8, 7))).toBe("2026-09-07")
  })
})
