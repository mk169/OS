import { useState } from "react"
import useStored from "../lib/useStored"
import { heute, tageBis, tageBisZahl } from "../lib/datum"
import { EINTEILUNGEN } from "../lib/todos"
import { lockedInAktiv } from "../lib/lockedin"
import TodoErstellen from "./TodoErstellen"
import {
  useHabitDaten,
  nutzeHabitToggle,
  disziplinAmTag,
} from "../lib/habits"

// Locked In ist ein scharf geschalteter Fokus-Modus: Man definiert ein Ziel
// mit Phase (wie ein Projekt) und den regelmäßigen Aufgaben dafür (Habits) und
// sieht dann nur das quantitativ Relevanteste. Welche Bereiche erscheinen, ist
// einstellbar.
const BEREICH_LISTE = [
  { key: "auftrag", label: "Auftrag heute" },
  { key: "disziplin", label: "Disziplin" },
  { key: "fokus", label: "Fokus" },
  { key: "fristen", label: "Ziele & Fristen" },
]

const STANDARD_CONFIG = {
  aktiv: false,
  ziel: "",
  phaseStart: "",
  phaseEnde: "",
  habitIds: [],
  bereiche: { auftrag: true, disziplin: true, fokus: true, fristen: true },
  fokusZiel: 90,
}

const FOKUS_OPTIONEN = [30, 60, 90, 120]

function istAuftrag(t) {
  return t.wichtig || t.dringend || (t.datum && t.datum <= heute())
}
function eisenhowerRang(t) {
  const i = EINTEILUNGEN.findIndex((g) => g.passt(t))
  return i === -1 ? EINTEILUNGEN.length : i
}
function phaseFortschritt(start, ende) {
  if (!start || !ende) return null
  const s = new Date(start).getTime()
  const e = new Date(ende).getTime()
  const gesamt = e - s
  if (gesamt <= 0) return null
  return Math.max(0, Math.min(100, Math.round(((Date.now() - s) / gesamt) * 100)))
}

// ──────────────────────────────────────────────────────────────
// Setup: Ziel, Phase, Habits und sichtbare Bereiche festlegen
// ──────────────────────────────────────────────────────────────

