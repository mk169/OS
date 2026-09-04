import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { erkenneDatum, erkenneProjekt } from "../lib/erkennung"

// Wiederverwendbarer Todo-Ersteller: ein Plus-Button, der ein Formular
// öffnet. Wird im Dashboard, auf der Todo-Seite, in Kursen und in
// Projekten benutzt. `fest` legt die Zuordnung fix fest (z.B. im Kurs).

export const EINTEILUNGEN = [
  {
    key: "wichtig-dringend",
    label: "Wichtig & dringend",
    punkt: "bg-red-500",
    text: "text-red-600",
    passt: (t) => t.wichtig && t.dringend,
  },
  {
    key: "wichtig",
    label: "Wichtig, nicht dringend",
    punkt: "bg-yellow-400",
    text: "text-yellow-600",
    passt: (t) => t.wichtig && !t.dringend,
  },
  {
    key: "dringend",
    label: "Dringend, nicht wichtig",
    punkt: "bg-orange-500",
    text: "text-orange-600",
    passt: (t) => !t.wichtig && t.dringend,
  },
  {
    key: "sonstige",
    label: "Sonstige",
    punkt: "bg-gray-400",
    text: "text-gray-500",
    passt: (t) => !t.wichtig && !t.dringend,
  },
]

export function einteilungVon(todo) {
  return EINTEILUNGEN.find((e) => e.passt(todo))
}

export default function TodoErstellen({
  fest = null,
  beschriftung = "Todo",
  knopfKlasse = null,
  knopfInhalt = null,
}) {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])

  const [offen, setOffen] = useState(false)
  const [name, setName] = useState("")
  const [zuordnung, setZuordnung] = useState("")
  const [dauer, setDauer] = useState("")
  const [deadline, setDeadline] = useState("")
  const [wichtig, setWichtig] = useState(false)
  const [dringend, setDringend] = useState(false)

  // Sekretär-Prinzip: Aus dem eingetippten Namen werden Deadline („morgen",
  // „in 2 Wochen") und ein bestehendes Projekt erkannt – aber nur als
  // Vorschlag angeboten. Übernommen wird erst auf Klick, und nur für Felder,
  // die noch leer sind.
  const vorschlag = useMemo(() => {
    const datum = deadline ? null : erkenneDatum(name)
    const projekt = fest || zuordnung ? null : erkenneProjekt(name, projekte)
    return datum || projekt ? { datum, projekt } : null
  }, [name, deadline, zuordnung, fest, projekte])

  function vorschlagUebernehmen() {
    if (!vorschlag) return
    if (vorschlag.datum) setDeadline(vorschlag.datum)
    if (vorschlag.projekt) setZuordnung(String(vorschlag.projekt.id))
  }

  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return

    let projektId = fest?.projektId ?? fest?.kursId ?? null
    if (!fest && zuordnung) projektId = Number(zuordnung)

    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: name.trim(),
        projektId,
        dauer: dauer ? Number(dauer) : null,
        datum: deadline,
        wichtig,
        dringend,
        erledigt: false,
      },
    ])
    setName("")
    setZuordnung("")
    setDauer("")
    setDeadline("")
    setWichtig(false)
    setDringend(false)
    setOffen(false)
  }

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className={
          knopfKlasse ??
          "flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-700"
        }
        title={`${beschriftung} erstellen`}
      >
        {knopfInhalt ?? "+"}
      </button>
    )
  }

  return (
    <form
      onSubmit={speichern}
      className="w-full rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-col text-xs text-gray-500 sm:min-w-[10rem] sm:flex-1">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${beschriftung} benennen`}
            autoFocus
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>

        {!fest && (
          <label className="flex flex-col text-xs text-gray-500">
            Zuordnung
            <select
              value={zuordnung}
              onChange={(e) => setZuordnung(e.target.value)}
              className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="">Keine</option>
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col text-xs text-gray-500">
          Dauer (Min.)
          <input
            type="number"
            min="5"
            step="5"
            value={dauer}
            onChange={(e) => setDauer(e.target.value)}
            placeholder="–"
            className="mt-1 w-24 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-500">
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
      </div>

      {vorschlag && (
        <button
          type="button"
          onClick={vorschlagUebernehmen}
          className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          <span className="text-gray-400">Erkannt:</span>
          {vorschlag.datum && (
            <span className="font-medium">
              {new Date(vorschlag.datum).toLocaleDateString("de-DE")}
            </span>
          )}
          {vorschlag.projekt && (
            <span className="font-medium">{vorschlag.projekt.name}</span>
          )}
          <span className="text-gray-400">— übernehmen</span>
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={wichtig}
            onChange={(e) => setWichtig(e.target.checked)}
            className="h-4 w-4 accent-gray-900"
          />
          Wichtig
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={dringend}
            onChange={(e) => setDringend(e.target.checked)}
            className="h-4 w-4 accent-gray-900"
          />
          Dringend
        </label>
        <span
          className={`flex items-center gap-1.5 text-xs ${einteilungVon({ wichtig, dringend }).text}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${einteilungVon({ wichtig, dringend }).punkt}`}
          />
          {einteilungVon({ wichtig, dringend }).label}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Erstellen
          </button>
        </div>
      </div>
    </form>
  )
}
