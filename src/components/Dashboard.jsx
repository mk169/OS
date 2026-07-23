import useStored from "../lib/useStored"
import { heute, tageBis, montagVon } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import { datumLang } from "./Kalender"
import { KalenderPanel } from "./KalenderSeite"
import TodoErstellen, { EINTEILUNGEN, einteilungVon } from "./TodoErstellen"
import {
  useHabitDaten,
  nutzeHabitToggle,
  wochenStreakVon,
  wochenZielErreicht,
} from "./HabitsSeite"

function begruessung() {
  const stunde = new Date().getHours()
  if (stunde < 11) return "Guten Morgen"
  if (stunde < 18) return "Guten Tag"
  return "Guten Abend"
}

// Dekorative Schriftfamilien (Fonts via <link> in index.html geladen).
const FONT_ARCADE = '"Press Start 2P", ui-monospace, monospace'
const FONT_TERMINAL = '"VT323", ui-monospace, "SF Mono", Menlo, monospace'
const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

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
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }

  const daten = todoGruppen(todos, projekte)
  const gemeinsam = { todos, ...daten, toggle, onNavigate, appName }

  if (stil === "gamified") return <DashboardGamified {...gemeinsam} />
  if (stil === "arcade") return <DashboardArcade {...gemeinsam} />
  if (stil === "cleangirl") return <DashboardCleanGirl {...gemeinsam} />
  if (stil === "notion") return <DashboardNotion {...gemeinsam} />
  return <DashboardTodo {...gemeinsam} />
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Todo-Liste" – klare Karten, farbige Punkte, Zähler-Badges (Todoist)
 * ════════════════════════════════════════════════════════════════════════ */