function LockedInSetup({ initial, habits, onSave, onCancel }) {
  const [ziel, setZiel] = useState(initial.ziel ?? "")
  const [phaseEnde, setPhaseEnde] = useState(initial.phaseEnde ?? "")
  const [fokusZiel, setFokusZiel] = useState(initial.fokusZiel ?? 90)
  const [habitIds, setHabitIds] = useState(initial.habitIds ?? [])
  const [bereiche, setBereiche] = useState(
    initial.bereiche ?? STANDARD_CONFIG.bereiche
  )

  function toggleHabit(id) {
    setHabitIds((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id]
    )
  }
  function toggleBereich(key) {
    setBereiche((b) => ({ ...b, [key]: !b[key] }))
  }
  function speichern() {
    if (!ziel.trim()) return
    // Eine bereits abgelaufene Phase würde den Modus sofort wieder
    // ausschalten – dann lieber ohne Enddatum starten.
    const phaseGueltig = phaseEnde && phaseEnde >= heute() ? phaseEnde : ""
    onSave({
      aktiv: true,
      ziel: ziel.trim(),
      phaseEnde: phaseGueltig,
      phaseStart: heute(),
      fokusZiel,
      habitIds,
      bereiche,
    })
  }

  const feldKlasse =
    "mt-2 w-full border border-white/20 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/60"

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
            Locked&nbsp;In
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
            >
              Abbrechen
            </button>
          )}
        </div>

        <h2 className="mt-8 text-3xl font-bold uppercase tracking-tight text-white">
          Fokus scharf&nbsp;schalten.
        </h2>
        <p className="mt-3 text-sm text-white/50">
          Definiere ein Ziel mit Phase. Im Modus siehst du nur das, was dafür
          zählt.
        </p>

        {/* Ziel */}
        <label className="mt-7 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Ziel
          </span>
          <input
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
            placeholder="z.B. Produkt-Launch, Prüfungsphase…"
            autoFocus
            className={feldKlasse}
          />
        </label>

        {/* Phase bis */}
        <label className="mt-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Phase bis
          </span>
          <input
            type="date"
            value={phaseEnde}
            onChange={(e) => setPhaseEnde(e.target.value)}
            className={`${feldKlasse} [color-scheme:dark]`}
          />
        </label>

        {/* Fokus-Tagesziel */}
        <div className="mt-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Fokus-Tagesziel
          </span>
          <div className="mt-2 flex gap-2">
            {FOKUS_OPTIONEN.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFokusZiel(m)}
                className={`flex-1 border px-2 py-2 text-sm tabular-nums transition-colors ${
                  fokusZiel === m
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/60 hover:border-white/50"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Relevante Habits */}
        {habits.length > 0 && (
          <div className="mt-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
              Relevante Habits{" "}
              <span className="text-white/25">
                {habitIds.length === 0 ? "(alle)" : `(${habitIds.length})`}
              </span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {habits.map((h) => {
                const an = habitIds.includes(h.id)
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabit(h.id)}
                    className={`border px-3 py-1.5 text-xs transition-colors ${
                      an
                        ? "border-white bg-white text-black"
                        : "border-white/20 text-white/60 hover:border-white/50"
                    }`}
                  >
                    {h.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sichtbare Bereiche */}
        <div className="mt-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Sichtbare Bereiche
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BEREICH_LISTE.map((b) => {
              const an = bereiche[b.key]
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => toggleBereich(b.key)}
                  className={`flex items-center gap-2 border px-3 py-2 text-left text-xs uppercase tracking-wider transition-colors ${
                    an
                      ? "border-white/60 text-white"
                      : "border-white/15 text-white/30"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      an ? "border-white bg-white text-black" : "border-white/40"
                    }`}
                  >
                    {an && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    )}
                  </span>
                  {b.label}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={speichern}
          disabled={!ziel.trim()}
          className="mt-8 w-full bg-white py-3.5 text-sm font-bold uppercase tracking-[0.3em] text-black transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          Locked In starten
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Bausteine der Ziel-Ansicht
// ──────────────────────────────────────────────────────────────

function Abschnitt({ titel, meta, onOpen, children }) {
  return (
    <section className="mt-8">
      <div className="mb-1 flex items-center justify-between border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={onOpen}
          className="group flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50 transition-colors hover:text-white"
        >
          {titel}
          {onOpen && (
            <span className="text-white/25 transition-colors group-hover:text-white">→</span>
          )}
        </button>
        {meta && (
          <span className="text-[11px] uppercase tracking-[0.25em] text-white/35">{meta}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function AbhakZeile({ erledigt, onToggle, text, meta }) {
  return (
    <li className="flex items-center gap-3 border-b border-white/10 py-3">
      <button
        type="button"
        onClick={onToggle}
        title="Abhaken"
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
          erledigt
            ? "border-white bg-white text-black"
            : "border-white/30 text-transparent hover:border-white/60"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${erledigt ? "text-white/40 line-through" : "text-white"}`}>
        {text}
      </span>
      {meta && (
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-white/40">{meta}</span>
      )}
    </li>
  )
}

// ──────────────────────────────────────────────────────────────
// Hauptseite
// ──────────────────────────────────────────────────────────────

