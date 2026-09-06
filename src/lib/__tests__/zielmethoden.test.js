import { describe, expect, it } from "vitest"
import {
  fuenf25Aufteilen,
  fuenf25Status,
  keyResults,
  krFortschritt,
  methodeVon,
  okrErreicht,
  okrFortschritt,
  smartPruefung,
  smartSatz,
  smartWert,
  woopPlanSatz,
  woopVollstaendig,
} from "../zielmethoden"

describe("methodeVon", () => {
  it("findet eine Methode und fällt sonst auf „frei“ zurück", () => {
    expect(methodeVon("okr").label).toBe("OKR")
    expect(methodeVon(undefined).key).toBe("frei")
    expect(methodeVon("gibtsnicht").key).toBe("frei")
  })
})

describe("smartPruefung", () => {
  it("zählt gefüllte SMART-Felder als erfüllt", () => {
    const ziel = {
      text: "",
      smart: {
        spezifisch: "Einleitung schreiben",
        messbar: "8 Seiten",
        attraktiv: "Danach läuft der Rest",
        realistisch: "3 Vormittage frei",
        terminiert: "bis Ende der Phase",
      },
    }
    expect(smartWert(ziel)).toBe(5)
  })

  // Ohne SMART-Felder wird der freie Zieltext geprüft, so weit das geht.
  it("erkennt eine Zahl im freien Text als messbar", () => {
    const pruefung = smartPruefung({ text: "3 Kapitel überarbeiten" })
    expect(pruefung.find((f) => f.key === "messbar").erfuellt).toBe(true)
  })

  it("erkennt auch ausgeschriebene Zahlwörter", () => {
    const pruefung = smartPruefung({ text: "drei Kapitel überarbeiten" })
    expect(pruefung.find((f) => f.key === "messbar").erfuellt).toBe(true)
  })

  it("hält vage Formulierungen für unspezifisch", () => {
    const vage = smartPruefung({ text: "mehr Sport machen" })
    expect(vage.find((f) => f.key === "spezifisch").erfuellt).toBe(false)
    expect(vage.find((f) => f.key === "messbar").erfuellt).toBe(false)

    const konkret = smartPruefung({ text: "Dreimal pro Woche laufen gehen" })
    expect(konkret.find((f) => f.key === "spezifisch").erfuellt).toBe(true)
  })

  it("wertet die Zuordnung zu einer Zwischenphase als Termin", () => {
    expect(
      smartPruefung({ text: "Kapitel schreiben", phaseId: 7 }).find(
        (f) => f.key === "terminiert"
      ).erfuellt
    ).toBe(true)
    expect(
      smartPruefung({ text: "Kapitel schreiben" }).find(
        (f) => f.key === "terminiert"
      ).erfuellt
    ).toBe(false)
  })

  it("verträgt ein leeres Ziel", () => {
    expect(smartWert(undefined)).toBe(0)
    expect(smartWert({})).toBe(0)
  })
})

describe("smartSatz", () => {
  it("baut aus den Feldern einen Zielsatz", () => {
    expect(
      smartSatz({
        spezifisch: "Einleitung schreiben",
        messbar: "8 Seiten",
        terminiert: "Ende April",
      })
    ).toBe("Einleitung schreiben (8 Seiten) bis Ende April")
  })

  it("lässt leere Felder weg", () => {
    expect(smartSatz({ spezifisch: "Laufen gehen" })).toBe("Laufen gehen")
    expect(smartSatz({})).toBe("")
  })
})

describe("krFortschritt", () => {
  it("rechnet den Anteil zwischen Start und Ziel", () => {
    expect(krFortschritt({ start: 0, ziel: 10, ist: 5 })).toBe(0.5)
    expect(krFortschritt({ start: 100, ziel: 200, ist: 150 })).toBe(0.5)
  })

  it("begrenzt auf 0 bis 1", () => {
    expect(krFortschritt({ start: 0, ziel: 10, ist: 25 })).toBe(1)
    expect(krFortschritt({ start: 0, ziel: 10, ist: -5 })).toBe(0)
  })

  // Auch abnehmende Kennzahlen sollen funktionieren: von 80 kg auf 75 kg.
  it("kommt mit einem Zielwert unter dem Startwert zurecht", () => {
    expect(krFortschritt({ start: 80, ziel: 70, ist: 75 })).toBe(0.5)
  })

  it("teilt nicht durch null", () => {
    expect(krFortschritt({ start: 5, ziel: 5, ist: 5 })).toBe(1)
    expect(krFortschritt({ start: 5, ziel: 5, ist: 3 })).toBe(0)
  })

  it("verträgt fehlende und unsinnige Werte", () => {
    // Ein frisch angelegtes Key Result ohne Zielwert steht bei 0, nicht bei
    // „erreicht" – sonst wäre ein leeres OKR sofort fertig.
    expect(krFortschritt({})).toBe(0)
    expect(krFortschritt({ ziel: "" })).toBe(0)
    expect(krFortschritt(undefined)).toBe(0)
    expect(krFortschritt({ start: 0, ziel: "viel", ist: 3 })).toBe(0)
  })
})

