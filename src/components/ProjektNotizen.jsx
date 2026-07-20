import { useState } from "react"
import useStored from "../lib/useStored"

// Lehrinhalte: eigene Notizen und Zusammenfassungen zum Projekt.
// Eine Notiz aufklappen und direkt darin schreiben – speichert automatisch.

export default function ProjektNotizen({ projekt }) {
  const [alleNotizen, setAlleNotizen] = useStored("notizen", [])
  const [titel, setTitel] = useState("")
  const [offeneId, setOffeneId] = useState(null)

  const notizen = alleNotizen.filter((n) => n.projektId === projekt.id || n.kursId === projekt.id)

  function addNotiz(e) {
    e.preventDefault()
    if (!titel.trim()) return
    const neue = {
      id: Date.now(),
      projektId: projekt.id,
      titel: titel.trim(),
      inhalt: "",
    }
    setAlleNotizen([...alleNotizen, neue])
    setTitel("")
    setOffeneId(neue.id)
  }

  function updateInhalt(id, inhalt) {
    setAlleNotizen(
      alleNotizen.map((n) => (n.id === id ? { ...n, inhalt } : n))
    )
  }

  function remove(id) {
    setAlleNotizen(alleNotizen.filter((n) => n.id !== id))
    if (offeneId === id) setOffeneId(null)
  }

  return (
    <div>
      <form
        onSubmit={addNotiz}
        className="flex gap-2 rounded-xl border border-gray-200 bg-white p-4"
      >
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Neue Notiz oder Zusammenfassung, z.B. Kapitel 2 – Verteilungen"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anlegen
        </button>
      </form>

      {notizen.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Noch keine Lehrinhalte. Lege eine Notiz an und schreibe direkt los.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notizen.map((notiz) => {
            const offen = offeneId === notiz.id
            return (
              <li
                key={notiz.id}
                className="group rounded-xl border border-gray-200 bg-white"
              >
                <div
                  onClick={() => setOffeneId(offen ? null : notiz.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                >
                  <span className="text-xs text-gray-400">
                    {offen ? "▾" : "▸"}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-900">
                    {notiz.titel}
                  </span>
                  {!offen && notiz.inhalt && (
                    <span className="max-w-48 truncate text-xs text-gray-400">
                      {notiz.inhalt}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(notiz.id)
                    }}
                    title="Notiz löschen"
                    className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
                {offen && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <textarea
                      value={notiz.inhalt}
                      onChange={(e) => updateInhalt(notiz.id, e.target.value)}
                      placeholder="Schreib hier deine Zusammenfassung – speichert automatisch."
                      rows={8}
                      autoFocus
                      className="w-full resize-y rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800 outline-none focus:border-gray-900 focus:bg-white"
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
