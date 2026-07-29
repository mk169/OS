import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  ZYKLUS_LAENGEN,
  berechneEnde,
  laengeLabel,
  zyklusStatus,
  restText,
} from "../lib/zyklen"

// Verwaltung der Fokus-Perioden (Zyklen) in den Einstellungen: anlegen,
// Ziel/Titel bearbeiten, Projekte verknüpfen und löschen. Die Anzeige auf
// dem Dashboard übernimmt ZyklusWidget.
export default function ZyklenEinstellungen() {
  const [zyklen, setZyklen] = useStored("zyklen", [])
  const [projekte] = useStored("projekte", [])
  const [formOffen, setFormOffen] = useState(false)

  const aktiveProjekte = projekte.filter((p) => !p.archiviert)
  // Neueste Perioden zuerst (nach Startdatum).
  const sortiert = [...zyklen].sort((a, b) =>
    (b.start ?? "").localeCompare(a.start ?? "")
  )

  function addZyklus(zyklus) {
    setZyklen([...zyklen, zyklus])
    setFormOffen(false)
  }

  function updateZyklus(neu) {
    setZyklen(zyklen.map((z) => (z.id === neu.id ? neu : z)))
  }

  function removeZyklus(id) {
    setZyklen(zyklen.filter((z) => z.id !== id))
  }

  return (
    <div className="space-y-3">
      {sortiert.length === 0 && !formOffen && (
        <p className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400">
          Noch keine Fokus-Periode. Lege eine an – ein klarer Zeitraum mit Ziel
          und wenigen Projekten, die du wirklich umsetzen willst.
        </p>
      )}

      {sortiert.map((z) => (
        <ZyklusKarte
          key={z.id}
          zyklus={z}
          projekte={aktiveProjekte}
          onUpdate={updateZyklus}
          onRemove={removeZyklus}
        />
      ))}

      {formOffen ? (
        <ZyklusForm
          projekte={aktiveProjekte}
          onSpeichern={addZyklus}
          onAbbrechen={() => setFormOffen(false)}
        />
      ) : (
        <button
          onClick={() => setFormOffen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-800"
        >
          <span className="text-base leading-none">+</span> Neue Fokus-Periode
        </button>
      )}
    </div>
  )
}

// Bestehende Periode: Titel & Ziel inline editierbar, Projekte per Chip
// zu-/abschaltbar. Länge/Start/Ende sind Anlege-Werte und werden hier nicht
// verändert (bei Bedarf löschen und neu anlegen).
function ZyklusKarte({ zyklus, projekte, onUpdate, onRemove }) {
  const s = zyklusStatus(zyklus)
  const gewaehlt = new Set(zyklus.projektIds ?? [])

  const badge = s.aktiv
    ? { text: `Aktiv · ${restText(s.tageUebrig)}`, stil: "bg-emerald-50 text-emerald-700" }
    : s.bevorstehend
      ? { text: `Startet in ${s.tageBisStart} Tagen`, stil: "bg-blue-50 text-blue-700" }
      : { text: "Abgeschlossen", stil: "bg-gray-100 text-gray-500" }

  function toggleProjekt(pid) {
    const neu = new Set(gewaehlt)
    if (neu.has(pid)) neu.delete(pid)
    else neu.add(pid)
    onUpdate({ ...zyklus, projektIds: [...neu] })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100">
      <div className="flex items-start justify-between gap-3">
        <input
          value={zyklus.titel}
          onChange={(e) => onUpdate({ ...zyklus, titel: e.target.value })}
          className="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-gray-900 outline-none"
        />
        <button
          onClick={() => onRemove(zyklus.id)}
          title="Periode löschen"
          className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
        >
          ×
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className={`rounded-full px-2 py-0.5 font-medium ${badge.stil}`}>
          {badge.text}
        </span>
        <span>
          {new Date(zyklus.start).toLocaleDateString("de-DE")} –{" "}
          {new Date(zyklus.ende).toLocaleDateString("de-DE")}
        </span>
        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-gray-500">
          {laengeLabel(zyklus.laenge)}
        </span>
      </div>

      <textarea
        value={zyklus.ziel ?? ""}
        onChange={(e) => onUpdate({ ...zyklus, ziel: e.target.value })}
        placeholder="Ziel dieser Periode – woran misst du den Erfolg?"
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent-400 focus:bg-white placeholder:text-gray-300"
      />

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Verknüpfte Projekte
      </p>
      {projekte.length === 0 ? (
        <p className="mt-1.5 text-xs text-gray-400">
          Noch keine Projekte angelegt.
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {projekte.map((p) => {
            const an = gewaehlt.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggleProjekt(p.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  an
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-gray-200 bg-white text-gray-500 hover:text-gray-900"
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Anlege-Formular für eine neue Periode.
function ZyklusForm({ projekte, onSpeichern, onAbbrechen }) {
  const [titel, setTitel] = useState("")
  const [ziel, setZiel] = useState("")
  const [laenge, setLaenge] = useState("90")
  const [start, setStart] = useState(heute())
  const [ende, setEnde] = useState("")
  const [projektIds, setProjektIds] = useState([])
  const [fehler, setFehler] = useState("")

  const istCustom = laenge === "custom"

  function toggleProjekt(pid) {
    setProjektIds((ids) =>
      ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid]
    )
  }

  function speichern(e) {
    e.preventDefault()
    if (!titel.trim()) return setFehler("Bitte gib der Periode einen Titel.")
    if (!start) return setFehler("Bitte wähle ein Startdatum.")
    const endDatum = istCustom ? ende : berechneEnde(start, laenge)
    if (!endDatum) return setFehler("Bitte wähle ein Enddatum.")
    if (endDatum < start)
      return setFehler("Das Enddatum liegt vor dem Start.")
    onSpeichern({
      id: Date.now(),
      titel: titel.trim(),
      ziel: ziel.trim(),
      laenge,
      start,
      ende: endDatum,
      projektIds,
    })
  }

  return (
    <form
      onSubmit={speichern}
      className="space-y-3 rounded-2xl border border-gray-300 bg-white p-4"
    >
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Titel, z.B. Q3 – Bachelorarbeit abschließen"
        autoFocus
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-accent-400 focus:bg-white"
      />

      <div>
        <p className="mb-1.5 text-xs text-gray-500">Länge</p>
        <div className="flex flex-wrap gap-1.5">
          {ZYKLUS_LAENGEN.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLaenge(l.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                laenge === l.key
                  ? "border-accent-500 bg-accent-50 text-accent-700"
                  : "border-gray-200 bg-white text-gray-500 hover:text-gray-900"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col text-xs text-gray-500">
          Start
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-accent-400 focus:bg-white"
          />
        </label>
        {istCustom ? (
          <label className="flex flex-col text-xs text-gray-500">
            Ende
            <input
              type="date"
              value={ende}
              onChange={(e) => setEnde(e.target.value)}
              className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-accent-400 focus:bg-white"
            />
          </label>
        ) : (
          start && (
            <div className="flex flex-col text-xs text-gray-500">
              Ende
              <span className="mt-1 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-500">
                {new Date(berechneEnde(start, laenge)).toLocaleDateString("de-DE")}
              </span>
            </div>
          )
        )}
      </div>

      <textarea
        value={ziel}
        onChange={(e) => setZiel(e.target.value)}
        placeholder="Ziel dieser Periode – woran misst du den Erfolg?"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent-400 focus:bg-white placeholder:text-gray-300"
      />

      <div>
        <p className="mb-1.5 text-xs text-gray-500">Projekte verknüpfen</p>
        {projekte.length === 0 ? (
          <p className="text-xs text-gray-400">Noch keine Projekte angelegt.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {projekte.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProjekt(p.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  projektIds.includes(p.id)
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-gray-200 bg-white text-gray-500 hover:text-gray-900"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {fehler && <p className="text-xs text-red-500">{fehler}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onAbbrechen}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-900"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          Anlegen
        </button>
      </div>
    </form>
  )
}
