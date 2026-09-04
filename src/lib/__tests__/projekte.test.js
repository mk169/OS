import { describe, expect, it } from "vitest"
import { projektFortschrittWerte, sammleTermine } from "../projekte"

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
