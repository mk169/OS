import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { bewerteKarte, istFaellig } from "../lib/spacedRepetition"
import {
  kartenReife,
  faelligForecast,
  lernVerlauf,
  lernStreak,
} from "../lib/lernstatistik"
import { alleLernplaene, lernplanSumme } from "../lib/lernplan"
import { LernplaeneSektion, KartenSektion } from "./LernUebersicht"
import {
  protokolliereWiederholung,
  protokolliereKarte,
  heuteGelernt,
  gelerntHeuteSet,
  tageslimitVon,
  tagesPortion,
} from "../lib/lernprotokoll"
import { heute } from "../lib/datum"
import { LernModus } from "./ProjektKarten"

// Die Lern-Zentrale: bündelt alles Lernen an einer Stelle.
//   Übersicht – was heute ansteht (Karten & Lernplan-Schritte), welche
//               Lernpläne laufen und welche Kartenstapel es gibt.
//   Statistik – Kartenreife, Fälligkeits-Prognose und der Lernverlauf.
// Der eigentliche Lern-Ablauf (Aufdecken, Bewerten, SM-2) wird aus
// ProjektKarten wiederverwendet – hier geht es ums Sammeln über alle
// Projekte hinweg und um den Überblick davor.
export default function LernenGlobal({ onNavigate }) {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])
  const [ablage] = useStored("ablage", [])
  const [protokoll] = useStored("lernprotokoll", {})
  const [lernTag] = useStored("lernTag", {})
  const [limits] = useStored("kartenLimits", {})
  const [lernModus, setLernModus] = useState(false)
  const [tab, setTab] = useState("uebersicht")

  const faellig = alleKarten.filter(istFaellig)
  const kartenSchluessel = (k) => k.projektId ?? k.kursId ?? "ohne"
  const projektName = (id) => projekte.find((p) => p.id === id)?.name

  // Fällige Karten nach Projekt gruppieren und je Projekt das Tageslimit
  // anwenden. Die kombinierte Tagesportion ist die Summe der freigeschalteten
  // Karten aller Projekte – so respektiert auch die globale Session die Limits.
  const nachProjekt = new Map()
  for (const k of faellig) {
    const s = projektName(k.projektId ?? k.kursId) ? kartenSchluessel(k) : "ohne"
    if (!nachProjekt.has(s)) nachProjekt.set(s, [])
    nachProjekt.get(s).push(k)
  }
  const gruppen = []
  const tagesKarten = []
  for (const [schluessel, kartenDesProjekts] of nachProjekt) {
    const limit = tageslimitVon(limits, schluessel)
    const portion = tagesPortion(
      kartenDesProjekts,
      gelerntHeuteSet(lernTag, schluessel),
      limit
    )
    tagesKarten.push(...portion)
    gruppen.push({
      name: schluessel === "ohne" ? "Ohne Projekt" : projektName(schluessel),
      faellig: kartenDesProjekts.length,
      verfuegbar: portion.length,
      limit,
    })
  }
  gruppen.sort((a, b) => b.verfuegbar - a.verfuegbar || b.faellig - a.faellig)

  // Heute insgesamt gelernte Karten (projektübergreifend, ohne Doppelzählung).
  const heuteGesamt = Object.values(lernTag ?? {}).reduce(
    (s, e) => s + (e?.datum === heute() ? e.karten.length : 0),
    0
  )
  const verfuegbar = tagesKarten.length

  // Lernpläne nur für die Kopfzahlen – die Liste selbst rendert
  // LernplaeneSektion mit eigenen Daten.
  const planSumme = useMemo(
    () => lernplanSumme(alleLernplaene(projekte, todos, ablage)),
    [projekte, todos, ablage]
  )

  function bewerte(karte, stufe, sekunden = null) {
    const neu = bewerteKarte(karte, stufe, sekunden)
    setAlleKarten(
      alleKarten.map((k) => (k.id === karte.id ? { ...k, ...neu } : k))
    )
    protokolliereWiederholung()
    protokolliereKarte(kartenSchluessel(karte), karte.id)
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
      <LernModus
        faellig={tagesKarten}
        onBewerte={bewerte}
        onEnde={beendeLernen}
      />
    )
  }

  const nichtsAngelegt = alleKarten.length === 0 && planSumme.schritte === 0

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1">
        {[
          { key: "uebersicht", label: "Übersicht" },
          { key: "statistik", label: "Statistik" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "statistik" ? (
        alleKarten.length > 0 ? (
          <LernStatistik
            karten={alleKarten}
            heuteGelernt={heuteGelernt(protokoll)}
            protokoll={protokoll}
          />
        ) : (
          <p className="mt-6 text-center text-sm text-gray-400">
            Noch keine Karteikarten – die Statistik füllt sich mit der ersten
            Wiederholung.
          </p>
        )
      ) : (
        <>
          <TagesKennzahlen
            faellig={faellig.length}
            heuteGelernt={heuteGesamt}
            schritteHeute={planSumme.heuteFaellig + planSumme.ueberfaellig}
            streak={lernStreak(protokoll)}
          />
          <LernSession
            alleKarten={alleKarten}
            verfuegbar={verfuegbar}
            faellig={faellig.length}
            heuteGesamt={heuteGesamt}
            gruppen={gruppen}
            onStart={starteLernen}
          />
          <LernplaeneSektion onNavigate={onNavigate} />
          <KartenSektion karten={alleKarten} onNavigate={onNavigate} />
          {nichtsAngelegt && (
            <p className="mt-4 text-center text-xs text-gray-400">
              Karteikarten legst du im Projekt unter „Karten" an, Lernpläne
              unter „Inhalte".
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Vier Kennzahlen für den Tag: was ansteht und was schon geschafft ist.
function TagesKennzahlen({ faellig, heuteGelernt, schritteHeute, streak }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kennzahl wert={faellig} label="Karten fällig" />
      <Kennzahl wert={schritteHeute} label="Schritte offen" />
      <Kennzahl wert={heuteGelernt} label="heute gelernt" />
      <Kennzahl wert={streak} label={streak === 1 ? "Tag Serie" : "Tage Serie"} />
    </div>
  )
}

// Die Session-Karte: „Jetzt lernen" bzw. der Hinweis, dass für heute
// Schluss ist – samt Aufschlüsselung der freigeschalteten Karten je Projekt.
function LernSession({
  alleKarten,
  verfuegbar,
  faellig,
  heuteGesamt,
  gruppen,
  onStart,
}) {
  if (alleKarten.length === 0) return null

  return (
    <div className="mt-4">
      {verfuegbar === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-2xl">{faellig > 0 ? "✅" : "🎉"}</p>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {faellig > 0
              ? "Tageslimit erreicht – morgen geht's weiter."
              : "Nichts fällig – alles wiederholt."}
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            {heuteGesamt} heute gelernt · {faellig} noch fällig
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-gray-900">
                {verfuegbar} {verfuegbar === 1 ? "Karte" : "Karten"}{" "}
                freigeschaltet
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                projektübergreifend · {heuteGesamt} heute gelernt · {faellig}{" "}
                fällig
              </p>
            </div>
            <button
              onClick={onStart}
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              Jetzt lernen
            </button>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Heute freigeschaltet je Projekt
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {gruppen.map((g) => (
                <li
                  key={g.name}
                  className="flex items-center gap-3 text-sm text-gray-700"
                >
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  {g.faellig > g.verfuegbar && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {g.faellig} fällig
                    </span>
                  )}
                  <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs tabular-nums text-gray-500">
                    {g.verfuegbar}
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

// Statistik-Panel im Stil von Anki: heute gelernt, Kartenreife, eine
// Fälligkeits-Prognose für die nächsten sieben Tage und der Rückblick auf
// die letzten zwei Wochen.
function LernStatistik({ karten, heuteGelernt, protokoll }) {
  const reife = kartenReife(karten)
  const forecast = faelligForecast(karten, 7)
  const maxForecast = Math.max(1, ...forecast.map((f) => f.anzahl))
  const verlauf = lernVerlauf(protokoll, 14)
  const maxVerlauf = Math.max(1, ...verlauf.map((v) => v.anzahl))
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

      {/* Rückblick */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Gelernt – letzte 14 Tage
        </p>
        <div className="flex items-end gap-1" style={{ height: 60 }}>
          {verlauf.map((v, i) => (
            <div key={v.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={`${v.key}: ${v.anzahl}`}
                className={`w-full rounded-t ${
                  v.anzahl === 0
                    ? "bg-gray-100"
                    : i === verlauf.length - 1
                      ? "bg-gray-900"
                      : "bg-gray-300"
                }`}
                style={{
                  height: `${(v.anzahl / maxVerlauf) * 40}px`,
                  minHeight: 3,
                }}
              />
              <span className="text-[10px] text-gray-400">
                {i === verlauf.length - 1 ? "heute" : wochentag(v.key)}
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
