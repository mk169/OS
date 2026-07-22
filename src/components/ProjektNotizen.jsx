import { useState } from "react"
import useStored from "../lib/useStored"

// Lehrinhalte: eigene Notizen und Zusammenfassungen zum Projekt, als
// Karten-Raster zum Sammeln und Stapeln. Klick öffnet die Notiz groß in
// einem eigenen Schreib-Overlay (wie ein offenes Dokument).

export default function ProjektNotizen({ projekt }) {
  const [alleNotizen, setAlleNotizen] = useStored("notizen", [])
  const [titel, setTitel] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(null)

  const notizen = alleNotizen.filter(
    (n) => n.projektId === projekt.id || n.kursId === projekt.id
  )
  const bearbeiteteNotiz = notizen.find((n) => n.id === bearbeiteId)

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
    setBearbeiteId(neue.id)
  }

  function updateNotiz(neu) {
    setAlleNotizen(alleNotizen.map((n) => (n.id === neu.id ? neu : n)))
  }

  function remove(id) {
    setAlleNotizen(alleNotizen.filter((n) => n.id !== id))
    if (bearbeiteId === id) setBearbeiteId(null)
  }

  return (
    <div>
      <form
        onSubmit={addNotiz}
        className="flex gap-2 border-b border-gray-100 pb-4"
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notizen.map((notiz) => (
            <div key={notiz.id} className="group relative">
              <button
                onClick={() => setBearbeiteId(notiz.id)}
                className="h-32 w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-400"
              >
                <p className="line-clamp-1 text-sm font-medium text-gray-900">
                  {notiz.titel}
                </p>
                <p className="mt-1.5 line-clamp-4 text-xs text-gray-400">
                  {notiz.inhalt || "Leer – klicken zum Schreiben."}
                </p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  remove(notiz.id)
                }}
                title="Notiz löschen"
                className="absolute right-2 top-2 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {bearbeiteteNotiz && (
        <NotizBearbeiten
          notiz={bearbeiteteNotiz}
          onChange={updateNotiz}
          onClose={() => setBearbeiteId(null)}
        />
      )}
    </div>
  )
}

// Vollbild-Schreib-Overlay für eine einzelne Notiz – Titel und Inhalt
// speichern automatisch bei jeder Änderung, kein Speichern-Button.
function NotizBearbeiten({ notiz, onChange, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:py-8">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Notiz</span>
          <button onClick={onClose} className="hover:text-gray-900">
            Fertig ×
          </button>
        </div>
        <input
          value={notiz.titel}
          onChange={(e) => onChange({ ...notiz, titel: e.target.value })}
          placeholder="Titel"
          autoFocus
          className="mt-4 w-full border-none bg-transparent text-2xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />
        <textarea
          value={notiz.inhalt}
          onChange={(e) => onChange({ ...notiz, inhalt: e.target.value })}
          placeholder="Schreib hier deine Zusammenfassung – speichert automatisch."
          className="mt-4 flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
        />
      </div>
    </div>
  )
}
