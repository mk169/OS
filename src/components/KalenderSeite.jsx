import { useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import { faelltAuf, WIEDERHOLUNGEN } from "../lib/wiederholung"
import { alsICS, parseICS } from "../lib/ics"
import Kalender from "./Kalender"

// Kalender-Panel: vollständiger Kalender (Tag/Woche/Monat, Timestacking)
// mit Termin-Erstellung. Wird im Dashboard eingebettet und auf der
// eigenen Kalender-Seite als Gesamtübersicht genutzt.

export function KalenderPanel({ tagesdetail = false }) {
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
  const [formWiederholung, setFormWiederholung] = useState("")
  const [formBis, setFormBis] = useState("")
  const [formGeburtstag, setFormGeburtstag] = useState(false)
  const [icsMeldung, setIcsMeldung] = useState("")
  const icsInput = useRef(null)

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
        .filter((t) => faelltAuf(t, key))
        .map((t) => ({
          typ:
            t.art === "geburtstag"
              ? "geburtstag"
              : t.fokus
                ? "fokus"
                : "termin",
          label:
            t.art === "geburtstag"
              ? `🎂 ${t.titel}`
              : t.fokus && t.projektId
                ? `${t.titel} · ${projektName(t.projektId) ?? ""}`
                : t.titel,
          zeit: t.ganztags ? "" : t.zeit,
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
        zeit: formGeburtstag ? "" : formZeit,
        endeZeit: !formGeburtstag && ausEnde ? formEnde : "",
        dauer: formGeburtstag ? null : dauer,
        fokus: !formGeburtstag && formFokus,
        projektId:
          !formGeburtstag && formFokus && formProjektId
            ? Number(formProjektId)
            : null,
        ganztags: formGeburtstag,
        art: formGeburtstag ? "geburtstag" : "",
        wiederholung: formGeburtstag ? "jaehrlich" : formWiederholung,
        bis: formGeburtstag ? "" : formBis,
      },
    ])
    setFormTitel("")
    setFormZeit("")
    setFormEnde("")
    setFormDauer("60")
    setFormFokus(false)
    setFormProjektId("")
    setFormWiederholung("")
    setFormBis("")
    setFormGeburtstag(false)
    setFormOffen(false)
  }

  // ICS-Export: .ics-Datei, die Google Kalender direkt importieren kann.
  function exportiereICS() {
    const blob = new Blob([alsICS(termine)], {
      type: "text/calendar;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "kalender.ics"
    a.click()
    URL.revokeObjectURL(url)
    setIcsMeldung("kalender.ics exportiert – in Google Kalender importierbar.")
  }

  // ICS-Import: liest .ics-Exporte (z. B. aus Google Kalender) ein.
  function importiereICS(e) {
    const datei = e.target.files?.[0]
    if (!datei) return
    const reader = new FileReader()
    reader.onload = () => {
      const importiert = parseICS(String(reader.result))
      if (importiert.length === 0) {
        setIcsMeldung("Keine Termine in der Datei gefunden.")
        return
      }
      const basisId = Date.now()
      setTermine([
        ...termine,
        ...importiert.map((t, i) => ({ id: basisId + i, ...t })),
      ])
      setIcsMeldung(
        `${importiert.length} ${importiert.length === 1 ? "Termin" : "Termine"} importiert.`
      )
    }
    reader.readAsText(datei)
    e.target.value = ""
  }

  return (
    <div
      className={
        tagesdetail ? "" : "rounded-xl border border-gray-200 bg-white p-5"
      }
    >
      {formOffen && (
        <form
          onSubmit={addTermin}
          className="mb-4 rounded-lg border border-gray-200 p-4"
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
            {!formGeburtstag && (
              <>
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
              </>
            )}
            <label className="flex flex-col text-xs text-gray-500">
              Wiederholen
              <select
                value={formGeburtstag ? "jaehrlich" : formWiederholung}
                onChange={(e) => setFormWiederholung(e.target.value)}
                disabled={formGeburtstag}
                className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {WIEDERHOLUNGEN.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            {!formGeburtstag && formWiederholung && (
              <label className="flex flex-col text-xs text-gray-500">
                Wiederholen bis (optional)
                <input
                  type="date"
                  value={formBis}
                  onChange={(e) => setFormBis(e.target.value)}
                  className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </label>
            )}
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formGeburtstag}
                onChange={(e) => setFormGeburtstag(e.target.checked)}
                className="h-4 w-4 accent-rose-500"
              />
              Geburtstag 🎂
            </label>
            {!formGeburtstag && (
              <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formFokus}
                  onChange={(e) => setFormFokus(e.target.checked)}
                  className="h-4 w-4 accent-violet-600"
                />
                Fokuszeit
              </label>
            )}
            {!formGeburtstag && formFokus && (
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
        legende={["termin", "fokus", "geburtstag", "aufgabe", "projekt"]}
        tagesdetail={tagesdetail}
        onNeu={(datum) => {
          setFormDatum(datum)
          setFormOffen(true)
        }}
        onNeuZeit={(datum, zeit) => {
          setFormDatum(datum)
          setFormZeit(zeit)
          setFormGeburtstag(false)
          setFormOffen(true)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      />

      {tagesdetail && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 text-xs text-gray-400">
          <button
            onClick={exportiereICS}
            className="border border-gray-200 px-2.5 py-1 text-gray-600 hover:bg-gray-50"
          >
            Exportieren (.ics)
          </button>
          <button
            onClick={() => icsInput.current?.click()}
            className="border border-gray-200 px-2.5 py-1 text-gray-600 hover:bg-gray-50"
          >
            Importieren (.ics)
          </button>
          <input
            ref={icsInput}
            type="file"
            accept=".ics,text/calendar"
            onChange={importiereICS}
            className="hidden"
          />
          <span>{icsMeldung || "Kompatibel mit Google Kalender."}</span>
        </div>
      )}
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
        <KalenderPanel tagesdetail />
      </div>
    </div>
  )
}
