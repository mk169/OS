import { useState } from "react"
import useStored from "../lib/useStored"
import { datumLang, heute } from "../lib/datum"
import { kalenderwoche, wochenEndeVon } from "../lib/wochenbericht"
import { einteilungVon, todoUmschalten } from "../lib/todos"
import {
  MAX_FOKUS,
  aufgabenAmTag,
  erledigtImZeitraum,
  fokusKandidaten,
  fokusTodos,
  loeseFokus,
  montagMitVersatz,
  nachQuadranten,
  offeneDerWoche,
  setzeFokus,
  setzeWochenziel,
  wochenTage,
  wochenzielVon,
} from "../lib/wochenplan"
import Seitenkopf from "./Seitenkopf"
import TodoErstellen from "./TodoErstellen"
import LeerHinweis, { LeerZeile } from "./LeerHinweis"
import { FristChip } from "./Bausteine"
import { SEITE_RASTER } from "../lib/layout"

// Wochenplan: erst die Woche, dann der Tag.
//
// Die Todo-Seite beantwortet „was ist alles offen?", der Kalender „wann ist
// was?". Dazwischen fehlte die Ebene, auf der geplant wird: Was macht diese
// Woche zu einer guten Woche, und was davon liegt auf welchem Tag. Genau das
// ist diese Seite – sie legt keine neuen Daten an, sondern ordnet die
// vorhandenen Aufgaben (Store `todos`) nach Woche, Tag und Eisenhower-Feld.
// Neu gespeichert werden nur das Wochenziel und die drei Tages-Prioritäten.
//
// Gerechnet wird in lib/wochenplan.js.

