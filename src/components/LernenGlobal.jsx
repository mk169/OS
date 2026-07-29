import { useState } from "react"
import useStored from "../lib/useStored"
import { bewerteKarte, istFaellig } from "../lib/spacedRepetition"
import { kartenReife, faelligForecast } from "../lib/lernstatistik"
import { protokolliereWiederholung, heuteGelernt } from "../lib/lernprotokoll"
import { LernModus } from "./ProjektKarten"

// Projektübergreifendes „Heute lernen": bündelt alle fälligen Karteikarten
// aus sämtlichen Projekten in einer einzigen Session. Der eigentliche
// Lern-Ablauf (Aufdecken, Bewerten, SM-2) wird aus ProjektKarten
// wiederverwendet – hier geht es nur ums Sammeln über alle Projekte hinweg
// und um die Übersicht davor.
export default function LernenGlobal() {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [projekte] = useStored("projekte", [])
  const [protokoll] = useStored("lernprotokoll", {})
  const [lernModus, setLernModus] = useState(false)

  const faellig = alleKarten.filter(istFaellig)

  // Fällige Karten nach Projekt gruppieren (für die Übersicht). Karten ohne
  // passendes Projekt landen unter „Ohne Projekt".
  const projektName = (id) => projekte.find((p) => p.id === id)?.name
  const gruppen = []
  const nachProjekt = new Map()
  for (const k of faellig) {
    const pid = k.projektId ?? k.kursId ?? null
    const schluessel = projektName(pid) ? pid : "ohne"
    nachProjekt.set(schluessel, (nachProjekt.get(schluessel) ?? 0) + 1)
  }
  for (const [pid, anzahl] of nachProjekt) {
    gruppen.push({
      name: pid === "ohne" ? "Ohne Projekt" : projektName(pid),
      anzahl,
    })
  }
  gruppen.sort((a, b) => b.anzahl - a.anzahl)

  function bewerte(karte, stufe, sekunden = null) {
    const neu = bewerteKarte(karte, stufe, sekunden)
    setAlleKarten(
      alleKarten.map((k) => (k.id === karte.id ? { ...k, ...neu } : k))
    )
    protokolliereWiederholung()
  }

  function starteLernen() {
    setLernModus(true)
    try {
      document.documentElement.requestFullscreen?.()
    } catch {
      /* nicht unterstützt – Overlay reicht */
    }
  }

  function beendeLernen() {
    setLernModus(false)
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()
    } catch {
      /* egal */
    }
  }

  if (lernModus) {
    return (
      <LernModus faellig={faellig} onBewerte={bewerte} onEnde={beendeLernen} />
    )
  }

  return (
    <div className="mt-4">
      {alleKarten.length === 0 ? null : faellig.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-2xl">🎉</p>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Nichts fällig – alles wiederholt.
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {alleKarten.length}{" "}
            {alleKarten.length === 1 ? "Karte" : "Karten"} im Plan. Schau später
            wieder vorbei.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-gray-900">
                {faellig.length} {faellig.length === 1 ? "Karte" : "Karten"}{" "}
                fällig
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                projektübergreifend – in einer Session wiederholen
              </p>
            </div>
            <button
              onClick={starteLernen}
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              Jetzt lernen
            </button>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Verteilung
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {gruppen.map((g) => (
                <li
                  key={g.name}
                  className="flex items-center gap-3 text-sm text-gray-700"
                >
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs tabular-nums text-gray-500">
                    {g.anzahl}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {alleKarten.length > 0 && (
        <LernStatistik
          karten={alleKarten}
          heuteGelernt={heuteGelernt(protokoll)}
        />
      )}
    </div>
  )
}

// Statistik-Panel im Stil von Anki: heute gelernt, Kartenreife und eine
// Fälligkeits-Prognose für die nächsten sieben Tage.
function LernStatistik({ karten, heuteGelernt }) {
  const reife = kartenReife(karten)
  const forecast = faelligForecast(karten, 7)
  const maxForecast = Math.max(1, ...forecast.map((f) => f.anzahl))
  const prozent = (n) => (reife.gesamt ? (n / reife.gesamt) * 100 : 0)
  const wochentag = (key) =>
    new Date(key).toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Statistik
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <Kennzahl wert={heuteGelernt} label="heute gelernt" />
        <Kennzahl wert={karten.filter(istFaellig).length} label="fällig" />
        <Kennzahl wert={reife.gesamt} label="Karten gesamt" />
      </div>

      {/* Kartenreife */}
      <div className="mt-5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div className="bg-gray-300" style={{ width: `${prozent(reife.neu)}%` }} />
          <div className="bg-blue-400" style={{ width: `${prozent(reife.jung)}%` }} />
          <div className="bg-emerald-500" style={{ width: `${prozent(reife.reif)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <LegendePunkt farbe="bg-gray-300" label="Neu" wert={reife.neu} />
          <LegendePunkt farbe="bg-blue-400" label="Jung" wert={reife.jung} />
          <LegendePunkt farbe="bg-emerald-500" label="Reif" wert={reife.reif} />
        </div>
      </div>

      {/* Prognose */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Fällig – nächste 7 Tage
        </p>
        <div className="flex items-end gap-1.5" style={{ height: 72 }}>
          {forecast.map((f, i) => (
            <div key={f.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-gray-400">
                {f.anzahl || ""}
              </span>
              <div
                className={`w-full rounded-t ${i === 0 ? "bg-accent-500" : "bg-accent-200"}`}
                style={{
                  height: `${(f.anzahl / maxForecast) * 48}px`,
                  minHeight: f.anzahl ? 3 : 0,
                }}
              />
              <span className="text-[10px] text-gray-400">
                {i === 0 ? "heute" : wochentag(f.key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Kennzahl({ wert, label }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <p className="text-2xl font-semibold tabular-nums text-gray-900">{wert}</p>
      <p className="mt-0.5 text-[11px] text-gray-400">{label}</p>
    </div>
  )
}

function LegendePunkt({ farbe, label, wert }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${farbe}`} />
      {label}
      <span className="tabular-nums text-gray-400">{wert}</span>
    </span>
  )
}
