import useStored from "../lib/useStored"
import { tageBis } from "../lib/datum"
import TodoErstellen, { EINTEILUNGEN, einteilungVon } from "./TodoErstellen"

export function TodoZeile({ todo, onToggle, onRemove, zuordnungsName }) {
  const einteilung = einteilungVon(todo)
  return (
    <li className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${einteilung.punkt}`} />
      <input
        type="checkbox"
        checked={!!todo.erledigt}
        onChange={() => onToggle(todo.id)}
        className="h-4 w-4 accent-gray-900"
      />
      <span
        className={`flex-1 truncate text-sm ${
          todo.erledigt ? "text-gray-400 line-through" : "text-gray-800"
        }`}
      >
        {todo.text}
      </span>
      {zuordnungsName && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {zuordnungsName}
        </span>
      )}
      {todo.dauer && (
        <span className="text-xs text-gray-400">{todo.dauer} Min.</span>
      )}
      {todo.datum && (
        <span className="text-xs text-gray-400">{tageBis(todo.datum)}</span>
      )}
      <button
        onClick={() => onRemove(todo.id)}
        title="Todo löschen"
        className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        ×
      </button>
    </li>
  )
}

export default function TodosSeite() {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])

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

  const offene = todos.filter((t) => !t.erledigt)
  const erledigte = todos.filter((t) => t.erledigt)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Todos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Sortiert nach wichtig und dringend.
          </p>
        </div>
        <TodoErstellen />
      </div>

      <div className="mt-8 space-y-8">
        {EINTEILUNGEN.map((gruppe) => {
          const eintraege = offene
            .filter((t) => gruppe.passt(t))
            .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
          return (
            <section key={gruppe.key}>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                <span className={`h-2 w-2 rounded-full ${gruppe.punkt}`} />
                {gruppe.label} ({eintraege.length})
              </h2>
              {eintraege.length === 0 ? (
                <p className="mt-2 text-sm text-gray-300">Nichts offen.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {eintraege.map((t) => (
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
            </section>
          )
        })}

        {erledigte.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Erledigt ({erledigte.length})
            </h2>
            <ul className="mt-2 space-y-1.5">
              {erledigte.map((t) => (
                <TodoZeile
                  key={t.id}
                  todo={t}
                  onToggle={toggle}
                  onRemove={remove}
                  zuordnungsName={zuordnungsName(t)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
