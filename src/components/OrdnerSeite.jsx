import { useState } from "react"
import useStored from "../lib/useStored"
import { tageBis, tageBisZahl } from "../lib/datum"
import ProjektDetail, {
  MODULE,
  STANDARD_MODULE,
  STATUS_OPTIONEN,
  PRIORITAETEN,
} from "./ProjektDetail"

// Ordnersystem: Projekte liegen in beliebig verschachtelbaren Ordnern
// (z.B. Uni → 4. Semester → Statistik). Jedes Projekt wird individuell
// erstellt und bringt nur die Bereiche mit, die es braucht.

// Fortschritt eines Projekts als Werte: erst der Workflow, sonst die
// zugeordneten Todos. gesamt === 0 heißt „nichts zum Abhaken“.
export function projektFortschrittWerte(projekt, todos) {
  const schritte = projekt.workflow ?? []
  if (schritte.length > 0) {
    return { erledigt: schritte.filter((s) => s.erledigt).length, gesamt: schritte.length }
  }
  const eigene = todos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  return { erledigt: eigene.filter((t) => t.erledigt).length, gesamt: eigene.length }
}

export function projektFortschritt(projekt, todos) {
  const { erledigt, gesamt } = projektFortschrittWerte(projekt, todos)
  return gesamt > 0 ? `${erledigt}/${gesamt}` : "–"
}

// Farbiger Deadline-Chip – Farbe nach Dringlichkeit, Text via tageBis.
export function DeadlineChip({ datum }) {
  if (!datum) return null
  const tage = tageBisZahl(datum)
  const stil =
    tage <= 0
      ? "bg-red-50 text-red-600"
      : tage <= 3
        ? "bg-amber-50 text-amber-700"
        : "bg-gray-100 text-gray-500"
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${stil}`}>
      {tageBis(datum)}
    </span>
  )
}

// Schlanker Fortschrittsbalken mit erledigt/gesamt-Beschriftung.
export function Fortschrittsbalken({ erledigt, gesamt }) {
  if (gesamt === 0) {
    return <span className="text-xs text-gray-300">Noch keine Aufgaben</span>
  }
  const prozent = Math.round((erledigt / gesamt) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all"
          style={{ width: `${prozent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-gray-400">
        {erledigt}/{gesamt}
      </span>
    </div>
  )
}

function OrdnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-gray-400"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

