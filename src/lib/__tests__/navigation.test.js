import { describe, expect, it } from "vitest"
import {
  STANDARD_GRUPPEN,
  navConfig,
  navSektionen,
  sektionOffen,
  setzeGruppe,
} from "../navigation"

const item = (key) => ({ key, label: key })
const items = ["dashboard", "todos", "finanzen", "leisure"].map(item)

describe("navConfig", () => {
  it("liefert ohne Einstellungen brauchbare Vorgaben", () => {
    const config = navConfig(undefined)
    expect(config.gruppen.map((g) => g.id)).toEqual(
      STANDARD_GRUPPEN.map((g) => g.id)
    )
  })
})

describe("navSektionen", () => {
  it("bündelt gruppiert nach Bereichen", () => {
    const config = { ...navConfig({}), gruppiert: true }
    const sektionen = navSektionen(items, config)
    const taeglich = sektionen.find((s) => s.label === "Täglich")
    expect(taeglich.items.map((i) => i.key)).toEqual(["dashboard", "todos"])
    const leben = sektionen.find((s) => s.label === "Leben")
    expect(leben.items.map((i) => i.key)).toEqual(["finanzen", "leisure"])
  })

  it("trennt bei eingeklappten Zweitbereichen in zwei Sektionen", () => {
    const config = { ...navConfig({}), gruppiert: false, sekundaerEingeklappt: true }
    const sektionen = navSektionen(items, config)
    expect(sektionen.map((s) => s.key)).toEqual(["primaer", "sekundaer"])
    expect(sektionen[1].items.map((i) => i.key)).toEqual(["finanzen", "leisure"])
  })

  it("zeigt sonst eine einzige Liste ohne Überschrift", () => {
    const config = { ...navConfig({}), gruppiert: false, sekundaerEingeklappt: false }
    const sektionen = navSektionen(items, config)
    expect(sektionen).toHaveLength(1)
    expect(sektionen[0].label).toBeNull()
  })

  it("lässt leere Sektionen weg", () => {
    const config = { ...navConfig({}), gruppiert: false, sekundaerEingeklappt: true }
    const sektionen = navSektionen([item("todos")], config)
    expect(sektionen).toHaveLength(1)
  })
})

describe("sektionOffen", () => {
  const config = { ...navConfig({}), sekundaerEingeklappt: true }
  const sekundaer = { key: "leben", label: "Leben", sekundaer: true, items: [item("finanzen")] }

  it("hält Sektionen ohne Überschrift immer offen", () => {
    const ohneLabel = { key: "alle", label: null, items }
    expect(sektionOffen(ohneLabel, { offeneSektionen: {}, config })).toBe(true)
  })

  it("lässt den Klick des Nutzers gewinnen", () => {
    const offen = sektionOffen(sekundaer, { offeneSektionen: { leben: true }, config })
    expect(offen).toBe(true)
  })

  it("öffnet die Sektion mit der aktiven Seite", () => {
    const offen = sektionOffen(sekundaer, {
      offeneSektionen: {},
      aktiveSeite: "finanzen",
      config,
    })
    expect(offen).toBe(true)
  })

  it("hält sekundäre Sektionen sonst geschlossen", () => {
    expect(sektionOffen(sekundaer, { offeneSektionen: {}, config })).toBe(false)
  })
})

describe("setzeGruppe", () => {
  it("verschiebt ein Modul in einen anderen Bereich", () => {
    const neu = setzeGruppe(STANDARD_GRUPPEN, "todos", "leben")
    expect(neu.find((g) => g.id === "taeglich").keys).not.toContain("todos")
    expect(neu.find((g) => g.id === "leben").keys).toContain("todos")
  })

  it("lässt die Vorgabe unverändert (keine Seiteneffekte)", () => {
    const vorher = JSON.stringify(STANDARD_GRUPPEN)
    setzeGruppe(STANDARD_GRUPPEN, "todos", "leben")
    expect(JSON.stringify(STANDARD_GRUPPEN)).toBe(vorher)
  })
})
