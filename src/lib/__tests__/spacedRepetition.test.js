import { describe, expect, it, afterEach, beforeEach, vi } from "vitest"
import {
  bewerteKarte,
  clozeFrage,
  clozeTeile,
  hatCloze,
  istFaellig,
  mische,
} from "../spacedRepetition"

const JETZT = new Date(2026, 8, 4, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JETZT)
})
afterEach(() => vi.useRealTimers())

describe("istFaellig", () => {
  it("hält neue Karten ohne Datum für sofort fällig", () => {
    expect(istFaellig({})).toBe(true)
  })

  it("erkennt heutige und überfällige Karten", () => {
    expect(istFaellig({ faellig: "2026-09-04" })).toBe(true)
    expect(istFaellig({ faellig: "2026-08-20" })).toBe(true)
    expect(istFaellig({ faellig: "2026-09-05" })).toBe(false)
  })
})

describe("bewerteKarte", () => {
  it("setzt eine vergessene Karte zurück und zählt einen Lapse", () => {
    const karte = { intervall: 10, ease: 2.5, wiederholungen: 3, lapses: 0 }
    const neu = bewerteKarte(karte, "nochmal")
    expect(neu.intervall).toBe(0)
    expect(neu.wiederholungen).toBe(0)
    expect(neu.lapses).toBe(1)
    expect(neu.ease).toBe(2.3)
    expect(neu.faellig).toBe("2026-09-04") // heute nochmal
  })

  it("startet eine neue Karte bei einem Tag, 'einfach' springt weiter", () => {
    expect(bewerteKarte({}, "gut").intervall).toBe(1)
    expect(bewerteKarte({}, "einfach").intervall).toBe(4)
  })

  it("verlängert das Intervall bei 'gut' um den Ease-Faktor", () => {
    const neu = bewerteKarte({ intervall: 10, ease: 2.5, wiederholungen: 1 }, "gut")
    expect(neu.intervall).toBe(25)
  })

  it("wächst bei 'schwer' langsamer als bei 'gut' und senkt den Ease", () => {
    const schwer = bewerteKarte({ intervall: 10, ease: 2.5 }, "schwer")
    expect(schwer.intervall).toBe(12)
    expect(schwer.ease).toBe(2.35)
  })

  it("hält den Ease-Faktor in seinen Grenzen", () => {
    const tief = bewerteKarte({ intervall: 5, ease: 1.35 }, "nochmal")
    expect(tief.ease).toBe(1.3)
    const hoch = bewerteKarte({ intervall: 5, ease: 2.7 }, "einfach")
    expect(hoch.ease).toBe(2.7)
  })

  it("belohnt schnelle Antworten und bremst zähe", () => {
    const basis = { intervall: 10, ease: 2.5, wiederholungen: 1 }
    expect(bewerteKarte(basis, "gut", 3).intervall).toBe(28) // < 6 s → ×1.1
    expect(bewerteKarte(basis, "gut", 30).intervall).toBe(21) // > 20 s → ×0.85
  })

  it("bremst Karten mit hoher Fehlerquote", () => {
    const wacklig = { intervall: 10, ease: 2.5, wiederholungen: 3, lapses: 3 }
    expect(bewerteKarte(wacklig, "gut").intervall).toBe(23) // ×0.9
  })

  it("führt einen gleitenden Schnitt der Antwortzeit", () => {
    expect(bewerteKarte({}, "gut", 9).dauerSchnitt).toBe(9)
    expect(bewerteKarte({ dauerSchnitt: 9 }, "gut", 3).dauerSchnitt).toBe(7)
  })

  it("setzt das Fälligkeitsdatum in die Nähe des Intervalls", () => {
    // Ab drei Tagen streut das Datum um ±5 %, hier also 25 ± 2 Tage.
    const neu = bewerteKarte({ intervall: 10, ease: 2.5, wiederholungen: 1 }, "gut")
    expect(neu.faellig >= "2026-09-27").toBe(true)
    expect(neu.faellig <= "2026-10-01").toBe(true)
  })
})

describe("Cloze-Karten", () => {
  it("erkennt Lückentexte", () => {
    expect(hatCloze("Die {{Mitose}} teilt Zellen.")).toBe(true)
    expect(hatCloze("Ohne Lücke")).toBe(false)
  })

  it("verdeckt die Lücken auf der Vorderseite", () => {
    expect(clozeFrage("Die {{Mitose}} teilt {{Zellen}}.")).toBe(
      "Die […] teilt […]."
    )
  })

  it("zerlegt den Text in Text- und Lücken-Stücke", () => {
    expect(clozeTeile("Die {{Mitose}} teilt.")).toEqual([
      { typ: "text", wert: "Die " },
      { typ: "cloze", wert: "Mitose" },
      { typ: "text", wert: " teilt." },
    ])
  })
})

describe("mische", () => {
  it("lässt das Original unberührt und behält alle Einträge", () => {
    const liste = [1, 2, 3, 4, 5]
    const gemischt = mische(liste)
    expect(liste).toEqual([1, 2, 3, 4, 5])
    expect([...gemischt].sort()).toEqual(liste)
  })
})
