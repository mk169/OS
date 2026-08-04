import useStored from "../lib/useStored"
import { heute, tageBis, tageBisZahl } from "../lib/datum"
import { EINTEILUNGEN } from "./TodoErstellen"
import TodoErstellen from "./TodoErstellen"
import {
  useHabitDaten,
  nutzeHabitToggle,
  disziplinAmTag,
  tagNummer,
} from "./HabitsSeite"

// Fokus-Tagesziel in Minuten (Basis für den Fokus-Anteil im Score).
const FOKUS_ZIEL_MIN = 90

// Ein Todo zählt zum „Auftrag heute", wenn es wichtig, dringend oder heute
// (bzw. überfällig) ist – der harte Kern des Tages.
function istAuftrag(t) {
  return t.wichtig || t.dringend || (t.datum && t.datum <= heute())
}

function eisenhowerRang(t) {
  const i = EINTEILUNGEN.findIndex((g) => g.passt(t))
  return i === -1 ? EINTEILUNGEN.length : i
}

// ──────────────────────────────────────────────────────────────
// Kleine Bausteine
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
            <span className="text-white/25 transition-colors group-hover:text-white">
              →
            </span>
          )}
        </button>
        {meta && (
          <span className="text-[11px] uppercase tracking-[0.25em] text-white/35">
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function AbhakZeile({ erledigt, onToggle, text, meta, gedimmt }) {
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${
          erledigt ? "text-white/40 line-through" : gedimmt ? "text-white/70" : "text-white"
        }`}
      >
        {text}
      </span>
      {meta && (
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-white/40">
          {meta}
        </span>
      )}
    </li>
  )
}

// ──────────────────────────────────────────────────────────────
// Kommandozentrum
// ──────────────────────────────────────────────────────────────

export default function LockedInSeite({ onNavigate }) {
  const { habits, setHabits } = useHabitDaten()
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [sessions] = useStored("deepwork", [])
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()

  // ── Disziplin (Habits) ──────────────────────────────────────
  const disziplin = disziplinAmTag(habits, new Date())

  // ── Auftrag heute (Todos) ───────────────────────────────────
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

  // ── Fokus (Deep Work) ───────────────────────────────────────
  const fokusMin = sessions
    .filter((s) => s.datum === heuteKey)
    .reduce((sum, s) => sum + (Number(s.minuten) || 0), 0)
  const fokusProzent = Math.min(100, Math.round((fokusMin / FOKUS_ZIEL_MIN) * 100))

  // ── Ziele & Fristen (Projekte) ──────────────────────────────
  const fristen = projekte
    .filter(
      (p) =>
        !p.archiviert && (p.status ?? "offen") !== "fertig" && p.deadline
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3)

  // ── Locked-In-Score: Schnitt der aktiven Komponenten ────────
  const komponenten = [
    habits.length > 0 ? disziplin.prozent : null,
    auftragProzent,
    fokusProzent,
  ].filter((k) => k != null)
  const score =
    komponenten.length === 0
      ? 0
      : Math.round(komponenten.reduce((s, k) => s + k, 0) / komponenten.length)

  const tag = tagNummer(habits)

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Kopf */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
            Locked&nbsp;In
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">
            Tag {tag}
          </span>
        </div>

        {/* Locked-In-Score */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/40">
            Locked-In-Score
          </p>
          <p className="mt-2 text-7xl font-light tabular-nums text-white">
            {score}
          </p>
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

        {/* Kennzahlen-Streifen */}
        <div className="mt-8 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10">
          {[
            {
              label: "Disziplin",
              wert: habits.length ? disziplin.prozent : "–",
              suffix: habits.length ? "%" : "",
            },
            { label: "Fokus", wert: fokusMin, suffix: "m" },
            {
              label: "Auftrag",
              wert: `${auftragErledigt}/${relevanteAlle.length}`,
              suffix: "",
            },
          ].map((k) => (
            <div key={k.label} className="px-2 py-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                {k.label}
              </p>
              <p className="mt-1.5 text-2xl font-light tabular-nums text-white">
                {k.wert}
                {k.suffix && <span className="text-sm text-white/40">{k.suffix}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Auftrag heute */}
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

        {/* Disziplin */}
        {habits.length > 0 && (
          <Abschnitt
            titel="Disziplin"
            meta={`${disziplin.erledigt}/${disziplin.gesamt}`}
            onOpen={() => onNavigate("habits")}
          >
            <ul>
              {habits.map((h) => (
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
        <Abschnitt
          titel="Fokus"
          meta={`${fokusMin} / ${FOKUS_ZIEL_MIN} min`}
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

        {/* Ziele & Fristen */}
        {fristen.length > 0 && (
          <Abschnitt
            titel="Ziele & Fristen"
            onOpen={() => onNavigate("projekte")}
          >
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
                        tage < 0
                          ? "text-white"
                          : tage <= 2
                            ? "text-white/80"
                            : "text-white/40"
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
