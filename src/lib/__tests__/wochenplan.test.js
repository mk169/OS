import { describe, expect, it } from "vitest"
import {
  aufgabenAmTag,
  erledigtImZeitraum,
  MAX_FOKUS,
  fokusKandidaten,
  fokusTodos,
  loeseFokus,
  montagMitVersatz,
  nachQuadranten,
  offeneDerWoche,
  setzeFokus,
  setzeWochenziel,
  wochenTage,
  wochenzielVon,
} from "../wochenplan"
import { erledigtTag, todoUmschalten } from "../todos"

describe("wochenTage", () => {
  it("liefert Montag bis Sonntag der Woche", () => {
    const tage = wochenTage("2026-09-07")
    expect(tage).toHaveLength(7)
    expect(tage[0]).toMatchObject({ key: "2026-09-07", name: "Mo" })
    expect(tage[6]).toMatchObject({ key: "2026-09-13", name: "So" })
  })

  it("trägt den Monatswechsel mit", () => {
    expect(wochenTage("2026-08-31").map((t) => t.key)).toContain("2026-09-06")
  })
})

describe("montagMitVersatz", () => {
  it("findet den Montag der laufenden Woche", () => {
    // Ein Mittwoch – der Montag davor ist der 09.09.2026.
    expect(montagMitVersatz(0, new Date(2026, 8, 9))).toBe("2026-09-07")
  })

  it("springt über den Jahreswechsel", () => {
    expect(montagMitVersatz(1, new Date(2026, 11, 30))).toBe("2027-01-04")
    expect(montagMitVersatz(-1, new Date(2027, 0, 5))).toBe("2026-12-28")
  })
})

describe("offeneDerWoche", () => {
  const todos = [
    { id: 1, text: "in der Woche", datum: "2026-09-09", erledigt: false },
    { id: 2, text: "überfällig", datum: "2026-08-20", erledigt: false },
    { id: 3, text: "nächste Woche", datum: "2026-09-20", erledigt: false },
    { id: 4, text: "erledigt", datum: "2026-09-09", erledigt: true },
    { id: 5, text: "ohne Datum", erledigt: false },
  ]

  it("nimmt alles Offene bis zum Wochenende – Liegengebliebenes eingeschlossen", () => {
    expect(offeneDerWoche(todos, "2026-09-07").map((t) => t.id)).toEqual([1, 2])
  })
})

describe("aufgabenAmTag", () => {
  it("nimmt genau die Aufgaben dieses Tages, offene wie erledigte", () => {
    const todos = [
      { id: 1, datum: "2026-09-09", erledigt: false },
      { id: 2, datum: "2026-09-09", erledigt: true },
      { id: 3, datum: "2026-09-10", erledigt: false },
    ]
    expect(aufgabenAmTag(todos, "2026-09-09").map((t) => t.id)).toEqual([1, 2])
  })
})

describe("erledigtImZeitraum", () => {
  it("richtet sich nach dem Tag des Abhakens", () => {
    const todos = [
      { id: 1, erledigt: true, erledigtAm: "2026-09-09", datum: "2026-01-01" },
      { id: 2, erledigt: true, erledigtAm: "2026-09-20" },
      { id: 3, erledigt: false, erledigtAm: "2026-09-09" },
    ]
    expect(erledigtImZeitraum(todos, "2026-09-07", "2026-09-13").map((t) => t.id))
      .toEqual([1])
  })

  it("fällt bei Altdaten ohne erledigtAm auf das geplante Datum zurück", () => {
    const alt = [{ id: 9, erledigt: true, datum: "2026-09-09" }]
    expect(erledigtImZeitraum(alt, "2026-09-07", "2026-09-13")).toHaveLength(1)
    expect(erledigtTag(alt[0])).toBe("2026-09-09")
  })

  it("nimmt für einen einzelnen Tag nur diesen Tag", () => {
    const todos = [
      { id: 1, erledigt: true, erledigtAm: "2026-09-09" },
      { id: 2, erledigt: true, erledigtAm: "2026-09-10" },
    ]
    expect(erledigtImZeitraum(todos, "2026-09-09").map((t) => t.id)).toEqual([1])
  })
})

