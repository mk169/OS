import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute, montagVon, wochenSchluessel } from "../lib/datum"
import { useHabitDaten, bereichVon } from "./HabitsSeite"
import Baum, { BAUM_ARTEN, stufeVon } from "./Baum"
import Seitenkopf from "./Seitenkopf"

const VORGABEN = [25, 50, 90]

function alsUhr(sekunden) {
  const m = Math.floor(sekunden / 60)
  const s = sekunden % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Deep Work: Fokus-Timer für konzentrierte Arbeitsblöcke. Während der
// Session wächst ein Baum (Forest-Prinzip); abgeschlossene Sessions lassen
// ihn in den Garten wachsen, ein Abbruch lässt ihn verdorren. Optional ist
// die Session mit einem Habit/Bereich verknüpft – dann bekommt der Baum
// dessen Farbe und das Habit wird bei Abschluss für heute abgehakt.

export default function DeepWorkSeite() {
  const [sessions, setSessions] = useStored("deepwork", [])
  const [termine, setTermine] = useStored("termine", [])
  const [projekte] = useStored("projekte", [])
  const [garten, setGarten] = useStored("garten", [])
  const { habits, setHabits, bereiche } = useHabitDaten()

  const [minuten, setMinuten] = useState(50)
  const [restSekunden, setRestSekunden] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [projektId, setProjektId] = useState("")
  const [art, setArt] = useState(BAUM_ARTEN[0].id)
  // Verknüpfung als "habit:<id>" | "bereich:<id>" | "" (ohne).
  const [verkn, setVerkn] = useState("")
  const [meldung, setMeldung] = useState("")
  // Zielzeitpunkt statt Sekundenzählen: bleibt korrekt, auch wenn der
  // Browser den Tab drosselt (z.B. während man woanders arbeitet).
  const endeUm = useRef(null)
  // Angaben des aktuell gepflanzten Baums – festgehalten beim Start, damit
  // Abschluss/Abbruch dieselben Werte nutzen wie beim Pflanzen.
  const pflanzung = useRef(null)

  const projektName = (id) => projekte.find((p) => p.id === Number(id))?.name

  const [planDatum, setPlanDatum] = useState(heute())
  const [planZeit, setPlanZeit] = useState("09:00")
  const [planDauer, setPlanDauer] = useState("90")
  const [planProjektId, setPlanProjektId] = useState("")
  const [planMeldung, setPlanMeldung] = useState("")

  // Löst die Verknüpfungs-Auswahl in Baum-Farbe und Habit/Bereich auf.
  function aufloesen(wert) {
    if (wert.startsWith("habit:")) {
      const id = Number(wert.slice(6))
      const h = habits.find((x) => x.id === id)
      const b = h ? bereichVon(h, bereiche) : null
      return { habitId: id, bereichId: h?.bereichId ?? null, farbe: b?.farbe ?? "emerald" }
    }
    if (wert.startsWith("bereich:")) {
      const id = wert.slice(8)
      const b = bereiche.find((x) => x.id === id)
      return { habitId: null, bereichId: id, farbe: b?.farbe ?? "emerald" }
    }
    return { habitId: null, bereichId: null, farbe: "emerald" }
  }

  // Timer-Takt: berechnet die Restzeit aus dem Zielzeitpunkt.
  useEffect(() => {
    if (!laeuft) return
    const takt = setInterval(() => {
      setRestSekunden(
        Math.max(0, Math.ceil((endeUm.current - Date.now()) / 1000))
      )
    }, 500)
    return () => clearInterval(takt)
  }, [laeuft])

  // Wenn der Tab wieder sichtbar wird, sofort auf die echte Restzeit springen
  // (Browser drosseln Timer in Hintergrund-Tabs).
  useEffect(() => {
    function aufwachen() {
      if (laeuft && endeUm.current) {
        setRestSekunden(
          Math.max(0, Math.ceil((endeUm.current - Date.now()) / 1000))
        )
      }
    }
    document.addEventListener("visibilitychange", aufwachen)
    window.addEventListener("focus", aufwachen)
    return () => {
      document.removeEventListener("visibilitychange", aufwachen)
      window.removeEventListener("focus", aufwachen)
    }
  }, [laeuft])

  // Abschluss: Baum wächst in den Garten, Session wird protokolliert und ein
  // verknüpftes Habit für heute abgehakt.
  useEffect(() => {
    if (restSekunden !== 0) return
    // pflanzung.current wird in start() immer gesetzt; der Fallback ist nur
    // defensiv und referenziert bewusst keinen Render-State.
    const p = pflanzung.current ?? { art: "eiche", minuten: 25, habitId: null, bereichId: null, farbe: "emerald", projektId: null }
    setLaeuft(false)
    setRestSekunden(null)
    setSessions((alte) => [
      ...alte,
      {
        id: Date.now(),
        datum: heute(),
        minuten: p.minuten,
        projektId: p.projektId ? Number(p.projektId) : null,
      },
    ])
    setGarten((alte) => [
      ...alte,
      {
        id: Date.now() + 1,
        datum: heute(),
        minuten: p.minuten,
        art: p.art,
        bereichId: p.bereichId,
        habitId: p.habitId,
        farbe: p.farbe,
        status: "gewachsen",
      },
    ])
    if (p.habitId) {
      setHabits((hs) =>
        hs.map((h) =>
          h.id === p.habitId && !h.erledigtAn.includes(heute())
            ? { ...h, erledigtAn: [...h.erledigtAn, heute()] }
            : h
        )
      )
    }
    setMeldung("🌳 Baum gewachsen – schön gemacht!")
    pflanzung.current = null
  }, [restSekunden, setSessions, setGarten, setHabits])

  function start() {
    pflanzung.current = { art, minuten, projektId, ...aufloesen(verkn) }
    endeUm.current = Date.now() + minuten * 60 * 1000
    setRestSekunden(minuten * 60)
    setLaeuft(true)
    setMeldung("")
  }

  function pauseOderWeiter() {
    if (laeuft) {
      setLaeuft(false)
    } else {
      endeUm.current = Date.now() + restSekunden * 1000
      setLaeuft(true)
    }
  }

  function abbrechen() {
    // Ein laufender Abbruch lässt den Baum verdorren; im Pausen-Zustand
    // wird nichts gepflanzt.
    if (laeuft && pflanzung.current) {
      const p = pflanzung.current
      setGarten((alte) => [
        ...alte,
        {
          id: Date.now(),
          datum: heute(),
          minuten: p.minuten,
          art: p.art,
          bereichId: p.bereichId,
          habitId: p.habitId,
          farbe: p.farbe,
          status: "verdorrt",
        },
      ])
      setMeldung("🥀 Baum verdorrt – bleib beim nächsten Mal dran.")
    }
    pflanzung.current = null
    setLaeuft(false)
    setRestSekunden(null)
  }

  function planeSession(e) {
    e.preventDefault()
    setTermine([
      ...termine,
      {
        id: Date.now(),
        titel: "Fokus",
        datum: planDatum,
        zeit: planZeit,
        dauer: Number(planDauer) || 60,
        fokus: true,
        projektId: planProjektId ? Number(planProjektId) : null,
      },
    ])
    setPlanMeldung(
      `Fokus-Block am ${new Date(planDatum).toLocaleDateString("de-DE")} um ${planZeit}${
        planProjektId ? ` für „${projektName(planProjektId)}“` : ""
      } eingeplant – erscheint im Kalender.`
    )
  }

  const letzte = [...sessions].reverse().slice(0, 5)
  const aktiv = pflanzung.current
  const fortschritt =
    restSekunden != null && aktiv ? 1 - restSekunden / (aktiv.minuten * 60) : 0

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf titel="Deep Work" />

      {/* Timer */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center">
        {restSekunden == null ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Dauer wählen
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {VORGABEN.map((v) => (
                <button
                  key={v}
                  onClick={() => setMinuten(v)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    minuten === v
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {v} Min.
                </button>
              ))}
              <input
                type="number"
                min="5"
                step="5"
                value={minuten}
                onChange={(e) => setMinuten(Number(e.target.value) || 5)}
                className="w-20 rounded-md border border-gray-200 px-3 py-2 text-center text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </div>

            {/* Baum-Art */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {BAUM_ARTEN.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setArt(b.id)}
                  title={b.name}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    art === b.id
                      ? "border border-gray-900 bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{b.emoji}</span>
                  {b.name}
                </button>
              ))}
            </div>

            {/* Verknüpfung mit Habit/Bereich */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
              <label className="flex items-center gap-2">
                Baum für
                <select
                  value={verkn}
                  onChange={(e) => setVerkn(e.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="">Ohne Habit</option>
                  {habits.length > 0 && (
                    <optgroup label="Habit (wird abgehakt)">
                      {habits.map((h) => (
                        <option key={h.id} value={`habit:${h.id}`}>
                          {h.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Bereich (nur Farbe)">
                    {bereiche.map((b) => (
                      <option key={b.id} value={`bereich:${b.id}`}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              {projekte.length > 0 && (
                <label className="flex items-center gap-2">
                  Projekt
                  <select
                    value={projektId}
                    onChange={(e) => setProjektId(e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                  >
                    <option value="">Ohne Projekt</option>
                    {projekte.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Vorschau des Baums */}
            <div className="mt-6 flex justify-center">
              <Baum
                art={art}
                farbe={aufloesen(verkn).farbe}
                stufe={3}
                className="h-24 w-20 opacity-90"
              />
            </div>

            <button
              onClick={start}
              className="mt-4 rounded-md bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-700"
            >
              Baum pflanzen & Fokus starten
            </button>
          </>
        ) : (
          <>
            {/* Wachsender Baum */}
            <div className="flex justify-center">
              <Baum
                art={aktiv?.art ?? art}
                farbe={aktiv?.farbe ?? "emerald"}
                stufe={stufeVon(fortschritt)}
                className="h-40 w-28 transition-all duration-700"
              />
            </div>
            <p className="mt-4 font-mono text-6xl font-semibold tabular-nums tracking-tight text-gray-900">
              {alsUhr(restSekunden)}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {laeuft ? "Fokus läuft – dein Baum wächst." : "Pausiert."}
              {aktiv?.projektId && ` · ${projektName(aktiv.projektId)}`}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={pauseOderWeiter}
                className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                {laeuft ? "Pause" : "Weiter"}
              </button>
              <button
                onClick={abbrechen}
                className="rounded-md border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Aufgeben
              </button>
            </div>
          </>
        )}
        {meldung && restSekunden == null && (
          <p className="mt-4 text-sm text-gray-500">{meldung}</p>
        )}
      </div>

      {/* Mein Garten */}
      <Garten garten={garten} bereiche={bereiche} onLeeren={() => setGarten([])} />

      {/* In den Kalender einplanen */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Block einplanen
        </h2>
        <form
          onSubmit={planeSession}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4"
        >
          <label className="flex flex-col text-xs text-gray-500">
            Datum
            <input
              type="date"
              value={planDatum}
              onChange={(e) => setPlanDatum(e.target.value)}
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            Uhrzeit
            <input
              type="time"
              value={planZeit}
              onChange={(e) => setPlanZeit(e.target.value)}
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            Dauer (Min.)
            <input
              type="number"
              min="15"
              step="15"
              value={planDauer}
              onChange={(e) => setPlanDauer(e.target.value)}
              className="mt-1 w-24 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            Projekt
            <select
              value={planProjektId}
              onChange={(e) => setPlanProjektId(e.target.value)}
              className="mt-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            >
              <option value="">Ohne Projekt</option>
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            In den Kalender
          </button>
        </form>
        {planMeldung && (
          <p className="mt-2 text-xs text-gray-500">{planMeldung}</p>
        )}
      </section>

      {/* Verlauf */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Letzte Sessions
        </h2>
        {letzte.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
            Noch keine abgeschlossenen Sessions.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {letzte.map((s) => (
              <li
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span className="flex-1 text-gray-800">
                  {s.minuten} Minuten Fokus
                  {s.projektId && projektName(s.projektId)
                    ? ` · ${projektName(s.projektId)}`
                    : ""}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(s.datum).toLocaleDateString("de-DE")}
                </span>
                <button
                  onClick={() =>
                    setSessions(sessions.filter((x) => x.id !== s.id))
                  }
                  title="Eintrag löschen"
                  className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Der Garten: Statistik plus alle gepflanzten Bäume nach Tag gruppiert.
function Garten({ garten, bereiche, onLeeren }) {
  const gewachsen = garten.filter((b) => b.status === "gewachsen")
  const woche = wochenSchluessel(montagVon(new Date()))
  const dieseWoche = gewachsen.filter(
    (b) => wochenSchluessel(new Date(b.datum)) === woche
  ).length
  const gesamtMin = gewachsen.reduce((s, b) => s + (b.minuten || 0), 0)
  const stunden = Math.floor(gesamtMin / 60)

  // Nach Tag gruppieren, neueste zuerst.
  const proTag = new Map()
  for (const b of garten) {
    if (!proTag.has(b.datum)) proTag.set(b.datum, [])
    proTag.get(b.datum).push(b)
  }
  const tage = [...proTag.keys()].sort((a, b) => b.localeCompare(a))

  const bereichName = (id) => bereiche.find((x) => x.id === id)?.name

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Mein Garten
        </h2>
        {garten.length > 0 && (
          <button
            onClick={onLeeren}
            className="text-xs text-gray-300 transition-colors hover:text-red-500"
            title="Garten leeren"
          >
            leeren
          </button>
        )}
      </div>

      {garten.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Noch keine Bäume. Starte eine Fokus-Session und pflanze deinen ersten.
        </p>
      ) : (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
          {/* Statistik */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {gewachsen.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                Bäume
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {dieseWoche}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                diese Woche
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {stunden > 0 ? `${stunden} h` : `${gesamtMin} m`}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                fokussiert
              </p>
            </div>
          </div>

          {/* Bäume nach Tag */}
          <div className="mt-5 space-y-4">
            {tage.map((tag) => (
              <div key={tag}>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  {new Date(tag).toLocaleDateString("de-DE", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {proTag.get(tag).map((b) => (
                    <div
                      key={b.id}
                      title={`${b.minuten} Min.${
                        b.bereichId && bereichName(b.bereichId)
                          ? ` · ${bereichName(b.bereichId)}`
                          : ""
                      }${b.status === "verdorrt" ? " · verdorrt" : ""}`}
                    >
                      <Baum
                        art={b.art}
                        farbe={b.farbe}
                        stufe={3}
                        verdorrt={b.status === "verdorrt"}
                        className="h-14 w-11"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
