import { useState } from "react"
import useStored from "../lib/useStored"
import { heute, montagVon, wochenSchluessel } from "../lib/datum"
import { schluessel } from "./Kalender"
import { FARBEN } from "../lib/farben"
import { Fortschrittsbalken } from "./OrdnerSeite"
import Seitenkopf from "./Seitenkopf"

// Habits nach dem Atomic-Habits-Prinzip, dargestellt als Wochen-Heatmap
// (Spalten = Wochen, Zeilen = Tage) mit Wochenziel statt Tages-Streak.
// Stacking-Ketten erscheinen als verbundene Karte: Anker-Habit, dann die
// angeknüpften darunter.

const STANDARD_BEREICHE = [
  { id: "koerper", name: "Körper", farbe: "emerald" },
  { id: "bildung", name: "Bildung", farbe: "blue" },
  { id: "arbeit", name: "Arbeit", farbe: "violet" },
  { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
]

const STANDARD_WOCHENZIEL = 3
const TAG_LABELS = ["Mo", "", "Mi", "", "Fr", "", ""]

export function useHabitDaten() {
  const [habits, setHabits] = useStored("habits", [])
  const [bereiche, setBereiche] = useStored("habitBereiche", STANDARD_BEREICHE)
  return { habits, setHabits, bereiche, setBereiche }
}

export function bereichVon(habit, bereiche) {
  return (
    bereiche.find((b) => b.id === habit.bereichId) ?? {
      name: "Allgemein",
      farbe: "gray",
    }
  )
}

// Gruppiert Habits in Stacking-Ketten: jede Kette beginnt mit einem
// freien Habit, dahinter folgen die angeknüpften in Reihenfolge.
export function alsKettenListe(habits) {
  const ketten = []
  const kinderVon = (id) => habits.filter((h) => h.stackNachId === id)

  function sammle(habit, kette) {
    kette.push(habit)
    for (const kind of kinderVon(habit.id)) sammle(kind, kette)
  }

  for (const h of habits) {
    const hatAnker = habits.some((x) => x.id === h.stackNachId)
    if (!hatAnker) {
      const kette = []
      sammle(h, kette)
      ketten.push(kette)
    }
  }
  return ketten
}

// Die letzten n Kalenderwochen als Montags-Daten (älteste zuerst, letzte
// = Montag der laufenden Woche).
function wochenSpalten(n) {
  const spalten = []
  const cursor = montagVon(new Date())
  for (let i = 0; i < n; i++) {
    spalten.unshift(new Date(cursor))
    cursor.setDate(cursor.getDate() - 7)
  }
  return spalten
}

export function wochenZielVon(habit) {
  return habit.wochenZiel ?? STANDARD_WOCHENZIEL
}

export function erledigtInWoche(habit, wocheMontag) {
  const zielSchluessel = schluessel(wocheMontag)
  return habit.erledigtAn.filter(
    (tag) => wochenSchluessel(new Date(tag)) === zielSchluessel
  ).length
}

export function wochenZielErreicht(habit, wocheMontag) {
  return erledigtInWoche(habit, wocheMontag) >= wochenZielVon(habit)
}

// Streak in Wochen: die laufende Woche zählt nicht als Fehlschlag, wenn
// sie ihr Ziel noch nicht erreicht hat (sie ist ja noch nicht vorbei).
export function wochenStreakVon(habit) {
  let zaehler = 0
  const cursor = montagVon(new Date())
  if (!wochenZielErreicht(habit, cursor)) cursor.setDate(cursor.getDate() - 7)
  while (wochenZielErreicht(habit, cursor)) {
    zaehler++
    cursor.setDate(cursor.getDate() - 7)
  }
  return zaehler
}

export function nutzeHabitToggle(habits, setHabits) {
  const heuteKey = heute()
  return (habit) => {
    const dran = habit.erledigtAn.includes(heuteKey)
    setHabits(
      habits.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              erledigtAn: dran
                ? h.erledigtAn.filter((d) => d !== heuteKey)
                : [...h.erledigtAn, heuteKey],
            }
          : h
      )
    )
  }
}

