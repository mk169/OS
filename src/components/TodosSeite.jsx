import { useState } from "react"
import useStored from "../lib/useStored"
import { fristTon, heute, tageBis } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import {
  LIFEOS_INHALT,
  LIFEOS_KNOPF_GOLD,
  LIFEOS_MONO,
  LIFEOS_PANEL,
  LIFEOS_PUNKT,
  LIFEOS_RUBRIK,
  LIFEOS_SEITE,
  LIFEOS_SERIF,
} from "../lib/lifeos"
import { rangVon, xpVonTodos, levelVon } from "../lib/spiel"
import Seitenkopf from "./Seitenkopf"
import TodoErstellen from "./TodoErstellen"
import { EINTEILUNGEN, einteilungVon, todoUmschalten } from "../lib/todos"
import LoeschKnopf from "./LoeschKnopf"
import { FristChip } from "./Bausteine"
import { SEITE_LESEN } from "../lib/layout"

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
    setTodos(todoUmschalten(todos, id, heute()))
  }

  function remove(id) {
    setTodos(todos.filter((t) => t.id !== id))
  }

  const offene = todos.filter((t) => !t.erledigt)
  const erledigte = todos.filter((t) => t.erledigt)
  const gemeinsam = { todos, offene, erledigte, toggle, remove, zuordnungsName }

  if (stil === "gamified") return <TodosGamified {...gemeinsam} />
  if (stil === "notion") return <TodosNotion {...gemeinsam} />
  if (stil === "lifeos") return <TodosLifeOS {...gemeinsam} />
  if (stil === "lockedin") return <TodosLockedIn {...gemeinsam} />
  return <TodosTodo {...gemeinsam} />
}

/* ══════════════════════════════════════════════════════════════════════════
 * Stil „Todo-Liste" – klare Karten, farbige Punkte (Todoist)
 * ════════════════════════════════════════════════════════════════════════ */

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
        title={todo.erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current transition-colors ${
          todo.erledigt ? "bg-gray-400 text-gray-400" : einteilung.text
        }`}
      >
        {/* Bei Erledigtem steht der Haken fest – nur bei offenen Zeilen ist er
            eine Vorschau beim Überfahren, sonst sähe jede offene Aufgabe
            abgehakt aus. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-2.5 w-2.5 transition-opacity ${
            todo.erledigt
              ? "text-white opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <button
        onClick={() => setBearbeiten(true)}
        title="Bearbeiten"
        className={`min-w-0 flex-1 truncate text-left text-sm ${
          todo.erledigt ? "text-gray-400 line-through" : "text-gray-800"
        }`}
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
    <div className={SEITE_LESEN}>
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

        {offene.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-gray-900">Keine offenen Quests</p>
            <p className="mt-1 text-xs text-gray-400">
              Leg eine Aufgabe an – erledigte Quests bringen XP.
            </p>
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
 * Stil „Life OS" – die Eisenhower-Matrix als vier Panels eines dunklen
 * Kommandopults. Jedes Quadrant-Panel trägt seine Handlungsanweisung
 * (SOFORT, PLANEN, DELEGIEREN, LÖSCHEN) statt einer bloßen Beschriftung.
 * ════════════════════════════════════════════════════════════════════════ */

// Punktfarbe und Anweisung je Quadrant – dieselben Schlüssel wie EINTEILUNGEN.
const LIFEOS_QUADRANTEN = {
  "wichtig-dringend": { punkt: "rot", anweisung: "Sofort" },
  wichtig: { punkt: "gold", anweisung: "Planen" },
  dringend: { punkt: "amber", anweisung: "Delegieren" },
  sonstige: { punkt: "grau", anweisung: "Löschen" },
}

function LifeOsTodoZeile({ todo, erledigt, zuordnung, onToggle, onRemove }) {
  return (
    <li className="group flex items-start gap-2.5 border-b border-[#242628] py-2 last:border-0">
      <button
        onClick={() => onToggle(todo.id)}
        title={erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
          erledigt
            ? "border-[#5aaa72] bg-[#5aaa72] text-[#080909]"
            : "border-[#2e3133] text-transparent hover:border-[#b88830] group-hover:text-[#5a5f68]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[12px] ${
            erledigt ? "text-[#5a5f68] line-through" : "text-[#e2e4e8]"
          }`}
        >
          {todo.text}
        </span>
        {(zuordnung || todo.datum || todo.dauer) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[10px] uppercase tracking-[0.1em] text-[#5a5f68]">
            {zuordnung && <span className="truncate">{zuordnung}</span>}
            {todo.datum && <span className="text-[#9ea3ab]">{tageBis(todo.datum)}</span>}
            {todo.dauer && <span>{todo.dauer} min</span>}
          </span>
        )}
      </span>
      <LoeschKnopf
        onLoeschen={() => onRemove(todo.id)}
        titel="Löschen"
        klasse="text-[#3a3d40] opacity-0 hover:text-[#c05050] group-hover:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}

