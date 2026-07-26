import useStored from "../lib/useStored"
import { tageBis } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import { rangVon, xpVonTodos, levelVon } from "../lib/spiel"
import Seitenkopf from "./Seitenkopf"
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
        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
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
  const [einstellungen] = useStored("einstellungen", { stil: STIL_STANDARD })
  const stil = normalisiereStil(einstellungen?.stil)

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

  if (stil === "gamified") {
    return (
      <TodosGamified
        todos={todos}
        offene={offene}
        erledigte={erledigte}
        toggle={toggle}
        remove={remove}
        zuordnungsName={zuordnungsName}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf titel="Todos" aktion={<TodoErstellen />} />

      <div className="mt-8 space-y-8">
        {EINTEILUNGEN.map((gruppe) => {
          const eintraege = offene
            .filter((t) => gruppe.passt(t))
            .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
          return (
            <section key={gruppe.key}>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
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
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
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

/* ══════════════════════════════════════════════════════════════════════════
 * Gamified-Stil: „Quest Board" – Todos als RPG-Quests mit Rang, XP und Gold.
 * ════════════════════════════════════════════════════════════════════════ */

function XpBalken({ fortschritt }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
        style={{ width: `${fortschritt}%` }}
      />
    </div>
  )
}

function QuestKarte({ todo, rang, zuordnung, onToggle, onRemove }) {
  const pal = FARBEN[rang.farbe] ?? FARBEN.gray
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 transition-colors hover:border-white/25">
      <button
        onClick={() => onToggle(todo.id)}
        title="Quest abschließen"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white/40 transition-colors hover:border-amber-300 hover:bg-amber-300 hover:text-slate-900"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className="text-lg leading-none">{rang.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">{todo.text}</span>
        {(zuordnung || todo.datum) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/40">
            {zuordnung && <span>📍 {zuordnung}</span>}
            {todo.datum && <span>⏳ {tageBis(todo.datum)}</span>}
          </span>
        )}
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${pal.punkt}`}>
        +{rang.xp} XP
      </span>
      <button
        onClick={() => onRemove(todo.id)}
        title="Quest aufgeben"
        className="shrink-0 text-white/20 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        ×
      </button>
    </li>
  )
}

function TodosGamified({ todos, offene, erledigte, toggle, remove, zuordnungsName }) {
  const xp = xpVonTodos(todos, einteilungVon)
  const { level, xpInLevel, xpProLevel, fortschritt } = levelVon(xp)
  const gold = erledigte.length * 10

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 px-5 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Helden-Header */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">
                ⚔️
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                  Quest Board
                </p>
                <h1 style={{ fontFamily: "var(--font-sans)" }} className="text-2xl font-bold">
                  Level {level}
                </h1>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-amber-300">🪙 {gold}</p>
              <p className="text-white/50">{offene.length} offen</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <XpBalken fortschritt={fortschritt} />
            </div>
            <span className="shrink-0 text-[11px] font-medium text-white/50">
              {xpInLevel}/{xpProLevel} XP
            </span>
          </div>
        </div>

        {/* Anlegen */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">
            Offene Quests
          </h2>
          <TodoErstellen
            knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-300"
            knopfInhalt="+ Neue Quest"
          />
        </div>

        {offene.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 py-12 text-center text-sm text-white/40">
            Alle Quests erledigt, Held! 🏆
          </div>
        ) : (
          <div className="space-y-6">
            {EINTEILUNGEN.map((gruppe) => {
              const eintraege = offene
                .filter((t) => gruppe.passt(t))
                .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
              if (eintraege.length === 0) return null
              const rang = rangVon(gruppe.key)
              const pal = FARBEN[rang.farbe] ?? FARBEN.gray
              return (
                <section key={gruppe.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-base">{rang.emoji}</span>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">
                      {rang.label}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${pal.punkt}`}>
                      +{rang.xp} XP
                    </span>
                    <span className="text-[11px] text-white/40">×{eintraege.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {eintraege.map((t) => (
                      <QuestKarte
                        key={t.id}
                        todo={t}
                        rang={rang}
                        zuordnung={zuordnungsName(t)}
                        onToggle={toggle}
                        onRemove={remove}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        {/* Abgeschlossen */}
        {erledigte.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
              ✔️ Abgeschlossen ({erledigte.length})
            </h3>
            <ul className="space-y-1.5">
              {erledigte.map((t) => {
                const rang = rangVon(einteilungVon(t).key)
                return (
                  <li key={t.id} className="group flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3.5 py-2">
                    <button
                      onClick={() => toggle(t.id)}
                      title="Wieder öffnen"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/80 text-white"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/40 line-through">{t.text}</span>
                    <span className="shrink-0 text-[10px] font-semibold text-amber-300/70">+{rang.xp} XP</span>
                    <button
                      onClick={() => remove(t.id)}
                      title="Löschen"
                      className="shrink-0 text-white/20 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
