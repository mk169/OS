import { useState } from "react"
import useStored from "../lib/useStored"
import { heute, tageBis, montagVon, datumLang } from "../lib/datum"
import { istFaellig } from "../lib/spacedRepetition"
import { alleLernplaene, lernplanSumme } from "../lib/lernplan"
import { dashboardConfig } from "../lib/dashboard"
import { faelltAuf } from "../lib/wiederholung"
import {
  erledigteSchritte,
  routineFortschritt,
  routinenAmTag,
  schrittUmschalten,
} from "../lib/dailyops"
import ZyklusWidget from "./ZyklusWidget"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import {
  LIFEOS_INHALT,
  LIFEOS_KNOPF_GHOST,
  LIFEOS_KNOPF_GOLD,
  LIFEOS_MONO,
  LIFEOS_PANEL,
  LIFEOS_PUNKT,
  LIFEOS_RUBRIK,
  LIFEOS_SEITE,
  LIFEOS_SERIF,
} from "../lib/lifeos"
import { KalenderPanel } from "./KalenderSeite"
import TodoErstellen from "./TodoErstellen"
import { FristChip } from "./Bausteine"
import { EINTEILUNGEN, einteilungVon, todoUmschalten } from "../lib/todos"
import MentorBanner from "./MentorBanner"
import { SEITE_LESEN } from "../lib/layout"
import {
  useHabitDaten,
  nutzeHabitToggle,
  wochenStreakVon,
  wochenZielErreicht,
  disziplinAmTag,
  erledigteTage,
} from "../lib/habits"

function begruessung() {
  const stunde = new Date().getHours()
  if (stunde < 11) return "Guten Morgen"
  if (stunde < 18) return "Guten Tag"
  return "Guten Abend"
}

// Hinweis auf alles, was heute zu lernen ist: fällige Karteikarten und
// anstehende Lernplan-Schritte (beides projektübergreifend). Erscheint nur,
// wenn wirklich etwas ansteht, und führt in die Lern-Übersicht
// (Sammeln → Lernen). „dunkel" für dunkle Dashboard-Stile.
function LernBanner({ onNavigate, variant = "hell" }) {
  const [karten] = useStored("karten", [])
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])
  const [ablage] = useStored("ablage", [])

  const faellig = karten.filter(istFaellig).length
  const summe = lernplanSumme(alleLernplaene(projekte, todos, ablage))
  const schritte = summe.ueberfaellig + summe.heuteFaellig
  if (faellig === 0 && schritte === 0) return null

  const titel = [
    faellig > 0 && `${faellig} ${faellig === 1 ? "Karte" : "Karten"} fällig`,
    schritte > 0 &&
      `${schritte} ${schritte === 1 ? "Lernschritt" : "Lernschritte"} heute`,
  ]
    .filter(Boolean)
    .join(" · ")

  const dunkel = variant === "dunkel"
  return (
    <button
      onClick={() => onNavigate("sammeln", "lernen")}
      className={`mb-6 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        dunkel
          ? "border-accent-500/40 bg-accent-500/15 hover:bg-accent-500/25"
          : "border-accent-200 bg-accent-50 hover:bg-accent-100"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-lg">
        🧠
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${dunkel ? "text-accent-200" : "text-accent-700"}`}
        >
          {titel}
        </span>
        <span
          className={`block text-xs ${dunkel ? "text-accent-200/70" : "text-accent-600/70"}`}
        >
          Karteikarten und Lernpläne projektübergreifend
        </span>
      </span>
      <span
        className={`shrink-0 text-sm font-medium ${dunkel ? "text-accent-300" : "text-accent-600"}`}
      >
        Lernen →
      </span>
    </button>
  )
}

