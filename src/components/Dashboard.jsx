import useStored from "../lib/useStored"
import { heute, tageBis } from "../lib/datum"
import { datumLang } from "./Kalender"
import { KalenderPanel } from "./KalenderSeite"
import Seitenkopf from "./Seitenkopf"
import TodoErstellen, { EINTEILUNGEN, einteilungVon } from "./TodoErstellen"
import {
  projektFortschrittWerte,
  DeadlineChip,
  Fortschrittsbalken,
} from "./OrdnerSeite"

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
  const [ordner] = useStored("ordner", [])
  const [termine] = useStored("termine", [])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf eyebrow={datumLang(heute())} titel={begruessung()} />

      <TagesUeberblick termine={termine} todos={todos} projekte={projekte} />

      <Abschnitt titel="Kalender" onOeffnen={() => onNavigate("kalender")}>
        <KalenderPanel nurHeute />
      </Abschnitt>

      <TodoVorschau
        todos={todos}
        setTodos={setTodos}
        projekte={projekte}
        onOeffnen={() => onNavigate("todos")}
      />

      <DeepWorkVorschau onOeffnen={() => onNavigate("deepwork")} />

      <ProjektBaum
        ordner={ordner}
        projekte={projekte}
        todos={todos}
        onOeffnen={() => onNavigate("projekte")}
        onProjekt={(id) => onNavigate("projekte", id)}
      />
    </div>
  )
}

function TagesUeberblick({ termine, todos, projekte }) {
  const heuteKey = heute()

  const heutige = [
    ...termine
      .filter((t) => t.datum === heuteKey)
      .map((t) => ({ label: t.titel, zeit: t.zeit, dauer: t.dauer })),
    ...projekte
      .filter((p) => p.deadline === heuteKey)
      .map((p) => ({ label: `Deadline: ${p.name}` })),
    ...todos
      .filter((t) => !t.erledigt && t.datum === heuteKey)
      .map((t) => ({ label: t.text })),
  ].sort((a, b) => (a.zeit || "99:99").localeCompare(b.zeit || "99:99"))

  if (heutige.length === 0) return null

  return (
    <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-5 py-1">
      {heutige.map((e, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
          <span className="w-12 text-xs text-gray-400">{e.zeit || "–"}</span>
          <span className="flex-1 text-gray-800">{e.label}</span>
          {e.dauer && (
            <span className="text-xs text-gray-400">{e.dauer} Min.</span>
          )}
        </li>
      ))}
    </ul>
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

function DeepWorkVorschau({ onOeffnen }) {
  const [sessions] = useStored("deepwork", [])
  const heutigeMinuten = sessions
    .filter((s) => s.datum === heute())
    .reduce((summe, s) => summe + s.minuten, 0)

  return (
    <Abschnitt titel="Deep Work" onOeffnen={onOeffnen}>
      <button
        onClick={onOeffnen}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-gray-400"
      >
        <span>
          <span className="block text-sm font-medium text-gray-900">
            Fokus-Timer starten
          </span>
          <span className="mt-0.5 block text-xs text-gray-400">
            {heutigeMinuten > 0
              ? `Heute ${heutigeMinuten} Minuten fokussiert`
              : "Heute noch keine Fokus-Session"}
          </span>
        </span>
        <span className="text-gray-300">→</span>
      </button>
    </Abschnitt>
  )
}

// Notion-artige Baumansicht: Ordner mit ihren Projekten, eingerückt.
function ProjektBaum({ ordner, projekte, todos, onOeffnen, onProjekt }) {
  const zeilen = []

  function sammle(parentId, ebene) {
    for (const p of projekte.filter(
      (x) => !x.archiviert && (x.ordnerId ?? null) === parentId
    )) {
      zeilen.push({ typ: "projekt", obj: p, ebene })
    }
    for (const o of ordner.filter((x) => (x.parentId ?? null) === parentId)) {
      zeilen.push({ typ: "ordner", obj: o, ebene })
      sammle(o.id, ebene + 1)
    }
  }
  sammle(null, 0)

  return (
    <Abschnitt titel="Projekte" onOeffnen={onOeffnen}>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Deadline</th>
              <th className="px-4 py-2.5 font-semibold">Fortschritt</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-6 text-center text-gray-400">
                  Noch keine Ordner oder Projekte angelegt.
                </td>
              </tr>
            ) : (
              zeilen.map(({ typ, obj, ebene }) => (
                <tr
                  key={`${typ}-${obj.id}`}
                  onClick={typ === "projekt" ? () => onProjekt(obj.id) : onOeffnen}
                  className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td
                    className="px-4 py-2.5"
                    style={{ paddingLeft: 16 + ebene * 24 }}
                  >
                    {typ === "ordner" ? (
                      <span className="flex items-center gap-2">
                        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          Ordner
                        </span>
                        <span className="font-medium text-gray-500">
                          {obj.name}
                        </span>
                      </span>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {obj.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {typ === "projekt" && obj.deadline && (
                      <DeadlineChip datum={obj.deadline} />
                    )}
                  </td>
                  <td className="w-44 px-4 py-2.5">
                    {typ === "projekt" && (
                      <Fortschrittsbalken
                        {...projektFortschrittWerte(obj, todos)}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Abschnitt>
  )
}