export default function OrdnerSeite({ startProjektId = null }) {
  const [ordner, setOrdner] = useStored("ordner", [])
  const [projekte, setProjekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])

  const [aktuellerOrdnerId, setAktuellerOrdnerId] = useState(null)
  const [offenesProjektId, setOffenesProjektId] = useState(startProjektId)
  const [ordnerFormOffen, setOrdnerFormOffen] = useState(false)
  const [ordnerName, setOrdnerName] = useState("")
  const [projektFormOffen, setProjektFormOffen] = useState(false)
  const [ansicht, setAnsicht] = useState("ordner")

  function updateProjekt(aktualisiert) {
    setProjekte(
      projekte.map((p) => (p.id === aktualisiert.id ? aktualisiert : p))
    )
  }

  const offenesProjekt = projekte.find((p) => p.id === offenesProjektId)
  if (offenesProjekt) {
    return (
      <ProjektDetail
        projekt={offenesProjekt}
        onUpdate={updateProjekt}
        onBack={() => setOffenesProjektId(null)}
      />
    )
  }

  const unterordner = ordner.filter(
    (o) => (o.parentId ?? null) === aktuellerOrdnerId
  )
  const hiesigeProjekte = projekte.filter(
    (p) => (p.ordnerId ?? null) === aktuellerOrdnerId
  )

  // Brotkrumen-Pfad vom Start bis zum aktuellen Ordner
  const pfad = []
  let zeiger = aktuellerOrdnerId
  while (zeiger != null) {
    const o = ordner.find((x) => x.id === zeiger)
    if (!o) break
    pfad.unshift(o)
    zeiger = o.parentId ?? null
  }

  function addOrdner(e) {
    e.preventDefault()
    if (!ordnerName.trim()) return
    setOrdner([
      ...ordner,
      { id: Date.now(), name: ordnerName.trim(), parentId: aktuellerOrdnerId },
    ])
    setOrdnerName("")
    setOrdnerFormOffen(false)
  }

  function removeOrdner(id) {
    const hatInhalt =
      ordner.some((o) => o.parentId === id) ||
      projekte.some((p) => p.ordnerId === id)
    if (hatInhalt) return
    setOrdner(ordner.filter((o) => o.id !== id))
  }

  function removeProjekt(id) {
    setProjekte(projekte.filter((p) => p.id !== id))
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Projekte</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AnsichtToggle ansicht={ansicht} setAnsicht={setAnsicht} />
          <button
            onClick={() => setOrdnerFormOffen(!ordnerFormOffen)}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            + Ordner
          </button>
          <button
            onClick={() => setProjektFormOffen(!projektFormOffen)}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            + Projekt
          </button>
        </div>
      </div>

      {ordnerFormOffen && (
        <form
          onSubmit={addOrdner}
          className="mt-4 flex gap-2 rounded-xl border border-gray-300 bg-white p-4"
        >
          <input
            value={ordnerName}
            onChange={(e) => setOrdnerName(e.target.value)}
            placeholder="Ordnername, z.B. Uni oder 4. Semester"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Anlegen
          </button>
          <button
            type="button"
            onClick={() => setOrdnerFormOffen(false)}
            className="px-2 py-2 text-sm text-gray-400 hover:text-gray-900"
          >
            Abbrechen
          </button>
        </form>
      )}

      {projektFormOffen && (
        <ProjektErstellen
          ordnerId={aktuellerOrdnerId}
          projekte={projekte}
          setProjekte={setProjekte}
          onFertig={() => setProjektFormOffen(false)}
        />
      )}

      {ansicht === "alle" && (
        <AlleAnsicht
          projekte={projekte}
          todos={todos}
          onOeffnen={setOffenesProjektId}
          onRemove={removeProjekt}
        />
      )}
      {ansicht === "board" && (
        <BoardAnsicht
          projekte={projekte}
          setProjekte={setProjekte}
          onOeffnen={setOffenesProjektId}
        />
      )}
      {ansicht === "anstehend" && (
        <AnstehendAnsicht
          projekte={projekte}
          todos={todos}
          onOeffnen={setOffenesProjektId}
        />
      )}

      {ansicht === "ordner" && (
        <div>
          <nav className="mt-3 flex flex-wrap items-center gap-1 text-sm text-gray-400">
            <button
              onClick={() => setAktuellerOrdnerId(null)}
              className={
                aktuellerOrdnerId === null
                  ? "font-medium text-gray-900"
                  : "hover:text-gray-900"
              }
            >
              Start
            </button>
            {pfad.map((o) => (
              <span key={o.id} className="flex items-center gap-1">
                <span>/</span>
                <button
                  onClick={() => setAktuellerOrdnerId(o.id)}
                  className={
                    o.id === aktuellerOrdnerId
                      ? "font-medium text-gray-900"
                      : "hover:text-gray-900"
                  }
                >
                  {o.name}
                </button>
              </span>
            ))}
          </nav>

      {unterordner.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Ordner
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unterordner.map((o) => {
              const anzahl =
                ordner.filter((x) => x.parentId === o.id).length +
                projekte.filter((p) => p.ordnerId === o.id).length
              return (
                <div
                  key={o.id}
                  onClick={() => setAktuellerOrdnerId(o.id)}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400"
                >
                  <OrdnerIcon />
                  <span className="flex-1 truncate text-sm font-medium text-gray-900">
                    {o.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {anzahl}
                  </span>
                  {anzahl === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeOrdner(o.id)
                      }}
                      title="Leeren Ordner löschen"
                      className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {hiesigeProjekte.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Projekte
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hiesigeProjekte.map((p) => (
              <ProjektKarte
                key={p.id}
                p={p}
                todos={todos}
                onOeffnen={setOffenesProjektId}
                onRemove={removeProjekt}
              />
            ))}
          </div>
        </section>
      )}

      {unterordner.length === 0 && hiesigeProjekte.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Dieser Ordner ist leer. Lege einen Unterordner oder ein Projekt an.
        </p>
      )}
        </div>
      )}
    </div>
  )
}