export default function LockedInSeite({ onNavigate }) {
  const [config, setConfig] = useStored("lockedInConfig", STANDARD_CONFIG)
  const { habits, setHabits } = useHabitDaten()
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [sessions] = useStored("deepwork", [])
  const [setupOffen, setSetupOffen] = useState(false)

  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()
  const bereiche = config.bereiche ?? STANDARD_CONFIG.bereiche

  // Setup zeigen, wenn kein Ziel definiert ist oder bewusst geöffnet.
  if (setupOffen || !config.ziel) {
    return (
      <LockedInSetup
        initial={config.ziel ? config : STANDARD_CONFIG}
        habits={habits}
        onSave={(neu) => {
          setConfig(neu)
          setSetupOffen(false)
        }}
        onCancel={config.ziel ? () => setSetupOffen(false) : null}
      />
    )
  }

  // Modus beendet oder Phase abgelaufen: das Ziel bleibt gespeichert, die
  // Kommandozentrale bleibt aber aus, bis wieder scharf geschaltet wird.
  if (!lockedInAktiv(config)) {
    const abgelaufen = config.phaseEnde && config.phaseEnde < heuteKey
    return (
      <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-md">
          <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
            Locked&nbsp;In
          </span>
          <h2 className="mt-8 text-3xl font-bold uppercase tracking-tight">
            Modus aus.
          </h2>
          <p className="mt-3 text-sm text-white/50">
            {abgelaufen
              ? `Die Phase für „${config.ziel}" ist abgelaufen. Neue Phase setzen und wieder scharf schalten.`
              : `Zuletzt: „${config.ziel}". Solange der Modus aus ist, steht Locked In nicht in der Tab-Leiste.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {!abgelaufen && (
              <button
                onClick={() => setConfig({ ...config, aktiv: true })}
                className="bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white/80"
              >
                Scharf schalten
              </button>
            )}
            <button
              onClick={() => setSetupOffen(true)}
              className="border border-white/20 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:border-white/50 hover:text-white"
            >
              Neu einstellen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Disziplin: nur die für das Ziel relevanten Habits ──────
  const zielHabits =
    config.habitIds?.length > 0
      ? habits.filter((h) => config.habitIds.includes(h.id))
      : habits
  const disziplin = disziplinAmTag(zielHabits, new Date())

  // ── Auftrag heute ──────────────────────────────────────────
  const relevanteAlle = todos.filter(istAuftrag)
  const auftragOffen = relevanteAlle
    .filter((t) => !t.erledigt)
    .sort(
      (a, b) =>
        eisenhowerRang(a) - eisenhowerRang(b) ||
        (a.datum || "9999").localeCompare(b.datum || "9999")
    )
  const auftragErledigt = relevanteAlle.filter((t) => t.erledigt).length
  const auftragProzent =
    relevanteAlle.length === 0
      ? null
      : Math.round((auftragErledigt / relevanteAlle.length) * 100)
  function todoToggle(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t)))
  }

  // ── Fokus ──────────────────────────────────────────────────
  const fokusZiel = config.fokusZiel || 90
  const fokusMin = sessions
    .filter((s) => s.datum === heuteKey)
    .reduce((sum, s) => sum + (Number(s.minuten) || 0), 0)
  const fokusProzent = Math.min(100, Math.round((fokusMin / fokusZiel) * 100))

  // ── Fristen ────────────────────────────────────────────────
  const fristen = projekte
    .filter((p) => !p.archiviert && (p.status ?? "offen") !== "fertig" && p.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3)

  // ── Locked-In-Score aus den aktiven, sichtbaren Komponenten ─
  const komponenten = [
    bereiche.disziplin && zielHabits.length > 0 ? disziplin.prozent : null,
    bereiche.auftrag ? auftragProzent : null,
    bereiche.fokus ? fokusProzent : null,
  ].filter((k) => k != null)
  const score =
    komponenten.length === 0
      ? 0
      : Math.round(komponenten.reduce((s, k) => s + k, 0) / komponenten.length)

  // ── Phase ──────────────────────────────────────────────────
  const restTage = config.phaseEnde ? tageBisZahl(config.phaseEnde) : null
  const fortschritt = phaseFortschritt(config.phaseStart, config.phaseEnde)

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Kopf */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
            Locked&nbsp;In
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSetupOffen(true)}
              title="Ziel & Bereiche einstellen"
              className="rounded-md border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:border-white/50 hover:text-white"
            >
              Einstellen
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, aktiv: false })}
              title="Locked-In-Modus beenden"
              className="rounded-md border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/60 transition-colors hover:border-white/50 hover:text-white"
            >
              Beenden
            </button>
          </div>
        </div>

        {/* Ziel + Phase */}
        <div className="mt-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/35">
            Ziel
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {config.ziel}
          </h1>
          {restTage != null && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
              {restTage < 0
                ? "Phase abgelaufen"
                : restTage === 0
                  ? "Letzter Tag der Phase"
                  : `Noch ${restTage} ${restTage === 1 ? "Tag" : "Tage"}`}
            </p>
          )}
          {fortschritt != null && (
            <div className="mt-3 h-1 w-full overflow-hidden bg-white/10">
              <div
                className="h-full bg-white/60 transition-all duration-500"
                style={{ width: `${fortschritt}%` }}
              />
            </div>
          )}
        </div>

        {/* Locked-In-Score */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/40">
            Locked-In-Score
          </p>
          <p className="mt-2 text-7xl font-light tabular-nums text-white">{score}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/30">
            Ausführung heute
          </p>
          <div className="mx-auto mt-5 h-1.5 w-full max-w-xs overflow-hidden bg-white/10">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Auftrag heute */}
        {bereiche.auftrag && (
          <Abschnitt
            titel="Auftrag heute"
            meta={`${auftragErledigt}/${relevanteAlle.length}`}
            onOpen={() => onNavigate("todos")}
          >
            {auftragOffen.length === 0 ? (
              <p className="py-6 text-center text-sm uppercase tracking-widest text-white/30">
                {relevanteAlle.length > 0 ? "Auftrag erfüllt" : "Kein Auftrag"}
              </p>
            ) : (
              <ul>
                {auftragOffen.slice(0, 6).map((t) => (
                  <AbhakZeile
                    key={t.id}
                    erledigt={false}
                    onToggle={() => todoToggle(t.id)}
                    text={t.text}
                    meta={t.datum ? tageBis(t.datum) : null}
                  />
                ))}
              </ul>
            )}
            <div className="mt-3">
              <TodoErstellen
                knopfKlasse="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50 transition-colors hover:text-white"
                knopfInhalt="+ Aufgabe"
              />
            </div>
          </Abschnitt>
        )}

        {/* Disziplin */}
        {bereiche.disziplin && zielHabits.length > 0 && (
          <Abschnitt
            titel="Disziplin"
            meta={`${disziplin.erledigt}/${disziplin.gesamt}`}
            onOpen={() => onNavigate("habits")}
          >
            <ul>
              {zielHabits.map((h) => (
                <AbhakZeile
                  key={h.id}
                  erledigt={h.erledigtAn.includes(heuteKey)}
                  onToggle={() => habitToggle(h)}
                  text={h.name}
                  meta={h.istSchluessel ? "KEY" : null}
                />
              ))}
            </ul>
          </Abschnitt>
        )}

        {/* Fokus */}
        {bereiche.fokus && (
          <Abschnitt
            titel="Fokus"
            meta={`${fokusMin} / ${fokusZiel} min`}
            onOpen={() => onNavigate("deepwork")}
          >
            <div className="flex items-center justify-between py-3">
              <div className="mr-4 h-1.5 flex-1 overflow-hidden bg-white/10">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${fokusProzent}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => onNavigate("deepwork")}
                className="shrink-0 rounded-md border border-white/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-white/60 hover:text-white"
              >
                Fokus starten
              </button>
            </div>
          </Abschnitt>
        )}

        {/* Ziele & Fristen */}
        {bereiche.fristen && fristen.length > 0 && (
          <Abschnitt titel="Ziele & Fristen" onOpen={() => onNavigate("projekte")}>
            <ul>
              {fristen.map((p) => {
                const tage = tageBisZahl(p.deadline)
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 border-b border-white/10 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] text-white">
                      {p.name}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] uppercase tracking-wider ${
                        tage < 0 ? "text-white" : tage <= 2 ? "text-white/80" : "text-white/40"
                      }`}
                    >
                      {tageBis(p.deadline)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Abschnitt>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
