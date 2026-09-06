import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  zyklusStatus,
  zyklusProjekte,
  zyklusZiele,
  zielSchritte,
  zielFortschritt,
  zielErreicht,
  zieleErreicht,
  aktualisiereZyklus,
  restText,
  laengeLabel,
  zyklusPhasen,
  aktivePhase,
  periodenWochen,
  wocheAm,
  wochenLabel,
  wochenZiele,
  unterziele,
  verknuepfungen,
  wochenFortschritt,
} from "../lib/zyklen"
import { Fortschrittsbalken } from "./Bausteine"
import { projektFortschrittWerte } from "../lib/projekte"
import PhasenZeitstrahl from "./PhasenZeitstrahl"
import ZyklenEinstellungen from "./ZyklenEinstellungen"
import Seitenkopf from "./Seitenkopf"
import LoeschKnopf from "./LoeschKnopf"
import { SEITE_RASTER } from "../lib/layout"
import { OkrFortschritt, SmartBadge, WoopSatz } from "./Zielmethoden"
import { NichtJetztListe } from "./Fuenf25"
import { nichtJetzt } from "../lib/zielmethoden"

// Eigener Bereich für die Fokus-Perioden: Übersicht über die laufende
// Periode, Wochenziele mit Unterzielen und Verknüpfungen (zu Projekten,
// Periodenzielen und Todos) sowie das Einrichten der Perioden selbst.

const TABS = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "wochen", label: "Wochenziele" },
  { key: "einrichten", label: "Einrichten" },
]

