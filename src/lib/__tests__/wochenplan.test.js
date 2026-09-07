import { describe, expect, it } from "vitest"
import {
  aufgabenAmTag,
  erledigtImZeitraum,
  montagMitVersatz,
  nachQuadranten,
  offeneDerWoche,
  setzeTop3,
  setzeWochenziel,
  top3Von,
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
  it("liefert immer drei Plätze, auch wenn nichts gespeichert ist", () => {
    expect(top3Von({}, "2026-09-07")).toEqual([
      { text: "", erledigt: false },
      { text: "", erledigt: false },
      { text: "", erledigt: false },
    ])
  })

  it("speichert nur, was auch Text hat", () => {
    const leer = [
      { text: "  ", erledigt: false },
      { text: "", erledigt: false },
      { text: "", erledigt: false },
    ]
    expect(setzeTop3({ "2026-09-07": [] }, "2026-09-07", leer)).toEqual({})
  })

  it("behält Häkchen und Text der belegten Plätze", () => {
    const eintraege = [
      { text: "Gespräch führen", erledigt: true },
      { text: "", erledigt: false },
      { text: "", erledigt: false },
    ]
    const gespeichert = setzeTop3({}, "2026-09-07", eintraege)
    expect(top3Von(gespeichert, "2026-09-07")[0]).toEqual({
      text: "Gespräch führen",
      erledigt: true,
    })
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
