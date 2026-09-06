import { describe, expect, it } from "vitest"
import { areasZuOrdnern, ideenZuTodos } from "../projektmigration"

describe("areasZuOrdnern", () => {
  it("lässt einen Bestand ohne Areas unverändert", () => {
    const projekte = [{ id: 1, name: "Hausarbeit" }]
    const ordner = [{ id: 5, name: "Uni", parentId: null }]
    const ergebnis = areasZuOrdnern({ projekte, ordner })
    expect(ergebnis.geaendert).toBe(false)
    expect(ergebnis.projekte).toBe(projekte)
    expect(ergebnis.ordner).toBe(ordner)
  })

  it("macht aus einer leeren Area einen Ordner und zieht ihre Projekte hinein", () => {
    const { projekte, ordner } = areasZuOrdnern({
      projekte: [
        { id: 1, name: "Gesundheit", typ: "area", ordnerId: null },
        { id: 2, name: "Marathon", areaId: 1, ordnerId: null },
      ],
      ordner: [],
    })

    expect(ordner).toEqual([{ id: 1, name: "Gesundheit", parentId: null }])
    // Die leere Area selbst verschwindet – der Ordner tritt an ihre Stelle.
    expect(projekte).toEqual([{ id: 2, name: "Marathon", ordnerId: 1 }])
  })

  it("behält eine Area mit eigenen Inhalten als normales Projekt", () => {
    const { projekte, ordner } = areasZuOrdnern({
      projekte: [{ id: 1, name: "Finanzen", typ: "area", ordnerId: null }],
      ordner: [],
      mitInhalt: new Set([1]),
    })

    expect(ordner).toHaveLength(1)
    expect(projekte).toHaveLength(1)
    expect(projekte[0]).toMatchObject({ id: 1, name: "Finanzen", ordnerId: 1 })
    expect(projekte[0].typ).toBeUndefined()
  })

  it("erkennt eigene Inhalte auch am Projekt selbst", () => {
    const mitWorkflow = areasZuOrdnern({
      projekte: [
        { id: 1, name: "Wohnung", typ: "area", workflow: [{ id: 9, text: "Umzug" }] },
      ],
      ordner: [],
    })
    expect(mitWorkflow.projekte).toHaveLength(1)

    const mitZiel = areasZuOrdnern({
      projekte: [{ id: 1, name: "Wohnung", typ: "area", ziel: "aufgeräumt leben" }],
      ordner: [],
    })
    expect(mitZiel.projekte).toHaveLength(1)
  })

  it("vergibt Ordner-IDs, die nicht mit bestehenden kollidieren", () => {
    const { ordner } = areasZuOrdnern({
      projekte: [
        { id: 1, name: "A", typ: "area" },
        { id: 2, name: "B", typ: "area" },
      ],
      ordner: [{ id: 42, name: "Uni", parentId: null }],
    })
    expect(ordner.map((o) => o.id)).toEqual([42, 43, 44])
  })

  it("hängt den neuen Ordner dorthin, wo die Area lag", () => {
    const { ordner } = areasZuOrdnern({
      projekte: [{ id: 1, name: "Sport", typ: "area", ordnerId: 7 }],
      ordner: [{ id: 7, name: "Privat", parentId: null }],
    })
    expect(ordner[1]).toEqual({ id: 8, name: "Sport", parentId: 7 })
  })
})

describe("ideenZuTodos", () => {
  it("macht aus Ideen Todos ohne Datum", () => {
    const { todos, geaendert } = ideenZuTodos({
      ideen: [{ id: 1, text: "Podcast starten", notiz: "" }],
      todos: [{ id: 9, text: "Alt" }],
      startId: 1000,
    })
    expect(geaendert).toBe(true)
    expect(todos).toHaveLength(2)
    expect(todos[1]).toMatchObject({
      id: 1000,
      text: "Podcast starten",
      datum: "",
      erledigt: false,
    })
  })

  it("rettet die Notiz in den Text – Todos haben kein Notizfeld", () => {
    const { todos } = ideenZuTodos({
      ideen: [{ id: 1, text: "Umzug", notiz: "erst nach der Prüfung" }],
      startId: 1,
    })
    expect(todos[0].text).toBe("Umzug – erst nach der Prüfung")
  })

  it("überspringt leere Ideen", () => {
    const ergebnis = ideenZuTodos({ ideen: [{ id: 1, text: "  " }], todos: [] })
    expect(ergebnis.geaendert).toBe(false)
    expect(ergebnis.todos).toEqual([])
  })
})
