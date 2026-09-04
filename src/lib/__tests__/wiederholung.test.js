import { describe, expect, it } from "vitest"
import { faelltAuf } from "../wiederholung"

const termin = (extra) => ({ datum: "2026-09-04", ...extra }) // Freitag

describe("faelltAuf", () => {
  it("trifft immer den Starttag", () => {
    expect(faelltAuf(termin({}), "2026-09-04")).toBe(true)
  })

  it("kennt ohne Wiederholung nur den einen Tag", () => {
    expect(faelltAuf(termin({}), "2026-09-05")).toBe(false)
  })

  it("ignoriert Tage vor dem Start", () => {
    expect(faelltAuf(termin({ wiederholung: "taeglich" }), "2026-09-03")).toBe(false)
  })

  it("täglich: jeder Tag ab Start", () => {
    const t = termin({ wiederholung: "taeglich" })
    expect(faelltAuf(t, "2026-09-05")).toBe(true)
    expect(faelltAuf(t, "2027-01-01")).toBe(true)
  })

  it("wöchentlich: nur derselbe Wochentag", () => {
    const t = termin({ wiederholung: "woechentlich" })
    expect(faelltAuf(t, "2026-09-11")).toBe(true) // Freitag
    expect(faelltAuf(t, "2026-09-10")).toBe(false) // Donnerstag
  })

  it("monatlich: nur derselbe Tag im Monat", () => {
    const t = termin({ wiederholung: "monatlich" })
    expect(faelltAuf(t, "2026-10-04")).toBe(true)
    expect(faelltAuf(t, "2026-10-05")).toBe(false)
  })

  it("jährlich: Tag und Monat müssen passen (z. B. Geburtstage)", () => {
    const t = termin({ wiederholung: "jaehrlich", art: "geburtstag" })
    expect(faelltAuf(t, "2027-09-04")).toBe(true)
    expect(faelltAuf(t, "2027-10-04")).toBe(false)
  })

  it("endet mit dem Bis-Datum", () => {
    const t = termin({ wiederholung: "taeglich", bis: "2026-09-06" })
    expect(faelltAuf(t, "2026-09-06")).toBe(true)
    expect(faelltAuf(t, "2026-09-07")).toBe(false)
  })

  it("ist ohne Startdatum nie fällig", () => {
    expect(faelltAuf({ wiederholung: "taeglich" }, "2026-09-04")).toBe(false)
  })
})
