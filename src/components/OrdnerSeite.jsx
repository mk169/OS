import { useState } from "react"
import useStored from "../lib/useStored"
import { tageBis } from "../lib/datum"
import ProjektDetail, { MODULE, STANDARD_MODULE } from "./ProjektDetail"

// Ordnersystem: Projekte liegen in beliebig verschachtelbaren Ordnern
// (z.B. Uni → 4. Semester → Statistik). Jedes Projekt wird individuell
// erstellt und bringt nur die Bereiche mit, die es braucht.

export function projektFortschritt(projekt, todos) {
  const schritte = projekt.workflow ?? []
  if (schritte.length > 0) {
    return `${schritte.filter((s) => s.erledigt).length}/${schritte.length}`
  }
  const eigene = todos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  if (eigene.length > 0) {
    return `${eigene.filter((t) => t.erledigt).length}/${eigene.length}`
  }
  return "–"
}

export default function OrdnerSeite({ onBack, startProjektId = null }) {
  const [ordner, setOrdner] = useStored("ordner", [])
  const [projekte, setProjekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])

  const [aktuellerOrdnerId, setAktuellerOrdnerId] = useState(null)
  const [offenesProjektId, setOffenesProjektId] = useState(startProjektId)
  const [ordnerFormOffen, setOrdnerFormOffen] = useState(false)
  const [ordnerName, setOrdnerName] = useState("")
  const [projektFormOffen, setProjektFormOffen] = useState(false)

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
      <button
        onClick={onBack}
        className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-900"
      >
        ← Dashboard
      </button>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projekte</h1>
          <nav className="mt-1 flex flex-wrap items-center gap-1 text-sm text-gray-400">
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
        </div>
        <div className="flex gap-2">
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

      <div className="mt-6 space-y-1.5">
        {unterordner.map((o) => {
          const anzahl =
            ordner.filter((x) => x.parentId === o.id).length +
            projekte.filter((p) => p.ordnerId === o.id).length
          return (
            <div
              key={o.id}
              onClick={() => setAktuellerOrdnerId(o.id)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400"
            >
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Ordner
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {o.name}
              </span>
              <span className="text-xs text-gray-400">
                {anzahl} {anzahl === 1 ? "Element" : "Elemente"}
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

        {hiesigeProjekte.map((p) => (
          <div
            key={p.id}
            onClick={() => setOffenesProjektId(p.id)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400"
          >
            <span className="flex-1 text-sm font-medium text-gray-900">
              {p.name}
            </span>
            <span className="hidden text-xs text-gray-400 md:inline">
              {(p.module ?? STANDARD_MODULE)
                .map((k) => MODULE.find((m) => m.key === k)?.label)
                .filter(Boolean)
                .join(" · ")}
            </span>
            {p.deadline && (
              <span className="text-xs text-gray-400">
                {tageBis(p.deadline)}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {projektFortschritt(p, todos)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeProjekt(p.id)
              }}
              title="Projekt löschen"
              className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        {unterordner.length === 0 && hiesigeProjekte.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
            Dieser Ordner ist leer. Lege einen Unterordner oder ein Projekt an.
          </p>
        )}
      </div>
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
