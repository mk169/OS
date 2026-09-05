import { useState } from "react"
import useStored from "../lib/useStored"
import { fristTon, tageBis } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import { rangVon, xpVonTodos, levelVon } from "../lib/spiel"
import Seitenkopf from "./Seitenkopf"
import TodoErstellen from "./TodoErstellen"
import { EINTEILUNGEN, einteilungVon } from "../lib/todos"
import LoeschKnopf from "./LoeschKnopf"

const FONT_ARCADE = '"Press Start 2P", ui-monospace, monospace'
const FONT_TERMINAL = '"VT323", ui-monospace, "SF Mono", Menlo, monospace'
const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

const GEISTER_FARBEN = {
  "wichtig-dringend": "#ff0000",
  wichtig: "#ffb8ff",
  dringend: "#ffb852",
  sonstige: "#00ffff",
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
    setTodos(todos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t)))
  }

  function remove(id) {
    setTodos(todos.filter((t) => t.id !== id))
  }

  const offene = todos.filter((t) => !t.erledigt)
  const erledigte = todos.filter((t) => t.erledigt)
  const gemeinsam = { todos, offene, erledigte, toggle, remove, zuordnungsName }

  if (stil === "gamified") return <TodosGamified {...gemeinsam} />
  if (stil === "arcade") return <TodosArcade {...gemeinsam} />
  if (stil === "cleangirl") return <TodosCleanGirl {...gemeinsam} />
  if (stil === "notion") return <TodosNotion {...gemeinsam} />
  if (stil === "lockedin") return <TodosLockedIn {...gemeinsam} />
  return <TodosTodo {...gemeinsam} />
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Todo-Liste" – klare Karten, farbige Punkte (Todoist)
 * ════════════════════════════════════════════════════════════════════════ */

// Frist mit Dringlichkeits-Ton: Überfälliges soll nicht als graues „vorbei"
// zwischen den übrigen Zeilen untergehen.
const FRIST_TON = {
  vorbei: "bg-red-50 text-red-600",
  heute: "bg-amber-50 text-amber-700",
  bald: "bg-gray-100 text-gray-600",
  fern: "text-gray-400",
}

