import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import { lockedInAktiv } from "../lockedin"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 8, 4, 12, 0, 0))
})
afterEach(() => vi.useRealTimers())

describe("lockedInAktiv", () => {
  it("braucht ein Ziel", () => {
    expect(lockedInAktiv({})).toBe(false)
    expect(lockedInAktiv({ ziel: "   " })).toBe(false)
    expect(lockedInAktiv({ ziel: "Abschluss" })).toBe(true)
  })

  it("ist aus, wenn der Modus beendet wurde", () => {
    expect(lockedInAktiv({ ziel: "Abschluss", aktiv: false })).toBe(false)
  })

  it("endet mit der Phase", () => {
    expect(lockedInAktiv({ ziel: "Abschluss", phaseEnde: "2026-09-04" })).toBe(true)
    expect(lockedInAktiv({ ziel: "Abschluss", phaseEnde: "2026-09-03" })).toBe(false)
  })

  it("verträgt fehlende Konfiguration", () => {
    expect(lockedInAktiv(undefined)).toBe(false)
    expect(lockedInAktiv(null)).toBe(false)
  })
})
