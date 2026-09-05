import { describe, expect, it } from "vitest"
import {
  MODULE,
  MODUL_GRUPPEN,
  NEUES_PROJEKT_MODULE,
  moduleDerGruppe,
  projektFortschrittWerte,
  sammleTermine,
} from "../projekte"

describe("projektFortschrittWerte", () => {
  it("zählt den Workflow, wenn es einen gibt", () => {
    const projekt = {
      id: 1,
      workflow: [{ erledigt: true }, { erledigt: false }, { erledigt: true }],
    }
    expect(projektFortschrittWerte(projekt, [])).toEqual({ erledigt: 2, gesamt: 3 })
  })

  it("nimmt sonst die zugeordneten Todos", () => {
    const todos = [
      { projektId: 1, erledigt: true },
      { projektId: 1, erledigt: false },
      { projektId: 2, erledigt: true },
    ]
    expect(projektFortschrittWerte({ id: 1 }, todos)).toEqual({ erledigt: 1, gesamt: 2 })
  })

  it("liest auch die alte kursId", () => {
    const todos = [{ kursId: 7, erledigt: true }]
    expect(projektFortschrittWerte({ id: 7 }, todos)).toEqual({ erledigt: 1, gesamt: 1 })
  })

  it("meldet 0 von 0, wenn es nichts abzuhaken gibt", () => {
    expect(projektFortschrittWerte({ id: 1 }, [])).toEqual({ erledigt: 0, gesamt: 0 })
  })
})

describe("sammleTermine", () => {
  const projekte = [
    {
      id: 1,
      name: "Bachelorarbeit",
      deadline: "2026-10-01",
      workflow: [
        { text: "Gliederung", datum: "2026-09-10", erledigt: false },
        { text: "Recherche", datum: "2026-09-05", erledigt: true },
        { text: "Ohne Datum" },
      ],
    },
    { id: 2, name: "Ohne Termine" },
  ]

  it("sammelt Deadlines und offene, terminierte Schritte", () => {
    const eintraege = sammleTermine(projekte, [])
    expect(eintraege).toEqual([
      { datum: "2026-10-01", label: "Deadline: Bachelorarbeit", projektId: 1, typ: "Deadline" },
      { datum: "2026-09-10", label: "Gliederung", projektId: 1, typ: "Schritt" },
    ])
  })

  it("nimmt offene Todos mit Datum auf, die zu einem Projekt gehören", () => {
    const todos = [
      { text: "Kapitel 1", datum: "2026-09-08", projektId: 1, erledigt: false },
      { text: "Erledigt", datum: "2026-09-08", projektId: 1, erledigt: true },
      { text: "Ohne Projekt", datum: "2026-09-08", erledigt: false },
      { text: "Fremdes Projekt", datum: "2026-09-08", projektId: 99, erledigt: false },
    ]
    const todoEintraege = sammleTermine(projekte, todos).filter((e) => e.typ === "Todo")
    expect(todoEintraege).toEqual([
      { datum: "2026-09-08", label: "Kapitel 1", projektId: 1, typ: "Todo" },
    ])
  })
})

describe("Bereiche eines Projekts", () => {
  it("haben eindeutige Schlüssel", () => {
    const keys = MODULE.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("gehören alle zu einer bekannten Gruppe", () => {
    const gruppen = MODUL_GRUPPEN.map((g) => g.key)
    for (const m of MODULE) expect(gruppen).toContain(m.gruppe)
  })

  it("erklären sich in einem Satz", () => {
    for (const m of MODULE) {
      expect(m.beschreibung.length).toBeGreaterThan(20)
      expect(m.beschreibung.endsWith(".")).toBe(true)
    }
  })

  it("verteilen sich lückenlos auf die Gruppen", () => {
    const summe = MODUL_GRUPPEN.reduce(
      (n, g) => n + moduleDerGruppe(g.key).length,
      0
    )
    expect(summe).toBe(MODULE.length)
  })

  it('hängen eigene Bereiche bei Arbeiten an', () => {
    const eigen = { key: "eigen-1", label: "Recherche" }
    expect(moduleDerGruppe("arbeiten", [eigen]).at(-1)).toBe(eigen)
    expect(moduleDerGruppe("lernen", [eigen])).not.toContain(eigen)
  })

  it("startet ein neues Projekt mit bekannten Bereichen", () => {
    for (const key of NEUES_PROJEKT_MODULE) {
      expect(MODULE.some((m) => m.key === key)).toBe(true)
    }
  })
})
