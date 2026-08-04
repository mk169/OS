import { useState } from "react"
import useStored from "../lib/useStored"
import { heute, montagVon, wochenSchluessel } from "../lib/datum"
import { schluessel } from "./Kalender"
import { FARBEN } from "../lib/farben"
import { normalisiereStil, STIL_STANDARD } from "../lib/stil"
import { levelVon, attributLevel } from "../lib/spiel"
import { Fortschrittsbalken } from "./OrdnerSeite"
import Seitenkopf from "./Seitenkopf"

const STANDARD_BEREICHE = [
  { id: "koerper", name: "Körper", farbe: "emerald" },
  { id: "bildung", name: "Bildung", farbe: "blue" },
  { id: "arbeit", name: "Arbeit", farbe: "violet" },
  { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
]

const STANDARD_WOCHENZIEL = 3
const TAG_LABELS = ["Mo", "", "Mi", "", "Fr", "", ""]
const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

// ──────────────────────────────────────────────────────────────
// Exportierte Helfer-Funktionen
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// Locked In – Disziplin-Modell (tagesbasiert)
//
// Anders als der wochenbasierte Standard bewertet dieser Stil jeden Tag
// kompromisslos: Disziplin = Anteil der an dem Tag existierenden Habits, die
// erledigt wurden. Die Habit-`id` ist der Erstell-Zeitstempel (Date.now) und
// dient als Existenz-Nachweis, damit frisch angelegte Habits vergangene Tage
// nicht rückwirkend „brechen".
// ──────────────────────────────────────────────────────────────

function existierteAm(habit, grenze) {
  return typeof habit.id !== "number" || habit.id <= grenze
}

// Habits, die an diesem Tag bereits existierten.
function habitsAmTag(habits, datum) {
  const d = new Date(datum)
  d.setHours(23, 59, 59, 999)
  const grenze = d.getTime()
  return habits.filter((h) => existierteAm(h, grenze))
}

// Disziplin eines Tages: erledigt / gesamt + Prozent + Vollständigkeit.
export function disziplinAmTag(habits, datum) {
  const relevant = habitsAmTag(habits, datum)
  const key = schluessel(datum)
  const erledigt = relevant.filter((h) => h.erledigtAn.includes(key)).length
  const gesamt = relevant.length
  return {
    erledigt,
    gesamt,
    prozent: gesamt === 0 ? 0 : Math.round((erledigt / gesamt) * 100),
    vollstaendig: gesamt > 0 && erledigt === gesamt,
  }
}

// Tages-Streak: Anzahl aufeinanderfolgender vollständiger (oder eingefrorener)
// Tage bis heute. Der laufende Tag bricht die Serie nicht – er zählt erst,
// wenn er vollständig ist (Reset erst um Mitternacht).
export function disziplinStreak(habits, gefroren = new Set()) {
  let zaehler = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  if (!disziplinAmTag(habits, cursor).vollstaendig) {
    cursor.setDate(cursor.getDate() - 1)
  }
  for (let i = 0; i < 3650; i++) {
    const status = disziplinAmTag(habits, cursor)
    if (status.gesamt === 0) break
    if (status.vollstaendig || gefroren.has(schluessel(cursor))) {
      zaehler++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return zaehler
}

// Edge Score: Durchschnittliche Disziplin der letzten 7 Tage mit Habits.
export function edgeScore(habits) {
  let summe = 0
  let tage = 0
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const s = disziplinAmTag(habits, cursor)
    if (s.gesamt > 0) {
      summe += s.prozent
      tage++
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return tage === 0 ? 0 : Math.round(summe / tage)
}

// Tag-Nummer seit dem ältesten angelegten Habit (Onboarding-Gefühl „DAY N").
export function tagNummer(habits) {
  const zeiten = habits
    .map((h) => (typeof h.id === "number" ? h.id : null))
    .filter((z) => z != null)
  if (zeiten.length === 0) return 1
  const start = new Date(Math.min(...zeiten))
  start.setHours(0, 0, 0, 0)
  const heuteD = new Date()
  heuteD.setHours(0, 0, 0, 0)
  return Math.max(1, Math.round((heuteD - start) / 86_400_000) + 1)
}

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

export function HabitKarten({
  habits,
  bereiche,
  onToggleHeute,
  onSetWochenZiel,
  onRemove,
}) {
  const ketten = alsKettenListe(habits)
  return (
    <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
      {ketten.map((kette) => (
        <div
          key={kette[0].id}
          className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-3 sm:px-4"
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

// ──────────────────────────────────────────────────────────────
// Komponenten für den Standard-Stil
// ──────────────────────────────────────────────────────────────

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
  const wochen = typeof window !== "undefined" && window.innerWidth < 640 ? 8 : wochenAnzahl
  const spalten = wochenSpalten(wochen)
  const streak = wochenStreakVon(habit)
  const ziel = wochenZielVon(habit)
  const inDieserWoche = erledigtInWoche(habit, montagVon(new Date()))

  return (
    <div className={`group py-2 sm:py-3 ${eingerueckt ? "pl-6" : ""}`}>
      <div className="flex items-center gap-2">
        {eingerueckt && <span className="-ml-4 text-xs text-gray-300">↳</span>}
        <span className={`h-2 w-2 shrink-0 rounded-full ${farbe.punkt}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
          {habit.name}
        </span>
        {onRemove && (
          <button
            onClick={() => onRemove(habit.id)}
            title="Habit löschen"
            className="shrink-0 text-gray-300 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-2 overflow-x-auto">
        <div className="inline-flex gap-[2px] sm:gap-[3px]">
          <div className="flex flex-col gap-[2px] sm:gap-[3px]">
            <span className="h-3 sm:h-3" />
            {TAG_LABELS.map((l, i) => (
              <span
                key={i}
                className="h-3 text-[7px] leading-[9px] text-gray-300 sm:h-2.5 sm:text-[8px] sm:leading-[10px]"
              >
                {l}
              </span>
            ))}
          </div>
          {spalten.map((montag, i) => {
            const vorMonat = i > 0 ? spalten[i - 1].getMonth() : null
            const zeigeMonat = i === 0 || montag.getMonth() !== vorMonat
            return (
              <div key={i} className="flex flex-col items-center gap-[2px] sm:gap-[3px]">
                <span className="h-3 whitespace-nowrap text-[7px] text-gray-400 sm:text-[8px]">
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
                    return <span key={tagIndex} className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                  }
                  if (tagKey === heuteKey) {
                    return (
                      <button
                        key={tagIndex}
                        type="button"
                        onClick={() => onToggleHeute(habit)}
                        title="Heute umschalten"
                        className={`h-3 w-3 rounded-sm sm:h-2.5 sm:w-2.5 ${
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
                      className={`h-3 w-3 rounded-sm sm:h-2.5 sm:w-2.5 ${
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

function HabitErstellen({
  habits,
  setHabits,
  bereiche,
  setBereiche,
  knopfKlasse = null,
  knopfInhalt = null,
}) {
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
        className={
          knopfKlasse ??
          "flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-700"
        }
        title="Habit erstellen"
      >
        {knopfInhalt ?? "+"}
      </button>
    )
  }

  return (
    <form
      onSubmit={speichern}
      className="w-full rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-col text-xs text-gray-500 sm:min-w-[10rem] sm:flex-1">
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
          Anknüpfen an (Stacking)
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
            placeholder="Name des Bereichs"
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

// ──────────────────────────────────────────────────────────────
// Hauptseite – Stil-Routing
// ──────────────────────────────────────────────────────────────

export default function HabitsSeite() {
  const { habits, setHabits, bereiche, setBereiche } = useHabitDaten()
  const [einstellungen] = useStored("einstellungen", { stil: STIL_STANDARD })
  const stil = normalisiereStil(einstellungen?.stil)
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

  const gemeinsam = {
    habits,
    bereiche,
    setHabits,
    setBereiche,
    toggle,
    setWochenZiel,
    remove,
    amZielCount,
  }

  if (stil === "gamified") return <HabitsGamified {...gemeinsam} />
  if (stil === "arcade") return <HabitsArcade {...gemeinsam} />
  if (stil === "cleangirl") return <HabitsCleanGirl {...gemeinsam} />
  if (stil === "notion") return <HabitsNotion {...gemeinsam} />
  if (stil === "lockedin") return <HabitsLockedIn {...gemeinsam} />
  return <HabitsTodo {...gemeinsam} />
}

// ──────────────────────────────────────────────────────────────
// Stil: Todo (Standard) – Klassische Heatmap-Ansicht
// ──────────────────────────────────────────────────────────────

function HabitsTodo({ habits, bereiche, setHabits, setBereiche, toggle, setWochenZiel, remove, amZielCount }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
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

      {habits.length === 0 ? null : (
        <div className="mt-6 sm:mt-8">
          <HabitKarten
            habits={habits}
            bereiche={bereiche}
            onToggleHeute={toggle}
            onSetWochenZiel={setWochenZiel}
            onRemove={remove}
          />
        </div>
      )}

      <section className="mt-8 sm:mt-10">
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
                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600"
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

// ──────────────────────────────────────────────────────────────
// Stil: Arcade – Retro Terminal
// ──────────────────────────────────────────────────────────────

function HabitsArcade({ habits, _bereiche, toggle, _remove }) {
  const completionsCount = habits.reduce((s, h) => s + h.erledigtAn.length, 0)
  const score = completionsCount * 50
  const bestStreak = habits.reduce((m, h) => Math.max(m, wochenStreakVon(h)), 0)

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p style={{ fontFamily: '"Press Start 2P"' }} className="text-[10px] text-yellow-300">
            TRAINING MODE
          </p>
          <p className="mt-2 text-[12px] text-white/70">Score: {String(score).padStart(5, "0")}</p>
          <p className="text-[10px] text-amber-400">🔥 Streak: {bestStreak}</p>
        </div>

        {habits.length === 0 ? (
          <p className="rounded border-2 border-blue-800 py-8 text-center text-xl text-white/50">
            NO HABITS LOADED
          </p>
        ) : (
          <div className="space-y-2">
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() => toggle(h)}
                className="flex w-full items-center gap-3 rounded border-2 border-cyan-600 bg-cyan-900/20 px-3 py-2 text-left transition-colors hover:border-cyan-300"
              >
                <span className="text-[10px] font-bold text-cyan-400">
                  {h.erledigtAn.includes(hoje()) ? "✓" : "○"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-cyan-300">{h.name}</span>
                <span className="text-[10px] text-cyan-400">🔥{wochenStreakVon(h)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Stil: Clean Girl – Soft & elegant
// ──────────────────────────────────────────────────────────────

function HabitsCleanGirl({ habits, _bereiche, toggle, remove }) {
  const completionsToday = habits.filter((h) =>
    h.erledigtAn.includes(heute())
  ).length

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-10">
        <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="text-4xl text-rose-400">
          daily rituals ♡
        </p>
        <p className="mt-2 text-sm text-rose-300">
          {completionsToday}/{habits.length} today
        </p>
      </div>

      {habits.length === 0 ? (
        <p className="rounded-3xl bg-white/60 py-10 text-center text-sm text-rose-400">
          start a new ritual ♡
        </p>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => {
            const dranHeute = h.erledigtAn.includes(heute())
            return (
              <li
                key={h.id}
                className="group flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-[0_10px_30px_-20px_rgba(219,112,147,0.6)] backdrop-blur-sm"
              >
                <button
                  onClick={() => toggle(h)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-rose-300 text-rose-400 transition-colors hover:bg-rose-100"
                  title="Heute trainieren"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3 w-3 ${dranHeute ? "opacity-100" : "opacity-0"}`}
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </button>
                <span
                  className={`min-w-0 flex-1 truncate text-[14px] ${
                    dranHeute ? "text-rose-300/50 line-through" : "text-rose-700"
                  }`}
                >
                  {h.name}
                </span>
                <span className="text-[11px] text-rose-300">🔥{wochenStreakVon(h)}</span>
                <button
                  onClick={() => remove(h.id)}
                  className="text-rose-200 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Stil: Notion – Minimal & subtil
// ──────────────────────────────────────────────────────────────

function HabitsNotion({ habits, bereiche, setHabits, setBereiche, toggle, remove }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-10">
        <div className="text-5xl">💪</div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">Habits</h1>
      </div>

      <section className="mb-12">
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Deine Fähigkeiten
          </p>
          <HabitErstellen
            habits={habits}
            setHabits={setHabits}
            bereiche={bereiche}
            setBereiche={setBereiche}
            knopfKlasse="text-sm text-gray-400 transition-colors hover:text-gray-800"
            knopfInhalt="+ Neu"
          />
        </div>

        {habits.length > 0 && (
          <ul>
            {habits.map((h) => {
              const dran = h.erledigtAn.includes(heute())
              return (
                <li key={h.id} className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={dran}
                    onChange={() => toggle(h)}
                    className="h-[15px] w-[15px] shrink-0 rounded accent-gray-800"
                  />
                  <span className={`min-w-0 flex-1 truncate text-[15px] ${dran ? "text-gray-400 line-through" : "text-gray-700"}`}>
                    {h.name}
                  </span>
                  <span className="text-[11px] text-gray-400">🔥{wochenStreakVon(h)}</span>
                  <button
                    onClick={() => remove(h.id)}
                    className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Gamified – RPG Training System
// ──────────────────────────────────────────────────────────────

function attributEmoji(name) {
  const n = name.toLowerCase()
  if (/(körper|koerper|sport|fitness|gesund)/.test(n)) return "💪"
  if (/(bildung|lernen|wissen|studium|schule)/.test(n)) return "🧠"
  if (/(arbeit|beruf|work|business|karriere)/.test(n)) return "⚒️"
  if (/(achtsam|medit|geist|mental|ruhe)/.test(n)) return "🧘"
  if (/(finanz|geld|money|spar)/.test(n)) return "💰"
  if (/(sozial|freund|familie|beziehung)/.test(n)) return "🤝"
  return "⭐"
}

const RUNEN_LABELS = ["M", "D", "M", "D", "F", "S", "S"]

function WochenRunen({ habit, farbe, onToggleHeute }) {
  const heuteKey = heute()
  const montag = montagVon(new Date())
  return (
    <div className="flex gap-1">
      {RUNEN_LABELS.map((label, i) => {
        const d = new Date(montag)
        d.setDate(d.getDate() + i)
        const key = schluessel(d)
        const done = habit.erledigtAn.includes(key)
        const future = key > heuteKey
        const istHeute = key === heuteKey
        return (
          <button
            key={i}
            type="button"
            disabled={future}
            onClick={istHeute ? () => onToggleHeute(habit) : undefined}
            title={d.toLocaleDateString("de-DE")}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold transition-colors ${
              done
                ? `${farbe.punkt} text-white`
                : future
                  ? "bg-white/5 text-white/15"
                  : istHeute
                    ? `border border-dashed ${farbe.ring} text-white/60`
                    : "bg-white/10 text-white/25"
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function HabitGamifiedKarte({
  habit,
  bereiche,
  onToggleHeute,
  onSetWochenZiel,
  onRemove,
  eingerueckt,
}) {
  const farbe = FARBEN[bereichVon(habit, bereiche).farbe] ?? FARBEN.gray
  const dranHeute = habit.erledigtAn.includes(heute())
  const streak = wochenStreakVon(habit)
  const ziel = wochenZielVon(habit)
  const inWoche = erledigtInWoche(habit, montagVon(new Date()))
  const fortschritt = ziel > 0 ? Math.min(100, Math.round((inWoche / ziel) * 100)) : 0

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${
        eingerueckt ? "ml-4 border-l-2 border-l-white/20" : ""
      }`}
    >
      <div className="group flex items-start gap-2">
        {eingerueckt && <span className="text-white/30">⛓</span>}
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${farbe.punkt}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{habit.name}</p>
          <p className="text-[11px] text-white/40">
            {streak > 0
              ? `🔥 ${streak} ${streak === 1 ? "Woche" : "Wochen"} Streak`
              : `${inWoche}/${ziel} diese Woche`}
          </p>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(habit.id)}
            title="Fähigkeit löschen"
            className="shrink-0 text-white/30 transition-colors hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${farbe.punkt} transition-all duration-500`}
            style={{ width: `${fortschritt}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] text-white/40">
          {inWoche}/{ziel} XP
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <WochenRunen habit={habit} farbe={farbe} onToggleHeute={onToggleHeute} />
        <button
          onClick={() => onToggleHeute(habit)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            dranHeute
              ? "bg-amber-400 text-slate-900"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {dranHeute ? "✓ Trainiert" : "Heute trainieren"}
        </button>
      </div>

      {onSetWochenZiel && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40">
          Ziel/Woche
          <WochenZielAuswahl wert={ziel} onChange={(z) => onSetWochenZiel(habit, z)} />
        </div>
      )}
    </div>
  )
}

function HabitsGamified({
  habits,
  bereiche,
  setHabits,
  setBereiche,
  toggle,
  setWochenZiel,
  remove,
}) {
  const totalCompletions = habits.reduce((s, h) => s + h.erledigtAn.length, 0)
  const { level, xpInLevel, xpProLevel, fortschritt } = levelVon(totalCompletions * 5)
  const bestStreak = habits.reduce((m, h) => Math.max(m, wochenStreakVon(h)), 0)
  const ketten = alsKettenListe(habits)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 px-5 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl shadow-lg">
                🧙
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-300">
                  Training
                </p>
                <h1 style={{ fontFamily: "var(--font-sans)" }} className="text-2xl font-bold">
                  Level {level}
                </h1>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-bold text-amber-300">🔥 {bestStreak}</p>
              <p className="text-white/50">{habits.length} Skills</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${fortschritt}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-medium text-white/50">
              {xpInLevel}/{xpProLevel} XP
            </span>
          </div>
        </div>

        {bereiche.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {bereiche.map((b) => {
              const farbe = FARBEN[b.farbe] ?? FARBEN.gray
              const count = habits
                .filter((h) => h.bereichId === b.id)
                .reduce((s, h) => s + h.erledigtAn.length, 0)
              const attr = attributLevel(count)
              return (
                <div key={b.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{attributEmoji(b.name)}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/80">
                      {b.name}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold">Lv {attr.level}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${farbe.punkt}`}
                      style={{ width: `${attr.fortschritt}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">Fähigkeiten</h2>
          <HabitErstellen
            habits={habits}
            setHabits={setHabits}
            bereiche={bereiche}
            setBereiche={setBereiche}
            knopfKlasse="inline-flex items-center gap-1.5 rounded-full bg-violet-500 px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-violet-400"
            knopfInhalt="+ Neue Fähigkeit"
          />
        </div>

        {habits.length === 0 ? null : (
          <div className="space-y-3">
            {ketten.map((kette) => (
              <div key={kette[0].id} className="space-y-2">
                {kette.map((habit, i) => (
                  <HabitGamifiedKarte
                    key={habit.id}
                    habit={habit}
                    bereiche={bereiche}
                    onToggleHeute={toggle}
                    onSetWochenZiel={setWochenZiel}
                    onRemove={remove}
                    eingerueckt={i > 0}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Stil: Locked In – Kompromisslose Disziplin, monochrom
//
// Eigener Modus mit zwei Tabs: „Heute" (Disziplin-Ring aus dem Anteil heute
// erledigter Habits, Tages-Streak mit Freeze-Schutz, Edge Score als
// 7-Tage-Schnitt, strenge Checkliste mit Keystone-Markierung) und „Verlauf"
// (Disziplin je Tag als monochrome Balken). Ohne Habits erscheint „Wähle
// deine Spur" mit Start-Stacks; später jederzeit über „Vorlage" erreichbar.
// ──────────────────────────────────────────────────────────────

function DisziplinRing({ prozent }) {
  const r = 88
  const umfang = 2 * Math.PI * r
  const offset = umfang * (1 - prozent / 100)
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="2"
        />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/40">
          Disziplin
        </span>
        <span className="mt-2 text-6xl font-light tabular-nums text-white">
          {prozent}
        </span>
        <span className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/30">
          Reset um Mitternacht
        </span>
      </div>
    </div>
  )
}

// Start-Stacks („Wähle deine Spur") – setzen beim Antippen eine passende
// Habit-Auswahl. bereichId verweist auf die Standard-Bereiche; unbekannte
// IDs fallen in anderen Stilen auf „Allgemein" zurück (im Locked-In-Look
// ohne Bedeutung, da monochrom).
const LOCKED_PRESETS = [
  {
    id: "base",
    name: "The Base Stack",
    untertitel: "Die Grundlagen. Nichts Extra.",
    habits: [
      { name: "7+ Stunden Schlaf", bereichId: "koerper", key: true },
      { name: "20 Minuten bewegen", bereichId: "koerper", key: true },
      { name: "Erste Stunde kein Handy", bereichId: "achtsamkeit" },
    ],
  },
  {
    id: "athlete",
    name: "Athlete",
    untertitel: "Trainieren. Ernähren. Schlafen.",
    habits: [
      { name: "Training absolviert", bereichId: "koerper", key: true },
      { name: "Protein-Ziel getroffen", bereichId: "koerper" },
      { name: "8 Stunden Schlaf", bereichId: "koerper", key: true },
      { name: "10 Min Mobility", bereichId: "koerper" },
    ],
  },
  {
    id: "student",
    name: "Student",
    untertitel: "Deep Work zuerst.",
    habits: [
      { name: "2 Std Deep Work", bereichId: "bildung", key: true },
      { name: "Vorlesung nachbereitet", bereichId: "bildung" },
      { name: "Vormittags kein Social Media", bereichId: "achtsamkeit" },
      { name: "20 Minuten lesen", bereichId: "bildung" },
    ],
  },
  {
    id: "founder",
    name: "Founder",
    untertitel: "Jeden Tag etwas shippen.",
    habits: [
      { name: "Etwas geshippt", bereichId: "arbeit", key: true },
      { name: "5 Outreach-Nachrichten", bereichId: "arbeit" },
      { name: "2 Std Deep Work", bereichId: "arbeit", key: true },
      { name: "Bewegung", bereichId: "koerper" },
    ],
  },
  {
    id: "reset",
    name: "The Reset",
    untertitel: "Konstanz statt Intensität.",
    habits: [
      { name: "Spaziergang", bereichId: "koerper", key: true },
      { name: "7+ Stunden Schlaf", bereichId: "koerper" },
      { name: "2 Liter Wasser", bereichId: "koerper" },
      { name: "Journaling", bereichId: "achtsamkeit" },
    ],
  },
  {
    id: "cut",
    name: "The Cut",
    untertitel: "Jeden Tag ein Defizit.",
    habits: [
      { name: "Kaloriendefizit gehalten", bereichId: "koerper", key: true },
      { name: "10.000 Schritte", bereichId: "koerper", key: true },
      { name: "Protein-Ziel getroffen", bereichId: "koerper" },
      { name: "Krafttraining", bereichId: "koerper" },
    ],
  },
]

// Verlaufszeilen der letzten `tage` Tage (nur Tage mit Habits), neuste zuerst.
function verlaufDaten(habits, gefroren, tage = 30) {
  const zeilen = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (let i = 0; i < tage; i++) {
    const s = disziplinAmTag(habits, cursor)
    if (s.gesamt > 0) {
      zeilen.push({
        key: schluessel(cursor),
        datum: new Date(cursor),
        ...s,
        gefroren: gefroren.has(schluessel(cursor)),
      })
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return zeilen
}

function LockedTab({ aktiv, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors ${
        aktiv
          ? "border-white text-white"
          : "border-transparent text-white/35 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  )
}

// „Wähle deine Spur" – Start-Stacks im Locked-In-Look.
function PickYourLane({ onWaehle }) {
  return (
    <div className="mt-8">
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/30">
        Start-Stack
      </p>
      <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight text-white">
        Wähle deine Spur.
      </h2>
      <p className="mt-3 text-sm text-white/50">
        Das wählt nur deinen Start-Stack. Anpassen kannst du danach jederzeit.
      </p>
      <div className="mt-6 space-y-3">
        {LOCKED_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onWaehle(p)}
            className="block w-full border border-white/15 p-5 text-left transition-colors hover:border-white/60"
          >
            <p className="text-lg font-bold uppercase tracking-widest text-white">
              {p.name}
            </p>
            <p className="mt-1 text-sm text-white/40">{p.untertitel}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// Verlauf – Disziplin je Tag als monochrome Balken.
function VerlaufAnsicht({ habits, gefroren }) {
  const zeilen = verlaufDaten(habits, gefroren, 30)
  if (zeilen.length === 0) {
    return (
      <p className="mt-10 border-t border-white/10 py-10 text-center text-sm uppercase tracking-widest text-white/30">
        Noch kein Verlauf
      </p>
    )
  }
  const vollstaendige = zeilen.filter((z) => z.vollstaendig || z.gefroren).length
  const schnitt = Math.round(
    zeilen.reduce((s, z) => s + z.prozent, 0) / zeilen.length
  )
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 text-[11px] uppercase tracking-[0.25em] text-white/40">
        <span>{vollstaendige} vollständige Tage</span>
        <span>Ø {schnitt}%</span>
      </div>
      <ul>
        {zeilen.map((z) => (
          <li
            key={z.key}
            className="flex items-center gap-3 border-b border-white/10 py-3"
          >
            <span className="w-24 shrink-0 text-xs text-white/50">
              {z.datum.toLocaleDateString("de-DE", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
            <div className="h-2 flex-1 overflow-hidden bg-white/10">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${z.prozent}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-white/60">
              {z.erledigt}/{z.gesamt}
            </span>
            <span className="w-4 shrink-0 text-center text-xs text-white/70">
              {z.gefroren ? "❄" : z.vollstaendig ? "✓" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HabitsLockedIn({
  habits,
  setHabits,
  bereiche,
  setBereiche,
  toggle,
}) {
  const [freeze, setFreeze] = useStored("habitFreeze", {
    verfuegbar: 1,
    tage: [],
  })
  const [tab, setTab] = useState("heute") // heute | verlauf
  const [presetsOffen, setPresetsOffen] = useState(false)
  const gefroren = new Set(freeze.tage ?? [])

  const heuteStatus = disziplinAmTag(habits, new Date())
  const streak = disziplinStreak(habits, gefroren)
  const score = edgeScore(habits)
  const tag = tagNummer(habits)
  const heuteKey = heute()

  // Schlüssel-Habits (Keystone) zuerst, sonst ursprüngliche Reihenfolge.
  const sortiert = [...habits].sort(
    (a, b) => (b.istSchluessel ? 1 : 0) - (a.istSchluessel ? 1 : 0)
  )

  function toggleSchluessel(habit) {
    setHabits(
      habits.map((h) =>
        h.id === habit.id ? { ...h, istSchluessel: !h.istSchluessel } : h
      )
    )
  }

  // Freeze auf den jüngsten vergangenen, unvollständigen Tag anwenden – so
  // überlebt die Serie einen einzelnen Ausrutscher.
  function freezeNutzen() {
    if ((freeze.verfuegbar ?? 0) <= 0) return
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    cursor.setDate(cursor.getDate() - 1)
    for (let i = 0; i < 60; i++) {
      const status = disziplinAmTag(habits, cursor)
      const key = schluessel(cursor)
      if (status.gesamt === 0) break
      if (!status.vollstaendig && !gefroren.has(key)) {
        setFreeze({
          verfuegbar: (freeze.verfuegbar ?? 0) - 1,
          tage: [...(freeze.tage ?? []), key],
        })
        return
      }
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  const freezeVerfuegbar = freeze.verfuegbar ?? 0

  // Start-Stack anwenden: passende Habits anhängen (heute erstellt, damit sie
  // vergangene Tage im Verlauf nicht rückwirkend brechen).
  function stackWaehlen(preset) {
    const basis = Date.now()
    const neue = preset.habits.map((h, i) => ({
      id: basis + i,
      name: h.name,
      bereichId: h.bereichId,
      stackNachId: null,
      erledigtAn: [],
      wochenZiel: 7,
      istSchluessel: Boolean(h.key),
    }))
    setHabits([...habits, ...neue])
    setPresetsOffen(false)
    setTab("heute")
  }

  const leer = habits.length === 0
  const zeigePresets = presetsOffen || (leer && tab === "heute")

  return (
    <div className="min-h-screen bg-black px-5 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-md">
        {/* Kopf */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.4em] text-white">
            Locked&nbsp;In
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">
            Tag {tag}
          </span>
          <HabitErstellen
            habits={habits}
            setHabits={setHabits}
            bereiche={bereiche}
            setBereiche={setBereiche}
            knopfKlasse="rounded-md border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-white/50 hover:text-white"
            knopfInhalt="+ Neu"
          />
        </div>

        {/* Modus-Tabs */}
        <div className="mt-6 flex items-center gap-6 border-b border-white/10">
          <LockedTab
            aktiv={tab === "heute" && !presetsOffen}
            onClick={() => {
              setTab("heute")
              setPresetsOffen(false)
            }}
          >
            Heute
          </LockedTab>
          <LockedTab
            aktiv={tab === "verlauf" && !presetsOffen}
            onClick={() => {
              setTab("verlauf")
              setPresetsOffen(false)
            }}
          >
            Verlauf
          </LockedTab>
          {!leer && (
            <button
              type="button"
              onClick={() => setPresetsOffen((o) => !o)}
              className={`ml-auto pb-2 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors ${
                presetsOffen ? "text-white" : "text-white/35 hover:text-white/70"
              }`}
            >
              Vorlage
            </button>
          )}
        </div>

        {zeigePresets ? (
          <PickYourLane onWaehle={stackWaehlen} />
        ) : tab === "verlauf" ? (
          <VerlaufAnsicht habits={habits} gefroren={gefroren} />
        ) : (
          <>
            {/* Disziplin-Ring */}
            <div className="mt-8">
              <DisziplinRing prozent={heuteStatus.prozent} />
            </div>

            {/* Streak + Freeze */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-sm uppercase tracking-[0.3em] text-white/50">
                Streak{" "}
                <span className="ml-1 font-bold tabular-nums text-white">
                  {streak}
                </span>
              </span>
              <button
                type="button"
                onClick={freezeNutzen}
                disabled={freezeVerfuegbar <= 0}
                title="Schützt die Serie an einem verpassten Tag"
                className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                  freezeVerfuegbar > 0
                    ? "border-white/25 text-white/70 hover:border-white/60 hover:text-white"
                    : "cursor-not-allowed border-white/10 text-white/20"
                }`}
              >
                Freeze ×{freezeVerfuegbar}
              </button>
            </div>

            {/* Edge Score */}
            <div className="mt-4 flex items-center justify-between rounded-md border border-white/15 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
                Edge Score
              </span>
              <span className="text-lg font-light tabular-nums text-white">
                {score}
              </span>
            </div>

            {/* Checkliste */}
            <div className="mt-6">
              <ul>
                {sortiert.map((h) => {
                  const dran = h.erledigtAn.includes(heuteKey)
                  return (
                    <li
                      key={h.id}
                      className="group flex items-center gap-3 border-t border-white/10 py-4"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(h)}
                        title="Heute abhaken"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                          dran
                            ? "border-white bg-white text-black"
                            : "border-white/30 text-transparent hover:border-white/60"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      </button>
                      <span
                        className={`min-w-0 flex-1 truncate text-lg font-medium ${
                          dran ? "text-white/40 line-through" : "text-white"
                        }`}
                      >
                        {h.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSchluessel(h)}
                        title={
                          h.istSchluessel
                            ? "Schlüssel-Habit (Keystone)"
                            : "Als Schlüssel-Habit markieren"
                        }
                        className={`shrink-0 border px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          h.istSchluessel
                            ? "border-white bg-white text-black"
                            : "border-white/15 text-white/25 hover:border-white/40 hover:text-white/50"
                        }`}
                      >
                        Key
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
