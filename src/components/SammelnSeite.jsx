import { useState } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"
import { NotizenRaster, NotizBearbeiten } from "./ProjektNotizen"
import WissensGraph from "./WissensGraph"

// Sammeln: der reibungslose Einfangpunkt für alles ("zweites Gehirn").
// Inbox = schnell erfassen, später verarbeiten (GTD-Prinzip). Wissen =
// projektfreie Referenz-Notizen mit "[[Titel]]"-Verlinkung zu anderem
// Wissen/Projekten (siehe NotizBearbeiten). Graph = visuelle Übersicht
// aller Verlinkungen.

const ANSICHTEN = [
  { key: "inbox", label: "Inbox" },
  { key: "wissen", label: "Wissen" },
  { key: "graph", label: "Graph" },
]

function AnsichtToggle({ ansicht, setAnsicht }) {
  return (
    <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
      {ANSICHTEN.map((a) => (
        <button
          key={a.key}
          onClick={() => setAnsicht(a.key)}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${
            ansicht === a.key
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

export default function SammelnSeite({ onNavigate }) {
  const [ansicht, setAnsicht] = useState("inbox")

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf
        titel="Sammeln"
        aktion={<AnsichtToggle ansicht={ansicht} setAnsicht={setAnsicht} />}
      />
      {ansicht === "inbox" && <InboxAnsicht />}
      {ansicht === "wissen" && <WissenAnsicht onNavigate={onNavigate} />}
      {ansicht === "graph" && <WissensGraph onNavigate={onNavigate} />}
    </div>
  )
}

function InboxAnsicht() {
  const [inbox, setInbox] = useStored("inbox", [])
  const [todos, setTodos] = useStored("todos", [])
  const [wissen, setWissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [text, setText] = useState("")

  function addInboxItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setInbox([
      ...inbox,
      { id: Date.now(), text: text.trim(), erstelltAm: new Date().toISOString() },
    ])
    setText("")
  }

  function verarbeiteAlsTodo(item, projektId = null) {
    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: item.text,
        projektId: projektId ? Number(projektId) : null,
        kursId: null,
        dauer: null,
        datum: "",
        wichtig: false,
        dringend: false,
        erledigt: false,
      },
    ])
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  function verarbeiteAlsNotiz(item) {
    setWissen([...wissen, { id: Date.now(), titel: item.text, inhalt: "" }])
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  function verwerfe(item) {
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  return (
    <div>
      <form onSubmit={addInboxItem} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was auch immer dir gerade durch den Kopf geht…"
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Erfassen
        </button>
      </form>

      {inbox.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Inbox leer. Alles verarbeitet.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {[...inbox].reverse().map((item) => (
            <li
              key={item.id}
              className="group flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                {item.text}
              </span>
              <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => verarbeiteAlsTodo(item)}
                  className="rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  → Todo
                </button>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) verarbeiteAlsTodo(item, e.target.value)
                  }}
                  className="rounded-sm border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 outline-none"
                >
                  <option value="">→ Projekt…</option>
                  {projekte.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => verarbeiteAlsNotiz(item)}
                  className="rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                >
                  → Wissen
                </button>
                <button
                  onClick={() => verwerfe(item)}
                  title="Verwerfen"
                  className="px-1 text-gray-300 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WissenAnsicht({ onNavigate }) {
  const [wissen, setWissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [titel, setTitel] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(null)

  const bearbeiteteNotiz = wissen.find((w) => w.id === bearbeiteId)

  function addWissen(e) {
    e.preventDefault()
    if (!titel.trim()) return
    const neu = { id: Date.now(), titel: titel.trim(), inhalt: "" }
    setWissen([...wissen, neu])
    setTitel("")
    setBearbeiteId(neu.id)
  }

  function updateWissen(neu) {
    setWissen(wissen.map((w) => (w.id === neu.id ? neu : w)))
  }

  function removeWissen(id) {
    setWissen(wissen.filter((w) => w.id !== id))
    if (bearbeiteId === id) setBearbeiteId(null)
  }

  // Wissen-Ziel öffnet sich inline im selben Overlay, Projekt-Ziel
  // navigiert auf App-Ebene zur Projektseite.
  function zielKlick(ziel) {
    if (ziel.typ === "wissen") setBearbeiteId(ziel.id)
    else onNavigate?.("projekte", ziel.id)
  }

  return (
    <div>
      <form onSubmit={addWissen} className="flex gap-2">
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Neuer Eintrag, z.B. Steuererklärung – Fristen"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anlegen
        </button>
      </form>

      <NotizenRaster
        notizen={wissen}
        onOeffnen={setBearbeiteId}
        onRemove={removeWissen}
      />

      {bearbeiteteNotiz && (
        <NotizBearbeiten
          notiz={bearbeiteteNotiz}
          onChange={updateWissen}
          onClose={() => setBearbeiteId(null)}
          wissen={wissen}
          projekte={projekte}
          onZielKlick={zielKlick}
        />
      )}
    </div>
  )
}
