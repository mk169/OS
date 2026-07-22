import useStored from "../lib/useStored"
import { heute, inTagen, montagVon, tageBisZahl } from "../lib/datum"
import Seitenkopf from "./Seitenkopf"
import { TodoZeile } from "./TodosSeite"
import { sammleTermine, DeadlineChip } from "./OrdnerSeite"
import { wochenZielErreicht } from "./HabitsSeite"

// Wochen-Review: zeigt proaktiv, was liegen geblieben, überfällig oder
// unbearbeitet ist – kein NAV-Eintrag, erreichbar wie „Suchen" über einen
// dauerhaften Link neben dem Such-Icon (App.jsx).

function Abschnitt({ titel, aktion, children }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {titel}
        </h2>
        {aktion}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function LeerHinweis({ text }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
      {text}
    </p>
  )
}

export default function ReviewSeite({ onNavigate }) {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [inbox] = useStored("inbox", [])
  const [habits] = useStored("habits", [])

  function zuordnungsName(todo) {
    const id = todo.projektId ?? todo.kursId
    return id ? projekte.find((p) => p.id === id)?.name : null
  }

  function toggle(id) {
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }

  function remove(id) {
    setTodos(todos.filter((t) => t.id !== id))
  }

  const heuteKey = heute()
  const ueberfaellig = todos
    .filter((t) => !t.erledigt && t.datum && tageBisZahl(t.datum) < 0)
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const wocheAktuell = montagVon(new Date())
  const letzteWoche = new Date(wocheAktuell)
  letzteWoche.setDate(letzteWoche.getDate() - 7)
  const habitsVerpasst = habits.filter(
    (h) => !wochenZielErreicht(h, letzteWoche)
  )

  const in7 = inTagen(7)
  const dieseWoche = sammleTermine(
    projekte.filter((p) => !p.archiviert),
    todos
  )
    .filter((e) => e.datum >= heuteKey && e.datum <= in7)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const projektName = (id) => projekte.find((p) => p.id === id)?.name ?? ""

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf titel="Wochenrückblick" />

      <Abschnitt titel="Überfällig">
        {ueberfaellig.length === 0 ? (
          <LeerHinweis text="Nichts überfällig." />
        ) : (
          <ul className="space-y-1.5">
            {ueberfaellig.map((t) => (
              <TodoZeile
                key={t.id}
                todo={t}
                onToggle={toggle}
                onRemove={remove}
                zuordnungsName={zuordnungsName(t)}
              />
            ))}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt
        titel="Inbox unbearbeitet"
        aktion={
          <button
            onClick={() => onNavigate("sammeln")}
            className="text-xs text-gray-400 hover:text-gray-900"
          >
            Zu Sammeln →
          </button>
        }
      >
        {inbox.length === 0 ? (
          <LeerHinweis text="Inbox leer." />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-900">
              {inbox.length} unbearbeitete{" "}
              {inbox.length === 1 ? "Notiz" : "Notizen"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {inbox.slice(0, 3).map((item) => (
                <li key={item.id} className="truncate">
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Abschnitt>

      <Abschnitt
        titel="Habits verpasst (letzte Woche)"
        aktion={
          <button
            onClick={() => onNavigate("habits")}
            className="text-xs text-gray-400 hover:text-gray-900"
          >
            Zu Habits →
          </button>
        }
      >
        {habits.length === 0 ? (
          <LeerHinweis text="Noch keine Habits angelegt." />
        ) : habitsVerpasst.length === 0 ? (
          <LeerHinweis text="Letzte Woche haben alle Habits ihr Ziel erreicht." />
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {habitsVerpasst.map((h) => (
              <li key={h.id} className="px-4 py-2.5 text-sm text-gray-800">
                {h.name}
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt titel="Diese Woche fällig">
        {dieseWoche.length === 0 ? (
          <LeerHinweis text="Nichts in den nächsten 7 Tagen fällig." />
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {dieseWoche.map((e, i) => (
              <li
                key={i}
                onClick={() => onNavigate("projekte", e.projektId)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <span className="w-20 shrink-0 text-xs text-gray-500">
                  {new Date(e.datum).toLocaleDateString("de-DE")}
                </span>
                <DeadlineChip datum={e.datum} />
                <span className="flex-1 truncate text-sm text-gray-800">
                  {e.label}
                </span>
                <span className="hidden max-w-32 truncate text-xs text-gray-400 sm:inline">
                  {projektName(e.projektId)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>
    </div>
  )
}