// Kleine Zahlen-Auswahl 1–7 für das Wochenziel – sowohl beim Anlegen
// als auch nachträglich in der Heatmap-Karte nutzbar.
export function WochenZielAuswahl({ wert, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={`${n}× pro Woche`}
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
            wert === n
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// Ein Habit als Stacking-Heatmap: Spalten = Wochen (Monatslabel bei
// Monatswechsel), Zeilen = Mo–So. Heute ist klickbar, Zukunft ist leer.
function HabitHeatmapKarte({
  habit,
  bereiche,
  wochenAnzahl = 26,
  onToggleHeute,
  onSetWochenZiel,
  onRemove,
  eingerueckt,
}) {
  const farbe = FARBEN[bereichVon(habit, bereiche).farbe] ?? FARBEN.gray
  const heuteKey = heute()
  const spalten = wochenSpalten(wochenAnzahl)
  const streak = wochenStreakVon(habit)
  const ziel = wochenZielVon(habit)
  const inDieserWoche = erledigtInWoche(habit, montagVon(new Date()))

  return (
    <div className={`py-3 ${eingerueckt ? "pl-6" : ""}`}>
      <div className="group flex items-center gap-2">
        {eingerueckt && <span className="-ml-4 text-xs text-gray-300">↳</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${farbe.punkt}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
          {habit.name}
        </span>
        {onRemove && (
          <button
            onClick={() => onRemove(habit.id)}
            title="Habit löschen"
            className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2 overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          <div className="flex flex-col gap-[3px]">
            <span className="h-3" />
            {TAG_LABELS.map((l, i) => (
              <span
                key={i}
                className="h-2.5 text-[8px] leading-[10px] text-gray-300"
              >
                {l}
              </span>
            ))}
          </div>
          {spalten.map((montag, i) => {
            const vorMonat = i > 0 ? spalten[i - 1].getMonth() : null
            const zeigeMonat = i === 0 || montag.getMonth() !== vorMonat
            return (
              <div key={i} className="flex flex-col items-center gap-[3px]">
                <span className="h-3 whitespace-nowrap text-[8px] text-gray-400">
                  {zeigeMonat
                    ? montag.toLocaleDateString("de-DE", { month: "short" })
                    : ""}
                </span>
                {Array.from({ length: 7 }, (_, tagIndex) => {
                  const tagDatum = new Date(montag)
                  tagDatum.setDate(tagDatum.getDate() + tagIndex)
                  const tagKey = schluessel(tagDatum)
                  const erledigt = habit.erledigtAn.includes(tagKey)
                  if (tagKey > heuteKey) {
                    return <span key={tagIndex} className="h-2.5 w-2.5" />
                  }
                  if (tagKey === heuteKey) {
                    return (
                      <button
                        key={tagIndex}
                        type="button"
                        onClick={() => onToggleHeute(habit)}
                        title="Heute umschalten"
                        className={`h-2.5 w-2.5 rounded-sm ${
                          erledigt
                            ? farbe.punkt
                            : `bg-white ring-1 ring-inset ${farbe.ring}`
                        }`}
                      />
                    )
                  }
                  return (
                    <span
                      key={tagIndex}
                      title={tagDatum.toLocaleDateString("de-DE")}
                      className={`h-2.5 w-2.5 rounded-sm ${
                        erledigt ? farbe.punkt : "bg-gray-100"
                      }`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          {streak > 0
            ? `🔥 ${streak} ${streak === 1 ? "Woche" : "Wochen"} Streak`
            : `${inDieserWoche}/${ziel} diese Woche`}
        </span>
        {onSetWochenZiel && (
          <WochenZielAuswahl
            wert={ziel}
            onChange={(z) => onSetWochenZiel(habit, z)}
          />
        )}
      </div>
    </div>
  )
}

// Karten-Raster: eine Karte pro Stacking-Kette, darin je Habit eine
// Heatmap-Zeile (angeknüpfte Habits mit ↳-Einzug darunter gestapelt).
export function HabitKarten({
  habits,
  bereiche,
  onToggleHeute,
  onSetWochenZiel,
  onRemove,
}) {
  const ketten = alsKettenListe(habits)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ketten.map((kette) => (
        <div
          key={kette[0].id}
          className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4"
        >
          {kette.map((habit, i) => (
            <HabitHeatmapKarte
              key={habit.id}
              habit={habit}
              bereiche={bereiche}
              onToggleHeute={onToggleHeute}
              onSetWochenZiel={onSetWochenZiel}
              onRemove={onRemove}
              eingerueckt={i > 0}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function HabitErstellen({ habits, setHabits, bereiche, setBereiche }) {
  const [offen, setOffen] = useState(false)
  const [name, setName] = useState("")
  const [bereichId, setBereichId] = useState(bereiche[0]?.id ?? "")
  const [neuerBereich, setNeuerBereich] = useState(false)
  const [bereichName, setBereichName] = useState("")
  const [bereichFarbe, setBereichFarbe] = useState("rose")
  const [stackNachId, setStackNachId] = useState("")
  const [wochenZiel, setWochenZiel] = useState(STANDARD_WOCHENZIEL)

  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return

    let zielBereichId = bereichId
    if (neuerBereich) {
      if (!bereichName.trim()) return
      const neu = {
        id: `eigen-${Date.now()}`,
        name: bereichName.trim(),
        farbe: bereichFarbe,
      }
      setBereiche([...bereiche, neu])
      zielBereichId = neu.id
    }

    setHabits([
      ...habits,
      {
        id: Date.now(),
        name: name.trim(),
        bereichId: zielBereichId,
        stackNachId: stackNachId ? Number(stackNachId) : null,
        erledigtAn: [],
        wochenZiel,
      },
    ])
    setName("")
    setStackNachId("")
    setNeuerBereich(false)
    setBereichName("")
    setWochenZiel(STANDARD_WOCHENZIEL)
    setOffen(false)
  }

  if (!offen) {
    return (
      <button
        onClick={() => setOffen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-700"
        title="Habit erstellen"
      >
        +
      </button>
    )
  }

  return (
    <form
      onSubmit={speichern}
      className="w-full rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          1. Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. 10 Minuten lesen"
            autoFocus
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-500">
          2. Bereich
          <select
            value={neuerBereich ? "neu" : bereichId}
            onChange={(e) => {
              if (e.target.value === "neu") setNeuerBereich(true)
              else {
                setNeuerBereich(false)
                setBereichId(e.target.value)
              }
            }}
            className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            {bereiche.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="neu">+ Eigener Bereich</option>
          </select>
        </label>

        <label className="flex flex-col text-xs text-gray-500">
          Anknüpfen an (Habit Stacking)
          <select
            value={stackNachId}
            onChange={(e) => setStackNachId(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            <option value="">Kein Anker</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                Nach: {h.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        3. Wochenziel
        <WochenZielAuswahl wert={wochenZiel} onChange={setWochenZiel} />
      </div>

      {neuerBereich && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3">
          <input
            value={bereichName}
            onChange={(e) => setBereichName(e.target.value)}
            placeholder="Name des Bereichs, z.B. Finanzen"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <div className="flex items-center gap-1.5">
            {Object.keys(FARBEN).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setBereichFarbe(f)}
                className={`h-5 w-5 rounded-full ${FARBEN[f].punkt} ${
                  bereichFarbe === f
                    ? "ring-2 ring-gray-900 ring-offset-1"
                    : "opacity-50 hover:opacity-100"
                }`}
                title={f}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Erstellen
        </button>
      </div>
    </form>
  )
}

export default function HabitsSeite() {
  const { habits, setHabits, bereiche, setBereiche } = useHabitDaten()
  const toggle = nutzeHabitToggle(habits, setHabits)
  const wocheAktuell = montagVon(new Date())

  function remove(id) {
    setHabits(
      habits
        .filter((h) => h.id !== id)
        .map((h) => (h.stackNachId === id ? { ...h, stackNachId: null } : h))
    )
  }

  function setWochenZiel(habit, ziel) {
    setHabits(
      habits.map((h) => (h.id === habit.id ? { ...h, wochenZiel: ziel } : h))
    )
  }

  const amZielCount = habits.filter((h) =>
    wochenZielErreicht(h, wocheAktuell)
  ).length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf
        titel="Habits"
        aktion={
          <HabitErstellen
            habits={habits}
            setHabits={setHabits}
            bereiche={bereiche}
            setBereiche={setBereiche}
          />
        }
      />

      {habits.length > 0 && (
        <div className="mt-4 max-w-sm">
          <Fortschrittsbalken erledigt={amZielCount} gesamt={habits.length} />
        </div>
      )}

      {habits.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Noch keine Habits. Lege mit dem Plus dein erstes an.
        </p>
      ) : (
        <div className="mt-8">
          <HabitKarten
            habits={habits}
            bereiche={bereiche}
            onToggleHeute={toggle}
            onSetWochenZiel={setWochenZiel}
            onRemove={remove}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Bereiche
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {bereiche.map((b) => {
            const farbe = FARBEN[b.farbe] ?? FARBEN.gray
            const anzahl = habits.filter((h) => h.bereichId === b.id).length
            return (
              <span
                key={b.id}
                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${farbe.punkt}`} />
                {b.name} ({anzahl})
              </span>
            )
          })}
        </div>
      </section>
    </div>
  )
}