export function FristChip({ datum, gedaempft = false }) {
  const ton = fristTon(datum)
  if (!ton) return null
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        gedaempft ? "text-gray-400" : FRIST_TON[ton]
      }`}
    >
      {tageBis(datum)}
    </span>
  )
}

function TodoRow({ todo, onToggle, onRemove, zuordnungsName }) {
  const einteilung = einteilungVon(todo)
  const [bearbeiten, setBearbeiten] = useState(false)

  // Klick auf den Text öffnet dasselbe Formular wie beim Anlegen, nur
  // vorbelegt – ein Tippfehler oder ein verschobenes Datum soll kein Löschen
  // und Neuanlegen erzwingen.
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
      {zuordnungsName && (
        <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {zuordnungsName}
        </span>
      )}
      {todo.dauer && (
        <span className="text-xs text-gray-400">{todo.dauer} Min.</span>
      )}
      <FristChip datum={todo.datum} gedaempft={todo.erledigt} />
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        titel="Todo löschen"
        klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}

function StatKachel({ wert, label, akzent, ton }) {
  const farbe =
    ton === "warnung" ? "text-red-600" : akzent ? "text-accent-600" : "text-gray-900"
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm shadow-gray-100">
      <p className={`text-2xl font-bold tracking-tight ${farbe}`}>{wert}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

function TodosTodo({ _todos, offene, erledigte, toggle, remove, zuordnungsName }) {
  const heuteFaellig = offene.filter((t) => fristTon(t.datum) === "heute").length
  const ueberfaellig = offene
    .filter((t) => fristTon(t.datum) === "vorbei")
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const uebrige = offene.filter((t) => fristTon(t.datum) !== "vorbei")
  const erledigt = erledigte.length

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf titel="Todos" aktion={<TodoErstellen />} />

      <div className="mb-8 mt-8 flex gap-3">
        <StatKachel wert={offene.length} label="offene Aufgaben" akzent />
        <StatKachel wert={heuteFaellig} label="heute fällig" />
        {ueberfaellig.length > 0 ? (
          <StatKachel wert={ueberfaellig.length} label="überfällig" ton="warnung" />
        ) : (
          <StatKachel wert={erledigt} label="erledigt" />
        )}
      </div>

      <div className="space-y-8">
        {/* Überfälliges zuoberst und mit eigener Überschrift – sonst geht es
            zwischen den Eisenhower-Gruppen unter. */}
        {ueberfaellig.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Überfällig ({ueberfaellig.length})
            </h2>
            <ul className="mt-2 space-y-2">
              {ueberfaellig.map((t) => (
                <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
              ))}
            </ul>
          </section>
        )}

        {offene.length === 0 && erledigte.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-400">
            Nichts offen. Leg mit „+" die erste Aufgabe an.
          </p>
        )}

        {offene.length === 0 && erledigte.length > 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center text-sm text-gray-400">
            Alles abgehakt. Setz dir das Nächste.
          </p>
        )}

        {EINTEILUNGEN.map((gruppe) => {
          const eintraege = uebrige
            .filter((t) => gruppe.passt(t))
            .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
          if (eintraege.length === 0) return null
          return (
            <section key={gruppe.key}>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                <span className={`h-2 w-2 rounded-full ${gruppe.punkt}`} />
                {gruppe.label} ({eintraege.length})
              </h2>
              <ul className="mt-2 space-y-2">
                {eintraege.map((t) => (
                  <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
                ))}
              </ul>
            </section>
          )
        })}

        {erledigte.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Erledigt ({erledigte.length})
            </h2>
            <ul className="mt-2 space-y-2">
              {erledigte.map((t) => (
                <TodoRow key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Arcade" – Retro Pac-Man im Terminal-Stil
 * ════════════════════════════════════════════════════════════════════════ */

function PacIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0">
      <path fill="#ffd400" d="M16 16 L31 8.5 A16 16 0 1 0 31 23.5 Z" />
    </svg>
  )
}

function GhostIcon({ size = 24, color = "#ff0000" }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0">
      <path
        fill={color}
        d="M4 30 V15 a12 12 0 0 1 24 0 V30 l-4-3 -4 3 -4-3 -4 3 -4-3 -4 3 Z"
      />
      <circle cx="12" cy="15" r="3.4" fill="#fff" />
      <circle cx="21" cy="15" r="3.4" fill="#fff" />
      <circle cx="13" cy="15.5" r="1.7" fill="#2121ff" />
      <circle cx="22" cy="15.5" r="1.7" fill="#2121ff" />
    </svg>
  )
}

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

function ArcadeGhostRow({ label, meta, color, erledigt, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded border-2 border-blue-800 bg-blue-950/40 px-3 py-2.5 text-left transition-colors hover:border-blue-400"
    >
      <GhostIcon size={26} color={color} />
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

function TodosArcade({ _todos, offene, erledigte, toggle, _remove, _zuordnungsName }) {
  const erledigtGesamt = erledigte.length
  const level = Math.floor(erledigtGesamt / 10) + 1
  const score = erledigtGesamt * 100
  const hiScore = (erledigtGesamt + offene.length) * 100

  const todoQuests = offene.slice(0, 8)

  return (
    <div style={{ fontFamily: FONT_TERMINAL }} className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
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

        <div className="mb-6 flex items-center gap-3">
          <PacIcon size={30} />
          <div className="min-w-0">
            <h1 style={{ fontFamily: FONT_ARCADE }} className="text-[13px] leading-tight text-yellow-300">
              READY!
            </h1>
            <p className="truncate text-xl leading-tight text-white/70">Todos</p>
          </div>
        </div>

        <div className="mb-7 space-y-3">
          <PacLane label="ERLEDIGT" wert={erledigtGesamt} max={erledigtGesamt + offene.length} />
          <PacLane label="OFFEN" wert={offene.length} max={offene.length + erledigtGesamt} />
        </div>

        <div className="mb-3">
          <h2 style={{ fontFamily: FONT_ARCADE }} className="text-[10px] text-white">
            ◄ QUESTS ►
          </h2>
        </div>

        {todoQuests.length === 0 ? (
          <p className="rounded border-2 border-blue-800 py-8 text-center text-xl text-white/50">
            GAME OVER — alle Quests erledigt!
          </p>
        ) : (
          <div className="space-y-2">
            {todoQuests.map((t) => {
              const ghostColor = GEISTER_FARBEN[einteilungVon(t).key] ?? "#00ffff"
              return (
                <ArcadeGhostRow
                  key={t.id}
                  label={t.text}
                  meta={t.datum ? tageBis(t.datum) : null}
                  color={ghostColor}
                  erledigt={false}
                  onToggle={() => toggle(t.id)}
                />
              )
            })}
          </div>
        )}

        {erledigte.length > 0 && (
          <div className="mt-6 space-y-2">
            <h2 style={{ fontFamily: FONT_ARCADE }} className="text-[10px] text-emerald-400">
              ◄ CAUGHT ►
            </h2>
            {erledigte.slice(0, 5).map((t) => {
              const ghostColor = GEISTER_FARBEN[einteilungVon(t).key] ?? "#00ffff"
              return (
                <ArcadeGhostRow
                  key={t.id}
                  label={t.text}
                  meta="200"
                  color={ghostColor}
                  erledigt={true}
                  onToggle={() => toggle(t.id)}
                />
              )
            })}
            {erledigte.length > 5 && (
              <p style={{ fontFamily: FONT_ARCADE }} className="text-[8px] text-white/50">
                +{erledigte.length - 5} more
              </p>
            )}
          </div>
        )}

        <div className="mt-4">
          <TodoErstellen
            knopfKlasse="inline-flex items-center gap-2 rounded border-2 border-yellow-400 bg-black px-4 py-2 text-sm text-yellow-300 transition-colors hover:bg-yellow-400 hover:text-black"
            knopfInhalt="+ INSERT COIN"
          />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Clean Girl" – soft, pastellrosa, elegant
 * ════════════════════════════════════════════════════════════════════════ */

function CleanGirlZeile({ todo, onToggle, onRemove, zuordnungsName }) {
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
      <span className={`min-w-0 flex-1 truncate text-[14px] ${todo.erledigt ? "text-rose-300/50 line-through" : "text-rose-700"}`}>
        {todo.text}
      </span>
      {zuordnungsName && (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-500">
          {zuordnungsName}
        </span>
      )}
      {todo.datum && (
        <span className="text-[11px] text-rose-300">{tageBis(todo.datum)}</span>
      )}
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        klasse="text-rose-200 opacity-0 hover:text-rose-400 group-hover:opacity-100"
      />
    </li>
  )
}

function TodosCleanGirl({ offene, erledigte, toggle, remove, zuordnungsName }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-10">
        <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="text-4xl text-rose-400">
          to-do ♡
        </p>
        <p className="mt-2 text-sm text-rose-300">
          {offene.length} {offene.length === 1 ? "task" : "tasks"} to go
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="text-sm italic text-rose-500">
          ongoing
        </p>
        <TodoErstellen
          knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-rose-400 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-500"
          knopfInhalt="+ hinzufügen"
        />
      </div>

      {offene.length === 0 ? (
        <p className="rounded-3xl bg-white/60 py-10 text-center text-sm text-rose-400">
          alles erledigt ♡
        </p>
      ) : (
        <ul className="space-y-3">
          {offene.map((t) => (
            <CleanGirlZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
          ))}
        </ul>
      )}

      {erledigte.length > 0 && (
        <div className="mt-12">
          <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="mb-3 text-sm italic text-rose-300">
            finished
          </p>
          <ul className="space-y-2 opacity-60">
            {erledigte.slice(0, 5).map((t) => (
              <CleanGirlZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Notion" – minimal, subtil, Haarlinien
 * ════════════════════════════════════════════════════════════════════════ */

function NotionZeile({ todo, onToggle, onRemove, zuordnungsName }) {
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50">
      <input
        type="checkbox"
        checked={!!todo.erledigt}
        onChange={() => onToggle(todo.id)}
        className="h-[15px] w-[15px] shrink-0 rounded accent-gray-800"
      />
      <span className={`min-w-0 flex-1 truncate text-[15px] ${todo.erledigt ? "text-gray-400 line-through" : "text-gray-700"}`}>
        {todo.text}
      </span>
      {zuordnungsName && (
        <span className="shrink-0 text-xs text-gray-400">{zuordnungsName}</span>
      )}
      {todo.datum && (
        <span className="shrink-0 text-xs text-gray-400">{tageBis(todo.datum)}</span>
      )}
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        klasse="text-gray-300 opacity-0 hover:text-gray-500 group-hover:opacity-100"
      />
    </li>
  )
}

function TodosNotion({ offene, erledigte, toggle, remove, zuordnungsName }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-10">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
          Todos
        </h1>
      </div>

      <section className="mb-12">
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            offene Aufgaben ({offene.length})
          </p>
          <TodoErstellen
            knopfKlasse="text-sm text-gray-400 transition-colors hover:text-gray-800"
            knopfInhalt="+ Neu"
          />
        </div>

        {offene.length > 0 && (
          <div className="space-y-5">
            {EINTEILUNGEN.map((e) => {
              const gruppe = offene.filter((t) => einteilungVon(t)?.key === e.key)
              if (gruppe.length === 0) return null
              return (
                <div key={e.key}>
                  <p className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    <span className={`h-2 w-2 rounded-full ${e.punkt}`} />
                    {e.label}
                  </p>
                  <ul>
                    {gruppe.map((t) => (
                      <NotionZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {erledigte.length > 0 && (
        <section>
          <div className="mb-3 border-b border-gray-100 pb-1.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              erledigt ({erledigte.length})
            </p>
          </div>
          <ul>
            {erledigte.slice(0, 10).map((t) => (
              <NotionZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} zuordnungsName={zuordnungsName(t)} />
            ))}
          </ul>
        </section>
      )}
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
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        titel="Quest aufgeben"
        klasse="text-white/20 opacity-0 group-hover:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}

function TodosGamified({ todos, offene, erledigte, toggle, remove, zuordnungsName }) {
  const xp = xpVonTodos(todos)
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

        {offene.length === 0 ? null : (
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
                    <LoeschKnopf
                      onLoeschen={() => remove(t.id)}
                      titel="Löschen"
                      klasse="text-white/20 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                    />
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

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Locked In" – monochrom, keine Farben, keine Belohnung. Die
 * Eisenhower-Einteilung bleibt die Ordnung, wird aber über Rang und Position
 * gezeigt statt über Farbpunkte: Was oben steht, ist dran.
 * ════════════════════════════════════════════════════════════════════════ */

function LockedZeile({ todo, onToggle, onRemove }) {
  return (
    <li className="group flex items-center gap-3 border-b border-white/10 py-3 last:border-0">
      <button
        onClick={() => onToggle(todo.id)}
        title="Als erledigt markieren"
        className="flex h-4 w-4 shrink-0 items-center justify-center border border-white/30 text-transparent transition-colors hover:border-white group-hover:text-white/60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-white/90">{todo.text}</span>
      {todo.dauer && (
        <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/25">
          {todo.dauer} min
        </span>
      )}
      {todo.datum && (
        <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/40">
          {tageBis(todo.datum)}
        </span>
      )}
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        titel="Löschen"
        klasse="text-white/20 opacity-0 group-hover:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}

function TodosLockedIn({ offene, erledigte, toggle, remove }) {
  const [zeigeErledigte, setZeigeErledigte] = useState(false)
  const gesamt = offene.length + erledigte.length
  const anteil = gesamt === 0 ? 0 : Math.round((erledigte.length / gesamt) * 100)

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em]">Auftrag</span>
          <TodoErstellen
            knopfKlasse="rounded-md border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-white/50 hover:text-white"
            knopfInhalt="+ Neu"
          />
        </div>

        <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10">
          {[
            { label: "Offen", wert: offene.length },
            { label: "Erledigt", wert: erledigte.length },
            { label: "Quote", wert: anteil, suffix: "%" },
          ].map((k) => (
            <div key={k.label} className="px-2 py-5 text-center">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{k.label}</p>
              <p className="mt-2 text-4xl font-light tabular-nums">
                {k.wert}
                {k.suffix && <span className="text-lg text-white/40">{k.suffix}</span>}
              </p>
            </div>
          ))}
        </div>

        {offene.length === 0 ? (
          <p className="mt-10 text-center text-sm uppercase tracking-[0.25em] text-white/30">
            Nichts offen. Setz dir das Nächste.
          </p>
        ) : (
          EINTEILUNGEN.map((e) => {
            const gruppe = offene.filter((t) => e.passt(t))
            if (gruppe.length === 0) return null
            return (
              <section key={e.key} className="mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
                    {e.label}
                  </p>
                  <span className="text-[11px] tabular-nums text-white/25">{gruppe.length}</span>
                </div>
                <ul className="mt-2">
                  {gruppe.map((t) => (
                    <LockedZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
                  ))}
                </ul>
              </section>
            )
          })
        )}

        {erledigte.length > 0 && (
          <section className="mt-10 border-t border-white/10 pt-4">
            <button
              onClick={() => setZeigeErledigte((z) => !z)}
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-white/60"
            >
              {zeigeErledigte ? "Erledigte ausblenden" : `Erledigte zeigen (${erledigte.length})`}
            </button>
            {zeigeErledigte && (
              <ul className="mt-2">
                {erledigte.map((t) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0"
                  >
                    <button
                      onClick={() => toggle(t.id)}
                      title="Wieder öffnen"
                      className="flex h-4 w-4 shrink-0 items-center justify-center border border-white/20 text-white/50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/30 line-through">
                      {t.text}
                    </span>
                    <LoeschKnopf
                      onLoeschen={() => remove(t.id)}
                      titel="Löschen"
                      klasse="text-white/20 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export { TodoRow as TodoZeile }