function Panel({ punkt = "bg-gray-400", titel, aktion, children, klasse = "" }) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100 ${klasse}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punkt}`} />
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-widest text-gray-500">
          {titel}
        </h2>
        {aktion}
      </div>
      {children}
    </section>
  )
}

// Eine Aufgabenzeile – dieselbe Darstellung in allen Blöcken der Seite.
function Zeile({ todo, zuordnung, onToggle }) {
  return (
    <li className="flex items-start gap-2.5 border-b border-gray-100 py-2 last:border-0">
      <button
        onClick={() => onToggle(todo.id)}
        title={todo.erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          todo.erledigt
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-gray-300 text-transparent hover:border-gray-900 hover:text-gray-400"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </button>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${
            todo.erledigt ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {todo.text}
        </span>
        {(zuordnung || todo.datum) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
            {zuordnung && <span className="truncate">{zuordnung}</span>}
            {todo.datum && <span>{todo.datum.slice(8)}.{todo.datum.slice(5, 7)}.</span>}
          </span>
        )}
      </span>
    </li>
  )
}

export default function WochenplanSeite() {
  const [tab, setTab] = useState("woche") // woche | tag
  const [versatz, setVersatz] = useState(0)
  // Für welchen Tag ist das Anlege-Formular offen? In der Spalte selbst wäre
  // dafür kein Platz – es erscheint unter dem Raster, mit vorbelegtem Datum.
  const [formTag, setFormTag] = useState(null)
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [zyklen] = useStored("zyklen", [])
  const [wochenziele, setWochenziele] = useStored("wochenziele", {})

  const heuteKey = heute()
  const montag = montagMitVersatz(versatz)
  const sonntag = wochenEndeVon(montag)
  const tage = wochenTage(montag)

  function toggle(id) {
    setTodos(todoUmschalten(todos, id, heuteKey))
  }

  function zuordnungsName(todo) {
    const id = todo.projektId ?? todo.kursId
    return id ? projekte.find((p) => p.id === id)?.name : null
  }

  // Wochenziel einer laufenden Fokus-Periode – wird angezeigt, nicht ersetzt:
  // Die Periode plant über Wochen hinweg, diese Seite plant diese eine Woche.
  const periodenZiel = zyklen
    .flatMap((z) =>
      (z.wochen ?? [])
        .filter((w) => w.start === montag && w.text?.trim())
        .map((w) => ({ text: w.text, periode: z.titel ?? "Periode" }))
    )
    .at(0)

  // Für welchen Tag wird beim Anlegen aus der Wochensicht datiert? Heute,
  // solange man in der laufenden Woche steht – sonst deren Montag.
  const planungsTag = heuteKey >= montag && heuteKey <= sonntag ? heuteKey : montag
  const ziel = wochenzielVon(wochenziele, montag)
  const offen = offeneDerWoche(todos, montag)
  const erledigtWoche = erledigtImZeitraum(todos, montag, sonntag)
  const quadranten = nachQuadranten(offen)

  return (
    <div className={SEITE_RASTER}>
      <Seitenkopf
        titel="Wochenplan"
        unterzeile="Plane die Woche. Dann den Tag."
        aktion={<TodoErstellen />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {[
          { key: "woche", label: "Wochenplan" },
          { key: "tag", label: "Tagesplan" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "woche" ? (
        <div className="space-y-4">
          {/* Wochenwechsel: der Plan der Vorwoche bleibt lesbar, die nächste
              lässt sich vorbereiten. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setVersatz((v) => v - 1)}
              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-900"
              title="Vorige Woche"
            >
              ←
            </button>
            <span className="text-sm font-medium text-gray-900">
              KW {kalenderwoche(montag)}
            </span>
            <span className="text-xs text-gray-400">
              {montag.slice(8)}.{montag.slice(5, 7)}. – {sonntag.slice(8)}.
              {sonntag.slice(5, 7)}.
            </span>
            <button
              onClick={() => setVersatz((v) => v + 1)}
              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-900"
              title="Nächste Woche"
            >
              →
            </button>
            {versatz !== 0 && (
              <button
                onClick={() => setVersatz(0)}
                className="text-xs font-medium text-accent-600 hover:underline"
              >
                Diese Woche
              </button>
            )}
          </div>

          <Panel
            punkt="bg-accent-500"
            titel="Ziel der Woche — was macht diese Woche erfolgreich?"
            klasse="border-accent-200 bg-accent-50/40"
          >
            {periodenZiel && (
              <p className="mb-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {periodenZiel.periode}:
                </span>{" "}
                {periodenZiel.text}
              </p>
            )}
            <textarea
              value={ziel}
              onChange={(e) =>
                setWochenziele(setzeWochenziel(wochenziele, montag, e.target.value))
              }
              rows={2}
              placeholder="Was willst du bis Sonntag erreicht haben?"
              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 font-serif text-[15px] leading-relaxed text-gray-900 outline-none focus:border-accent-400"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Wird beim Tippen gespeichert.
            </p>
          </Panel>

          {/* Die Woche als sieben Spalten. Ein Tag ist hier keine Uhrzeit,
              sondern eine Schublade: Was an diesem Tag drankommt. */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {tage.map((t) => {
              const desTages = aufgabenAmTag(todos, t.key)
              const istHeute = t.key === heuteKey
              return (
                <div
                  key={t.key}
                  className={`flex min-h-[7.5rem] flex-col rounded-xl border bg-white p-3 ${
                    istHeute ? "border-accent-400" : "border-gray-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-widest ${
                        istHeute ? "text-accent-600" : "text-gray-500"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {t.tag}.{t.monat}.
                    </span>
                  </div>
                  {desTages.length === 0 ? (
                    <p className="text-[11px] text-gray-300">Leer</p>
                  ) : (
                    <ul className="flex-1">
                      {desTages.map((todo) => (
                        <li key={todo.id}>
                          <button
                            onClick={() => toggle(todo.id)}
                            className="flex w-full items-start gap-1.5 py-1 text-left"
                          >
                            <span
                              className={`mt-[3px] h-3 w-3 shrink-0 rounded-[3px] border ${
                                todo.erledigt
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-gray-300"
                              }`}
                            />
                            <span
                              className={`min-w-0 flex-1 break-words text-[11px] leading-snug ${
                                todo.erledigt
                                  ? "text-gray-300 line-through"
                                  : "text-gray-700"
                              }`}
                            >
                              {todo.text}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => setFormTag(t.key)}
                    title={`Aufgabe für ${t.name} anlegen`}
                    className="mt-2 w-full rounded-md border border-gray-200 py-1 text-[11px] text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>

          {formTag && (
            <TodoErstellen
              key={formTag}
              startDatum={formTag}
              offenStart
              beschriftung={`Aufgabe am ${formTag.slice(8)}.${formTag.slice(5, 7)}.`}
              onFertig={() => setFormTag(null)}
            />
          )}

          <Panel punkt="bg-blue-500" titel="Alle offenen Aufgaben dieser Woche">
            {offen.length === 0 ? (
              <LeerZeile text="Für diese Woche ist nichts terminiert." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {quadranten.map((q) => (
                  <div key={q.key}>
                    <p
                      className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest ${q.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${q.punkt}`} />
                      <span className="min-w-0 flex-1 truncate">{q.label}</span>
                      {/* Anlegen im richtigen Feld: Einteilung vorbelegt,
                          Datum auf einen Tag dieser Woche. */}
                      <TodoErstellen
                        beschriftung={q.label}
                        startWichtig={q.key === "wichtig-dringend" || q.key === "wichtig"}
                        startDringend={q.key === "wichtig-dringend" || q.key === "dringend"}
                        startDatum={planungsTag}
                        knopfKlasse="shrink-0 rounded border border-gray-200 px-1.5 text-sm leading-5 font-normal text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700"
                        knopfInhalt="+"
                      />
                    </p>
                    {q.todos.length === 0 ? (
                      <p className="py-1 text-xs text-gray-300">Leer</p>
                    ) : (
                      <ul>
                        {q.todos.map((todo) => (
                          <Zeile
                            key={todo.id}
                            todo={todo}
                            zuordnung={zuordnungsName(todo)}
                            onToggle={toggle}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel punkt="bg-emerald-500" titel={`Diese Woche erledigt (${erledigtWoche.length})`}>
            {erledigtWoche.length === 0 ? (
              <LeerZeile text="Noch nichts abgehakt – oder die Woche ist im Rückblick schon abgeschlossen (dabei wandern erledigte Aufgaben in den Bericht)." />
            ) : (
              <ul>
                {erledigtWoche.map((todo) => (
                  <Zeile
                    key={todo.id}
                    todo={todo}
                    zuordnung={zuordnungsName(todo)}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : (
        <Tagesplan
          todos={todos}
          setTodos={setTodos}
          heuteKey={heuteKey}
          onToggle={toggle}
          zuordnungsName={zuordnungsName}
        />
      )}
    </div>
  )
}

// ── Tagesplan ────────────────────────────────────────────────────────────

function Tagesplan({ todos, setTodos, heuteKey, onToggle, zuordnungsName }) {
  // Welcher freie Platz sucht gerade eine Aufgabe? (Index des Slots)
  const [waehlt, setWaehlt] = useState(null)
  const fokus = fokusTodos(todos, heuteKey)
  const offen = todos.filter((t) => !t.erledigt)
  const quadranten = nachQuadranten(offen)
  const erledigtHeute = erledigtImZeitraum(todos, heuteKey)
  const kandidaten = fokusKandidaten(todos, heuteKey)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{datumLang(heuteKey)}</p>

      {/* Die drei Prioritäten sind echte Aufgaben: Was hier oben steht, ist
          dasselbe Todo wie unten in der Matrix – einmal abhaken genügt. */}
      <Panel punkt="bg-accent-500" titel={`Die ${MAX_FOKUS} Prioritäten heute`}>
        <ol className="space-y-2">
          {Array.from({ length: MAX_FOKUS }, (_, i) => {
            const todo = fokus[i]
            return (
              <li key={todo?.id ?? `leer-${i}`} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-4 shrink-0 text-xs font-semibold text-gray-300">
                  {i + 1}
                </span>
                {todo ? (
                  <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5">
                    <button
                      onClick={() => onToggle(todo.id)}
                      title={todo.erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        todo.erledigt
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-300 text-transparent hover:border-gray-900 hover:text-gray-400"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="h-2 w-2">
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </button>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        todo.erledigt ? "text-gray-400 line-through" : "text-gray-900"
                      }`}
                    >
                      {todo.text}
                    </span>
                    {zuordnungsName(todo) && (
                      <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {zuordnungsName(todo)}
                      </span>
                    )}
                    {/* Aus den Prioritäten nehmen – die Aufgabe bleibt. */}
                    <button
                      onClick={() => setTodos(loeseFokus(todos, todo.id))}
                      title="Nicht mehr Priorität heute"
                      className="shrink-0 text-gray-300 transition-colors hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ) : waehlt === i ? (
                  <div className="min-w-0 flex-1 rounded-md border border-gray-300 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-500">
                        Aufgabe wählen
                      </p>
                      <button
                        onClick={() => setWaehlt(null)}
                        className="text-xs text-gray-400 hover:text-gray-900"
                      >
                        Abbrechen
                      </button>
                    </div>
                    {kandidaten.length === 0 ? (
                      <LeerZeile text="Keine offene Aufgabe übrig – leg unten eine neue an." />
                    ) : (
                      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                        {kandidaten.map((k) => (
                          <li key={k.id}>
                            <button
                              onClick={() => {
                                setTodos(setzeFokus(todos, k.id, heuteKey))
                                setWaehlt(null)
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${einteilungVon(k).punkt}`}
                              />
                              <span className="min-w-0 flex-1 truncate">{k.text}</span>
                              {k.datum && <FristChip datum={k.datum} />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      {/* Neu anlegen und sofort zur Priorität machen – der
                          Anlass ist ja genau dieser freie Platz. */}
                      <TodoErstellen
                        beschriftung="Neue Priorität"
                        startDatum={heuteKey}
                        zusatzFelder={{ fokus: heuteKey }}
                        onFertig={() => setWaehlt(null)}
                        knopfKlasse="text-xs font-medium text-accent-600 hover:underline"
                        knopfInhalt="+ Neue Aufgabe anlegen"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setWaehlt(i)}
                    className="min-w-0 flex-1 rounded-md border border-dashed border-gray-200 px-3 py-1.5 text-left text-sm text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700"
                  >
                    {i === 0 ? "Das Wichtigste heute wählen" : "Weitere Priorität wählen"}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {quadranten.map((q) => (
          <Panel
            key={q.key}
            punkt={q.punkt}
            titel={`${q.label} — ${ANWEISUNG[q.key]}`}
            aktion={
              /* Anlegen dort, wo die Lücke auffällt: mit der Einteilung
                 dieses Feldes vorbelegt. */
              <TodoErstellen
                beschriftung={q.label}
                startWichtig={q.key === "wichtig-dringend" || q.key === "wichtig"}
                startDringend={q.key === "wichtig-dringend" || q.key === "dringend"}
                startDatum={heuteKey}
                knopfKlasse="shrink-0 rounded border border-gray-200 px-1.5 text-sm leading-5 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-700"
                knopfInhalt="+"
              />
            }
          >
            {q.todos.length === 0 ? (
              <LeerZeile text="Leer." />
            ) : (
              <ul>
                {q.todos.map((todo) => (
                  <Zeile
                    key={todo.id}
                    todo={todo}
                    zuordnung={zuordnungsName(todo)}
                    onToggle={onToggle}
                  />
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>

      {offen.length === 0 && erledigtHeute.length === 0 && (
        <LeerHinweis
          emoji="🗓️"
          titel="Noch keine Aufgaben"
          text="Leg oben rechts die erste Aufgabe an – im Wochenplan landet sie dann auf dem Tag, den du ihr gibst."
        />
      )}

      <Panel punkt="bg-emerald-500" titel={`Heute erledigt (${erledigtHeute.length})`}>
        {erledigtHeute.length === 0 ? (
          <LeerZeile text="Heute ist noch nichts abgehakt." />
        ) : (
          <ul>
            {erledigtHeute.map((todo) => (
              <Zeile
                key={todo.id}
                todo={todo}
                zuordnung={zuordnungsName(todo)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

// Was das jeweilige Eisenhower-Feld von einem verlangt – die Matrix ist
// eine Handlungsanweisung, keine Sortierung.
const ANWEISUNG = {
  "wichtig-dringend": "Sofort",
  wichtig: "Planen",
  dringend: "Delegieren",
  sonstige: "Löschen",
}
