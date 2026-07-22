import useStored from "../lib/useStored"
import { heute, tageBis } from "../lib/datum"
import { datumLang } from "./Kalender"
import { KalenderPanel } from "./KalenderSeite"
import Seitenkopf from "./Seitenkopf"
import TodoErstellen, { EINTEILUNGEN, einteilungVon } from "./TodoErstellen"

function begruessung() {
  const stunde = new Date().getHours()
  if (stunde < 11) return "Guten Morgen"
  if (stunde < 18) return "Guten Tag"
  return "Guten Abend"
}

function Abschnitt({ titel, onOeffnen, aktion, children }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <button
          onClick={onOeffnen}
          className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-900"
        >
          {titel}
          <span className="text-gray-300 transition-colors group-hover:text-gray-900">
            →
          </span>
        </button>
        {aktion}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function Dashboard({ onNavigate }) {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf eyebrow={datumLang(heute())} titel={begruessung()} />

      <Abschnitt titel="Kalender" onOeffnen={() => onNavigate("kalender")}>
        <KalenderPanel nurHeute />
      </Abschnitt>

      <TodoVorschau
        todos={todos}
        setTodos={setTodos}
        projekte={projekte}
        onOeffnen={() => onNavigate("todos")}
      />
    </div>
  )
}

// Eine Todo-Zeile für die Dashboard-Vorschau (bewusst eigenständig statt
// TodosSeite.jsx' TodoZeile – hier ohne Zuordnungs-Badge innerhalb einer
// Projekt-Gruppe, da der Gruppentitel die Zuordnung schon zeigt).
function TodoZeileVorschau({ todo, onToggle, zuordnungsName }) {
  const einteilung = einteilungVon(todo)
  return (
    <li className="group flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300">
      <span className={`w-1 shrink-0 ${einteilung.punkt}`} />
      <div className="flex flex-1 items-center gap-3 px-3.5 py-2.5">
        <input
          type="checkbox"
          checked={false}
          onChange={() => onToggle(todo.id)}
          className="h-4 w-4 shrink-0 accent-gray-900"
        />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
          {todo.text}
        </span>
        {zuordnungsName && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {zuordnungsName}
          </span>
        )}
        {todo.datum && (
          <span className="shrink-0 text-xs text-gray-400">
            {tageBis(todo.datum)}
          </span>
        )}
      </div>
    </li>
  )
}

// Todos nach laufendem Projekt gruppiert: „laufend" = nicht archiviert
// und Status ungleich „fertig" (offen ODER aktiv zählt als laufend,
// sonst blieben Todos der meisten – nie manuell auf „aktiv" gesetzten –
// Projekte unsichtbar). Rest ohne laufendes Projekt landet in „Ohne
// Projekt". Innerhalb jeder Gruppe gilt weiter die Eisenhower-Sortierung.
function TodoVorschau({ todos, setTodos, projekte, onOeffnen }) {
  const gruppenReihenfolge = (t) => EINTEILUNGEN.findIndex((g) => g.passt(t))
  const sortiere = (liste) =>
    [...liste].sort(
      (a, b) =>
        gruppenReihenfolge(a) - gruppenReihenfolge(b) ||
        (a.datum || "9999").localeCompare(b.datum || "9999")
    )

  const offene = todos.filter((t) => !t.erledigt)
  const laufend = projekte.filter(
    (p) => !p.archiviert && (p.status ?? "offen") !== "fertig"
  )

  const gruppen = laufend
    .map((p) => ({
      projekt: p,
      todos: sortiere(
        offene.filter((t) => (t.projektId ?? t.kursId) === p.id)
      ),
    }))
    .filter((g) => g.todos.length > 0)

  const ohneGruppe = sortiere(
    offene.filter((t) => {
      const pid = t.projektId ?? t.kursId
      return !pid || !laufend.some((p) => p.id === pid)
    })
  )

  function toggle(id) {
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }

  return (
    <Abschnitt titel="Todos" onOeffnen={onOeffnen} aktion={<TodoErstellen />}>
      {gruppen.length === 0 && ohneGruppe.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-sm text-gray-400">
          Keine offenen Todos.
        </div>
      ) : (
        <div className="space-y-4">
          {gruppen.map(({ projekt, todos: projektTodos }) => (
            <div key={projekt.id}>
              <p className="mb-1.5 text-xs font-medium text-gray-500">
                {projekt.name}
              </p>
              <ul className="space-y-2">
                {projektTodos.slice(0, 4).map((t) => (
                  <TodoZeileVorschau key={t.id} todo={t} onToggle={toggle} />
                ))}
              </ul>
            </div>
          ))}
          {ohneGruppe.length > 0 && (
            <div>
              {gruppen.length > 0 && (
                <p className="mb-1.5 text-xs font-medium text-gray-500">
                  Ohne Projekt
                </p>
              )}
              <ul className="space-y-2">
                {ohneGruppe.slice(0, 4).map((t) => (
                  <TodoZeileVorschau key={t.id} todo={t} onToggle={toggle} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Abschnitt>
  )
}