const ANSICHTEN = [
  { key: "ordner", label: "Ordner" },
  { key: "alle", label: "Alle" },
  { key: "board", label: "Board" },
  { key: "anstehend", label: "Anstehend" },
]

const PRIO_RANG = { hoch: 3, mittel: 2, niedrig: 1, "": 0 }

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

// Wiederverwendbare Projektkarte (Ordner- und Alle-Ansicht).
function ProjektKarte({ p, todos, onOeffnen, onRemove }) {
  const tags = (p.module ?? STANDARD_MODULE)
    .map((k) => MODULE.find((m) => m.key === k)?.label)
    .filter(Boolean)
  return (
    <div
      onClick={() => onOeffnen(p.id)}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-400"
    >
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(p.id)
          }}
          title="Projekt löschen"
          className="absolute right-3 top-3 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          ×
        </button>
      )}
      <h3 className="truncate pr-4 text-sm font-medium text-gray-900">
        {p.name}
      </h3>
      {p.beschreibung && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
          {p.beschreibung}
        </p>
      )}
      <div className="mt-4">
        <Fortschrittsbalken {...projektFortschrittWerte(p, todos)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tags.slice(0, 2).map((label) => (
          <span
            key={label}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
          >
            {label}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-[10px] text-gray-400">+{tags.length - 2}</span>
        )}
        {p.deadline && (
          <span className="ml-auto">
            <DeadlineChip datum={p.deadline} />
          </span>
        )}
      </div>
    </div>
  )
}

