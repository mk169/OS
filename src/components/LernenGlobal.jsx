import { useState } from "react"
import useStored from "../lib/useStored"
import { bewerteKarte, istFaellig } from "../lib/spacedRepetition"
import { LernModus } from "./ProjektKarten"

// Projektübergreifendes „Heute lernen": bündelt alle fälligen Karteikarten
// aus sämtlichen Projekten in einer einzigen Session. Der eigentliche
// Lern-Ablauf (Aufdecken, Bewerten, SM-2) wird aus ProjektKarten
// wiederverwendet – hier geht es nur ums Sammeln über alle Projekte hinweg
// und um die Übersicht davor.
export default function LernenGlobal() {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [projekte] = useStored("projekte", [])
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
      {alleKarten.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Noch keine Karteikarten. Lege sie im Bereich „Karteikarten" eines
          Projekts an – hier sammeln sich dann alle fälligen Karten.
        </p>
      ) : faellig.length === 0 ? (
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
    </div>
  )
}