describe("okrFortschritt", () => {
  it("mittelt über die Key Results", () => {
    const ziel = {
      keyResults: [
        { start: 0, ziel: 10, ist: 10 },
        { start: 0, ziel: 10, ist: 0 },
      ],
    }
    expect(okrFortschritt(ziel)).toBe(0.5)
    expect(okrErreicht(ziel)).toBe(false)
  })

  it("gilt als erreicht, wenn alle Key Results voll sind", () => {
    const ziel = { keyResults: [{ start: 0, ziel: 4, ist: 4 }] }
    expect(okrErreicht(ziel)).toBe(true)
  })

  // Ohne Key Results gibt es nichts zu messen – null statt 0, damit die
  // Oberfläche „noch nichts gemessen" von „0 %" unterscheiden kann.
  it("gibt ohne Key Results null zurück", () => {
    expect(okrFortschritt({ keyResults: [] })).toBe(null)
    expect(okrFortschritt({})).toBe(null)
    expect(keyResults(undefined)).toEqual([])
  })
})

describe("WOOP", () => {
  it("baut den Wenn-dann-Satz", () => {
    expect(
      woopPlanSatz({
        hindernis: "ich abends zu müde bin",
        plan: "gehe ich zehn Minuten vor die Tür",
      })
    ).toBe("Wenn ich abends zu müde bin, dann gehe ich zehn Minuten vor die Tür.")
  })

  it("bleibt leer, solange Hindernis oder Plan fehlen", () => {
    expect(woopPlanSatz({ hindernis: "ich müde bin" })).toBe("")
    expect(woopPlanSatz({})).toBe("")
  })

  it("erkennt Vollständigkeit", () => {
    expect(
      woopVollstaendig({
        wunsch: "a",
        ergebnis: "b",
        hindernis: "c",
        plan: "d",
      })
    ).toBe(true)
    expect(woopVollstaendig({ wunsch: "a", ergebnis: "b" })).toBe(false)
  })
})

describe("5/25-Regel", () => {
  const kandidaten = [
    { id: 1, text: "Bachelorarbeit abgeben", gewaehlt: true },
    { id: 2, text: "Halbmarathon laufen", gewaehlt: true },
    { id: 3, text: "Italienisch lernen", gewaehlt: false },
    { id: 4, text: "   ", gewaehlt: false },
  ]

  it("zählt Gesammeltes und Gewähltes und ignoriert Leerzeilen", () => {
    expect(fuenf25Status(kandidaten)).toMatchObject({
      gesammelt: 3,
      gewaehlt: 2,
      offen: 3,
      bereit: true,
      zuViele: false,
    })
  })

  it("meldet mehr als fünf Gewählte", () => {
    const sechs = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      text: `Ziel ${i}`,
      gewaehlt: true,
    }))
    expect(fuenf25Status(sechs)).toMatchObject({ gewaehlt: 6, zuViele: true, offen: 0 })
  })

  it("teilt in Ziele und die „Nicht jetzt“-Liste", () => {
    expect(fuenf25Aufteilen(kandidaten)).toEqual({
      ziele: ["Bachelorarbeit abgeben", "Halbmarathon laufen"],
      nichtJetzt: ["Italienisch lernen"],
    })
  })

  it("verträgt eine leere Liste", () => {
    expect(fuenf25Status([])).toMatchObject({ gesammelt: 0, bereit: false })
    expect(fuenf25Aufteilen([])).toEqual({ ziele: [], nichtJetzt: [] })
  })
})
