import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"

const VORGABEN = [25, 50, 90]

function alsUhr(sekunden) {
  const m = Math.floor(sekunden / 60)
  const s = sekunden % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Deep Work: Fokus-Timer für konzentrierte Arbeitsblöcke. Abgeschlossene
// Sessions werden protokolliert; künftige Blöcke lassen sich als Termin
// in den Kalender einplanen.

export default function DeepWorkSeite({ onBack }) {
  const [sessions, setSessions] = useStored("deepwork", [])
  const [termine, setTermine] = useStored("termine", [])
  const [projekte] = useStored("projekte", [])

  const [minuten, setMinuten] = useState(50)
  const [restSekunden, setRestSekunden] = useState(null)
  const [laeuft, setLaeuft] = useState(false)
  const [projektId, setProjektId] = useState("")
  // Zielzeitpunkt statt Sekundenzählen: bleibt korrekt, auch wenn der
  // Browser den Tab drosselt (z.B. während man woanders arbeitet).
  const endeUm = useRef(null)

  const projektName = (id) => projekte.find((p) => p.id === Number(id))?.name

  const [planDatum, setPlanDatum] = useState(heute())
  const [planZeit, setPlanZeit] = useState("09:00")
  const [planDauer, setPlanDauer] = useState("90")
  const [planProjektId, setPlanProjektId] = useState("")
  const [planMeldung, setPlanMeldung] = useState("")

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

  // Abschluss: Session protokollieren, wenn der Timer 0 erreicht.
  useEffect(() => {
    if (restSekunden === 0) {
      setLaeuft(false)
      setRestSekunden(null)
      setSessions((alte) => [
        ...alte,
        {
          id: Date.now(),
          datum: heute(),
          minuten,
          projektId: projektId ? Number(projektId) : null,
        },
      ])
    }
  }, [restSekunden, minuten, projektId, setSessions])

  function start() {
    endeUm.current = Date.now() + minuten * 60 * 1000
    setRestSekunden(minuten * 60)
    setLaeuft(true)
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

  const heutigeMinuten = sessions
    .filter((s) => s.datum === heute())
    .reduce((summe, s) => summe + s.minuten, 0)
  const letzte = [...sessions].reverse().slice(0, 5)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <button
        onClick={onBack}
        className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-900"
      >
        ← Dashboard
      </button>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Deep Work</h1>
        <p className="mt-1 text-sm text-gray-400">
          Ein Block, eine Aufgabe, keine Ablenkung.
          {heutigeMinuten > 0 && ` Heute bereits ${heutigeMinuten} Minuten fokussiert.`}
        </p>
      </div>

      {/* Timer */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center">
        {restSekunden == null ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
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
            {projekte.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                Für Projekt
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
              </div>
            )}
            <button
              onClick={start}
              className="mt-6 rounded-md bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-700"
            >
              Fokus starten
            </button>
          </>
        ) : (
          <>
            <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-gray-900">
              {alsUhr(restSekunden)}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {laeuft ? "Fokus läuft – dranbleiben." : "Pausiert."}
              {projektId && ` · ${projektName(projektId)}`}
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
                Abbrechen
              </button>
            </div>
          </>
        )}
      </div>

      {/* In den Kalender einplanen */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
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
