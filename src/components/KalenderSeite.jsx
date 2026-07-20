import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import Kalender from "./Kalender"

// Kalender-Panel: vollständiger Kalender (Tag/Woche/Monat, Timestacking)
// mit Termin-Erstellung. Wird im Dashboard eingebettet und auf der
// eigenen Kalender-Seite als Gesamtübersicht genutzt.

export function KalenderPanel() {
  const [termine, setTermine] = useStored("termine", [])
  const [todos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])

  const [formOffen, setFormOffen] = useState(false)
  const [formTitel, setFormTitel] = useState("")
  const [formDatum, setFormDatum] = useState(heute())
  const [formZeit, setFormZeit] = useState("")
  const [formEnde, setFormEnde] = useState("")
  const [formDauer, setFormDauer] = useState("60")
  const [formFokus, setFormFokus] = useState(false)
  const [formProjektId, setFormProjektId] = useState("")

  // Minuten zwischen zwei Uhrzeiten "HH:MM" (nur wenn Ende nach Start liegt).
  function minutenZwischen(start, ende) {
    if (!start || !ende) return null
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = ende.split(":").map(Number)
    const diff = eh * 60 + em - (sh * 60 + sm)
    return diff > 0 ? diff : null
  }

  const offeneTodos = todos.filter((t) => !t.erledigt)
  const projektName = (id) => projekte.find((p) => p.id === Number(id))?.name

  function eintraegeAm(key) {
    return [
      ...termine
        .filter((t) => t.datum === key)
        .map((t) => ({
          typ: t.fokus ? "fokus" : "termin",
          label:
            t.fokus && t.projektId
              ? `${t.titel} · ${projektName(t.projektId) ?? ""}`
              : t.titel,
          zeit: t.zeit,
          bis: t.endeZeit,
          dauer: t.dauer,
          onRemove: () => setTermine(termine.filter((x) => x.id !== t.id)),
        })),
      ...projekte
        .filter((p) => p.deadline === key)
        .map((p) => ({ typ: "projekt", label: `${p.name} – Deadline` })),
      ...todos
        .filter((t) => !t.erledigt && t.datum === key)
        .map((t) => ({ typ: "aufgabe", label: t.text, dauer: t.dauer })),
    ].sort((a, b) => (a.zeit || "99:99").localeCompare(b.zeit || "99:99"))
  }

  function addTermin(e) {
    e.preventDefault()
    if (!formTitel.trim()) return
    // Ende hat Vorrang: liegt eine Endzeit vor, ergibt sich die Dauer daraus.
    const ausEnde = minutenZwischen(formZeit, formEnde)
    const dauer = ausEnde ?? (formZeit && formDauer ? Number(formDauer) : null)
    setTermine([
      ...termine,
      {
        id: Date.now(),
        titel: formTitel.trim(),
        datum: formDatum,
        zeit: formZeit,
        endeZeit: ausEnde ? formEnde : "",
        dauer,
        fokus: formFokus,
        projektId: formFokus && formProjektId ? Number(formProjektId) : null,
      },
    ])
    setFormTitel("")
    setFormZeit("")
    setFormEnde("")
    setFormDauer("60")
    setFormFokus(false)
    setFormProjektId("")
    setFormOffen(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {formOffen && (
        <form
          onSubmit={addTermin}
          className="mb-4 rounded-lg bg-gray-50 p-4"
        >
          <input
            value={formTitel}
            onChange={(e) => setFormTitel(e.target.value)}
            placeholder="Titel des Termins…"
            autoFocus
            className="w-full rounded-md border border-gray-200 px-4 py-3 text-lg font-medium text-gray-900 outline-none focus:border-gray-900"
          />

          <label className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            oder Todo übernehmen
            <select
              value=""
              onChange={(e) => {
                const t = offeneTodos.find(
                  (x) => x.id === Number(e.target.value)
                )
                if (t) {
                  setFormTitel(t.text)
                  if (t.dauer) setFormDauer(String(t.dauer))
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="">– Todo wählen –</option>
              {offeneTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text}
                  {projektName(t.projektId ?? t.kursId)
                    ? ` (${projektName(t.projektId ?? t.kursId)})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-gray-500">
              Datum
              <input
                type="date"
                value={formDatum}
                onChange={(e) => setFormDatum(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-500">
              Von
              <input
                type="time"
                value={formZeit}
                onChange={(e) => setFormZeit(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-500">
              Bis (optional)
              <input
                type="time"
                value={formEnde}
                onChange={(e) => setFormEnde(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-500">
              Dauer (Min.)
              <input
                type="number"
                min="15"
                step="15"
                value={formEnde ? (minutenZwischen(formZeit, formEnde) ?? "") : formDauer}
                onChange={(e) => setFormDauer(e.target.value)}
                disabled={!!formEnde}
                className="mt-1 w-24 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formFokus}
                onChange={(e) => setFormFokus(e.target.checked)}
                className="h-4 w-4 accent-violet-600"
              />
              Fokuszeit
            </label>
            {formFokus && (
              <label className="flex flex-col text-xs text-gray-500">
                Projekt
                <select
                  value={formProjektId}
                  onChange={(e) => setFormProjektId(e.target.value)}
                  className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="">Ohne Projekt</option>
                  {projekte.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setFormOffen(false)}
              className="px-2 py-2 text-sm text-gray-400 hover:text-gray-900"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <Kalender
        eintraegeAm={eintraegeAm}
        legende={["termin", "fokus", "aufgabe", "projekt"]}
        onNeu={(datum) => {
          setFormDatum(datum)
          setFormOffen(true)
        }}
      />
    </div>
  )
}

export default function KalenderSeite() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Kalender</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gesamtübersicht – Termine mit Dauer stapeln sich in der Tagesansicht
          zu deinem Tagesplan.
        </p>
      </div>

      <div className="mt-6">
        <KalenderPanel />
      </div>
    </div>
  )
}