// Heutige Routinen aus Daily Operations: die Schritte, die heute anstehen,
// direkt auf der Startseite abhakbar. Nutzt dieselbe Logik wie die
// Daily-Operations-Seite. Steht heute nichts an, bleibt der Block weg.
function RoutinenPanel({ onNavigate }) {
  const [routinen] = useStored("dailyops_routinen", [])
  const [protokoll, setProtokoll] = useStored("dailyops_protokoll", {})
  const heuteKey = heute()
  const anstehend = routinenAmTag(routinen, heuteKey)
  if (anstehend.length === 0) return null

  return (
    <section className="mb-8">
      <button
        onClick={() => onNavigate("dailyops")}
        className="group mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
      >
        <span className="text-base">🔄</span> Routinen
        <span className="text-gray-300 transition-colors group-hover:text-accent-600">
          →
        </span>
      </button>
      <ul className="space-y-2">
        {anstehend.map((r) => {
          const fortschritt = routineFortschritt(r, protokoll, heuteKey)
          const erledigt = erledigteSchritte(protokoll, r.id, heuteKey)
          return (
            <li
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm shadow-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                  {r.name}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    fortschritt.fertig
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {fortschritt.erledigt}/{fortschritt.gesamt}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {(r.schritte ?? []).map((s) => {
                  const ab = erledigt.includes(s.id)
                  return (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm transition-colors hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={ab}
                          onChange={() =>
                            setProtokoll(
                              schrittUmschalten(protokoll, r.id, s.id, heuteKey)
                            )
                          }
                          className="h-4 w-4 shrink-0 accent-gray-900"
                        />
                        <span className={ab ? "text-gray-400 line-through" : "text-gray-700"}>
                          {s.text}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Heutige Habits als abhakbare Liste – für die Startseiten-Stile, die keine
// eigene Habit-Darstellung haben (Standard). Nutzt dieselbe
// Habit-Logik wie die Habits-Seite. Nichts anzeigen, wenn keine Habits da sind.
function HabitsPanel({ onNavigate }) {
  const { habits, setHabits } = useHabitDaten()
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()
  if (habits.length === 0) return null

  return (
    <section className="mb-8">
      <button
        onClick={() => onNavigate("habits")}
        className="group mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
      >
        <span className="text-base">🔁</span> Habits
        <span className="text-gray-300 transition-colors group-hover:text-accent-600">
          →
        </span>
      </button>
      <ul className="space-y-2">
        {habits.map((h) => {
          const dran = erledigteTage(h).includes(heuteKey)
          return (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm shadow-gray-100"
            >
              <button
                onClick={() => habitToggle(h)}
                title={dran ? "Rückgängig" : "Erledigt"}
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                  dran
                    ? "border-accent-500 bg-accent-500 text-white"
                    : "border-gray-300 text-transparent hover:border-accent-400"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-2.5 w-2.5"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </button>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  dran ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              >
                {h.name}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                🔥 {wochenStreakVon(h)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Offene Todos nach laufendem Projekt gruppieren (+ „Ohne Projekt"), innerhalb
// jeder Gruppe nach Eisenhower und Datum sortiert. Von allen drei Stilen
// gemeinsam genutzt, damit die Logik nur einmal existiert.
function todoGruppen(todos, projekte) {
  const rang = (t) => EINTEILUNGEN.findIndex((g) => g.passt(t))
  const sortiere = (liste) =>
    [...liste].sort(
      (a, b) =>
        rang(a) - rang(b) || (a.datum || "9999").localeCompare(b.datum || "9999")
    )

  const offene = todos.filter((t) => !t.erledigt)
  const laufend = projekte.filter(
    (p) => !p.archiviert && (p.status ?? "offen") !== "fertig"
  )

  const gruppen = laufend
    .map((p) => ({
      projekt: p,
      todos: sortiere(offene.filter((t) => (t.projektId ?? t.kursId) === p.id)),
    }))
    .filter((g) => g.todos.length > 0)

  const ohneGruppe = sortiere(
    offene.filter((t) => {
      const pid = t.projektId ?? t.kursId
      return !pid || !laufend.some((p) => p.id === pid)
    })
  )

  return { offene, gruppen, ohneGruppe }
}

export default function Dashboard({ onNavigate }) {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [einstellungen] = useStored("einstellungen", {
    appName: "OS",
    stil: STIL_STANDARD,
  })

  const stil = normalisiereStil(einstellungen?.stil)
  const appName = einstellungen?.appName || "OS"

  function toggle(id) {
    setTodos(todoUmschalten(todos, id, heute()))
  }

  const daten = todoGruppen(todos, projekte)
  const dashboard = dashboardConfig(einstellungen)
  const gemeinsam = { todos, ...daten, toggle, onNavigate, appName, dashboard }

  if (stil === "gamified") return <DashboardGamified {...gemeinsam} />
  if (stil === "lifeos") return <DashboardLifeOS {...gemeinsam} />
  if (stil === "lockedin") return <DashboardLockedIn {...gemeinsam} />
  return <DashboardTodo {...gemeinsam} />
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Standard" – klare Karten, farbige Punkte, Zähler-Badges
 * ════════════════════════════════════════════════════════════════════════ */

function TodoRow({ todo, onToggle }) {
  const einteilung = einteilungVon(todo)
  const [bearbeiten, setBearbeiten] = useState(false)

  // Wie auf der Todo-Seite: Klick auf den Text öffnet das vorbelegte
  // Formular, statt Löschen und Neuanlegen zu erzwingen.
  if (bearbeiten) {
    return (
      <li>
        <TodoErstellen todo={todo} onFertig={() => setBearbeiten(false)} />
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-sm shadow-gray-100 transition-colors hover:border-gray-300">
      <button
        onClick={() => onToggle(todo.id)}
        title="Als erledigt markieren"
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current transition-colors ${einteilung.text}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <button
        onClick={() => setBearbeiten(true)}
        title="Bearbeiten"
        className="min-w-0 flex-1 truncate text-left text-sm text-gray-800"
      >
        {todo.text}
      </button>
      <FristChip datum={todo.datum} gedaempft={todo.erledigt} />
    </li>
  )
}

function StatKachel({ wert, label, akzent }) {
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm shadow-gray-100">
      <p className={`text-2xl font-bold tracking-tight ${akzent ? "text-accent-600" : "text-gray-900"}`}>
        {wert}
      </p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

function DashboardTodo({ todos, offene, gruppen, ohneGruppe, toggle, onNavigate, dashboard }) {
  const heuteFaellig = offene.filter((t) => t.datum && t.datum <= heute()).length
  const erledigt = todos.filter((t) => t.erledigt).length

  return (
    <div className={SEITE_LESEN}>
      <header className="mb-7">
        <p className="text-sm font-semibold text-accent-600">{datumLang(heute())}</p>
        <h1
          style={{ fontFamily: "var(--font-sans)" }}
          className="mt-1 text-3xl font-bold tracking-tight text-gray-900"
        >
          {begruessung()}
        </h1>
      </header>

      {dashboard.fokusPeriode && <ZyklusWidget onNavigate={onNavigate} />}
      {dashboard.mentor && <MentorBanner onNavigate={onNavigate} />}
      {dashboard.lernen && <LernBanner onNavigate={onNavigate} />}

      {dashboard.kennzahlen && (
        <div className="mb-8 flex gap-3">
          <StatKachel wert={offene.length} label="offene Aufgaben" akzent />
          <StatKachel wert={heuteFaellig} label="heute fällig" />
          <StatKachel wert={erledigt} label="erledigt" />
        </div>
      )}

      {dashboard.kalender && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => onNavigate("kalender")}
              className="group flex items-center gap-1.5 text-sm font-semibold text-gray-900"
            >
              <span className="text-base">📅</span> Heute
              <span className="text-gray-300 transition-colors group-hover:text-accent-600">→</span>
            </button>
          </div>
          <KalenderPanel nurHeute />
        </section>
      )}

      {dashboard.habits && <HabitsPanel onNavigate={onNavigate} />}
      {dashboard.routinen && <RoutinenPanel onNavigate={onNavigate} />}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => onNavigate("todos")}
            className="group flex items-center gap-1.5 text-sm font-semibold text-gray-900"
          >
            <span className="text-base">✅</span> Aufgaben
            <span className="text-gray-300 transition-colors group-hover:text-accent-600">→</span>
          </button>
          <TodoErstellen
            knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-600"
            knopfInhalt={
              <>
                <span className="text-base leading-none">+</span> Aufgabe
              </>
            }
          />
        </div>

        {gruppen.length === 0 && ohneGruppe.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center text-sm text-gray-400">
            Nichts offen. Setz dir das Nächste – über „+ Aufgabe".
          </p>
        ) : (
          <div className="space-y-6">
            {gruppen.map(({ projekt, todos: projektTodos }) => (
              <div key={projekt.id}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {projekt.name}
                  </p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                    {projektTodos.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {projektTodos.slice(0, 5).map((t) => (
                    <TodoRow key={t.id} todo={t} onToggle={toggle} />
                  ))}
                </ul>
              </div>
            ))}
            {ohneGruppe.length > 0 && (
              <div>
                {gruppen.length > 0 && (
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ohne Projekt
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                      {ohneGruppe.length}
                    </span>
                  </div>
                )}
                <ul className="space-y-2">
                  {ohneGruppe.slice(0, 6).map((t) => (
                    <TodoRow key={t.id} todo={t} onToggle={toggle} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Gamified" – Level, Fortschrittsbalken, bunte Kacheln (Habitica)
 * ════════════════════════════════════════════════════════════════════════ */

function StatBalken({ wert, max, label, farbe, einheit }) {
  const pal = FARBEN[farbe] ?? FARBEN.gray
  const anteil = max > 0 ? Math.min(100, Math.round((wert / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-400">
          {wert}
          {einheit ?? ` / ${max}`}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${pal.punkt} transition-all duration-500`}
          style={{ width: `${anteil}%` }}
        />
      </div>
    </div>
  )
}

function AktionsKachel({ label, meta, farbe, erledigt, onToggle }) {
  const pal = FARBEN[farbe] ?? FARBEN.gray
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-100">
      <button
        onClick={onToggle}
        title={erledigt ? "Rückgängig" : "Erledigt!"}
        className={`flex w-14 shrink-0 items-center justify-center text-white transition-colors ${
          erledigt ? "bg-gray-300" : pal.punkt
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          {erledigt ? <path d="M20 6 9 17l-5-5" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
        <p className={`truncate text-sm font-semibold ${erledigt ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {label}
        </p>
        {meta && <p className="mt-0.5 truncate text-xs text-gray-400">{meta}</p>}
      </div>
    </div>
  )
}

function DashboardGamified({ todos, offene, ohneGruppe, gruppen, toggle, onNavigate, dashboard }) {
  const { habits, setHabits, bereiche } = useHabitDaten()
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()
  const wocheMontag = montagVon(new Date())

  // Spielerische Kennzahlen aus vorhandenen Daten ableiten.
  const erledigtGesamt = todos.filter((t) => t.erledigt).length
  const level = Math.floor(erledigtGesamt / 10) + 1
  const xpInLevel = erledigtGesamt % 10

  const habitsHeute = habits.filter((h) => erledigteTage(h).includes(heuteKey)).length
  const habitsAmZiel = habits.filter((h) => wochenZielErreicht(h, wocheMontag)).length
  const bestStreak = habits.reduce((m, h) => Math.max(m, wochenStreakVon(h)), 0)

  // Aktions-Kacheln: heute fällige/offene Todos + heutige Habits.
  const todoKacheln = [...gruppen.flatMap((g) => g.todos), ...ohneGruppe].slice(0, 5)
  const farbeFuerTodo = (t) => {
    const e = einteilungVon(t)
    return e.key === "wichtig-dringend" ? "rose"
      : e.key === "wichtig" ? "amber"
      : e.key === "dringend" ? "amber"
      : "cyan"
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-lg shadow-gray-900/10 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-500/20 text-3xl ring-1 ring-white/10">
            🧙
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-300">
              {begruessung()}
            </p>
            <h1
              style={{ fontFamily: "var(--font-sans)" }}
              className="text-2xl font-bold tracking-tight text-white"
            >
              Level {level}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent-400 transition-all duration-500"
                  style={{ width: `${(xpInLevel / 10) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-white/60">{xpInLevel}/10 XP</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/5 py-2">
            <p className="text-lg font-bold">🔥 {bestStreak}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">Streak</p>
          </div>
          <div className="rounded-xl bg-white/5 py-2">
            <p className="text-lg font-bold">✅ {erledigtGesamt}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">Erledigt</p>
          </div>
          <div className="rounded-xl bg-white/5 py-2">
            <p className="text-lg font-bold">⚡ {offene.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">Offen</p>
          </div>
        </div>
      </div>

      {dashboard.fokusPeriode && <ZyklusWidget onNavigate={onNavigate} />}
      {dashboard.mentor && <MentorBanner onNavigate={onNavigate} />}
      {dashboard.lernen && <LernBanner onNavigate={onNavigate} />}

      {/* Fortschrittsbalken */}
      {dashboard.kennzahlen && (
        <div className="mb-8 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100">
          <StatBalken wert={erledigtGesamt} max={erledigtGesamt + offene.length} label="Aufgaben" farbe="rose" />
          <StatBalken wert={habitsHeute} max={Math.max(1, habits.length)} label="Habits heute" farbe="blue" einheit={` / ${habits.length}`} />
          <StatBalken wert={habitsAmZiel} max={Math.max(1, habits.length)} label="Wochenziel erreicht" farbe="emerald" einheit={` / ${habits.length}`} />
        </div>
      )}

      {/* Aktions-Kacheln */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-sm font-bold text-gray-900">Deine Quests heute</h2>
          <TodoErstellen
            knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-600"
            knopfInhalt={<><span className="text-base leading-none">+</span> Quest</>}
          />
        </div>

        {todoKacheln.length === 0 && habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-gray-900">Noch keine Quests</p>
            <p className="mt-1 text-xs text-gray-400">
              Leg eine Aufgabe an – sie erscheint hier und bringt XP.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todoKacheln.map((t) => (
              <AktionsKachel
                key={t.id}
                label={t.text}
                meta={t.datum ? tageBis(t.datum) : null}
                farbe={farbeFuerTodo(t)}
                erledigt={false}
                onToggle={() => toggle(t.id)}
              />
            ))}
            {dashboard.habits && habits.map((h) => {
              const dran = erledigteTage(h).includes(heuteKey)
              const bereich = bereiche.find((b) => b.id === h.bereichId)
              return (
                <AktionsKachel
                  key={`h-${h.id}`}
                  label={h.name}
                  meta={`Habit · 🔥 ${wochenStreakVon(h)} Wochen`}
                  farbe={bereich?.farbe ?? "violet"}
                  erledigt={dran}
                  onToggle={() => habitToggle(h)}
                />
              )
            })}
          </div>
        )}
      </section>

      {dashboard.kalender && (
        <section>
          <button
            onClick={() => onNavigate("kalender")}
            className="group mb-3 flex items-center gap-1.5 font-sans text-sm font-bold text-gray-900"
          >
            <span>📅</span> Heute im Kalender
            <span className="text-gray-300 transition-colors group-hover:text-accent-600">→</span>
          </button>
          <KalenderPanel nurHeute />
        </section>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Life OS" – dunkles Kommandopult: fast schwarzer Grund, Panels mit
 * feiner Kante, gesperrte Versalien als Rubriken, Gold als einzige Farbe.
 * Zahlen und Titel stehen in der Serife, alles Sachliche in Mono.
 * ════════════════════════════════════════════════════════════════════════ */

// Die Leitsätze der Kopfzeile. Bewusst eine feste, kleine Auswahl statt eines
// Zitat-Speichers: Der Satz wechselt mit dem Tag, nicht mit jedem Rendern –
// sonst flackerte er bei jedem Häkchen.
const LIFEOS_LEITSAETZE = [
  ["Disziplin ist, das zu tun, was du dir vorgenommen hast — lange nachdem die Stimmung weg ist.", "Grundsatz"],
  ["Du steigst nicht auf das Niveau deiner Ziele, du fällst auf das Niveau deiner Systeme.", "James Clear"],
  ["Der Preis der Konzentration ist alles, was du dafür nicht tust.", "Deep Work"],
  ["Ein Tag ohne Plan gehört den Plänen anderer.", "Grundsatz"],
  ["Nicht die Menge entscheidet, sondern die Wiederholung.", "Grundsatz"],
  ["Was messbar ist, wird gemacht.", "Grundsatz"],
  ["Anfangen schlägt vorbereiten.", "Grundsatz"],
]

function LifeOsRubrik({ punkt = "gold", children, aktion }) {
  return (
    <div className={`${LIFEOS_RUBRIK} mb-3`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LIFEOS_PUNKT[punkt]}`} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {aktion}
    </div>
  )
}

function LifeOsKennzahl({ wert, label }) {
  return (
    <div className="rounded border border-[#242628] bg-[#161719] px-3 py-3 text-center">
      <p
        style={{ fontFamily: LIFEOS_SERIF }}
        className="text-2xl leading-none tabular-nums text-[#d4a84b]"
      >
        {wert}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-[#5a5f68]">
        {label}
      </p>
    </div>
  )
}

// Eine Zeile im Aufgaben-Panel: Häkchen, Text, Frist – ohne Farbfläche, die
// Einteilung zeigt nur der Punkt links.
function LifeOsZeile({ label, meta, erledigt, onToggle }) {
  return (
    <li className="group flex items-center gap-2.5 border-b border-[#242628] py-2 last:border-0">
      <button
        onClick={onToggle}
        title="Als erledigt markieren"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
          erledigt
            ? "border-[#5aaa72] bg-[#5aaa72] text-[#080909]"
            : "border-[#2e3133] text-transparent hover:border-[#b88830] group-hover:text-[#5a5f68]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-[12px] ${
          erledigt ? "text-[#5a5f68] line-through" : "text-[#e2e4e8]"
        }`}
      >
        {label}
      </span>
      {meta && (
        <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">
          {meta}
        </span>
      )}
    </li>
  )
}

function DashboardLifeOS({ todos, offene, gruppen, ohneGruppe, toggle, onNavigate, appName, dashboard }) {
  const { habits, setHabits } = useHabitDaten()
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const [deepwork] = useStored("deepwork", [])
  const [termine] = useStored("termine", [])
  const heuteKey = heute()

  const erledigt = todos.filter((t) => t.erledigt).length
  const fokusHeute = deepwork
    .filter((s) => s.datum === heuteKey)
    .reduce((summe, s) => summe + (Number(s.minuten) || 0), 0)
  const disziplin = disziplinAmTag(habits, new Date())
  const bestStreak = habits.reduce((m, h) => Math.max(m, wochenStreakVon(h)), 0)

  const aufgaben = [...gruppen.flatMap((g) => g.todos), ...ohneGruppe].slice(0, 7)
  const termineHeute = termine
    .filter((t) => faelltAuf(t, heuteKey))
    .sort((a, b) => (a.zeit || "99:99").localeCompare(b.zeit || "99:99"))

  // Tagesindex – derselbe Satz für den ganzen Tag.
  const [satz, quelle] =
    LIFEOS_LEITSAETZE[
      Math.floor(new Date(heuteKey).getTime() / 86400000) % LIFEOS_LEITSAETZE.length
    ]

  return (
    <div style={{ fontFamily: LIFEOS_MONO }} className={LIFEOS_SEITE}>
      <div className={LIFEOS_INHALT}>
        {/* Kopf: Logo-Zeile, Begrüßung, Weg zum Tagesplan */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#242628] pb-3">
          <div className="min-w-0">
            <p
              style={{ fontFamily: LIFEOS_SERIF }}
              className="text-[13px] italic text-[#d4a84b]"
            >
              {appName}
              <span className="ml-2 text-[9px] not-italic uppercase tracking-[0.25em] text-[#5a5f68]">
                System
              </span>
            </p>
            <h1
              style={{ fontFamily: LIFEOS_SERIF }}
              className="mt-1 truncate text-[22px] font-normal text-[#e2e4e8]"
            >
              {begruessung()}.
            </h1>
            <p className="mt-0.5 text-[11px] text-[#5a5f68]">{datumLang(heuteKey)}</p>
          </div>
          {/* Rechter Rand: am Desktop schwebt dort das Zahnrad der App-Hülle –
              der Knopf weicht ihm aus, statt sich mit ihm zu überlagern. */}
          <button
            onClick={() => onNavigate("todos")}
            className={`${LIFEOS_KNOPF_GHOST} shrink-0 md:mr-9`}
          >
            → Tagesplan
          </button>
        </div>

        {/* Leitsatz des Tages */}
        <div
          style={{ fontFamily: LIFEOS_SERIF }}
          className="mb-4 rounded-r border-l-2 border-[#d4a84b] bg-[#161719] px-3.5 py-2.5 text-[13px] italic text-[#9ea3ab]"
        >
          {satz}
          <span
            style={{ fontFamily: LIFEOS_MONO }}
            className="mt-1 block text-[10px] not-italic uppercase tracking-[0.15em] text-[#5a5f68]"
          >
            {quelle}
          </span>
        </div>

        {dashboard.fokusPeriode && <ZyklusWidget onNavigate={onNavigate} variant="dunkel" />}
        {dashboard.mentor && <MentorBanner onNavigate={onNavigate} variant="dunkel" />}
        {dashboard.lernen && <LernBanner onNavigate={onNavigate} variant="dunkel" />}

        {dashboard.kennzahlen && (
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <LifeOsKennzahl wert={offene.length} label="Offen" />
            <LifeOsKennzahl
              wert={`${disziplin.erledigt}/${disziplin.gesamt}`}
              label="Habits heute"
            />
            <LifeOsKennzahl wert={`${fokusHeute}m`} label="Fokus heute" />
            <LifeOsKennzahl wert={`${bestStreak}w`} label="Beste Serie" />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Offene Aufgaben */}
            <section className={LIFEOS_PANEL}>
              <LifeOsRubrik
                punkt="gruen"
                aktion={
                  <TodoErstellen
                    knopfKlasse="shrink-0 rounded border border-[#2e3133] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#9ea3ab] transition-colors hover:border-[#b88830] hover:text-[#f0c870]"
                    knopfInhalt="+ Task"
                  />
                }
              >
                Offene Tasks
              </LifeOsRubrik>

              {aufgaben.length === 0 ? (
                <p className="rounded border border-dashed border-[#242628] py-6 text-center text-[11px] text-[#5a5f68]">
                  Nichts offen – setz dir das Nächste.
                </p>
              ) : (
                <ul>
                  {aufgaben.map((t) => (
                    <LifeOsZeile
                      key={t.id}
                      label={t.text}
                      meta={t.datum ? tageBis(t.datum) : null}
                      erledigt={false}
                      onToggle={() => toggle(t.id)}
                    />
                  ))}
                </ul>
              )}
              {erledigt > 0 && (
                <p className="mt-2.5 text-[10px] uppercase tracking-[0.15em] text-[#5a5f68]">
                  {erledigt} erledigt
                </p>
              )}
            </section>

            {/* Habits */}
            {dashboard.habits && habits.length > 0 && (
              <section className={LIFEOS_PANEL}>
                <LifeOsRubrik punkt="gold">Habits — Heute</LifeOsRubrik>
                <ul>
                  {habits.map((h) => (
                    <LifeOsZeile
                      key={h.id}
                      label={h.name}
                      meta={`${wochenStreakVon(h)}w`}
                      erledigt={erledigteTage(h).includes(heuteKey)}
                      onToggle={() => habitToggle(h)}
                    />
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate("habits")}
                  className={`${LIFEOS_KNOPF_GHOST} mt-3`}
                >
                  Alle Habits →
                </button>
              </section>
            )}
          </div>

          <div className="space-y-4">
            {/* Termine heute – bewusst als eigene Liste statt des hellen
                Kalender-Panels, das den dunklen Grund aufreißen würde. */}
            {dashboard.kalender && (
              <section className={LIFEOS_PANEL}>
                <LifeOsRubrik punkt="blau">Heute im Kalender</LifeOsRubrik>
                {termineHeute.length === 0 ? (
                  <p className="text-[11px] text-[#5a5f68]">Keine Termine.</p>
                ) : (
                  <ul>
                    {termineHeute.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 border-b border-[#242628] py-2 last:border-0"
                      >
                        <span className="w-11 shrink-0 text-[11px] tabular-nums text-[#d4a84b]">
                          {t.zeit || "—"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px]">
                          {t.titel || t.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => onNavigate("kalender")}
                  className={`${LIFEOS_KNOPF_GHOST} mt-3`}
                >
                  Kalender →
                </button>
              </section>
            )}

            {/* Fokus-Aufruf: die eine Hauptaktion des Pults */}
            <section className={LIFEOS_PANEL}>
              <LifeOsRubrik punkt="cyan">Deep Work</LifeOsRubrik>
              <p
                style={{ fontFamily: LIFEOS_SERIF }}
                className="text-[15px] leading-snug text-[#e2e4e8]"
              >
                {fokusHeute > 0
                  ? `${fokusHeute} Minuten Fokus heute.`
                  : "Noch keine Fokuszeit heute."}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#5a5f68]">
                Konzentration ist ein Muskel. Eine Einheit reicht, um den Tag zu
                drehen.
              </p>
              <button
                onClick={() => onNavigate("deepwork")}
                className={`${LIFEOS_KNOPF_GOLD} mt-3`}
              >
                ⧖ Session starten
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Locked In" – monochrom und knapp. Keine Farbe, keine Belohnung,
 * keine Begrüßung: nur der Auftrag für heute und die Zahlen, die zeigen, ob
 * er läuft. Die Kommandozentrale (Bereich „Locked In") ist einen Klick weit.
 * ════════════════════════════════════════════════════════════════════════ */

function LockedKennzahl({ label, wert, suffix }) {
  return (
    <div className="px-2 py-5 text-center">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{label}</p>
      <p className="mt-2 text-4xl font-light tabular-nums text-white">
        {wert}
        {suffix && <span className="text-lg text-white/40">{suffix}</span>}
      </p>
    </div>
  )
}

function LockedBalken({ anteil }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden bg-white/10">
      <div
        className="h-full bg-white transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, anteil))}%` }}
      />
    </div>
  )
}

function DashboardLockedIn({ todos, offene, toggle, onNavigate, dashboard }) {
  const { habits } = useHabitDaten()
  const [routinen] = useStored("dailyops_routinen", [])
  const [protokoll, setProtokoll] = useStored("dailyops_protokoll", {})
  const [deepwork] = useStored("deepwork", [])
  const [termine] = useStored("termine", [])
  const heuteKey = heute()

  const heuteFaellig = offene.filter((t) => t.datum && t.datum <= heuteKey)
  const erledigt = todos.filter((t) => t.erledigt).length
  const fokusHeute = deepwork
    .filter((s) => s.datum === heuteKey)
    .reduce((summe, s) => summe + (Number(s.minuten) || 0), 0)

  const disziplin = disziplinAmTag(habits, new Date())
  const anstehendeRoutinen = routinenAmTag(routinen, heuteKey)
  const termineHeute = termine
    .filter((t) => faelltAuf(t, heuteKey))
    .sort((a, b) => (a.zeit || "99:99").localeCompare(b.zeit || "99:99"))

  // Der Auftrag: überfällig und heute zuerst, dann nach Eisenhower-Rang.
  const rang = (t) => EINTEILUNGEN.findIndex((e) => e.passt(t))
  const auftrag = [...offene]
    .sort(
      (a, b) =>
        (a.datum || "9999").localeCompare(b.datum || "9999") || rang(a) - rang(b)
    )
    .slice(0, 6)

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em]">Heute</span>
          <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            {datumLang(heuteKey)}
          </span>
        </div>

        {dashboard.mentor && (
          <div className="mt-5">
            <MentorBanner onNavigate={onNavigate} variant="mono" />
          </div>
        )}
        {dashboard.lernen && <LernBanner onNavigate={onNavigate} variant="dunkel" />}

        {dashboard.kennzahlen && (
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10">
            <LockedKennzahl label="Offen" wert={offene.length} />
            <LockedKennzahl label="Heute" wert={heuteFaellig.length} />
            <LockedKennzahl label="Fokus" wert={fokusHeute} suffix="m" />
          </div>
        )}

        {dashboard.habits && habits.length > 0 && (
          <button
            onClick={() => onNavigate("habits")}
            className="mt-6 block w-full text-left"
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-white/40">
              <span>Disziplin</span>
              <span className="tabular-nums">
                {disziplin.erledigt}/{disziplin.gesamt}
              </span>
            </div>
            <LockedBalken anteil={disziplin.prozent} />
          </button>
        )}

        {dashboard.routinen && anstehendeRoutinen.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => onNavigate("dailyops")}
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
            >
              Betrieb
            </button>
            {anstehendeRoutinen.map((r) => {
              const erledigteIds = erledigteSchritte(protokoll, r.id, heuteKey)
              return (
                <div key={r.id} className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">
                    {r.name}
                  </p>
                  <ul className="mt-1">
                    {(r.schritte ?? []).map((schritt) => {
                      const ab = erledigteIds.includes(schritt.id)
                      return (
                        <li key={schritt.id}>
                          <button
                            onClick={() =>
                              setProtokoll(
                                schrittUmschalten(protokoll, r.id, schritt.id, heuteKey)
                              )
                            }
                            className="flex w-full items-center gap-3 border-b border-white/10 py-2.5 text-left last:border-0"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                                ab ? "border-white bg-white" : "border-white/30"
                              }`}
                            >
                              {ab && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
                                  <path d="m5 12 5 5L20 7" />
                                </svg>
                              )}
                            </span>
                            <span className={`min-w-0 flex-1 truncate text-sm ${ab ? "text-white/30 line-through" : "text-white/90"}`}>
                              {schritt.text}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate("todos")}
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
            >
              Auftrag
            </button>
            <TodoErstellen
              knopfKlasse="rounded-md border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-white/50 hover:text-white"
              knopfInhalt="+ Neu"
            />
          </div>

          {auftrag.length === 0 ? (
            <p className="mt-6 text-center text-sm uppercase tracking-[0.25em] text-white/30">
              Nichts offen. Setz dir das Nächste.
            </p>
          ) : (
            <ul className="mt-3">
              {auftrag.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 border-b border-white/10 py-3 last:border-0">
                  <button
                    onClick={() => toggle(t.id)}
                    title="Als erledigt markieren"
                    className="flex h-4 w-4 shrink-0 items-center justify-center border border-white/30 text-transparent transition-colors hover:border-white group-hover:text-white/60"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm text-white/90">{t.text}</span>
                  {t.datum && (
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/40">
                      {tageBis(t.datum)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {erledigt > 0 && (
            <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/25">
              {erledigt} erledigt
            </p>
          )}
        </section>

        {dashboard.kalender && (
          <section className="mt-10">
            <button
              onClick={() => onNavigate("kalender")}
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-white"
            >
              Termine
            </button>
            {/* Bewusst nicht das gemeinsame Kalender-Panel: Es ist durch und
                durch hell und risse ein weißes Loch in den schwarzen Screen.
                Hier reicht die nackte Liste dessen, was heute ansteht. */}
            {termineHeute.length === 0 ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/25">
                Keine Termine
              </p>
            ) : (
              <ul className="mt-3">
                {termineHeute.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 border-b border-white/10 py-2.5 last:border-0"
                  >
                    <span className="w-12 shrink-0 text-[11px] tabular-nums text-white/40">
                      {t.zeit || "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/90">
                      {t.titel || t.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <button
          onClick={() => onNavigate("lockedin")}
          className="mt-10 w-full border border-white/20 py-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 transition-colors hover:border-white/50 hover:text-white"
        >
          Kommandozentrale →
        </button>
      </div>
    </div>
  )
}