function TodosLifeOS({ offene, erledigte, toggle, remove, zuordnungsName }) {
  const [zeigeErledigte, setZeigeErledigte] = useState(false)
  const gesamt = offene.length + erledigte.length
  const quote = gesamt === 0 ? 0 : Math.round((erledigte.length / gesamt) * 100)

  return (
    <div style={{ fontFamily: LIFEOS_MONO }} className={LIFEOS_SEITE}>
      <div className={LIFEOS_INHALT}>
        {/* Kopf */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#242628] pb-3">
          <div className="min-w-0">
            <h1
              style={{ fontFamily: LIFEOS_SERIF }}
              className="text-[22px] font-normal text-[#e2e4e8]"
            >
              Tagesplan
            </h1>
            <p className="mt-0.5 text-[11px] text-[#5a5f68]">
              Nach Wichtigkeit sortiert, nicht nach Lautstärke.
            </p>
          </div>
          <TodoErstellen
            knopfKlasse={`${LIFEOS_KNOPF_GOLD} shrink-0`}
            knopfInhalt="+ Task"
          />
        </div>

        {/* Kennzahlen */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "Offen", wert: offene.length },
            { label: "Erledigt", wert: erledigte.length },
            { label: "Quote", wert: `${quote}%` },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded border border-[#242628] bg-[#161719] px-3 py-3 text-center"
            >
              <p
                style={{ fontFamily: LIFEOS_SERIF }}
                className="text-2xl leading-none tabular-nums text-[#d4a84b]"
              >
                {k.wert}
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.15em] text-[#5a5f68]">
                {k.label}
              </p>
            </div>
          ))}
        </div>

        {/* Die vier Quadranten */}
        {offene.length === 0 ? (
          <p className="rounded border border-dashed border-[#242628] py-10 text-center text-[11px] uppercase tracking-[0.2em] text-[#5a5f68]">
            Nichts offen — setz dir das Nächste.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {EINTEILUNGEN.map((e) => {
              const gruppe = offene
                .filter((t) => e.passt(t))
                .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
              if (gruppe.length === 0) return null
              const q = LIFEOS_QUADRANTEN[e.key]
              return (
                <section key={e.key} className={LIFEOS_PANEL}>
                  <div className={`${LIFEOS_RUBRIK} mb-3`}>
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${LIFEOS_PUNKT[q.punkt]}`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {e.label} — {q.anweisung}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#9ea3ab]">
                      {gruppe.length}
                    </span>
                  </div>
                  <ul>
                    {gruppe.map((t) => (
                      <LifeOsTodoZeile
                        key={t.id}
                        todo={t}
                        erledigt={false}
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

        {/* Erledigtes */}
        {erledigte.length > 0 && (
          <section className={`${LIFEOS_PANEL} mt-4`}>
            <button
              onClick={() => setZeigeErledigte((z) => !z)}
              className={`${LIFEOS_RUBRIK} w-full transition-colors hover:text-[#9ea3ab]`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LIFEOS_PUNKT.gruen}`} />
              {zeigeErledigte
                ? "Erledigte ausblenden"
                : `Erledigte zeigen (${erledigte.length})`}
            </button>
            {zeigeErledigte && (
              <ul className="mt-3">
                {erledigte.map((t) => (
                  <LifeOsTodoZeile
                    key={t.id}
                    todo={t}
                    erledigt
                    zuordnung={zuordnungsName(t)}
                    onToggle={toggle}
                    onRemove={remove}
                  />
                ))}
              </ul>
            )}
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