function TodoRow({ todo, onToggle }) {
  const einteilung = einteilungVon(todo)
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
      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
        {todo.text}
      </span>
      {todo.datum && (
        <span className="shrink-0 text-xs font-medium text-gray-400">
          {tageBis(todo.datum)}
        </span>
      )}
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

function DashboardTodo({ todos, offene, gruppen, ohneGruppe, toggle, onNavigate }) {
  const heuteFaellig = offene.filter((t) => t.datum && t.datum <= heute()).length
  const erledigt = todos.filter((t) => t.erledigt).length

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
      <header className="mb-7">
        <p className="text-sm font-semibold text-accent-600">{datumLang(heute())}</p>
        <h1
          style={{ fontFamily: "var(--font-sans)" }}
          className="mt-1 text-3xl font-bold tracking-tight text-gray-900"
        >
          {begruessung()}
        </h1>
      </header>

      <div className="mb-8 flex gap-3">
        <StatKachel wert={offene.length} label="offene Aufgaben" akzent />
        <StatKachel wert={heuteFaellig} label="heute fällig" />
        <StatKachel wert={erledigt} label="erledigt" />
      </div>

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
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
            Alles erledigt – keine offenen Aufgaben. 🎉
          </div>
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

function DashboardGamified({ todos, offene, ohneGruppe, gruppen, toggle, onNavigate }) {
  const { habits, setHabits, bereiche } = useHabitDaten()
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()
  const wocheMontag = montagVon(new Date())

  // Spielerische Kennzahlen aus vorhandenen Daten ableiten.
  const erledigtGesamt = todos.filter((t) => t.erledigt).length
  const level = Math.floor(erledigtGesamt / 10) + 1
  const xpInLevel = erledigtGesamt % 10

  const habitsHeute = habits.filter((h) => h.erledigtAn.includes(heuteKey)).length
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
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
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

      {/* Fortschrittsbalken */}
      <div className="mb-8 space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100">
        <StatBalken wert={erledigtGesamt} max={erledigtGesamt + offene.length} label="Aufgaben" farbe="rose" />
        <StatBalken wert={habitsHeute} max={Math.max(1, habits.length)} label="Habits heute" farbe="blue" einheit={` / ${habits.length}`} />
        <StatBalken wert={habitsAmZiel} max={Math.max(1, habits.length)} label="Wochenziel erreicht" farbe="emerald" einheit={` / ${habits.length}`} />
      </div>

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
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
            Noch keine Quests. Leg mit „+ Quest" los! 🚀
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
            {habits.map((h) => {
              const dran = h.erledigtAn.includes(heuteKey)
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
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Arcade" – Retro-Arcade im Pac-Man-Look (schwarz, gelb, Geister)
 * ════════════════════════════════════════════════════════════════════════ */

// Pac-Man-Keil (öffnet nach rechts).
function PacIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0">
      <path fill="#ffd400" d="M16 16 L31 8.5 A16 16 0 1 0 31 23.5 Z" />
    </svg>
  )
}

// Klassischer Geist; „frightened" = gefressen/blau.
function GhostIcon({ size = 24, color = "#ff0000", frightened = false }) {
  const body = frightened ? "#2121ff" : color
  const eye = frightened ? "#ffffff" : "#2121ff"
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0">
      <path
        fill={body}
        d="M4 30 V15 a12 12 0 0 1 24 0 V30 l-4-3 -4 3 -4-3 -4 3 -4-3 -4 3 Z"
      />
      <circle cx="12" cy="15" r="3.4" fill="#fff" />
      <circle cx="21" cy="15" r="3.4" fill="#fff" />
      <circle cx="13" cy="15.5" r="1.7" fill={eye} />
      <circle cx="22" cy="15.5" r="1.7" fill={eye} />
    </svg>
  )
}

// Fortschritt als Pac-Dot-Bahn: gefressene Punkte links leer, Pac-Man am Rand,
// verbleibende als Pellets.
function PacLane({ label, wert, max }) {
  const n = 14
  const gegessen = max > 0 ? Math.round((wert / max) * n) : 0
  return (
    <div>
      <div className="flex items-center justify-between" style={{ fontFamily: FONT_ARCADE }}>
        <span className="text-[8px] text-white/70">{label}</span>
        <span className="text-[8px] text-yellow-300">
          {wert}/{max}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1 rounded border-2 border-blue-700 bg-black px-2 py-1.5">
        {Array.from({ length: n }).map((_, i) => {
          if (i < gegessen) return <span key={i} className="h-2 w-2 shrink-0" />
          if (i === gegessen) return <PacIcon key={i} size={12} />
          return (
            <span key={i} className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-200/80" />
          )
        })}
      </div>
    </div>
  )
}

function GhostRow({ label, meta, color, erledigt, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={erledigt ? "Rückgängig" : "Fressen!"}
      className="flex w-full items-center gap-3 rounded border-2 border-blue-800 bg-blue-950/40 px-3 py-2.5 text-left transition-colors hover:border-blue-400"
    >
      <GhostIcon size={26} color={color} frightened={erledigt} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-lg leading-tight ${erledigt ? "text-white/40 line-through" : "text-white"}`}>
          {label}
        </span>
        {meta && <span className="block truncate text-sm text-white/40">{meta}</span>}
      </span>
      <span style={{ fontFamily: FONT_ARCADE }} className="shrink-0 text-[8px] text-yellow-300">
        {erledigt ? "200" : "•••"}
      </span>
    </button>
  )
}

const GEISTER_FARBEN = {
  "wichtig-dringend": "#ff0000",
  wichtig: "#ffb8ff",
  dringend: "#ffb852",
  sonstige: "#00ffff",
}

function DashboardArcade({ todos, offene, gruppen, ohneGruppe, toggle, onNavigate }) {
  const { habits, setHabits } = useHabitDaten()
  const habitToggle = nutzeHabitToggle(habits, setHabits)
  const heuteKey = heute()

  const erledigtGesamt = todos.filter((t) => t.erledigt).length
  const level = Math.floor(erledigtGesamt / 10) + 1
  const xpInLevel = erledigtGesamt % 10
  const score = erledigtGesamt * 100
  const hiScore = (erledigtGesamt + offene.length) * 100
  const habitsHeute = habits.filter((h) => h.erledigtAn.includes(heuteKey)).length
  const bestStreak = habits.reduce((m, h) => Math.max(m, wochenStreakVon(h)), 0)

  const todoQuests = [...gruppen.flatMap((g) => g.todos), ...ohneGruppe].slice(0, 5)
  const ghostFor = (t) => GEISTER_FARBEN[einteilungVon(t).key] ?? "#00ffff"

  return (
    <div style={{ fontFamily: FONT_TERMINAL }} className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Scoreboard */}
        <div className="mb-6 grid grid-cols-3 items-start" style={{ fontFamily: FONT_ARCADE }}>
          <div>
            <p className="text-[8px] text-white/70">1UP</p>
            <p className="mt-1.5 text-[12px] text-white">{String(score).padStart(5, "0")}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-red-500">HIGH SCORE</p>
            <p className="mt-1.5 text-[12px] text-yellow-300">{String(hiScore).padStart(5, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-white/70">LEVEL</p>
            <p className="mt-1.5 text-[12px] text-yellow-300">{level}</p>
          </div>
        </div>

        {/* Begrüßung */}
        <div className="mb-6 flex items-center gap-3">
          <PacIcon size={30} />
          <div className="min-w-0">
            <h1 style={{ fontFamily: FONT_ARCADE }} className="text-[13px] leading-tight text-yellow-300">
              READY!
            </h1>
            <p className="truncate text-xl leading-tight text-white/70">
              {begruessung()} · {datumLang(heute())}
            </p>
          </div>
        </div>

        {/* Fortschritts-Bahnen */}
        <div className="mb-7 space-y-3">
          <PacLane label="XP" wert={xpInLevel} max={10} />
          <PacLane label="AUFGABEN" wert={erledigtGesamt} max={erledigtGesamt + offene.length} />
          <PacLane label="HABITS" wert={habitsHeute} max={Math.max(1, habits.length)} />
        </div>

        {/* Quests */}
        <div className="mb-3 flex items-center justify-between">
          <h2 style={{ fontFamily: FONT_ARCADE }} className="text-[10px] text-white">
            ◄ QUESTS ►
          </h2>
          <span style={{ fontFamily: FONT_ARCADE }} className="text-[8px] text-yellow-300">
            🔥 {bestStreak}
          </span>
        </div>

        {todoQuests.length === 0 && habits.length === 0 ? (
          <p className="rounded border-2 border-blue-800 py-8 text-center text-xl text-white/50">
            GAME OVER — keine Quests
          </p>
        ) : (
          <div className="space-y-2">
            {todoQuests.map((t) => (
              <GhostRow
                key={t.id}
                label={t.text}
                meta={t.datum ? tageBis(t.datum) : null}
                color={ghostFor(t)}
                erledigt={false}
                onToggle={() => toggle(t.id)}
              />
            ))}
            {habits.map((h) => {
              const dran = h.erledigtAn.includes(heuteKey)
              return (
                <GhostRow
                  key={`h-${h.id}`}
                  label={h.name}
                  meta={`HABIT · 🔥 ${wochenStreakVon(h)}`}
                  color="#00ffff"
                  erledigt={dran}
                  onToggle={() => habitToggle(h)}
                />
              )
            })}
          </div>
        )}

        <div className="mt-4">
          <TodoErstellen
            knopfKlasse="inline-flex items-center gap-2 rounded border-2 border-yellow-400 bg-black px-4 py-2 text-sm text-yellow-300 transition-colors hover:bg-yellow-400 hover:text-black"
            knopfInhalt="+ INSERT COIN"
          />
        </div>

        {/* Kalender */}
        <div className="mt-8">
          <button
            onClick={() => onNavigate("kalender")}
            style={{ fontFamily: FONT_ARCADE }}
            className="mb-3 text-[9px] text-white transition-colors hover:text-yellow-300"
          >
            ► HEUTE
          </button>
          <div className="overflow-hidden rounded-lg border-2 border-blue-700">
            <KalenderPanel nurHeute />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Clean Girl" – soft, pastellrosa, elegante Serife, viel Weißraum
 * ════════════════════════════════════════════════════════════════════════ */

function CleanPill({ wert, label, farbe }) {
  return (
    <div className={`flex-1 rounded-3xl px-4 py-3 text-center ${farbe}`}>
      <p className="text-2xl font-semibold" style={{ fontFamily: FONT_SERIF_ELEGANT }}>
        {wert}
      </p>
      <p className="mt-0.5 text-[11px] lowercase tracking-wide opacity-70">{label}</p>
    </div>
  )
}

function CleanGirlZeile({ todo, onToggle }) {
  return (
    <li className="group flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-[0_10px_30px_-20px_rgba(219,112,147,0.6)] backdrop-blur-sm">
      <button
        onClick={() => onToggle(todo.id)}
        title="Als erledigt markieren"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-rose-300 text-rose-400 transition-colors hover:bg-rose-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className="min-w-0 flex-1 truncate text-[15px] text-rose-950/80">{todo.text}</span>
      {todo.datum && (
        <span className="shrink-0 text-xs text-rose-400">{tageBis(todo.datum)}</span>
      )}
    </li>
  )
}

function DashboardCleanGirl({ todos, offene, gruppen, ohneGruppe, toggle, onNavigate }) {
  const heuteFaellig = offene.filter((t) => t.datum && t.datum <= heute()).length
  const erledigt = todos.filter((t) => t.erledigt).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-purple-50 px-5 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <div className="mb-2 text-2xl">🎀🌷</div>
          <h1 style={{ fontFamily: FONT_SERIF_ELEGANT }} className="text-4xl font-medium italic text-rose-950/80">
            {begruessung().toLowerCase()}
          </h1>
          <p className="mt-1.5 text-sm lowercase tracking-wide text-rose-400">
            {datumLang(heute())}
          </p>
        </header>

        <div className="mb-8 flex gap-3">
          <CleanPill wert={offene.length} label="offen" farbe="bg-rose-100/70 text-rose-600" />
          <CleanPill wert={heuteFaellig} label="heute" farbe="bg-purple-100/70 text-purple-600" />
          <CleanPill wert={erledigt} label="erledigt" farbe="bg-amber-100/70 text-amber-700" />
        </div>

        <section className="mb-8">
          <button
            onClick={() => onNavigate("kalender")}
            style={{ fontFamily: FONT_SERIF_ELEGANT }}
            className="mb-3 text-lg italic text-rose-950/70 transition-colors hover:text-rose-500"
          >
            heute ☕
          </button>
          <div className="overflow-hidden rounded-3xl shadow-[0_20px_50px_-30px_rgba(219,112,147,0.7)]">
            <KalenderPanel nurHeute />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => onNavigate("todos")}
              style={{ fontFamily: FONT_SERIF_ELEGANT }}
              className="text-lg italic text-rose-950/70 transition-colors hover:text-rose-500"
            >
              to-do ♡
            </button>
            <TodoErstellen
              knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-rose-400 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-500"
              knopfInhalt="+ hinzufügen"
            />
          </div>

          {gruppen.length === 0 && ohneGruppe.length === 0 ? (
            <p className="rounded-3xl bg-white/60 py-10 text-center text-sm text-rose-400">
              alles erledigt ♡
            </p>
          ) : (
            <div className="space-y-5">
              {gruppen.map(({ projekt, todos: projektTodos }) => (
                <div key={projekt.id}>
                  <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="mb-1.5 px-1 text-sm italic text-rose-500">
                    {projekt.name}
                  </p>
                  <ul className="space-y-2">
                    {projektTodos.slice(0, 5).map((t) => (
                      <CleanGirlZeile key={t.id} todo={t} onToggle={toggle} />
                    ))}
                  </ul>
                </div>
              ))}
              {ohneGruppe.length > 0 && (
                <div>
                  {gruppen.length > 0 && (
                    <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="mb-1.5 px-1 text-sm italic text-rose-500">
                      sonstiges
                    </p>
                  )}
                  <ul className="space-y-2">
                    {ohneGruppe.slice(0, 6).map((t) => (
                      <CleanGirlZeile key={t.id} todo={t} onToggle={toggle} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Notion" – ruhig, minimal, Emoji-Seitenkopf, Haarlinien statt Karten
 * ════════════════════════════════════════════════════════════════════════ */

function NotionZeile({ todo, onToggle }) {
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50">
      <input
        type="checkbox"
        checked={false}
        onChange={() => onToggle(todo.id)}
        className="h-[15px] w-[15px] shrink-0 rounded accent-gray-800"
      />
      <span className="min-w-0 flex-1 truncate text-[15px] text-gray-700">
        {todo.text}
      </span>
      {todo.datum && (
        <span className="shrink-0 text-xs text-gray-400">{tageBis(todo.datum)}</span>
      )}
    </li>
  )
}

function DashboardNotion({ gruppen, ohneGruppe, toggle, onNavigate }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Seitenkopf mit Emoji-„Cover" */}
      <div className="mb-10">
        <div className="text-5xl">🏠</div>
        <h1
          style={{ fontFamily: "var(--font-sans)" }}
          className="mt-3 text-4xl font-bold tracking-tight text-gray-900"
        >
          {begruessung()}
        </h1>
        <p className="mt-1.5 text-sm text-gray-400">{datumLang(heute())}</p>
      </div>

      {/* Aufgaben */}
      <section className="mb-12">
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-1.5">
          <button
            onClick={() => onNavigate("todos")}
            className="text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-700"
          >
            Aufgaben
          </button>
          <TodoErstellen
            knopfKlasse="text-sm text-gray-400 transition-colors hover:text-gray-800"
            knopfInhalt="+ Neu"
          />
        </div>

        {gruppen.length === 0 && ohneGruppe.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-300">Keine offenen Aufgaben.</p>
        ) : (
          <div className="space-y-6">
            {gruppen.map(({ projekt, todos: projektTodos }) => (
              <div key={projekt.id}>
                <p className="mb-1 px-2 text-[13px] font-semibold text-gray-500">
                  {projekt.name}
                </p>
                <ul>
                  {projektTodos.slice(0, 6).map((t) => (
                    <NotionZeile key={t.id} todo={t} onToggle={toggle} />
                  ))}
                </ul>
              </div>
            ))}
            {ohneGruppe.length > 0 && (
              <div>
                {gruppen.length > 0 && (
                  <p className="mb-1 px-2 text-[13px] font-semibold text-gray-500">
                    Weiteres
                  </p>
                )}
                <ul>
                  {ohneGruppe.slice(0, 8).map((t) => (
                    <NotionZeile key={t.id} todo={t} onToggle={toggle} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Kalender */}
      <section>
        <div className="mb-2 border-b border-gray-100 pb-1.5">
          <button
            onClick={() => onNavigate("kalender")}
            className="text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-700"
          >
            Heute
          </button>
        </div>
        <KalenderPanel nurHeute />
      </section>
    </div>
  )
}
