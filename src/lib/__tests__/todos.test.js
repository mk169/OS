import { describe, expect, it } from "vitest"
import { EINTEILUNGEN, einteilungVon } from "../todos"
import { levelVon, rangVon, xpVonTodos } from "../spiel"

describe("einteilungVon", () => {
  it("ordnet die vier Felder der Eisenhower-Matrix zu", () => {
    expect(einteilungVon({ wichtig: true, dringend: true }).key).toBe("wichtig-dringend")
    expect(einteilungVon({ wichtig: true, dringend: false }).key).toBe("wichtig")
    expect(einteilungVon({ wichtig: false, dringend: true }).key).toBe("dringend")
    expect(einteilungVon({ wichtig: false, dringend: false }).key).toBe("sonstige")
  })

  it("behandelt fehlende Angaben als 'sonstige'", () => {
    expect(einteilungVon({}).key).toBe("sonstige")
  })

  it("deckt mit den vier Feldern jeden Fall genau einmal ab", () => {
    for (const wichtig of [true, false]) {
      for (const dringend of [true, false]) {
        const treffer = EINTEILUNGEN.filter((e) => e.passt({ wichtig, dringend }))
        expect(treffer).toHaveLength(1)
      }
    }
  })
})

describe("Spiel-Logik", () => {
  it("gibt jedem Eisenhower-Feld einen Rang", () => {
    expect(rangVon("wichtig-dringend").label).toBe("BOSS")
    expect(rangVon("gibtsnicht").label).toBe("QUEST")
  })

  it("zählt XP nur für erledigte Todos", () => {
    const todos = [
      { wichtig: true, dringend: true, erledigt: true }, // 50
      { wichtig: true, dringend: false, erledigt: true }, // 30
      { wichtig: true, dringend: true, erledigt: false }, // zählt nicht
    ]
    expect(xpVonTodos(todos)).toBe(80)
  })

  it("rechnet XP in Level und Fortschritt um", () => {
    expect(levelVon(0)).toMatchObject({ level: 1, xpInLevel: 0, fortschritt: 0 })
    expect(levelVon(150)).toMatchObject({ level: 2, xpInLevel: 50, fortschritt: 50 })
    expect(levelVon(1000)).toMatchObject({ level: 11, xpInLevel: 0 })
  })
})
