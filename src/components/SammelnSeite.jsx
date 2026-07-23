import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"
import { NotizenRaster, NotizBearbeiten } from "./ProjektNotizen"
import WissensGraph from "./WissensGraph"
import { Suchfeld, SortMenu, LayoutUmschalter } from "./ListenControls"
import { erkenneDatum, erkenneProjekt } from "../lib/erkennung"
import { tageBis } from "../lib/datum"

const WISSEN_SORT = [
  { value: "bearbeitet", label: "Zuletzt bearbeitet" },
  { value: "neueste", label: "Neueste" },
  { value: "aelteste", label: "Älteste" },
  { value: "titel", label: "Titel A–Z" },
]

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
  const [sort, setSort] = useStored("inboxSort", "neueste")

  const sortiert = [...inbox].sort((a, b) =>
    sort === "aelteste" ? a.id - b.id : b.id - a.id
  )

  function addInboxItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setInbox([
      ...inbox,
      { id: Date.now(), text: text.trim(), erstelltAm: new Date().toISOString() },
    ])
    setText("")
  }

  function verarbeiteAlsTodo(item, projektId = null, datum = "") {
    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: item.text,
        projektId: projektId ? Number(projektId) : null,
        kursId: null,
        dauer: null,
        datum,
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
        <>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {inbox.length} {inbox.length === 1 ? "Eintrag" : "Einträge"}
          </span>
          <SortMenu
            wert={sort}
            onChange={setSort}
            optionen={[
              { value: "neueste", label: "Neueste" },
              { value: "aelteste", label: "Älteste" },
            ]}
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {sortiert.map((item) => {
            const erkanntesDatum = erkenneDatum(item.text)
            const erkanntesProjekt = erkenneProjekt(item.text, projekte)
            return (
              <li
                key={item.id}
                className="group flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                  {item.text}
                </span>
                {(erkanntesDatum || erkanntesProjekt) && (
                  <div className="flex items-center gap-1.5">
                    {erkanntesDatum && (
                      <span
                        title="Erkanntes Datum"
                        className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                      >
                        📅 {tageBis(erkanntesDatum)}
                      </span>
                    )}
                    {erkanntesProjekt && (
                      <span
                        title="Erkanntes Projekt"
                        className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                      >
                        📁 {erkanntesProjekt.name}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() =>
                      verarbeiteAlsTodo(
                        item,
                        erkanntesProjekt?.id ?? null,
                        erkanntesDatum ?? ""
                      )
                    }
                    className="rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    → Todo
                  </button>
                  <select
                    defaultValue={erkanntesProjekt ? String(erkanntesProjekt.id) : ""}
                    onChange={(e) => {
                      if (e.target.value)
                        verarbeiteAlsTodo(item, e.target.value, erkanntesDatum ?? "")
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
            )
          })}
        </ul>
        </>
      )}
    </div>
  )
}

function WissenAnsicht({ onNavigate }) {
  const [wissen, setWissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [notizen] = useStored("notizen", [])
  const [titel, setTitel] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(null)
  const [suche, setSuche] = useState("")
  const [sort, setSort] = useStored("wissenSort", "bearbeitet")
  const [layout, setLayout] = useStored("wissenLayout", "raster")

  const bearbeiteteNotiz = wissen.find((w) => w.id === bearbeiteId)

  // Gefiltert (Titel + Inhalt) und sortiert. „bearbeitet" nutzt
  // aktualisiertAm mit Fallback auf id (= Erstellzeit via Date.now()).
  const sichtbareWissen = useMemo(() => {
    const q = suche.trim().toLowerCase()
    const gefiltert = q
      ? wissen.filter(
          (w) =>
            (w.titel ?? "").toLowerCase().includes(q) ||
            (w.inhalt ?? "").toLowerCase().includes(q)
        )
      : wissen
    return [...gefiltert].sort((a, b) => {
      if (sort === "titel") return (a.titel ?? "").localeCompare(b.titel ?? "")
      if (sort === "aelteste") return a.id - b.id
      if (sort === "neueste") return b.id - a.id
      return (b.aktualisiertAm ?? b.id) - (a.aktualisiertAm ?? a.id)
    })
  }, [wissen, suche, sort])

  function addWissen(e) {
    e.preventDefault()
    if (!titel.trim()) return
    const neu = { id: Date.now(), titel: titel.trim(), inhalt: "", aktualisiertAm: Date.now() }
    setWissen([...wissen, neu])
    setTitel("")
    setBearbeiteId(neu.id)
  }

  function updateWissen(neu) {
    const gestempelt = { ...neu, aktualisiertAm: Date.now() }
    setWissen(wissen.map((w) => (w.id === neu.id ? gestempelt : w)))
  }

  function removeWissen(id) {
    setWissen(wissen.filter((w) => w.id !== id))
    if (bearbeiteId === id) setBearbeiteId(null)
  }

  // Wissen-Ziel öffnet sich inline im selben Overlay, Projekt-Ziel
  // navigiert auf App-Ebene zur Projektseite, Notiz-Ziel zusätzlich mit
  // der genauen Notiz (siehe App.jsx/OrdnerSeite.jsx).
  function zielKlick(ziel) {
    if (ziel.typ === "wissen") setBearbeiteId(ziel.id)
    else if (ziel.typ === "notiz")
      onNavigate?.("projekte", { projektId: ziel.projektId, notizId: ziel.id })
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

      {wissen.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <Suchfeld wert={suche} onChange={setSuche} placeholder="Wissen durchsuchen…" />
          <SortMenu wert={sort} onChange={setSort} optionen={WISSEN_SORT} />
          <LayoutUmschalter layout={layout} setLayout={setLayout} />
        </div>
      )}

      <NotizenRaster
        notizen={sichtbareWissen}
        onOeffnen={setBearbeiteId}
        onRemove={removeWissen}
        layout={layout}
        leerText={
          suche.trim()
            ? "Kein Wissen zu dieser Suche."
            : "Noch kein Wissen. Lege einen Eintrag an und schreibe direkt los."
        }
      />

      {bearbeiteteNotiz && (
        <NotizBearbeiten
          key={bearbeiteteNotiz.id}
          notiz={bearbeiteteNotiz}
          onChange={updateWissen}
          onClose={() => setBearbeiteId(null)}
          wissen={wissen}
          projekte={projekte}
          notizen={notizen}
          onZielKlick={zielKlick}
        />
      )}
    </div>
  )
}
