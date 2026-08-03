import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  ZYKLUS_LAENGEN,
  berechneEnde,
  laengeLabel,
  zyklusStatus,
  zyklusProjekte,
  zyklusZiele,
  zielSchritte,
  zielFortschritt,
  aktualisiereZyklus,
  zieleErreicht,
  restText,
  zyklusPhasen,
  phaseStatus,
  naechsterTag,
} from "../lib/zyklen"

// Verwaltung der Fokus-Perioden (Zyklen) in den Einstellungen: anlegen,
// Titel/Ziel bearbeiten, Projekte mit je eigenem Periodenziel verknüpfen und
// löschen. Die Anzeige auf dem Dashboard übernimmt ZyklusWidget.
export default function ZyklenEinstellungen() {
  const [zyklen, setZyklen] = useStored("zyklen", [])
  const [projekte] = useStored("projekte", [])
  const [formOffen, setFormOffen] = useState(false)

  const aktiveProjekte = projekte.filter((p) => !p.archiviert)
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

// Wiederverwendbare Liste „Projekt + eigenes Periodenziel". Wird beim Anlegen
// und beim Bearbeiten genutzt. eintraege = [{ projektId, ziel, erledigt }].
// mitErledigt blendet die Erreicht-Checkbox ein (nur beim Bearbeiten sinnvoll).
function ProjektZiele({ eintraege, alleProjekte, onChange, mitErledigt = false }) {
  const verknuepft = new Set(eintraege.map((e) => e.projektId))
  const verfuegbar = alleProjekte.filter((p) => !verknuepft.has(p.id))
  const name = (pid) => alleProjekte.find((p) => p.id === pid)?.name ?? "Projekt"

  function setZiel(pid, ziel) {
    onChange(eintraege.map((e) => (e.projektId === pid ? { ...e, ziel } : e)))
  }
  function toggleErledigt(pid) {
    onChange(
      eintraege.map((e) =>
        e.projektId === pid ? { ...e, erledigt: !e.erledigt } : e
      )
    )
  }
  function entferne(pid) {
    onChange(eintraege.filter((e) => e.projektId !== pid))
  }
  function fuegeHinzu(pid) {
    if (!pid) return
    onChange([
      ...eintraege,
      { projektId: Number(pid), ziel: "", erledigt: false },
    ])
  }

  return (
    <div className="space-y-2">
      {eintraege.map((e) => (
        <div
          key={e.projektId}
          className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
        >
          <div className="flex items-center gap-2">
            {mitErledigt && (
              <input
                type="checkbox"
                checked={!!e.erledigt}
                onChange={() => toggleErledigt(e.projektId)}
                title="Ziel erreicht"
                className="h-4 w-4 shrink-0 accent-gray-900"
              />
            )}
            <span
              className={`min-w-0 flex-1 truncate text-sm font-medium ${
                e.erledigt ? "text-gray-400 line-through" : "text-gray-800"
              }`}
            >
              {name(e.projektId)}
            </span>
            <button
              type="button"
              onClick={() => entferne(e.projektId)}
              title="Projekt entfernen"
              className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
            >
              ×
            </button>
          </div>
          <input
            value={e.ziel}
            onChange={(ev) => setZiel(e.projektId, ev.target.value)}
            placeholder="Konkretes Ziel für dieses Projekt in dieser Periode…"
            className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent-400 placeholder:text-gray-300"
          />
        </div>
      ))}

      {verfuegbar.length > 0 ? (
        <select
          value=""
          onChange={(ev) => fuegeHinzu(ev.target.value)}
          className="w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 outline-none transition-colors focus:border-accent-400"
        >
          <option value="">+ Projekt verknüpfen …</option>
          {verfuegbar.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        eintraege.length === 0 && (
          <p className="text-xs text-gray-400">Noch keine Projekte angelegt.</p>
        )
      )}
    </div>
  )
}

// Eigene, projektunabhängige Ziele einer Periode. Jedes Ziel ist ein Feld,
// das man aufklappt und in dem man konkrete Teilschritte abhakt (wie ein
// Mini-Projekt für Vorhaben ohne eigenes Projekt).
// ziele = [{ id, text, schritte: [{ id, text, erledigt }] }].
function EigeneZiele({ ziele, onChange }) {
  const [entwurf, setEntwurf] = useState("")
  const [offenId, setOffenId] = useState(null)

  const neueId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  function hinzufuegen() {
    const t = entwurf.trim()
    if (!t) return
    const id = neueId()
    onChange([...ziele, { id, text: t, schritte: [] }])
    setEntwurf("")
    setOffenId(id)
  }
  function setZiel(id, patch) {
    onChange(ziele.map((z) => (z.id === id ? { ...z, ...patch } : z)))
  }
  function entferne(id) {
    onChange(ziele.filter((z) => z.id !== id))
  }
  function setSchritte(id, schritte) {
    setZiel(id, { schritte })
  }

  return (
    <div className="space-y-2">
      {ziele.map((z) => {
        const schritte = zielSchritte(z)
        const { erledigt, gesamt } = zielFortschritt(z)
        const fertig = gesamt > 0 && erledigt === gesamt
        const offen = offenId === z.id
        return (
          <div
            key={z.id}
            className="rounded-lg border border-gray-200 bg-gray-50"
          >
            <div className="flex items-center gap-2 p-2.5">
              <button
                type="button"
                onClick={() => setOffenId(offen ? null : z.id)}
                title={offen ? "Zuklappen" : "Aufklappen"}
                className={`shrink-0 text-gray-400 transition-transform hover:text-gray-700 ${offen ? "rotate-90" : ""}`}
              >
                ▸
              </button>
              <input
                value={z.text}
                onChange={(e) => setZiel(z.id, { text: e.target.value })}
                placeholder="Zieltitel…"
                className={`min-w-0 flex-1 border-none bg-transparent text-sm font-medium outline-none placeholder:text-gray-300 ${
                  fertig ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              />
              {gesamt > 0 && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    fertig
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {erledigt}/{gesamt}
                </span>
              )}
              <button
                type="button"
                onClick={() => entferne(z.id)}
                title="Ziel entfernen"
                className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
              >
                ×
              </button>
            </div>

            {offen && (
              <div className="border-t border-gray-200 px-2.5 pb-2.5 pt-2">
                <ZielSchritte
                  schritte={schritte}
                  onChange={(neu) => setSchritte(z.id, neu)}
                  neueId={neueId}
                />
              </div>
            )}
          </div>
        )
      })}

      <div className="flex gap-2">
        <input
          value={entwurf}
          onChange={(e) => setEntwurf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              hinzufuegen()
            }
          }}
          placeholder="Neues Ziel, z.B. Fit werden"
          className="min-w-0 flex-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-accent-400 placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={hinzufuegen}
          className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  )
}

// Teilschritte eines Ziels: abhaken, umbenennen, entfernen, hinzufügen.
function ZielSchritte({ schritte, onChange, neueId }) {
  const [entwurf, setEntwurf] = useState("")

  function add() {
    const t = entwurf.trim()
    if (!t) return
    onChange([...schritte, { id: neueId(), text: t, erledigt: false }])
    setEntwurf("")
  }
  function toggle(id) {
    onChange(
      schritte.map((s) => (s.id === id ? { ...s, erledigt: !s.erledigt } : s))
    )
  }
  function setText(id, text) {
    onChange(schritte.map((s) => (s.id === id ? { ...s, text } : s)))
  }
  function entferne(id) {
    onChange(schritte.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-1.5">
      {schritte.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!s.erledigt}
            onChange={() => toggle(s.id)}
            className="h-4 w-4 shrink-0 accent-gray-900"
          />
          <input
            value={s.text}
            onChange={(e) => setText(s.id, e.target.value)}
            placeholder="Teilschritt…"
            className={`min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-gray-300 ${
              s.erledigt ? "text-gray-400 line-through" : "text-gray-700"
            }`}
          />
          <button
            type="button"
            onClick={() => entferne(s.id)}
            title="Teilschritt entfernen"
            className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}
      <input
        value={entwurf}
        onChange={(e) => setEntwurf(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add()
          }
        }}
        placeholder="+ Teilschritt, z.B. 3x pro Woche laufen"
        className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-accent-400 placeholder:text-gray-400"
      />
    </div>
  )
}

// Zwischenphasen („Aufteilungen") einer Periode: die Gesamtperiode in
// aufeinanderfolgende Abschnitte gliedern (z.B. Vorbereitung / Umsetzung /
// Abschluss oder Sprint 1–3). Jede Phase hat Titel und eigenen Zeitraum.
// Neue Phasen schließen automatisch an die vorige an und bleiben innerhalb
// des Periodenzeitraums (start/ende) begrenzt.
// phasen = [{ id, titel, start, ende }].
function Zwischenphasen({ phasen, start, ende, onChange }) {
  const neueId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Reihenfolge in der Anzeige nach Start – so wandern Phasen beim Datieren
  // an ihren richtigen Platz.
  const sortiert = [...phasen].sort((a, b) =>
    (a.start ?? "").localeCompare(b.start ?? "")
  )

  function hinzufuegen() {
    // Beginn = Tag nach dem Ende der spätesten Phase, sonst Periodenstart.
    const letzte = sortiert[sortiert.length - 1]
    const beginn = letzte?.ende ? naechsterTag(letzte.ende) : start || ""
    onChange([
      ...phasen,
      {
        id: neueId(),
        titel: "",
        start: beginn && ende && beginn > ende ? ende : beginn,
        ende: ende || "",
      },
    ])
  }
  function setPhase(id, patch) {
    onChange(phasen.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function entferne(id) {
    onChange(phasen.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-2">
      {sortiert.map((p) => {
        const s = p.start && p.ende ? phaseStatus(p) : null
        return (
          <div
            key={p.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                title={
                  s?.aktiv
                    ? "Läuft gerade"
                    : s?.vorbei
                      ? "Abgeschlossen"
                      : "Bevorstehend"
                }
                className={`h-2 w-2 shrink-0 rounded-full ${
                  s?.aktiv
                    ? "bg-emerald-500"
                    : s?.vorbei
                      ? "bg-gray-300"
                      : "bg-blue-400"
                }`}
              />
              <input
                value={p.titel}
                onChange={(e) => setPhase(p.id, { titel: e.target.value })}
                placeholder="Phasentitel, z.B. Umsetzung"
                className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={() => entferne(p.id)}
                title="Zwischenphase entfernen"
                className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
              >
                ×
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={p.start ?? ""}
                min={start || undefined}
                max={p.ende || ende || undefined}
                onChange={(e) => setPhase(p.id, { start: e.target.value })}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none transition-colors focus:border-accent-400"
              />
              <span className="text-xs text-gray-300">–</span>
              <input
                type="date"
                value={p.ende ?? ""}
                min={p.start || start || undefined}
                max={ende || undefined}
                onChange={(e) => setPhase(p.id, { ende: e.target.value })}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none transition-colors focus:border-accent-400"
              />
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={hinzufuegen}
        className="w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 outline-none transition-colors hover:border-accent-400 hover:text-gray-800"
      >
        + Zwischenphase
      </button>
    </div>
  )
}

// Bestehende Periode: Titel & Ziel inline editierbar, Projekte mit eigenen
// Periodenzielen verwaltbar. Länge/Start/Ende sind Anlege-Werte und werden
// hier nicht verändert (bei Bedarf löschen und neu anlegen).
function ZyklusKarte({ zyklus, projekte, onUpdate, onRemove }) {
  const s = zyklusStatus(zyklus)
  const eintraege = zyklusProjekte(zyklus)
  const ziele = zieleErreicht(zyklus)

  const badge = s.aktiv
    ? { text: `Aktiv · ${restText(s.tageUebrig)}`, stil: "bg-emerald-50 text-emerald-700" }
    : s.bevorstehend
      ? { text: `Startet in ${s.tageBisStart} Tagen`, stil: "bg-blue-50 text-blue-700" }
      : { text: "Abgeschlossen", stil: "bg-gray-100 text-gray-500" }

  // Jede Änderung persistiert die Periode in der aktuellen Datenstruktur.
  const patch = (aenderung) => onUpdate(aktualisiereZyklus(zyklus, aenderung))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100">
      <div className="flex items-start justify-between gap-3">
        <input
          value={zyklus.titel}
          onChange={(e) => patch({ titel: e.target.value })}
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
        {ziele.gesamt > 0 && (
          <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-gray-500">
            {ziele.erreicht}/{ziele.gesamt} Ziele
          </span>
        )}
      </div>

      <textarea
        value={zyklus.ziel ?? ""}
        onChange={(e) => patch({ ziel: e.target.value })}
        placeholder="Übergeordnetes Ziel dieser Periode – woran misst du den Erfolg?"
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent-400 focus:bg-white placeholder:text-gray-300"
      />

      <p className="mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Projekte & ihre Periodenziele
      </p>
      <ProjektZiele
        eintraege={eintraege}
        alleProjekte={projekte}
        onChange={(neu) => patch({ projekte: neu })}
        mitErledigt
      />

      <p className="mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Eigene Ziele
      </p>
      <EigeneZiele
        ziele={zyklusZiele(zyklus)}
        onChange={(neu) => patch({ ziele: neu })}
      />

      <p className="mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Zwischenphasen
      </p>
      <Zwischenphasen
        phasen={zyklusPhasen(zyklus)}
        start={zyklus.start}
        ende={zyklus.ende}
        onChange={(neu) => patch({ phasen: neu })}
      />
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
  const [projektZiele, setProjektZiele] = useState([])
  const [eigeneZiele, setEigeneZiele] = useState([])
  const [phasen, setPhasen] = useState([])
  const [fehler, setFehler] = useState("")

  const istCustom = laenge === "custom"
  // Voraussichtliches Ende – begrenzt die Datumsfelder der Zwischenphasen.
  const endVorschau = istCustom ? ende : berechneEnde(start, laenge)

  function speichern(e) {
    e.preventDefault()
    if (!titel.trim()) return setFehler("Bitte gib der Periode einen Titel.")
    if (!start) return setFehler("Bitte wähle ein Startdatum.")
    const endDatum = istCustom ? ende : berechneEnde(start, laenge)
    if (!endDatum) return setFehler("Bitte wähle ein Enddatum.")
    if (endDatum < start) return setFehler("Das Enddatum liegt vor dem Start.")
    onSpeichern({
      id: Date.now(),
      titel: titel.trim(),
      ziel: ziel.trim(),
      laenge,
      start,
      ende: endDatum,
      projekte: projektZiele,
      ziele: eigeneZiele,
      phasen,
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
        placeholder="Übergeordnetes Ziel dieser Periode – woran misst du den Erfolg?"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent-400 focus:bg-white placeholder:text-gray-300"
      />

      <div>
        <p className="mb-1.5 text-xs text-gray-500">
          Projekte & ihre Periodenziele
        </p>
        <ProjektZiele
          eintraege={projektZiele}
          alleProjekte={projekte}
          onChange={setProjektZiele}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs text-gray-500">Eigene Ziele</p>
        <EigeneZiele ziele={eigeneZiele} onChange={setEigeneZiele} />
      </div>

      <div>
        <p className="mb-1.5 text-xs text-gray-500">Zwischenphasen</p>
        <Zwischenphasen
          phasen={phasen}
          start={start}
          ende={endVorschau}
          onChange={setPhasen}
        />
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
