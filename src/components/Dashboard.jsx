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
