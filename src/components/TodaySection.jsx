import { tageBis, heute } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import { einteilungVon } from "./TodoErstellen"
import { wochenStreakVon } from "./HabitsSeite"

function TodayFilters({ filters, onChange }) {
  const filterButtons = [
    { key: "todos", label: "Aufgaben", icon: "✅" },
    { key: "termine", label: "Termine", icon: "🗓️" },
    { key: "habits", label: "Habits", icon: "💪" },
    { key: "deepwork", label: "Focus", icon: "🎯" },
    { key: "inbox", label: "Inbox", icon: "📥" },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {filterButtons.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            filters[key]
              ? "bg-accent-100 text-accent-700"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <span className="mr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

function TodayTodos({ todos, onToggle, projekte }) {
  if (!todos || todos.length === 0) return null

  const getProjektName = (projektId, kursId) => {
    if (!projektId && !kursId) return null
    const id = projektId ?? kursId
    return projekte?.find((p) => p.id === id)?.name
  }

  const einteilung = (t) => einteilungVon(t)

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span>📋</span> Heute fällig ({todos.length})
      </h3>
      <ul className="space-y-2">
        {todos.map((t) => {
          const ein = einteilung(t)
          const projektName = getProjektName(t.projektId, t.kursId)
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-gray-300"
            >
              <button
                onClick={() => onToggle(t.id)}
                title="Als erledigt markieren"
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current transition-colors ${ein.text}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 opacity-0 transition-opacity hover:opacity-100">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </button>
              <span className="min-w-0 flex-1 text-gray-800">{t.text}</span>
              {projektName && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  {projektName}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TodayTermine({ termine, onNavigate }) {
  if (!termine || termine.length === 0) return null

  const timeFormat = (zeitstring) => {
    if (!zeitstring) return ""
    const [h, m] = zeitstring.split(":").map(Number)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span>🗓️</span> Heute Termine ({termine.length})
      </h3>
      <ul className="space-y-2">
        {termine.map((t) => (
          <li
            key={t.id}
            onClick={() => onNavigate("kalender")}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-accent-300 hover:bg-accent-50"
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-16 text-xs font-medium text-gray-500">
                {timeFormat(t.von)}
                {t.bis && ` – ${timeFormat(t.bis)}`}
              </span>
              <span className="min-w-0 flex-1 text-gray-800">{t.titel}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TodayHabits({ habits, bereiche, onToggle }) {
  if (!habits || habits.length === 0) return null

  const heuteKey = heute()
  const habitsHeuteErledigt = habits.filter((h) =>
    h.erledigtAn?.includes(heuteKey)
  ).length

  const getBereichFarbe = (bereichId) => {
    const bereich = bereiche?.find((b) => b.id === bereichId)
    return bereich?.farbe || "gray"
  }

  const getBereichNamen = (bereichId) => {
    const bereich = bereiche?.find((b) => b.id === bereichId)
    return bereich?.name || ""
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span>💪</span> Habits ({habitsHeuteErledigt}/{habits.length})
      </h3>
      <ul className="space-y-2">
        {habits.map((h) => {
          const isComplete = h.erledigtAn?.includes(heuteKey)
          const streak = wochenStreakVon(h)
          const bereichName = getBereichNamen(h.bereichId)
          const bereichFarbe = getBereichFarbe(h.bereichId)
          const pal = FARBEN[bereichFarbe] ?? FARBEN.gray

          return (
            <li
              key={h.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                isComplete
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <button
                onClick={() => onToggle(h.id)}
                title={isComplete ? "Rückgängig" : "Erledigt"}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  isComplete
                    ? `border-current ${pal.punkt}`
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {isComplete && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </button>
              <span className={`min-w-0 flex-1 ${isComplete ? "text-gray-500 line-through" : "text-gray-800"}`}>
                {h.name}
              </span>
              {bereichName && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${pal.punkt}`}
                >
                  {bereichName}
                </span>
              )}
              {streak > 0 && (
                <span className="shrink-0 text-xs font-semibold text-orange-500">
                  🔥{streak}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TodayDeepWork({ deepwork, projekte }) {
  if (!deepwork || deepwork.length === 0) return null

  const timeFormat = (zeitstring) => {
    if (!zeitstring) return ""
    const [h, m] = zeitstring.split(":").map(Number)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  const getProjektName = (projektId) => {
    return projekte?.find((p) => p.id === projektId)?.name || ""
  }

  const totalMinutes = deepwork.reduce((sum, d) => {
    if (!d.von || !d.bis) return sum
    const [vh, vm] = d.von.split(":").map(Number)
    const [bh, bm] = d.bis.split(":").map(Number)
    return sum + (bh * 60 + bm - (vh * 60 + vm))
  }, 0)

  const totalHours = (totalMinutes / 60).toFixed(1)
  const hoursInGoal = 3 // default goal

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span>🎯</span> Deep Work ({deepwork.length})
      </h3>
      <ul className="space-y-2">
        {deepwork.map((d) => {
          const projektName = getProjektName(d.projektId)
          return (
            <li
              key={d.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-gray-300"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-16 text-xs font-medium text-gray-500">
                  {timeFormat(d.von)}
                  {d.bis && ` – ${timeFormat(d.bis)}`}
                </span>
                <span className="min-w-0 flex-1 text-gray-800">{d.thema}</span>
                {projektName && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {projektName}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 rounded-lg bg-gray-50 p-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-gray-600">Fokuszeit heute</span>
          <span className="text-xs font-medium text-gray-400">
            {totalHours} / {hoursInGoal} hrs
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-500"
            style={{
              width: `${Math.min(100, (parseFloat(totalHours) / hoursInGoal) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function TodayInbox({ count, onNavigate }) {
  if (count === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span>📥</span> Inbox
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {count} {count === 1 ? "Element" : "Elemente"} warten auf Verarbeitung
          </p>
        </div>
        <button
          onClick={() => onNavigate("sammeln")}
          className="shrink-0 rounded-lg bg-accent-100 px-3 py-2 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-200"
        >
          Verarbeiten →
        </button>
      </div>
    </div>
  )
}

export function TodaySection({
  todayData,
  filters,
  onFilterChange,
  onTodoToggle,
  onHabitToggle,
  onNavigate,
  projekte,
  bereiche,
}) {
  if (
    !filters.todos &&
    !filters.termine &&
    !filters.habits &&
    !filters.deepwork &&
    !filters.inbox
  ) {
    return null
  }

  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Heute im Überblick
        </h2>
        <TodayFilters filters={filters} onChange={onFilterChange} />
      </div>

      <div className="space-y-6">
        {filters.todos && (
          <TodayTodos
            todos={todayData.todosDueToday}
            onToggle={onTodoToggle}
            projekte={projekte}
          />
        )}

        {filters.termine && (
          <TodayTermine
            termine={todayData.appointmentsToday}
            onNavigate={onNavigate}
          />
        )}

        {filters.habits && (
          <TodayHabits
            habits={todayData.habitsToday}
            bereiche={bereiche}
            onToggle={onHabitToggle}
          />
        )}

        {filters.deepwork && (
          <TodayDeepWork
            deepwork={todayData.deepworkToday}
            projekte={projekte}
          />
        )}

        {filters.inbox && (
          <TodayInbox count={todayData.inboxCount} onNavigate={onNavigate} />
        )}
      </div>
    </section>
  )
}
