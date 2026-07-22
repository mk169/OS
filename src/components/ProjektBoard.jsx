import { useState } from "react"
import useStored from "../lib/useStored"

// Eigenständiges Board pro Projekt: Ideen/Aufgaben als Karten, die per
// Drag&Drop zwischen Inbox / In Arbeit / Fertig wandern. Eigene
// Datenstruktur, unabhängig vom linearen Workflow-Bereich (Schritte mit
// Datum) – beide Bereiche können nebeneinander existieren.

export const BOARD_SPALTEN = [
  { value: "inbox", label: "Inbox" },
  { value: "arbeit", label: "In Arbeit" },
  { value: "fertig", label: "Fertig" },
]

export default function ProjektBoard({ projekt }) {
  const [alleKarten, setAlleKarten] = useStored("boardKarten", [])
  const [ziehId, setZiehId] = useState(null)
  const [offenId, setOffenId] = useState(null)
  const [neuText, setNeuText] = useState({})

  const karten = alleKarten.filter((k) => k.projektId === projekt.id)

  function addKarte(spalte, titel) {
    if (!titel.trim()) return
    setAlleKarten([
      ...alleKarten,
      {
        id: Date.now(),
        projektId: projekt.id,
        spalte,
        titel: titel.trim(),
        notiz: "",
        erstelltAm: Date.now(),
      },
    ])
    setNeuText({ ...neuText, [spalte]: "" })
  }

  function verschiebeKarte(id, spalte) {
    setAlleKarten(
      alleKarten.map((k) => (k.id === id ? { ...k, spalte } : k))
    )
  }

  function updateNotiz(id, notiz) {
    setAlleKarten(
      alleKarten.map((k) => (k.id === id ? { ...k, notiz } : k))
    )
  }

  function removeKarte(id) {
    setAlleKarten(alleKarten.filter((k) => k.id !== id))
    if (offenId === id) setOffenId(null)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {BOARD_SPALTEN.map((sp) => {
        const spalte = karten.filter((k) => k.spalte === sp.value)
        return (
          <div
            key={sp.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (ziehId != null) verschiebeKarte(ziehId, sp.value)
              setZiehId(null)
            }}
            className="rounded-xl border border-gray-200 bg-gray-50/40 p-2"
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs font-medium text-gray-600">
                {sp.label}
              </span>
              <span className="text-xs text-gray-400">{spalte.length}</span>
            </div>

            <div className="mt-1 space-y-2">
              {spalte.map((k) => {
                const offen = offenId === k.id
                return (
                  <div
                    key={k.id}
                    draggable
                    onDragStart={() => setZiehId(k.id)}
                    onDragEnd={() => setZiehId(null)}
                    className="group rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div
                      onClick={() => setOffenId(offen ? null : k.id)}
                      className="flex cursor-pointer items-start gap-2"
                    >
                      <span className="min-w-0 flex-1 text-sm text-gray-900">
                        {k.titel}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeKarte(k.id)
                        }}
                        title="Karte löschen"
                        className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                    {offen && (
                      <textarea
                        value={k.notiz}
                        onChange={(e) => updateNotiz(k.id, e.target.value)}
                        placeholder="Notiz…"
                        rows={3}
                        autoFocus
                        className="mt-2 w-full resize-y rounded-md border border-gray-200 bg-transparent p-2 text-xs text-gray-700 outline-none focus:border-gray-900"
                      />
                    )}
                  </div>
                )
              })}
              {spalte.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-gray-300">
                  Hierher ziehen
                </p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addKarte(sp.value, neuText[sp.value] ?? "")
              }}
              className="mt-2"
            >
              <input
                value={neuText[sp.value] ?? ""}
                onChange={(e) =>
                  setNeuText({ ...neuText, [sp.value]: e.target.value })
                }
                placeholder="+ Karte hinzufügen"
                className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-900"
              />
            </form>
          </div>
        )
      })}
    </div>
  )
}
