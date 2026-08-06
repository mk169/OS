import { useState } from "react"
import useStored from "../lib/useStored"
import { heute, inTagen, montagVon, tageBisZahl, wochenSchluessel } from "../lib/datum"
import {
  baueBericht,
  wochenEndeVon,
  kalenderwoche,
  fokusText,
} from "../lib/wochenbericht"
import LoeschKnopf from "./LoeschKnopf"
import Seitenkopf from "./Seitenkopf"
import { TodoZeile } from "./TodosSeite"
import { sammleTermine, DeadlineChip } from "./OrdnerSeite"
import { wochenZielErreicht } from "./HabitsSeite"
import MentorInhalt from "./MentorInhalt"

// Wochen-Review: zeigt proaktiv, was liegen geblieben, überfällig oder
// unbearbeitet ist – kein NAV-Eintrag, erreichbar wie „Suchen" über einen
// dauerhaften Link neben dem Such-Icon (App.jsx).
//
// Oben steht der Mentor (Gleichung, Sensoren, Befunde): das Deuten der
// eigenen Daten gehört zum Zurückschauen, darum hat er keine eigene Seite
// mehr, sondern eröffnet den Rückblick.

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

function LeerHinweis() {
  return null
}

export default function ReviewSeite({ onNavigate }) {
  const [todos, setTodos] = useStored("todos", [])
  const [projekte] = useStored("projekte", [])
  const [inbox] = useStored("inbox", [])
  const [habits] = useStored("habits", [])
  const [deepwork] = useStored("deepwork", [])
  const [zyklen] = useStored("zyklen", [])
  const [berichte, setBerichte] = useStored("wochenberichte", [])

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

  // Die Woche, die als nächstes abgeschlossen werden kann: die laufende
  // (ab Sonntag) bzw. jede frühere, für die es noch keinen Bericht gibt.
  const aktuelleWoche = wochenSchluessel(new Date())
  const offeneWoche = (() => {
    const abgeschlossen = new Set(berichte.map((b) => b.woche))
    // Von der jüngsten Woche rückwärts: normalerweise ist das die gerade
    // vergangene, sonntags schon die laufende. Bis zu acht Wochen zurück,
    // damit nach einer Pause nichts unter den Tisch fällt.
    for (let i = 0; i <= 8; i++) {
      const d = new Date(aktuelleWoche)
      d.setDate(d.getDate() - i * 7)
      const key = wochenSchluessel(d)
      // Die laufende Woche erst ab Sonntag anbieten.
      if (key === aktuelleWoche && new Date().getDay() !== 0) continue
      if (abgeschlossen.has(key)) continue
      // Weiter zurückliegende Wochen nur, wenn dort überhaupt etwas war –
      // sonst bietet der Rückblick eine leere Woche nach der anderen an.
      if (i > 1) {
        const probe = baueBericht({ woche: key, todos, deepwork, habits, zyklen, wochenZielErreicht })
        const leer =
          probe.todos.length === 0 &&
          probe.fokusMinuten === 0 &&
          !probe.wochenziel
        if (leer) continue
      }
      return key
    }
    return null
  })()

  // Woche festhalten: Bericht schreiben und die erledigten Todos der Woche
  // aus der Liste nehmen – ihr Inhalt steckt ab jetzt im Bericht.
  function wocheAbschliessen(woche, todosLoeschen = true) {
    const bericht = baueBericht({
      woche,
      todos,
      deepwork,
      habits,
      zyklen,
      wochenZielErreicht,
    })
    setBerichte([...berichte.filter((b) => b.woche !== woche), bericht])
    if (todosLoeschen) {
      const weg = new Set(bericht.todos.map((t) => t.id))
      setTodos(todos.filter((t) => !weg.has(t.id)))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        titel="Wochenrückblick"
        unterzeile="Was der Mentor sieht – und was liegen geblieben ist."
      />

      <WochenAbschluss
        woche={offeneWoche}
        vorschau={
          offeneWoche
            ? baueBericht({
                woche: offeneWoche,
                todos,
                deepwork,
                habits,
                zyklen,
                wochenZielErreicht,
              })
            : null
        }
        onAbschliessen={wocheAbschliessen}
      />

      <MentorInhalt onNavigate={onNavigate} />

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

      <Wochenstatistik
        berichte={berichte}
        projekte={projekte}
        onNotiz={(woche, notiz) =>
          setBerichte(
            berichte.map((b) => (b.woche === woche ? { ...b, notiz } : b))
          )
        }
        onLoeschen={(woche) =>
          setBerichte(berichte.filter((b) => b.woche !== woche))
        }
      />
    </div>
  )
}

// Die Woche festhalten: zeigt vorab, was in den Bericht wandert, und
// schließt sie auf Knopfdruck ab.
function WochenAbschluss({ woche, vorschau, onAbschliessen }) {
  const [todosLoeschen, setTodosLoeschen] = useState(true)
  if (!woche || !vorschau) return null
  const bis = wochenEndeVon(woche)
  const datum = (d) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })

  return (
    <section className="mt-6 rounded-xl border border-gray-900 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-gray-900">
          KW {kalenderwoche(woche)} abschließen
          <span className="ml-2 text-xs font-normal text-gray-400">
            {datum(woche)}–{datum(bis)}
          </span>
        </p>
        <p className="text-xs text-gray-400">
          {vorschau.todos.length} erledigt · {fokusText(vorschau.fokusMinuten)}{" "}
          Fokus
          {vorschau.habits.gesamt > 0 &&
            ` · Habits ${vorschau.habits.erreicht}/${vorschau.habits.gesamt}`}
          {vorschau.wochenziel &&
            ` · Wochenziel ${vorschau.wochenziel.erledigt}/${vorschau.wochenziel.gesamt}`}
        </p>
      </div>

      {vorschau.wochenziel?.text && (
        <p className="mt-2 font-serif text-[15px] italic text-gray-500">
          „{vorschau.wochenziel.text}"
        </p>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={todosLoeschen}
          onChange={(e) => setTodosLoeschen(e.target.checked)}
          className="h-4 w-4 accent-gray-900"
        />
        Erledigte Todos aus der Liste nehmen ({vorschau.todos.length})
      </label>
      <p className="mt-1 text-xs text-gray-400">
        Ihr Text bleibt im Bericht dieser Woche erhalten.
      </p>

      <button
        onClick={() => onAbschliessen(woche, todosLoeschen)}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Woche festhalten
      </button>
    </section>
  )
}

// Rückschau über alle abgeschlossenen Wochen: je Woche eine Zeile mit den
// Zahlen, aufklappbar mit den erledigten Aufgaben und Platz für eine Notiz.
function Wochenstatistik({ berichte, projekte, onNotiz, onLoeschen }) {
  const [offen, setOffen] = useState(null)
  if (berichte.length === 0) return null

  const sortiert = [...berichte].sort((a, b) => b.woche.localeCompare(a.woche))
  const schnitt = Math.round(
    sortiert.reduce((s, b) => s + (b.fokusMinuten ?? 0), 0) / sortiert.length
  )
  const datum = (d) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
  const projektName = (id) => projekte.find((p) => p.id === id)?.name

  return (
    <Abschnitt titel="Wochenstatistik">
      <p className="mb-3 text-xs text-gray-400">
        {sortiert.length} {sortiert.length === 1 ? "Woche" : "Wochen"}{" "}
        festgehalten · im Schnitt {fokusText(schnitt)} Fokus pro Woche
      </p>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {sortiert.map((b) => {
          const auf = offen === b.woche
          return (
            <li key={b.woche}>
              <div className="group flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setOffen(auf ? null : b.woche)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-16 shrink-0 text-sm font-medium text-gray-900">
                    KW {kalenderwoche(b.woche)}
                  </span>
                  <span className="hidden w-24 shrink-0 text-xs text-gray-400 sm:block">
                    {datum(b.von)}–{datum(b.bis)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
                    {b.wochenziel?.text || "—"}
                  </span>
                </button>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                  {b.todos.length} ✓
                </span>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                  {fokusText(b.fokusMinuten)}
                </span>
                {b.habits.gesamt > 0 && (
                  <span className="hidden shrink-0 text-xs tabular-nums text-gray-400 sm:block">
                    {b.habits.erreicht}/{b.habits.gesamt} Habits
                  </span>
                )}
                <LoeschKnopf
                  onLoeschen={() => onLoeschen(b.woche)}
                  titel="Bericht löschen"
                  klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                />
              </div>

              {auf && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                  {b.todos.length > 0 ? (
                    <ul className="space-y-1">
                      {b.todos.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-emerald-500">✓</span>
                          <span className="min-w-0 flex-1 truncate">{t.text}</span>
                          {projektName(t.projektId) && (
                            <span className="shrink-0 text-xs text-gray-400">
                              {projektName(t.projektId)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Keine erledigten Aufgaben in dieser Woche.
                    </p>
                  )}
                  <textarea
                    value={b.notiz ?? ""}
                    onChange={(e) => onNotiz(b.woche, e.target.value)}
                    rows={2}
                    placeholder="Was lief gut, was nicht, was nimmst du mit?"
                    className="mt-3 w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-900"
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Abschnitt>
  )
}
