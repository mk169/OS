import { useState } from "react"
import useStored from "../lib/useStored"
import { FARBEN } from "../lib/farben"

// Tagesblöcke: wiederverwendbare Vorlagen für den Kalender-Tagesplan
// (Name, Farbe, Standarddauer). Ein paar sind vorgegeben, eigene lassen
// sich jederzeit ergänzen – gleiches Prinzip wie die Habit-Bereiche.

const STANDARD_TAGESBLOECKE = [
  { id: "deepwork", name: "Deep Work", farbe: "violet", dauer: 90 },
  { id: "sport", name: "Sport", farbe: "emerald", dauer: 60 },
  { id: "pause", name: "Pause", farbe: "amber", dauer: 15 },
]

export function useTagesblockVorlagen() {
  const [bloecke, setBloecke] = useStored("tagesbloecke", STANDARD_TAGESBLOECKE)
  return { bloecke, setBloecke }
}

// Zeilen-Picker: vorgegebene + eigene Blöcke als Pillen, „+" öffnet ein
// kleines Formular für einen neuen eigenen Block.
export function TagesblockAuswahl({ bloecke, wert, onWaehle, onErstellen }) {
  const [neuOffen, setNeuOffen] = useState(false)
  const [name, setName] = useState("")
  const [farbe, setFarbe] = useState("violet")
  const [dauer, setDauer] = useState("30")

  function erstellen(e) {
    e.preventDefault()
    if (!name.trim()) return
    const neu = {
      id: `eigen-${Date.now()}`,
      name: name.trim(),
      farbe,
      dauer: Number(dauer) || 30,
    }
    onErstellen(neu)
    onWaehle(neu.id)
    setName("")
    setDauer("30")
    setNeuOffen(false)
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-500">Tagesblock (optional)</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onWaehle("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            wert === ""
              ? "bg-gray-900 text-white"
              : "border border-gray-200 bg-white text-gray-500 hover:text-gray-900"
          }`}
        >
          Kein Block
        </button>
        {bloecke.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onWaehle(b.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              wert === b.id
                ? `${FARBEN[b.farbe].voll}`
                : `${FARBEN[b.farbe].zart} hover:opacity-80`
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setNeuOffen(!neuOffen)}
          className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
        >
          + Eigener Block
        </button>
      </div>

      {neuOffen && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3">
          <label className="flex flex-col text-xs text-gray-500">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Lesen"
              className="mt-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            Dauer (Min.)
            <input
              type="number"
              min="5"
              step="5"
              value={dauer}
              onChange={(e) => setDauer(e.target.value)}
              className="mt-1 w-20 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <div className="flex items-center gap-1.5 pb-1.5">
            {Object.keys(FARBEN).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFarbe(f)}
                className={`h-5 w-5 rounded-full ${FARBEN[f].punkt} ${
                  farbe === f
                    ? "ring-2 ring-gray-900 ring-offset-1"
                    : "opacity-50 hover:opacity-100"
                }`}
                title={f}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={erstellen}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
          >
            Erstellen
          </button>
        </div>
      )}
    </div>
  )
}