describe("nachQuadranten", () => {
  it("verteilt auf die vier Felder, ohne eine Aufgabe zu verlieren", () => {
    const todos = [
      { id: 1, wichtig: true, dringend: true },
      { id: 2, wichtig: true, dringend: false },
      { id: 3, wichtig: false, dringend: true },
      { id: 4, wichtig: false, dringend: false },
      { id: 5 },
    ]
    const felder = nachQuadranten(todos)
    expect(felder).toHaveLength(4)
    expect(felder.flatMap((f) => f.todos)).toHaveLength(todos.length)
    expect(felder[0].key).toBe("wichtig-dringend")
    expect(felder[3].todos.map((t) => t.id)).toEqual([4, 5])
  })

  it("sortiert innerhalb eines Feldes nach Datum, Undatiertes zuletzt", () => {
    const todos = [
      { id: 1, wichtig: true, dringend: true },
      { id: 2, wichtig: true, dringend: true, datum: "2026-09-08" },
    ]
    expect(nachQuadranten(todos)[0].todos.map((t) => t.id)).toEqual([2, 1])
  })
})

describe("Wochenziel", () => {
  it("legt ein Ziel an, ohne andere Wochen anzufassen", () => {
    const vorher = { "2026-08-31": "Altes Ziel" }
    const nachher = setzeWochenziel(vorher, "2026-09-07", "Abgabe fertig")
    expect(wochenzielVon(nachher, "2026-09-07")).toBe("Abgabe fertig")
    expect(nachher["2026-08-31"]).toBe("Altes Ziel")
    expect(vorher["2026-09-07"]).toBeUndefined() // keine Mutation
  })

  it("entfernt den Eintrag, wenn das Feld geleert wird", () => {
    const nachher = setzeWochenziel({ "2026-09-07": "x" }, "2026-09-07", "   ")
    expect(nachher["2026-09-07"]).toBeUndefined()
  })

  it("antwortet auf eine unbekannte Woche mit leerem Text", () => {
    expect(wochenzielVon({}, "2026-09-07")).toBe("")
    expect(wochenzielVon(undefined, "2026-09-07")).toBe("")
  })
})

describe("Tages-Prioritäten", () => {
  const tag = "2026-09-09"
  const todos = [
    { id: 1, text: "A", erledigt: false, fokus: tag },
    { id: 2, text: "B", erledigt: false },
    { id: 3, text: "C", erledigt: true },
    { id: 4, text: "D", erledigt: false, fokus: "2026-09-08" },
  ]

  it("nimmt nur die Aufgaben, die heute Priorität sind", () => {
    expect(fokusTodos(todos, tag).map((t) => t.id)).toEqual([1])
  })

  it("macht eine offene Aufgabe zur Priorität", () => {
    expect(fokusTodos(setzeFokus(todos, 2, tag), tag).map((t) => t.id)).toEqual([1, 2])
  })

  it("lässt nicht mehr als drei Plätze zu", () => {
    const voll = [1, 2, 3].map((id) => ({ id, erledigt: false, fokus: tag }))
    const nachher = setzeFokus([...voll, { id: 9, erledigt: false }], 9, tag)
    expect(fokusTodos(nachher, tag)).toHaveLength(MAX_FOKUS)
    expect(nachher.find((t) => t.id === 9).fokus).toBeUndefined()
  })

  it("löst eine Priorität, ohne die Aufgabe zu löschen", () => {
    const nachher = loeseFokus(todos, 1)
    expect(fokusTodos(nachher, tag)).toEqual([])
    expect(nachher.find((t) => t.id === 1).text).toBe("A")
  })

  it("schlägt offene Aufgaben vor – Fälliges zuerst, Erledigtes nie", () => {
    const auswahl = fokusKandidaten(
      [
        { id: 1, erledigt: false, wichtig: false, dringend: false },
        { id: 2, erledigt: false, wichtig: true, dringend: true },
        { id: 3, erledigt: false, datum: "2026-09-08" },
        { id: 4, erledigt: true },
        { id: 5, erledigt: false, fokus: tag },
      ],
      tag
    )
    expect(auswahl.map((t) => t.id)).toEqual([3, 2, 1])
  })
})

describe("todoUmschalten", () => {
  it("hält beim Abhaken den Tag fest", () => {
    const [todo] = todoUmschalten([{ id: 1, erledigt: false }], 1, "2026-09-09")
    expect(todo).toEqual({ id: 1, erledigt: true, erledigtAm: "2026-09-09" })
  })

  it("räumt den Tag beim Wiederöffnen weg", () => {
    const [todo] = todoUmschalten(
      [{ id: 1, erledigt: true, erledigtAm: "2026-09-09" }],
      1,
      "2026-09-10"
    )
    expect(todo.erledigt).toBe(false)
    expect("erledigtAm" in todo).toBe(false)
  })

  it("lässt alle anderen Aufgaben unberührt", () => {
    const todos = [{ id: 1, erledigt: false }, { id: 2, erledigt: false }]
    const nachher = todoUmschalten(todos, 1, "2026-09-09")
    expect(nachher[1]).toBe(todos[1])
  })
})