// „Alle Projekte" ordnerübergreifend mit Sortierung und Filtern.
function AlleAnsicht({ projekte, todos, onOeffnen, onRemove }) {
  const [sortierung, setSortierung] = useState("faellig")
  const [statusFilter, setStatusFilter] = useState("")
  const [prioFilter, setPrioFilter] = useState("")

  const gefiltert = projekte.filter((p) => {
    if (statusFilter && (p.status ?? "offen") !== statusFilter) return false
    if (prioFilter && (p.prioritaet ?? "") !== prioFilter) return false
    return true
  })
  const liste = [...gefiltert].sort((a, b) => {
    if (sortierung === "faellig")
      return (a.deadline || "9999").localeCompare(b.deadline || "9999")
    if (sortierung === "prioritaet")
      return (
        (PRIO_RANG[b.prioritaet ?? ""] ?? 0) -
        (PRIO_RANG[a.prioritaet ?? ""] ?? 0)
      )
    if (sortierung === "status")
      return (a.status ?? "offen").localeCompare(b.status ?? "offen")
    return a.name.localeCompare(b.name)
  })

  const selektStil =
    "rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-800 outline-none focus:border-gray-900"

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <label className="flex items-center gap-1.5">
          Sortieren
          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
            className={selektStil}
          >
            <option value="faellig">Fälligkeit</option>
            <option value="prioritaet">Priorität</option>
            <option value="status">Status</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selektStil}
          >
            <option value="">Alle</option>
            {STATUS_OPTIONEN.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Priorität
          <select
            value={prioFilter}
            onChange={(e) => setPrioFilter(e.target.value)}
            className={selektStil}
          >
            <option value="">Alle</option>
            {PRIORITAETEN.filter((p) => p.value).map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {liste.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Keine Projekte für diese Auswahl.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((p) => (
            <ProjektKarte
              key={p.id}
              p={p}
              todos={todos}
              onOeffnen={onOeffnen}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Kanban-Board nach Status, Projekte per Drag&Drop verschiebbar.
function BoardAnsicht({ projekte, setProjekte, onOeffnen }) {
  const [ziehId, setZiehId] = useState(null)

  function setzeStatus(id, status) {
    setProjekte(projekte.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {STATUS_OPTIONEN.map((sp) => {
        const spalte = projekte.filter((p) => (p.status ?? "offen") === sp.value)
        return (
          <div
            key={sp.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (ziehId != null) setzeStatus(ziehId, sp.value)
              setZiehId(null)
            }}
            className="rounded-xl border border-gray-200 bg-gray-50/40 p-2"
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${sp.tag}`}
              >
                {sp.label}
              </span>
              <span className="text-xs text-gray-400">{spalte.length}</span>
            </div>
            <div className="mt-1 space-y-2">
              {spalte.map((p) => {
                const pr = PRIORITAETEN.find((x) => x.value === p.prioritaet)
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setZiehId(p.id)}
                    onDragEnd={() => setZiehId(null)}
                    onClick={() => onOeffnen(p.id)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-400"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {pr && pr.value && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${pr.tag}`}
                        >
                          {pr.label}
                        </span>
                      )}
                      {p.deadline && (
                        <span className="ml-auto">
                          <DeadlineChip datum={p.deadline} />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {spalte.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-gray-300">
                  Hierher ziehen
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Projektübergreifend: nächste Deadlines, terminierte Schritte, Todos.
function AnstehendAnsicht({ projekte, todos, onOeffnen }) {
  const projektName = (id) => projekte.find((p) => p.id === id)?.name ?? ""
  const eintraege = []
  for (const p of projekte) {
    if (p.deadline)
      eintraege.push({
        datum: p.deadline,
        label: `Deadline: ${p.name}`,
        projektId: p.id,
        typ: "Deadline",
      })
    for (const s of p.workflow ?? []) {
      if (s.datum && !s.erledigt)
        eintraege.push({
          datum: s.datum,
          label: s.text,
          projektId: p.id,
          typ: "Schritt",
        })
    }
  }
  for (const t of todos) {
    const pid = t.projektId ?? t.kursId
    if (t.datum && !t.erledigt && pid)
      eintraege.push({
        datum: t.datum,
        label: t.text,
        projektId: pid,
        typ: "Todo",
      })
  }
  const liste = eintraege
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 25)

  return (
    <div className="mt-4">
      {liste.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Nichts Anstehendes – keine Deadlines, Schritte oder Todos mit Termin.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {liste.map((e, i) => (
            <li
              key={i}
              onClick={() => onOeffnen(e.projektId)}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <span className="w-20 shrink-0 text-xs text-gray-500">
                {new Date(e.datum).toLocaleDateString("de-DE")}
              </span>
              <DeadlineChip datum={e.datum} />
              <span className="flex-1 truncate text-sm text-gray-800">
                {e.label}
              </span>
              <span className="hidden max-w-32 truncate text-xs text-gray-400 sm:inline">
                {projektName(e.projektId)}
              </span>
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {e.typ}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProjektErstellen({ ordnerId, projekte, setProjekte, onFertig }) {
  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [deadline, setDeadline] = useState("")

  // Projekt entsteht leer (wie ein Notion-Blatt) – Bereiche werden
  // danach im Übersichts-Sheet hinzugefügt.
  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return
    setProjekte([
      ...projekte,
      {
        id: Date.now(),
        name: name.trim(),
        beschreibung: beschreibung.trim(),
        ordnerId,
        deadline,
        module: [],
        ziel: "",
        workflow: [],
      },
    ])
    onFertig()
  }

  return (
    <form
      onSubmit={speichern}
      className="mt-4 rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Statistik I"
            autoFocus
            className="mt-1 w-52 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Beschreibung
          <input
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="optional"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Deadline / Prüfung
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Bereiche fügst du danach direkt im Projekt-Sheet hinzu.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onFertig}
          className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Projekt anlegen
        </button>
      </div>
    </form>
  )
}
