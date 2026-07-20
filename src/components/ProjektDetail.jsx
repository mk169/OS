import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import Kalender from "./Kalender"
import TodoErstellen from "./TodoErstellen"
import { TodoZeile } from "./TodosSeite"
import ProjektInhalte from "./ProjektInhalte"
import ProjektNotizen from "./ProjektNotizen"
import ProjektKarten from "./ProjektKarten"

// Alle Bereiche, die ein Projekt enthalten kann. Beim Erstellen (und
// jederzeit über „Bereiche anpassen“) wählbar – so wird aus demselben
// System ein Uni-Kurs, ein Lernprojekt oder ein privates Vorhaben.

export const MODULE = [
  { key: "ziel", label: "Ziel" },
  { key: "workflow", label: "Workflow" },
  { key: "todos", label: "Todos" },
  { key: "inhalte", label: "Inhalte" },
  { key: "notizen", label: "Notizen" },
  { key: "karten", label: "Karteikarten" },
  { key: "kalender", label: "Kalender" },
]

export const STANDARD_MODULE = ["ziel", "workflow", "todos", "kalender"]

export default function ProjektDetail({ projekt, onUpdate, onBack }) {
  const module = projekt.module ?? STANDARD_MODULE
  const eigene = projekt.eigeneModule ?? []
  const [neuerBereichName, setNeuerBereichName] = useState("")

  function modulInfo(key) {
    return (
      MODULE.find((m) => m.key === key) ?? eigene.find((m) => m.key === key)
    )
  }

  // Reihenfolge der Tabs folgt der Reihenfolge in projekt.module
  const sichtbareModule = module.map(modulInfo).filter(Boolean)
  const [aktiv, setAktiv] = useState("uebersicht")
  const [anpassen, setAnpassen] = useState(false)

  const verfuegbar = [...MODULE, ...eigene].filter(
    (m) => !module.includes(m.key)
  )

  const workflow = projekt.workflow ?? []
  const erledigt = workflow.filter((s) => s.erledigt).length

  function toggleModul(key) {
    const neu = module.includes(key)
      ? module.filter((m) => m !== key)
      : [...module, key]
    onUpdate({ ...projekt, module: neu })
    if (aktiv === key && module.includes(key)) {
      setAktiv(neu[0] ?? "ziel")
    }
  }

  function verschiebeModul(key, richtung) {
    const i = module.indexOf(key)
    const j = i + richtung
    if (i < 0 || j < 0 || j >= module.length) return
    const neu = [...module]
    ;[neu[i], neu[j]] = [neu[j], neu[i]]
    onUpdate({ ...projekt, module: neu })
  }

  function addEigenerBereich(e) {
    e.preventDefault()
    if (!neuerBereichName.trim()) return
    const neu = { key: `eigen-${Date.now()}`, label: neuerBereichName.trim() }
    onUpdate({
      ...projekt,
      eigeneModule: [...eigene, neu],
      module: [...module, neu.key],
    })
    setNeuerBereichName("")
    setAktiv(neu.key)
  }

  function removeEigenerBereich(key) {
    onUpdate({
      ...projekt,
      eigeneModule: eigene.filter((m) => m.key !== key),
      module: module.filter((k) => k !== key),
    })
    if (aktiv === key) setAktiv(module.filter((k) => k !== key)[0] ?? "ziel")
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.25rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <button
        onClick={onBack}
        className="self-start text-xs font-medium text-gray-400 transition-colors hover:text-gray-900"
      >
        ← Zurück
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {projekt.name}
          </h1>
          {projekt.beschreibung && (
            <p className="mt-1 text-sm text-gray-400">{projekt.beschreibung}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            Deadline
            <input
              type="date"
              value={projekt.deadline ?? ""}
              onChange={(e) =>
                onUpdate({ ...projekt, deadline: e.target.value })
              }
              className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-900"
            />
          </label>
          <button
            onClick={() => setAnpassen(!anpassen)}
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Bereiche anpassen
          </button>
        </div>
      </div>

      {anpassen && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Aktive Bereiche – mit ‹ › verschieben
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {sichtbareModule.map((m) => (
                <span
                  key={m.key}
                  className="flex items-center gap-0.5 rounded-full bg-gray-900 py-1 pl-1.5 pr-2 text-xs font-medium text-white"
                >
                  <button
                    onClick={() => verschiebeModul(m.key, -1)}
                    title="Nach vorne"
                    className="rounded px-1 text-gray-400 hover:text-white"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => verschiebeModul(m.key, 1)}
                    title="Nach hinten"
                    className="rounded px-1 text-gray-400 hover:text-white"
                  >
                    ›
                  </button>
                  <button onClick={() => toggleModul(m.key)} title="Ausblenden">
                    {m.label}
                  </button>
                  {m.key.startsWith("eigen-") && (
                    <button
                      onClick={() => removeEigenerBereich(m.key)}
                      title="Bereich endgültig löschen"
                      className="ml-1 rounded px-1 text-gray-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Verfügbar – klicken zum Einblenden
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[...MODULE, ...eigene]
                .filter((m) => !module.includes(m.key))
                .map((m) => (
                  <button
                    key={m.key}
                    onClick={() => toggleModul(m.key)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-900"
                  >
                    {m.label}
                  </button>
                ))}
              <form onSubmit={addEigenerBereich} className="flex gap-1.5">
                <input
                  value={neuerBereichName}
                  onChange={(e) => setNeuerBereichName(e.target.value)}
                  placeholder="Eigener Bereich, z.B. Recherche"
                  className="w-48 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-900 outline-none focus:border-gray-900"
                />
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
                >
                  + Erstellen
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-12 z-10 mt-6 flex gap-5 overflow-x-auto border-b border-gray-200 bg-gray-50/85 backdrop-blur sm:gap-6 md:top-0">
        <TabButton
          active={aktiv === "uebersicht"}
          onClick={() => setAktiv("uebersicht")}
        >
          Übersicht
        </TabButton>
        {sichtbareModule.map((m) => (
          <TabButton
            key={m.key}
            active={aktiv === m.key}
            onClick={() => setAktiv(m.key)}
          >
            {m.label}
            {m.key === "workflow" && workflow.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">
                {erledigt}/{workflow.length}
              </span>
            )}
          </TabButton>
        ))}
      </nav>

      <div className="mt-6 flex flex-1 flex-col">
        {aktiv === "uebersicht" && (
          <UebersichtModul
            projekt={projekt}
            onUpdate={onUpdate}
            sichtbareModule={sichtbareModule}
            verfuegbar={verfuegbar}
            onOeffnen={setAktiv}
            onEinblenden={toggleModul}
            onEigenerBereich={addEigenerBereich}
            neuerBereichName={neuerBereichName}
            setNeuerBereichName={setNeuerBereichName}
          />
        )}
        {aktiv === "ziel" && <ZielModul projekt={projekt} onUpdate={onUpdate} />}
        {aktiv === "workflow" && (
          <WorkflowModul projekt={projekt} onUpdate={onUpdate} />
        )}
        {aktiv === "todos" && <TodosModul projekt={projekt} />}
        {aktiv === "inhalte" && <ProjektInhalte projekt={projekt} />}
        {aktiv === "notizen" && <ProjektNotizen projekt={projekt} />}
        {aktiv === "karten" && <ProjektKarten projekt={projekt} />}
        {aktiv === "kalender" && <KalenderModul projekt={projekt} />}
        {aktiv.startsWith("eigen-") && (
          <EigenerModul
            projekt={projekt}
            modulKey={aktiv}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  )
}

// Notion-artiger Tab oben in der Leiste.
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-2 text-sm transition-colors ${
        active
          ? "border-gray-900 font-medium text-gray-900"
          : "border-transparent text-gray-400 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  )
}

// Dokument-Blatt: weißes „Word“-Blatt, das die volle Höhe füllt. Alle
// Schreibflächen sitzen darin, damit jeder Tab dasselbe Layout hat.
function Dokument({ children }) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-1 flex-col px-6 py-8 sm:px-12 sm:py-10">
        {children}
      </div>
    </div>
  )
}

// Hauptseite des Projekts – wie ein Notion-Blatt: oben freier Text,
// darunter Kacheln, die auf die eingefügten Bereiche verlinken. Über
// „+ Seite“ lassen sich weitere Bereiche einfügen oder neu erstellen.
function UebersichtModul({
  projekt,
  onUpdate,
  sichtbareModule,
  verfuegbar,
  onOeffnen,
  onEinblenden,
  onEigenerBereich,
  neuerBereichName,
  setNeuerBereichName,
}) {
  const [alleTodos] = useStored("todos", [])
  const [ablage] = useStored("ablage", [])
  const [notizen] = useStored("notizen", [])
  const [karten] = useStored("karten", [])
  const [seiteHinzu, setSeiteHinzu] = useState(false)

  const gehoert = (e) =>
    e.projektId === projekt.id || e.kursId === projekt.id

  function beschreibung(key) {
    if (key === "ziel")
      return projekt.ziel?.trim()
        ? projekt.ziel.slice(0, 60)
        : "Noch kein Ziel definiert"
    if (key === "workflow") {
      const wf = projekt.workflow ?? []
      return wf.length
        ? `${wf.filter((s) => s.erledigt).length}/${wf.length} Schritte erledigt`
        : "Noch keine Schritte"
    }
    if (key === "todos") {
      const offen = alleTodos.filter((t) => gehoert(t) && !t.erledigt).length
      return `${offen} offene ${offen === 1 ? "Aufgabe" : "Aufgaben"}`
    }
    if (key === "inhalte") {
      const n = ablage.filter(gehoert).length
      return `${n} ${n === 1 ? "Inhalt" : "Inhalte"}`
    }
    if (key === "notizen") {
      const n = notizen.filter(gehoert).length
      return `${n} ${n === 1 ? "Notiz" : "Notizen"}`
    }
    if (key === "karten") {
      const n = karten.filter(gehoert).length
      return `${n} ${n === 1 ? "Karte" : "Karten"}`
    }
    if (key === "kalender") return "Termine & Deadlines"
    const eigen = (projekt.eigeneModule ?? []).find((m) => m.key === key)
    return eigen?.text?.trim() ? eigen.text.slice(0, 60) : "Leere Seite"
  }

  // Word-artiges Blatt: freie Schreibfläche, darunter verlinkte Seiten,
  // die beim Klick als Tab geöffnet werden.
  return (
    <Dokument>
      <textarea
        value={projekt.uebersicht ?? ""}
        onChange={(e) => onUpdate({ ...projekt, uebersicht: e.target.value })}
        placeholder="Schreib hier frei los – wie auf einem leeren Blatt. Notizen, Gedanken, worum es geht. Speichert automatisch."
        className="min-h-[38vh] w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
      />

      {sichtbareModule.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Verlinkte Seiten
          </p>
          <div className="mt-2 space-y-0.5">
            {sichtbareModule.map((m) => (
              <button
                key={m.key}
                onClick={() => onOeffnen(m.key)}
                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="text-gray-300">¶</span>
                <span className="text-sm font-medium text-gray-900 underline decoration-gray-300 decoration-dotted underline-offset-2 group-hover:decoration-gray-900">
                  {m.label}
                </span>
                <span className="truncate text-xs text-gray-400">
                  — {beschreibung(m.key)}
                </span>
                <span className="ml-auto text-xs text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
                  öffnen ↗
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        {!seiteHinzu ? (
          <button
            onClick={() => setSeiteHinzu(true)}
            className="rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:text-gray-900"
          >
            + Seite einfügen
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {verfuegbar.map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  onEinblenden(m.key)
                  onOeffnen(m.key)
                  setSeiteHinzu(false)
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                + {m.label}
              </button>
            ))}
            <form
              onSubmit={(e) => {
                onEigenerBereich(e)
                setSeiteHinzu(false)
              }}
              className="flex gap-1.5"
            >
              <input
                value={neuerBereichName}
                onChange={(e) => setNeuerBereichName(e.target.value)}
                placeholder="Eigene Seite, z.B. Recherche"
                className="w-44 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-900 outline-none focus:border-gray-900"
              />
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
              >
                Erstellen
              </button>
            </form>
            <button
              onClick={() => setSeiteHinzu(false)}
              className="px-1.5 py-1 text-xs text-gray-400 hover:text-gray-900"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </Dokument>
  )
}

// Individueller Bereich: Freitextfläche, speichert beim Tippen.
function EigenerModul({ projekt, modulKey, onUpdate }) {
  const eigene = projekt.eigeneModule ?? []
  const modul = eigene.find((m) => m.key === modulKey)
  if (!modul) return null

  function setText(text) {
    onUpdate({
      ...projekt,
      eigeneModule: eigene.map((m) =>
        m.key === modulKey ? { ...m, text } : m
      ),
    })
  }

  return (
    <Dokument>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {modul.label}
      </p>
      <textarea
        value={modul.text ?? ""}
        onChange={(e) => setText(e.target.value)}
        placeholder="Freier Bereich – schreib hier, was du brauchst. Speichert automatisch."
        className="mt-3 min-h-[40vh] w-full flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
      />
    </Dokument>
  )
}

function ZielModul({ projekt, onUpdate }) {
  return (
    <Dokument>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Zieldefinition
      </p>
      <textarea
        value={projekt.ziel ?? ""}
        onChange={(e) => onUpdate({ ...projekt, ziel: e.target.value })}
        placeholder="Was soll dieses Projekt erreichen? Woran erkennst du, dass es fertig ist? Speichert automatisch."
        className="mt-3 min-h-[40vh] w-full flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
      />
    </Dokument>
  )
}

function WorkflowModul({ projekt, onUpdate }) {
  const [text, setText] = useState("")
  const [datum, setDatum] = useState("")
  const [ansicht, setAnsicht] = useState("timeline")
  const workflow = projekt.workflow ?? []

  function addSchritt(e) {
    e.preventDefault()
    if (!text.trim()) return
    onUpdate({
      ...projekt,
      workflow: [
        ...workflow,
        { id: Date.now(), text: text.trim(), datum, erledigt: false },
      ],
    })
    setText("")
    setDatum("")
  }

  function toggle(id) {
    onUpdate({
      ...projekt,
      workflow: workflow.map((s) =>
        s.id === id ? { ...s, erledigt: !s.erledigt } : s
      ),
    })
  }

  function remove(id) {
    onUpdate({ ...projekt, workflow: workflow.filter((s) => s.id !== id) })
  }

  return (
    <div>
      <form
        onSubmit={addSchritt}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4"
      >
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Schritt
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z.B. Prototyp fertigstellen"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Termin
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      {workflow.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
            {[
              { key: "timeline", label: "Timeline" },
              { key: "liste", label: "Liste" },
            ].map((a) => (
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
        </div>
      )}

      {workflow.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Noch keine Schritte. Plane deinen Workflow von oben nach unten.
        </p>
      ) : ansicht === "timeline" ? (
        <WorkflowTimeline
          workflow={workflow}
          onToggle={toggle}
          onRemove={remove}
        />
      ) : (
        <ul className="mt-2 space-y-1.5">
          {workflow.map((s, i) => (
            <li
              key={s.id}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="w-5 text-right text-xs text-gray-300">
                {i + 1}
              </span>
              <input
                type="checkbox"
                checked={s.erledigt}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 accent-gray-900"
              />
              <span
                className={`flex-1 truncate text-sm ${
                  s.erledigt ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              >
                {s.text}
              </span>
              {s.datum && (
                <span className="text-xs text-gray-400">
                  {new Date(s.datum).toLocaleDateString("de-DE")}
                </span>
              )}
              <button
                onClick={() => remove(s.id)}
                title="Schritt löschen"
                className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Workflow als horizontale Timeline: jeder Schritt eine Zeile, waagerecht
// nach Datum positioniert, mit senkrechter „heute“-Linie.
function WorkflowTimeline({ workflow, onToggle, onRemove }) {
  const TAG = 24 * 60 * 60 * 1000
  const mitDatum = workflow.filter((s) => s.datum)
  const ohneDatum = workflow.filter((s) => !s.datum)

  if (mitDatum.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
        Gib den Schritten ein Datum, damit sie auf der Timeline erscheinen.
      </p>
    )
  }

  const heuteMs = new Date(heute()).getTime()
  const zeiten = mitDatum.map((s) => new Date(s.datum).getTime())
  let min = Math.min(...zeiten, heuteMs)
  let max = Math.max(...zeiten, heuteMs)
  if (max - min < TAG) {
    min -= 3 * TAG
    max += 3 * TAG
  } else {
    // etwas Rand links und rechts
    const rand = (max - min) * 0.08
    min -= rand
    max += rand
  }
  const spanne = max - min
  const pos = (ms) => ((ms - min) / spanne) * 100
  const heutePos = pos(heuteMs)

  const achse = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    links: f * 100,
    label: new Date(min + f * spanne).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
  }))

  const sortiert = [...mitDatum].sort(
    (a, b) => new Date(a.datum) - new Date(b.datum)
  )

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {/* Datumsachse */}
        <div className="relative h-5">
          {achse.map((a, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px] text-gray-400"
              style={{ left: `${a.links}%` }}
            >
              {a.label}
            </span>
          ))}
        </div>

        {/* Zeilen mit „heute“-Linie */}
        <div className="relative border-t border-gray-100 pt-2">
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400"
            style={{ left: `${heutePos}%` }}
          >
            <span className="absolute -top-0 left-1 whitespace-nowrap text-[10px] font-medium text-red-400">
              heute
            </span>
          </div>

          <div className="space-y-1.5">
            {sortiert.map((s) => {
              const links = pos(new Date(s.datum).getTime())
              // Karte nicht über den rechten Rand schieben
              const transform = links > 55 ? "translateX(-100%)" : "none"
              return (
                <div key={s.id} className="relative h-8">
                  <div
                    className={`group absolute top-0 flex items-center gap-2 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-sm ${
                      s.erledigt
                        ? "border-gray-100 bg-gray-50 text-gray-400"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                    style={{ left: `${links}%`, transform }}
                  >
                    <input
                      type="checkbox"
                      checked={s.erledigt}
                      onChange={() => onToggle(s.id)}
                      className="h-3.5 w-3.5 accent-gray-900"
                    />
                    <span className={s.erledigt ? "line-through" : ""}>
                      {s.text}
                    </span>
                    <span className="text-gray-300">
                      {new Date(s.datum).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => onRemove(s.id)}
                      title="Schritt löschen"
                      className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {ohneDatum.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Ohne Termin
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {ohneDatum.map((s) => (
              <li
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={s.erledigt}
                  onChange={() => onToggle(s.id)}
                  className="h-4 w-4 accent-gray-900"
                />
                <span
                  className={`flex-1 truncate text-sm ${
                    s.erledigt ? "text-gray-400 line-through" : "text-gray-800"
                  }`}
                >
                  {s.text}
                </span>
                <button
                  onClick={() => onRemove(s.id)}
                  title="Schritt löschen"
                  className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TodosModul({ projekt }) {
  const [alleTodos, setAlleTodos] = useStored("todos", [])
  const todos = alleTodos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  const offen = todos.filter((t) => !t.erledigt)
  const erledigt = todos.filter((t) => t.erledigt)

  function toggle(id) {
    setAlleTodos(
      alleTodos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }

  function remove(id) {
    setAlleTodos(alleTodos.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {offen.length} offene {offen.length === 1 ? "Todo" : "Todos"}
        </p>
        <TodoErstellen fest={{ projektId: projekt.id }} />
      </div>

      {todos.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Noch keine Todos in diesem Projekt.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {[...offen, ...erledigt].map((t) => (
            <TodoZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
      )}
    </div>
  )
}

function KalenderModul({ projekt }) {
  const [alleTodos] = useStored("todos", [])
  const workflow = projekt.workflow ?? []

  function eintraegeAm(key) {
    return [
      ...(projekt.deadline === key
        ? [{ typ: "projekt", label: `${projekt.name} – Deadline` }]
        : []),
      ...workflow
        .filter((s) => s.datum === key)
        .map((s) => ({
          typ: "schritt",
          label: s.erledigt ? `${s.text} (erledigt)` : s.text,
        })),
      ...alleTodos
        .filter(
          (t) =>
            (t.projektId === projekt.id || t.kursId === projekt.id) &&
            !t.erledigt &&
            t.datum === key
        )
        .map((t) => ({ typ: "aufgabe", label: t.text, dauer: t.dauer })),
    ]
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="mb-4 text-xs text-gray-400">
        Zeigt Workflow-Schritte mit Termin, Todos mit Deadline und die
        Projekt-Deadline.
      </p>
      <Kalender
        eintraegeAm={eintraegeAm}
        legende={["schritt", "aufgabe", "projekt"]}
      />
    </div>
  )
}
