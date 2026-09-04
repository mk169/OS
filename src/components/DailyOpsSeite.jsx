import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { heute, inTagen } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import {
  RHYTHMEN,
  TAGESZEITEN,
  WOCHENTAGE_KURZ,
  erledigteSchritte,
  rhythmusLabel,
  routineFortschritt,
  routineStreak,
  routinenAmTag,
  schrittUmschalten,
  tageszeitVon,
  tagesBilanz,
  verlauf,
} from "../lib/dailyops"
import Seitenkopf from "./Seitenkopf"
import LoeschKnopf from "./LoeschKnopf"

// Lebensbereich „Daily Operations": der tägliche Betrieb als Checklisten.
// Habits fragen „habe ich es getan?", Routinen fragen „ist der Ablauf
// durch?" – deshalb hier Schritte statt einzelner Gewohnheiten. Die
// Rechnung (Rhythmus, Fortschritt, Serie) liegt in lib/dailyops.js.

const FARB_OPTIONEN = ["violet", "emerald", "blue", "amber", "rose", "cyan"]

export default function DailyOpsSeite() {
  const [routinen, setRoutinen] = useStored("dailyops_routinen", [])
  const [protokoll, setProtokoll] = useStored("dailyops_protokoll", {})
  const [tag, setTag] = useState(heute())
  const [verwalten, setVerwalten] = useState(false)

  const anstehend = useMemo(() => routinenAmTag(routinen, tag), [routinen, tag])
  const bilanz = useMemo(() => tagesBilanz(routinen, protokoll, tag), [routinen, protokoll, tag])
  const streak = useMemo(() => routineStreak(routinen, protokoll), [routinen, protokoll])
  const woche = useMemo(() => verlauf(routinen, protokoll, 7), [routinen, protokoll])

  const umschalten = (routineId, schrittId) =>
    setProtokoll(schrittUmschalten(protokoll, routineId, schrittId, tag))

  const istHeute = tag === heute()

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        eyebrow="Betrieb"
        titel="Daily Operations"
        unterzeile="Der tägliche Betrieb – Routinen und wiederkehrende Abläufe."
        aktion={
          <button
            onClick={() => setVerwalten((v) => !v)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
          >
            {verwalten ? "Fertig" : "Routinen verwalten"}
          </button>
        }
      />

      {verwalten ? (
        <Verwaltung routinen={routinen} setRoutinen={setRoutinen} />
      ) : (
        <div className="space-y-5">
          {/* Tageswechsel: der Betrieb lässt sich auch nachtragen. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <PfeilKnopf richtung="zurueck" onClick={() => setTag(nachbarTag(tag, -1))} />
              <span className="min-w-[9.5rem] text-center text-sm font-medium text-gray-900">
                {tagLabel(tag)}
              </span>
              <PfeilKnopf
                richtung="vor"
                onClick={() => setTag(nachbarTag(tag, 1))}
                aus={istHeute}
              />
            </div>
            {!istHeute && (
              <button
                onClick={() => setTag(heute())}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-900"
              >
                Heute
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <StatKarte
              label={bilanz.gesamt === 0 ? "nichts zu tun" : "Schritte erledigt"}
              wert={bilanz.gesamt === 0 ? "–" : `${bilanz.erledigt}/${bilanz.gesamt}`}
            />
            <StatKarte
              label="Routinen durch"
              wert={`${bilanz.fertigeRoutinen}/${bilanz.routinen}`}
            />
            <StatKarte
              label="Serie"
              wert={streak === 0 ? "–" : `${streak} ${streak === 1 ? "Tag" : "Tage"}`}
            />
          </div>

          <Wochenstreifen tage={woche} aktiv={tag} onWaehle={setTag} />

          {anstehend.length === 0 ? (
            <LeerHinweis
              emoji="🗒️"
              titel={
                routinen.length === 0 ? "Noch keine Routine" : "Heute steht nichts an"
              }
              text={
                routinen.length === 0
                  ? "Lege einen Ablauf an – Morgenroutine, Wochenstart, Abendcheck."
                  : "An diesem Tag ist keine deiner Routinen fällig."
              }
            />
          ) : (
            <ul className="space-y-3">
              {anstehend.map((r) => (
                <RoutinenKarte
                  key={r.id}
                  routine={r}
                  erledigt={erledigteSchritte(protokoll, r.id, tag)}
                  fortschritt={routineFortschritt(r, protokoll, tag)}
                  onUmschalten={(schrittId) => umschalten(r.id, schrittId)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Bausteine ──────────────────────────────────────────────────────────── */

function StatKarte({ label, wert }) {
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm shadow-gray-100">
      <p className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{wert}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

function LeerHinweis({ emoji, titel, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-2 text-sm font-medium text-gray-900">{titel}</p>
      <p className="mt-1 text-xs text-gray-400">{text}</p>
    </div>
  )
}

function PfeilKnopf({ richtung, onClick, aus = false }) {
  return (
    <button
      onClick={onClick}
      disabled={aus}
      title={richtung === "vor" ? "Nächster Tag" : "Vorheriger Tag"}
      className="rounded-lg px-2 py-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {richtung === "vor" ? "›" : "‹"}
    </button>
  )
}

// Nachbartag eines Datums-Schlüssels; nie über heute hinaus.
function nachbarTag(tag, schritt) {
  const d = new Date(tag)
  d.setDate(d.getDate() + schritt)
  const neu = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return neu > heute() ? heute() : neu
}

function tagLabel(tag) {
  if (tag === heute()) return "Heute"
  if (tag === inTagen(-1)) return "Gestern"
  return new Date(tag).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  })
}

// Sieben Tage als Balken: wie viel war an dem Tag durch?
function Wochenstreifen({ tage, aktiv, onWaehle }) {
  return (
    <div className="flex items-end gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-3">
      {tage.map((t) => {
        const hoehe = t.gesamt === 0 ? 6 : Math.max(6, Math.round((t.prozent / 100) * 40))
        const voll = t.gesamt > 0 && t.erledigt === t.gesamt
        return (
          <button
            key={t.datum}
            onClick={() => onWaehle(t.datum)}
            title={
              t.gesamt === 0
                ? `${t.datum}: nichts fällig`
                : `${t.datum}: ${t.erledigt}/${t.gesamt}`
            }
            className="group flex flex-1 flex-col items-center gap-1"
          >
            <span className="flex h-10 w-full items-end justify-center">
              <span
                style={{ height: `${hoehe}px` }}
                className={`w-full rounded-md transition-colors ${
                  t.gesamt === 0
                    ? "bg-gray-100"
                    : voll
                      ? "bg-accent-500"
                      : "bg-accent-200 group-hover:bg-accent-300"
                }`}
              />
            </span>
            <span
              className={`text-[10px] ${
                t.datum === aktiv ? "font-semibold text-gray-900" : "text-gray-400"
              }`}
            >
              {WOCHENTAGE_KURZ[(new Date(t.datum).getDay() + 6) % 7]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RoutinenKarte({ routine, erledigt, fortschritt, onUmschalten }) {
  const zeit = tageszeitVon(routine.zeit)
  const pal = FARBEN[routine.farbe] ?? FARBEN.violet
  const schritte = routine.schritte ?? []

  return (
    <li
      className={`rounded-2xl border bg-white p-4 transition-colors ${
        fortschritt.fertig ? "border-emerald-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${pal.zart}`}>
          {zeit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{routine.name}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {zeit.label} · {rhythmusLabel(routine)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            fortschritt.fertig ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {fortschritt.gesamt === 0
            ? "leer"
            : `${fortschritt.erledigt}/${fortschritt.gesamt}`}
        </span>
      </div>

      {schritte.length === 0 ? (
        <p className="mt-3 text-xs text-gray-400">
          Diese Routine hat noch keine Schritte – unter „Routinen verwalten" ergänzen.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {schritte.map((s) => {
            const ab = erledigt.includes(s.id)
            return (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={ab}
                    onChange={() => onUmschalten(s.id)}
                    className="h-4 w-4 shrink-0 accent-gray-900"
                  />
                  <span className={ab ? "text-gray-400 line-through" : "text-gray-700"}>
                    {s.text}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/* ── Verwaltung ─────────────────────────────────────────────────────────── */

function Verwaltung({ routinen, setRoutinen }) {
  const [name, setName] = useState("")
  const [zeit, setZeit] = useState("morgen")
  const [rhythmus, setRhythmus] = useState("taeglich")

  function anlegen(e) {
    e.preventDefault()
    if (!name.trim()) return
    setRoutinen([
      ...routinen,
      {
        id: Date.now(),
        name: name.trim(),
        zeit,
        rhythmus,
        tage: rhythmus === "tage" ? [] : undefined,
        farbe: FARB_OPTIONEN[routinen.length % FARB_OPTIONEN.length],
        schritte: [],
        erstelltAm: Date.now(),
      },
    ])
    setName("")
  }

  const aendere = (id, aenderung) =>
    setRoutinen(routinen.map((r) => (r.id === id ? { ...r, ...aenderung } : r)))

  return (
    <div className="space-y-4">
      <form
        onSubmit={anlegen}
        className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine, z.B. Morgenroutine"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <select
          value={zeit}
          onChange={(e) => setZeit(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        >
          {TAGESZEITEN.map((z) => (
            <option key={z.key} value={z.key}>
              {z.emoji} {z.label}
            </option>
          ))}
        </select>
        <select
          value={rhythmus}
          onChange={(e) => setRhythmus(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        >
          {RHYTHMEN.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anlegen
        </button>
      </form>

      {routinen.length === 0 ? (
        <LeerHinweis
          emoji="🗒️"
          titel="Noch keine Routine"
          text="Ein Ablauf ist eine Checkliste mit Rhythmus – täglich, werktags oder an festen Tagen."
        />
      ) : (
        <ul className="space-y-3">
          {routinen.map((r) => (
            <RoutineBearbeiten
              key={r.id}
              routine={r}
              onAendere={(a) => aendere(r.id, a)}
              onLoeschen={() => setRoutinen(routinen.filter((x) => x.id !== r.id))}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function RoutineBearbeiten({ routine, onAendere, onLoeschen }) {
  const [schritt, setSchritt] = useState("")
  const schritte = routine.schritte ?? []

  function schrittHinzu(e) {
    e.preventDefault()
    if (!schritt.trim()) return
    onAendere({ schritte: [...schritte, { id: Date.now(), text: schritt.trim() }] })
    setSchritt("")
  }

  function tagUmschalten(index) {
    const tage = routine.tage ?? []
    onAendere({
      tage: tage.includes(index) ? tage.filter((t) => t !== index) : [...tage, index],
    })
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <input
          value={routine.name}
          onChange={(e) => onAendere({ name: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-transparent px-1 py-0.5 text-sm font-medium text-gray-900 outline-none hover:border-gray-200 focus:border-gray-900"
        />
        <LoeschKnopf
          onLoeschen={onLoeschen}
          klasse="text-gray-300"
          frageText="Routine löschen?"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={routine.zeit ?? "morgen"}
          onChange={(e) => onAendere({ zeit: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-900"
        >
          {TAGESZEITEN.map((z) => (
            <option key={z.key} value={z.key}>
              {z.emoji} {z.label}
            </option>
          ))}
        </select>
        <select
          value={routine.rhythmus ?? "taeglich"}
          onChange={(e) => onAendere({ rhythmus: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-900"
        >
          {RHYTHMEN.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          {FARB_OPTIONEN.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onAendere({ farbe: f })}
              title={f}
              className={`h-4 w-4 rounded-full transition-transform hover:scale-110 ${FARBEN[f].punkt} ${
                (routine.farbe ?? "violet") === f ? "ring-2 ring-gray-400 ring-offset-1" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {(routine.rhythmus ?? "taeglich") === "tage" && (
        <div className="mt-2 flex gap-1">
          {WOCHENTAGE_KURZ.map((label, i) => {
            const an = (routine.tage ?? []).includes(i)
            return (
              <button
                key={label}
                type="button"
                onClick={() => tagUmschalten(i)}
                className={`h-7 w-9 rounded-md text-[11px] font-medium transition-colors ${
                  an ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {schritte.map((s) => (
          <li key={s.id} className="group flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
            <input
              value={s.text}
              onChange={(e) =>
                onAendere({
                  schritte: schritte.map((x) =>
                    x.id === s.id ? { ...x, text: e.target.value } : x
                  ),
                })
              }
              className="min-w-0 flex-1 rounded-md border border-transparent px-1 py-0.5 text-sm text-gray-700 outline-none hover:border-gray-200 focus:border-gray-900"
            />
            <LoeschKnopf
              onLoeschen={() =>
                onAendere({ schritte: schritte.filter((x) => x.id !== s.id) })
              }
              klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
            />
          </li>
        ))}
      </ul>

      <form onSubmit={schrittHinzu} className="mt-2">
        <input
          value={schritt}
          onChange={(e) => setSchritt(e.target.value)}
          placeholder="+ Schritt"
          className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-900"
        />
      </form>
    </li>
  )
}
