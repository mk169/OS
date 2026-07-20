import { useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import { schluessel } from "./Kalender"

// Habits nach dem Atomic-Habits-Prinzip, dargestellt als kleine farbige
// Kacheln (Farbe = Bereich). Stacking-Ketten erscheinen als verbundene
// Reihe: Anker-Habit, dann die angeknüpften dahinter.

export const FARBEN = {
  emerald: { zart: "bg-emerald-50 text-emerald-700", voll: "bg-emerald-500 text-white", punkt: "bg-emerald-500" },
  blue: { zart: "bg-blue-50 text-blue-700", voll: "bg-blue-500 text-white", punkt: "bg-blue-500" },
  violet: { zart: "bg-violet-50 text-violet-700", voll: "bg-violet-500 text-white", punkt: "bg-violet-500" },
  amber: { zart: "bg-amber-50 text-amber-700", voll: "bg-amber-500 text-white", punkt: "bg-amber-500" },
  rose: { zart: "bg-rose-50 text-rose-700", voll: "bg-rose-500 text-white", punkt: "bg-rose-500" },
  cyan: { zart: "bg-cyan-50 text-cyan-700", voll: "bg-cyan-500 text-white", punkt: "bg-cyan-500" },
  gray: { zart: "bg-gray-100 text-gray-600", voll: "bg-gray-600 text-white", punkt: "bg-gray-400" },
}

const STANDARD_BEREICHE = [
  { id: "koerper", name: "Körper", farbe: "emerald" },
  { id: "bildung", name: "Bildung", farbe: "blue" },
  { id: "arbeit", name: "Arbeit", farbe: "violet" },
  { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
]

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

export function streakVon(habit) {
  let zaehler = 0
  const d = new Date()
  if (!habit.erledigtAn.includes(heute())) d.setDate(d.getDate() - 1)
  while (habit.erledigtAn.includes(schluessel(d))) {
    zaehler++
    d.setDate(d.getDate() - 1)
  }
  return zaehler
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

// Kompakte Kachel-Ansicht: pro Kette eine Reihe kleiner farbiger Felder.
export function HabitKacheln({ habits, bereiche, onToggle, onRemove }) {
  const heuteKey = heute()
  const ketten = alsKettenListe(habits)

  return (
    <div className="space-y-2">
      {ketten.map((kette) => (
        <div key={kette[0].id} className="flex flex-wrap items-center gap-1.5">
          {kette.map((habit, i) => {
            const erledigt = habit.erledigtAn.includes(heuteKey)
            const farbe =
              FARBEN[bereichVon(habit, bereiche).farbe] ?? FARBEN.gray
            const s = streakVon(habit)
            return (
              <span key={habit.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-xs text-gray-300">→</span>}
                <button
                  onClick={() => onToggle(habit)}
                  title={
                    erledigt ? "Heute erledigt – klicken zum Zurücksetzen" : "Als erledigt markieren"
                  }
                  className={`group relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    erledigt ? farbe.voll : `${farbe.zart} hover:opacity-80`
                  }`}
                >
                  {habit.name}
                  {s > 0 && (
                    <span className={erledigt ? "ml-1.5 opacity-80" : "ml-1.5 opacity-60"}>
                      {s}
                    </span>
                  )}
                  {onRemove && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(habit.id)
                      }}
                      title="Habit löschen"
                      className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[10px] leading-none text-white group-hover:flex"
                    >
                      ×
                    </span>
                  )}
                </button>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
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

function HabitErstellen({ habits, setHabits, bereiche, setBereiche }) {
  const [offen, setOffen] = useState(false)
  const [name, setName] = useState("")
  const [bereichId, setBereichId] = useState(bereiche[0]?.id ?? "")
  const [neuerBereich, setNeuerBereich] = useState(false)
  const [bereichName, setBereichName] = useState("")
  const [bereichFarbe, setBereichFarbe] = useState("rose")
  const [stackNachId, setStackNachId] = useState("")

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
      },
    ])
    setName("")
    setStackNachId("")
    setNeuerBereich(false)
    setBereichName("")
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

      {neuerBereich && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3">
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
  const heuteKey = heute()

  function remove(id) {
    setHabits(
      habits
        .filter((h) => h.id !== id)
        .map((h) => (h.stackNachId === id ? { ...h, stackNachId: null } : h))
    )
  }

  const heuteErledigt = habits.filter((h) =>
    h.erledigtAn.includes(heuteKey)
  ).length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="mt-1 text-sm text-gray-400">
            {habits.length === 0
              ? "Baue Gewohnheiten in Ketten auf – ein Habit knüpft an das nächste an."
              : `Heute ${heuteErledigt} von ${habits.length} erledigt. Klicken zum Abhaken.`}
          </p>
        </div>
        <HabitErstellen
          habits={habits}
          setHabits={setHabits}
          bereiche={bereiche}
          setBereiche={setBereiche}
        />
      </div>

      {habits.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Noch keine Habits. Lege mit dem Plus dein erstes an.
        </p>
      ) : (
        <div className="mt-8">
          <HabitKacheln
            habits={habits}
            bereiche={bereiche}
            onToggle={toggle}
            onRemove={remove}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Bereiche
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {bereiche.map((b) => {
            const farbe = FARBEN[b.farbe] ?? FARBEN.gray
            const anzahl = habits.filter((h) => h.bereichId === b.id).length
            return (
              <span
                key={b.id}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${farbe.zart}`}
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
