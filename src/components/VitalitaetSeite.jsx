import { useMemo } from "react"
import useStored from "../lib/useStored"
import { heute, inTagen } from "../lib/datum"
import { FARBEN } from "../lib/farben"
import Seitenkopf from "./Seitenkopf"
import {
  ENERGIE_SKALA,
  STIMMUNG_SKALA,
  leererEintrag,
  eintragVon,
  istAusgefuellt,
  durchschnitt,
  eineStelle,
} from "../lib/vitalitaet"
import LoeschKnopf from "./LoeschKnopf"

// Vitalität: der tägliche Körper-Check-in. Ein Eintrag je Tag; alles
// Optionale, aber jeder Wert füttert später den Mentor (lib/insights.js).

// Letzte n Tage als absteigende Datumsliste ("heute" zuerst).
function letzteTage(n) {
  return Array.from({ length: n }, (_, i) => inTagen(-i))
}

// 1–5-Auswahl mit Emoji-Ankern (Energie/Stimmung).
function SkalaWahl({ skala, wert, onWaehle }) {
  return (
    <div className="mt-2 grid grid-cols-5 gap-1.5">
      {skala.slice(1).map((stufe) => {
        const aktiv = wert === stufe.wert
        const pal = FARBEN[stufe.farbe] ?? FARBEN.gray
        return (
          <button
            key={stufe.wert}
            type="button"
            onClick={() => onWaehle(aktiv ? null : stufe.wert)}
            title={stufe.label}
            className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors ${
              aktiv
                ? `${pal.zart} border-transparent ring-2 ${pal.ring}`
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className="text-xl leading-none">{stufe.emoji}</span>
            <span
              className={`text-[10px] font-medium ${
                aktiv ? "" : "text-gray-400"
              }`}
            >
              {stufe.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Kleine Kennzahl-Kachel für die Trend-Zeile.
function TrendKachel({ label, wert, suffix, hinweis }) {
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-2xl font-bold tracking-tight text-gray-900">
        {wert}
        {suffix && wert !== "–" && (
          <span className="ml-0.5 text-sm font-medium text-gray-400">
            {suffix}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
      {hinweis && <p className="mt-0.5 text-[11px] text-gray-400">{hinweis}</p>}
    </div>
  )
}

// „Energie-Kurve": die letzten 14 Tage als Balken (leer = kein Eintrag).
function EnergieKurve({ vitalitaet }) {
  const tage = letzteTage(14).reverse() // links = älter, rechts = heute
  const heuteKey = heute()
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Energie · 14 Tage
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 72 }}>
        {tage.map((datum) => {
          const e = eintragVon(vitalitaet, datum)
          const wert = e?.energie ?? null
          const stufe = wert ? ENERGIE_SKALA[wert] : null
          const pal = stufe ? FARBEN[stufe.farbe] : null
          const hoehe = wert ? `${(wert / 5) * 100}%` : "8%"
          return (
            <div
              key={datum}
              title={
                wert
                  ? `${new Date(datum).toLocaleDateString("de-DE")}: ${stufe.label}`
                  : `${new Date(datum).toLocaleDateString("de-DE")}: kein Eintrag`
              }
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              <div
                className={`w-full rounded-t-md transition-all ${
                  pal ? pal.punkt : "bg-gray-100"
                } ${datum === heuteKey ? "ring-2 ring-offset-1 ring-gray-300" : ""}`}
                style={{ height: hoehe }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function VitalitaetSeite() {
  const [vitalitaet, setVitalitaet] = useStored("vitalitaet", [])
  const heuteKey = heute()
  const heuteEintrag = eintragVon(vitalitaet, heuteKey)

  // Upsert für den heutigen Tag – legt bei Bedarf ein Gerüst an.
  function setzeHeute(patch) {
    setVitalitaet((v) => {
      const idx = v.findIndex((e) => e.datum === heuteKey)
      if (idx === -1) return [...v, { ...leererEintrag(heuteKey), ...patch }]
      const kopie = [...v]
      kopie[idx] = { ...kopie[idx], ...patch, aktualisiertAm: Date.now() }
      return kopie
    })
  }

  function loesche(datum) {
    setVitalitaet((v) => v.filter((e) => e.datum !== datum))
  }

  // Trends: Durchschnitte der letzten 7 Tage (nur gesetzte Werte).
  const letzte7 = useMemo(() => {
    const set = new Set(letzteTage(7))
    return vitalitaet.filter((e) => set.has(e.datum))
  }, [vitalitaet])

  const energie7 = durchschnitt(letzte7, "energie")
  const stimmung7 = durchschnitt(letzte7, "stimmung")
  const schlaf7 = durchschnitt(letzte7, "schlaf")
  const bewegung7 = letzte7.filter((e) => e.bewegung).length

  const verlauf = useMemo(
    () =>
      [...vitalitaet]
        .filter(istAusgefuellt)
        .sort((a, b) => b.datum.localeCompare(a.datum))
        .slice(0, 14),
    [vitalitaet]
  )

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        eyebrow="Körper"
        titel="Vitalität"
        unterzeile="Ein ehrlicher Check-in am Tag – Rohstoff für den Mentor."
      />

      {/* Heutiger Check-in */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Heute</h2>
          <span className="text-xs text-gray-400">
            {new Date(heuteKey).toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>

        {/* Energie */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Energie
          </p>
          <SkalaWahl
            skala={ENERGIE_SKALA}
            wert={heuteEintrag?.energie ?? null}
            onWaehle={(w) => setzeHeute({ energie: w })}
          />
        </div>

        {/* Stimmung */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Stimmung
          </p>
          <SkalaWahl
            skala={STIMMUNG_SKALA}
            wert={heuteEintrag?.stimmung ?? null}
            onWaehle={(w) => setzeHeute({ stimmung: w })}
          />
        </div>

        {/* Schlaf, Bewegung, Gewicht */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Schlaf (Std.)
            <input
              type="number"
              min="0"
              max="16"
              step="0.5"
              inputMode="decimal"
              value={heuteEintrag?.schlaf ?? ""}
              onChange={(e) =>
                setzeHeute({
                  schlaf: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z. B. 7,5"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-accent-400"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Gewicht (kg)
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={heuteEintrag?.gewicht ?? ""}
              onChange={(e) =>
                setzeHeute({
                  gewicht: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="optional"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-accent-400"
            />
          </label>

          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Bewegung
            <button
              type="button"
              onClick={() => setzeHeute({ bewegung: !heuteEintrag?.bewegung })}
              className={`mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium normal-case tracking-normal transition-colors ${
                heuteEintrag?.bewegung
                  ? "border-transparent bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {heuteEintrag?.bewegung ? "✓ Bewegt" : "🏃 Bewegt?"}
            </button>
          </div>
        </div>

        {/* Notiz */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Notiz
          </p>
          <textarea
            value={heuteEintrag?.notiz ?? ""}
            onChange={(e) => setzeHeute({ notiz: e.target.value })}
            placeholder="Was hat heute Energie gegeben oder gezogen?"
            rows={2}
            className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-accent-400"
          />
        </div>
      </section>

      {/* 7-Tage-Trend */}
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Letzte 7 Tage
        </h2>
        <div className="flex gap-3">
          <TrendKachel
            label="Energie ⌀"
            wert={energie7 == null ? "–" : eineStelle(energie7)}
            suffix="/5"
          />
          <TrendKachel
            label="Stimmung ⌀"
            wert={stimmung7 == null ? "–" : eineStelle(stimmung7)}
            suffix="/5"
          />
          <TrendKachel
            label="Schlaf ⌀"
            wert={schlaf7 == null ? "–" : eineStelle(schlaf7)}
            suffix="h"
          />
          <TrendKachel label="Bewegt" wert={bewegung7} suffix="× " />
        </div>
      </section>

      {/* Energie-Kurve */}
      <EnergieKurve vitalitaet={vitalitaet} />

      {/* Verlauf */}
      {verlauf.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Verlauf
          </h2>
          <ul className="space-y-1.5">
            {verlauf.map((e) => {
              const en = e.energie ? ENERGIE_SKALA[e.energie] : null
              const st = e.stimmung ? STIMMUNG_SKALA[e.stimmung] : null
              return (
                <li
                  key={e.datum}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5"
                >
                  <span className="w-20 shrink-0 text-xs font-medium text-gray-500">
                    {new Date(e.datum).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                    {e.datum === heuteKey && (
                      <span className="ml-1 text-accent-600">·heute</span>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-700">
                    {en && (
                      <span title={`Energie: ${en.label}`}>
                        {en.emoji} {en.label}
                      </span>
                    )}
                    {st && (
                      <span title={`Stimmung: ${st.label}`}>{st.emoji}</span>
                    )}
                    {e.schlaf != null && (
                      <span className="text-gray-400">😴 {eineStelle(e.schlaf)}h</span>
                    )}
                    {e.bewegung && <span className="text-gray-400">🏃</span>}
                    {e.gewicht != null && (
                      <span className="text-gray-400">⚖️ {e.gewicht}kg</span>
                    )}
                    {e.notiz?.trim() && (
                      <span className="min-w-0 basis-full truncate text-xs italic text-gray-400">
                        „{e.notiz.trim()}"
                      </span>
                    )}
                  </div>
                  <LoeschKnopf
                    onLoeschen={() => loesche(e.datum)}
                    titel="Eintrag löschen"
                    klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