function Karte({ titel, children, aktion }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {titel}
        </p>
        {aktion}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

// Perioden für die Auswahl: laufende zuerst, dann kommende, dann vergangene.
function sortierePerioden(zyklen) {
  const rang = (z) => {
    const s = zyklusStatus(z)
    return s.aktiv ? 0 : s.bevorstehend ? 1 : 2
  }
  return [...zyklen].sort(
    (a, b) => rang(a) - rang(b) || (a.start ?? "").localeCompare(b.start ?? "")
  )
}

export default function PeriodeSeite({ onNavigate }) {
  const [zyklen, setZyklen] = useStored("zyklen", [])
  const [tab, setTab] = useState("uebersicht")
  const [gewaehlteId, setGewaehlteId] = useState(null)

  const sortiert = sortierePerioden(zyklen)
  const periode =
    sortiert.find((z) => z.id === gewaehlteId) ?? sortiert[0] ?? null

  function updatePeriode(aenderung) {
    setZyklen(
      zyklen.map((z) =>
        z.id === periode.id ? aktualisiereZyklus(z, aenderung) : z
      )
    )
  }

  return (
    <div className={SEITE_RASTER}>
      <Seitenkopf
        eyebrow="Fokus-Periode"
        titel="Periode"
        unterzeile="Ein begrenzter Zeitraum, ein Ziel – heruntergebrochen auf Wochen."
        aktion={
          sortiert.length > 1 && (
            <select
              value={periode?.id ?? ""}
              onChange={(e) => setGewaehlteId(Number(e.target.value))}
              className="max-w-full cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-gray-900"
            >
              {sortiert.map((z) => {
                const s = zyklusStatus(z)
                const zustand = s.aktiv
                  ? "läuft"
                  : s.bevorstehend
                    ? "geplant"
                    : "vorbei"
                return (
                  <option key={z.id} value={z.id}>
                    {z.titel?.trim() || "Ohne Titel"} · {zustand}
                  </option>
                )
              })}
            </select>
          )
        }
      />

      <nav className="-mt-4 mb-6 flex gap-5 overflow-x-auto border-b border-gray-200 sm:gap-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-2 text-sm transition-colors ${
              tab === t.key
                ? "border-gray-900 font-medium text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "einrichten" ? (
        <ZyklenEinstellungen />
      ) : !periode ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            Noch keine Periode angelegt.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Eine Periode ist ein begrenzter Zeitraum (14/30/90 Tage, Halbjahr,
            Jahr) mit einem Ziel – der Rest hängt sich daran auf.
          </p>
          <button
            onClick={() => setTab("einrichten")}
            className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Periode einrichten
          </button>
        </div>
      ) : tab === "uebersicht" ? (
        <Uebersicht
          periode={periode}
          onUpdate={updatePeriode}
          onNavigate={onNavigate}
          onZuWochen={() => setTab("wochen")}
        />
      ) : (
        <Wochenziele
          periode={periode}
          onUpdate={updatePeriode}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}

// ── Übersicht ──────────────────────────────────────────────────────────────

function Uebersicht({ periode, onUpdate, onNavigate, onZuWochen }) {
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])
  const status = zyklusStatus(periode)
  const ziele = zieleErreicht(periode)
  const phasen = zyklusPhasen(periode)
  const laufendePhase = aktivePhase(periode)
  const wochen = periodenWochen(periode)
  const dieseWoche = wocheAm(periode)
  const wochenziel = dieseWoche
    ? wochenZiele(periode).find((w) => w.start === dieseWoche.start)
    : null

  const projektZiele = zyklusProjekte(periode)
  const eigeneZiele = zyklusZiele(periode)

  function toggleProjektziel(projektId) {
    onUpdate({
      projekte: projektZiele.map((e) =>
        e.projektId === projektId ? { ...e, erledigt: !e.erledigt } : e
      ),
    })
  }

  function toggleSchritt(zielId, schrittId) {
    onUpdate({
      ziele: eigeneZiele.map((z) =>
        z.id === zielId
          ? {
              ...z,
              schritte: zielSchritte(z).map((s) =>
                s.id === schrittId ? { ...s, erledigt: !s.erledigt } : s
              ),
            }
          : z
      ),
    })
  }

  const datum = (d) => new Date(d).toLocaleDateString("de-DE")

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-medium text-gray-900">
              {periode.titel?.trim() || "Ohne Titel"}
            </h2>
            {periode.ziel && (
              <p className="mt-1 font-serif text-[15px] italic text-gray-500">
                {periode.ziel}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {datum(periode.start)} – {datum(periode.ende)} ·{" "}
              {laengeLabel(periode.laenge)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              status.aktiv
                ? "bg-emerald-50 text-emerald-700"
                : status.bevorstehend
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            {status.aktiv
              ? restText(status.tageUebrig)
              : status.bevorstehend
                ? `startet in ${status.tageBisStart} Tagen`
                : "abgeschlossen"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Zeit
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{ width: `${status.prozentZeit}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Tag {status.verstrichen} von {status.tageGesamt} ·{" "}
              {status.prozentZeit}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Ziele
            </p>
            <Fortschrittsbalken
              erledigt={ziele.erreicht}
              gesamt={ziele.gesamt}
            />
            <p className="mt-1.5 text-xs text-gray-400">
              {wochen.length} {wochen.length === 1 ? "Woche" : "Wochen"} ·{" "}
              {phasen.length > 0
                ? `${phasen.length} Zwischenphasen`
                : "keine Zwischenphasen"}
            </p>
          </div>
        </div>

        {phasen.length > 0 && (
          <div className="mt-4">
            <PhasenZeitstrahl zyklus={periode} />
            {laufendePhase && (
              <p className="mt-2 text-xs text-gray-400">
                Gerade: {laufendePhase.phase.titel?.trim() || "Zwischenphase"} (
                {laufendePhase.nummer} von {laufendePhase.gesamt})
              </p>
            )}
          </div>
        )}
      </section>

      <Karte
        titel="Diese Woche"
        aktion={
          <button
            onClick={onZuWochen}
            className="text-xs text-gray-400 hover:text-gray-900"
          >
            Wochenziele →
          </button>
        }
      >
        {!dieseWoche ? (
          <p className="text-sm text-gray-400">
            Heute liegt außerhalb dieser Periode.
          </p>
        ) : (
          <div>
            <p className="text-xs text-gray-400">
              Woche {dieseWoche.nummer} von {wochen.length} ·{" "}
              {wochenLabel(dieseWoche)}
            </p>
            <p
              className={`mt-1 text-[15px] ${
                wochenziel?.text?.trim()
                  ? "text-gray-900"
                  : "text-gray-300"
              }`}
            >
              {wochenziel?.text?.trim() || "Noch kein Wochenziel gesetzt."}
            </p>
            {wochenziel && unterziele(wochenziel).length > 0 && (
              <div className="mt-3 max-w-xs">
                <Fortschrittsbalken {...wochenFortschritt(wochenziel)} />
              </div>
            )}
          </div>
        )}
      </Karte>

      <Karte titel="Verknüpfte Projekte">
        {projektZiele.length === 0 ? (
          <p className="text-sm text-gray-400">
            Keine Projekte verknüpft – unter „Einrichten“ zuordnen.
          </p>
        ) : (
          <ul className="space-y-2">
            {projektZiele.map((e) => {
              const projekt = projekte.find((p) => p.id === e.projektId)
              if (!projekt) return null
              return (
                <li
                  key={e.projektId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={!!e.erledigt}
                    onChange={() => toggleProjektziel(e.projektId)}
                    title="Periodenziel erreicht"
                    className="h-4 w-4 accent-gray-900"
                  />
                  <button
                    onClick={() => onNavigate?.("projekte", projekt.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={`truncate text-sm font-medium ${
                        e.erledigt
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {projekt.name}
                    </p>
                    {e.ziel && (
                      <p className="truncate text-xs text-gray-400">{e.ziel}</p>
                    )}
                  </button>
                  <div className="w-32 shrink-0">
                    <Fortschrittsbalken
                      {...projektFortschrittWerte(projekt, todos)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Karte>

      {nichtJetzt(periode).length > 0 && (
        <Karte titel="Nicht jetzt">
          <NichtJetztListe eintraege={nichtJetzt(periode)} ohneKopf />
        </Karte>
      )}

      <Karte titel="Eigene Ziele">
        {eigeneZiele.length === 0 ? (
          <p className="text-sm text-gray-400">
            Keine eigenen Ziele – unter „Einrichten“ anlegen.
          </p>
        ) : (
          <ul className="space-y-3">
            {eigeneZiele.map((z) => {
              const fortschritt = zielFortschritt(z)
              return (
                <li key={z.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        zielErreicht(z)
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {z.text || "Ohne Titel"}
                    </span>
                    {z.methode === "smart" && (
                      <span className="ml-auto">
                        <SmartBadge ziel={z} />
                      </span>
                    )}
                    <span
                      className={`text-xs text-gray-400 ${
                        z.methode === "smart" ? "" : "ml-auto"
                      }`}
                    >
                      {fortschritt.erledigt}/{fortschritt.gesamt}
                    </span>
                  </div>
                  {/* Was die gewählte Methode beisteuert: bei OKR der
                      gemessene Fortschritt, bei WOOP der Wenn-dann-Satz. */}
                  {z.methode === "okr" && (
                    <div className="mt-2">
                      <OkrFortschritt ziel={z} />
                    </div>
                  )}
                  {z.methode === "woop" && <WoopSatz ziel={z} />}
                  {zielSchritte(z).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {zielSchritte(z).map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!s.erledigt}
                            onChange={() => toggleSchritt(z.id, s.id)}
                            className="h-3.5 w-3.5 accent-gray-900"
                          />
                          <span
                            className={`text-sm ${
                              s.erledigt
                                ? "text-gray-400 line-through"
                                : "text-gray-700"
                            }`}
                          >
                            {s.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>
    </div>
  )
}

// ── Wochenziele ────────────────────────────────────────────────────────────

function Wochenziele({ periode, onUpdate, onNavigate }) {
  const wochen = periodenWochen(periode)
  const dieseWoche = wocheAm(periode)
  const [offen, setOffen] = useState(
    dieseWoche?.start ?? wochen[0]?.start ?? null
  )
  const eintraege = wochenZiele(periode)

  // Schreibt eine Woche zurück; existiert noch keine, wird sie angelegt.
  function setWoche(start, patch) {
    const vorhanden = eintraege.some((w) => w.start === start)
    const neu = vorhanden
      ? eintraege.map((w) => (w.start === start ? { ...w, ...patch } : w))
      : [
          ...eintraege,
          { start, text: "", unterziele: [], verknuepfungen: [], ...patch },
        ]
    onUpdate({ wochen: neu })
  }

  if (wochen.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Diese Periode hat keinen gültigen Zeitraum.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {wochen.map((w) => {
        const eintrag = eintraege.find((e) => e.start === w.start) ?? null
        const istOffen = offen === w.start
        const istJetzt = dieseWoche?.start === w.start
        const fortschritt = wochenFortschritt(eintrag)
        return (
          <section
            key={w.start}
            className={`overflow-hidden rounded-xl border bg-white ${
              istJetzt ? "border-gray-900" : "border-gray-200"
            }`}
          >
            <button
              onClick={() => setOffen(istOffen ? null : w.start)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <span className="w-24 shrink-0 text-xs text-gray-400">
                Woche {w.nummer}
                {istJetzt && (
                  <span className="ml-1 font-medium text-gray-900">· jetzt</span>
                )}
              </span>
              <span className="hidden w-24 shrink-0 text-xs text-gray-300 sm:block">
                {wochenLabel(w)}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  eintrag?.text?.trim() ? "text-gray-900" : "text-gray-300"
                }`}
              >
                {eintrag?.text?.trim() || "Kein Wochenziel"}
              </span>
              {fortschritt.gesamt > 0 && (
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {fortschritt.erledigt}/{fortschritt.gesamt}
                </span>
              )}
              <span className="shrink-0 text-xs text-gray-300">
                {istOffen ? "▲" : "▼"}
              </span>
            </button>

            {istOffen && (
              <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    Wochenziel
                    <input
                      value={eintrag?.text ?? ""}
                      onChange={(e) => setWoche(w.start, { text: e.target.value })}
                      placeholder="Das eine Ziel dieser Woche"
                      className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
                    />
                  </label>
                  <div className="mt-1.5 flex justify-end">
                    <Einplanen
                      titel={eintrag?.text ?? ""}
                      wochenStart={w.vonTag}
                      wochenEnde={w.bisTag}
                      terminId={eintrag?.terminId ?? null}
                      onGeplant={(terminId) => setWoche(w.start, { terminId })}
                    />
                  </div>
                </div>

                <Unterziele
                  woche={eintrag}
                  onChange={(liste) => setWoche(w.start, { unterziele: liste })}
                  wochenStart={w.vonTag}
                  wochenEnde={w.bisTag}
                />

                <Verknuepfungen
                  periode={periode}
                  woche={eintrag}
                  onChange={(liste) =>
                    setWoche(w.start, { verknuepfungen: liste })
                  }
                  onNavigate={onNavigate}
                />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// Ein Ziel in den Kalender legen: aus einem Vorhaben wird Zeit. Erzeugt
// einen Fokus-Termin im Store `termine` und merkt sich seine ID am Ziel,
// damit man sieht, dass (und wann) es eingeplant ist.
function Einplanen({ titel, wochenStart, wochenEnde, terminId, onGeplant }) {
  const [termine, setTermine] = useStored("termine", [])
  const [offen, setOffen] = useState(false)
  const heuteKey = heute()
  const vorschlag =
    heuteKey >= wochenStart && heuteKey <= wochenEnde ? heuteKey : wochenStart
  const [datum, setDatum] = useState(vorschlag)
  const [zeit, setZeit] = useState("09:00")
  const [dauer, setDauer] = useState("60")

  const termin = termine.find((t) => t.id === terminId)

  if (termin) {
    const tag = new Date(termin.datum).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
        📅 {tag}
        {termin.zeit ? ` ${termin.zeit}` : ""}
        <button
          onClick={() => {
            setTermine(termine.filter((t) => t.id !== termin.id))
            onGeplant(null)
          }}
          title="Termin wieder entfernen"
          className="rounded-sm px-0.5 text-violet-400 hover:text-violet-900"
        >
          ×
        </button>
      </span>
    )
  }

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        title="In den Kalender legen"
        disabled={!titel?.trim()}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        📅 Einplanen
      </button>
    )
  }

  function speichern(e) {
    e.preventDefault()
    const id = Date.now()
    setTermine([
      ...termine,
      {
        id,
        titel: titel.trim(),
        datum,
        zeit,
        endeZeit: "",
        dauer: Number(dauer) || 60,
        fokus: true,
        projektId: null,
        ganztags: false,
        art: "",
        wiederholung: "",
        bis: "",
        blockId: null,
      },
    ])
    onGeplant(id)
    setOffen(false)
  }

  return (
    <form
      onSubmit={speichern}
      className="flex shrink-0 flex-wrap items-center gap-1"
    >
      <input
        type="date"
        value={datum}
        min={wochenStart}
        max={wochenEnde}
        onChange={(e) => setDatum(e.target.value)}
        className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
      />
      <input
        type="time"
        value={zeit}
        onChange={(e) => setZeit(e.target.value)}
        className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
      />
      <input
        type="number"
        min="15"
        step="15"
        value={dauer}
        onChange={(e) => setDauer(e.target.value)}
        title="Dauer in Minuten"
        className="w-14 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-gray-700"
      >
        In den Kalender
      </button>
      <button
        type="button"
        onClick={() => setOffen(false)}
        className="px-1 text-xs text-gray-400 hover:text-gray-900"
      >
        Abbrechen
      </button>
    </form>
  )
}

function Unterziele({ woche, onChange, wochenStart, wochenEnde }) {
  const [text, setText] = useState("")
  const liste = unterziele(woche)

  function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    onChange([
      ...liste,
      { id: Date.now(), text: text.trim(), erledigt: false },
    ])
    setText("")
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Unterziele
      </p>
      {liste.length > 0 && (
        <ul className="mt-2 space-y-1">
          {liste.map((u) => (
            <li key={u.id} className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!u.erledigt}
                onChange={() =>
                  onChange(
                    liste.map((x) =>
                      x.id === u.id ? { ...x, erledigt: !x.erledigt } : x
                    )
                  )
                }
                className="h-4 w-4 accent-gray-900"
              />
              <input
                value={u.text}
                onChange={(e) =>
                  onChange(
                    liste.map((x) =>
                      x.id === u.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                className={`min-w-0 flex-1 border-none bg-transparent text-sm outline-none ${
                  u.erledigt ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              />
              <Einplanen
                titel={u.text}
                wochenStart={wochenStart}
                wochenEnde={wochenEnde}
                terminId={u.terminId ?? null}
                onGeplant={(terminId) =>
                  onChange(
                    liste.map((x) => (x.id === u.id ? { ...x, terminId } : x))
                  )
                }
              />
              <LoeschKnopf
                onLoeschen={() => onChange(liste.filter((x) => x.id !== u.id))}
                titel="Unterziel löschen"
                klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
              />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Unterziel hinzufügen"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </form>
    </div>
  )
}

// Verknüpfungen einer Woche: Projekt, Periodenziel oder Todo. Gespeichert
// wird nur der Verweis ({ typ, ziel }) – Titel und Zustand kommen live aus
// der jeweiligen Quelle, damit nichts doppelt gepflegt werden muss.
function Verknuepfungen({ periode, woche, onChange, onNavigate }) {
  const [projekte] = useStored("projekte", [])
  const [todos, setTodos] = useStored("todos", [])
  const [wahl, setWahl] = useState("")
  const liste = verknuepfungen(woche)

  const optionen = [
    ...zyklusProjekte(periode)
      .map((e) => projekte.find((p) => p.id === e.projektId))
      .filter(Boolean)
      .map((p) => ({
        wert: `projekt:${p.id}`,
        label: `Projekt · ${p.name}`,
      })),
    ...projekte
      .filter(
        (p) =>
          !p.archiviert &&
          !zyklusProjekte(periode).some((e) => e.projektId === p.id)
      )
      .map((p) => ({ wert: `projekt:${p.id}`, label: `Projekt · ${p.name}` })),
    ...zyklusZiele(periode).map((z) => ({
      wert: `ziel:${z.id}`,
      label: `Periodenziel · ${z.text || "Ohne Titel"}`,
    })),
    ...todos
      .filter((t) => !t.erledigt)
      .slice(0, 60)
      .map((t) => ({ wert: `todo:${t.id}`, label: `Todo · ${t.text}` })),
  ].filter((o) => !liste.some((v) => `${v.typ}:${v.ziel}` === o.wert))

  function add(wert) {
    if (!wert) return
    const [typ, id] = wert.split(":")
    onChange([...liste, { id: Date.now(), typ, ziel: Number(id) }])
    setWahl("")
  }

  // Anzeige einer Verknüpfung: Titel plus Aktion (öffnen bzw. abhaken).
  function beschreibe(v) {
    if (v.typ === "projekt") {
      const p = projekte.find((x) => x.id === v.ziel)
      return p
        ? { label: p.name, hinweis: "Projekt", oeffnen: () => onNavigate?.("projekte", p.id) }
        : null
    }
    if (v.typ === "ziel") {
      const z = zyklusZiele(periode).find((x) => x.id === v.ziel)
      return z
        ? { label: z.text || "Ohne Titel", hinweis: "Periodenziel", erledigt: zielErreicht(z) }
        : null
    }
    const t = todos.find((x) => x.id === v.ziel)
    return t
      ? {
          label: t.text,
          hinweis: "Todo",
          erledigt: !!t.erledigt,
          toggle: () =>
            setTodos(
              todos.map((x) =>
                x.id === t.id ? { ...x, erledigt: !x.erledigt } : x
              )
            ),
        }
      : null
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Verknüpfungen
      </p>
      {liste.length > 0 && (
        <ul className="mt-2 space-y-1">
          {liste.map((v) => {
            const info = beschreibe(v)
            return (
              <li
                key={v.id}
                className="group flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5"
              >
                <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {info?.hinweis ?? "Fehlt"}
                </span>
                {info?.toggle && (
                  <input
                    type="checkbox"
                    checked={!!info.erledigt}
                    onChange={info.toggle}
                    className="h-3.5 w-3.5 accent-gray-900"
                  />
                )}
                {info?.oeffnen ? (
                  <button
                    onClick={info.oeffnen}
                    className="min-w-0 flex-1 truncate text-left text-sm text-gray-800 underline decoration-gray-200 underline-offset-4 hover:text-gray-900"
                  >
                    {info.label}
                  </button>
                ) : (
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      info?.erledigt
                        ? "text-gray-400 line-through"
                        : info
                          ? "text-gray-800"
                          : "text-gray-300"
                    }`}
                  >
                    {info?.label ?? "Verknüpftes Element gibt es nicht mehr"}
                  </span>
                )}
                <LoeschKnopf
                  onLoeschen={() =>
                    onChange(liste.filter((x) => x.id !== v.id))
                  }
                  titel="Verknüpfung entfernen"
                  frageText="Entfernen?"
                  klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                />
              </li>
            )
          })}
        </ul>
      )}
      <select
        value={wahl}
        onChange={(e) => add(e.target.value)}
        className="mt-2 w-full cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 outline-none focus:border-gray-900"
      >
        <option value="">+ Verknüpfung hinzufügen …</option>
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
