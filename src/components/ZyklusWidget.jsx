import useStored from "../lib/useStored"
import { useState } from "react"
import {
  zyklusStatus,
  zyklusProjekte,
  zyklusZiele,
  zielSchritte,
  zielFortschritt,
  aktualisiereZyklus,
  zieleErreicht,
  restText,
  zyklusPhasen,
  aktivePhase,
  phaseStatus,
} from "../lib/zyklen"
import { projektFortschrittWerte, Fortschrittsbalken } from "./OrdnerSeite"
import PhasenZeitstrahl from "./PhasenZeitstrahl"

// Dashboard-Karte(n) für die aktuell laufenden Fokus-Perioden: zeigt Ziel,
// Restlaufzeit, verstrichenen Zeitanteil und die verknüpften Projekte mit
// ihrem eigenen Periodenziel und Fortschritt. Projektziele lassen sich direkt
// hier abhaken. Erscheint nur, wenn gerade ein Zyklus aktiv ist. „dunkel" für
// dunkle Dashboard-Stile (Arcade).
export default function ZyklusWidget({ onNavigate, variant = "hell" }) {
  const [zyklen, setZyklen] = useStored("zyklen", [])
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])

  const aktive = zyklen
    .map((z) => ({ zyklus: z, status: zyklusStatus(z) }))
    .filter((x) => x.status.aktiv)
    // Dringendste (am wenigsten Restzeit) zuerst.
    .sort((a, b) => a.status.tageUebrig - b.status.tageUebrig)

  if (aktive.length === 0) return null

  function toggleErledigt(zyklus, projektId) {
    const neu = zyklusProjekte(zyklus).map((e) =>
      e.projektId === projektId ? { ...e, erledigt: !e.erledigt } : e
    )
    const aktualisiert = aktualisiereZyklus(zyklus, { projekte: neu })
    setZyklen(zyklen.map((z) => (z.id === zyklus.id ? aktualisiert : z)))
  }

  // Teilschritte eines eigenen Ziels ändern (abhaken / hinzufügen). Die
  // Änderungsfunktion bekommt die aktuelle Schrittliste und gibt die neue.
  function aendereZielSchritte(zyklus, zielId, aenderung) {
    const neu = zyklusZiele(zyklus).map((z) =>
      z.id === zielId ? { ...z, schritte: aenderung(zielSchritte(z)) } : z
    )
    const aktualisiert = aktualisiereZyklus(zyklus, { ziele: neu })
    setZyklen(zyklen.map((z) => (z.id === zyklus.id ? aktualisiert : z)))
  }
  function toggleSchritt(zyklus, zielId, schrittId) {
    aendereZielSchritte(zyklus, zielId, (schritte) =>
      schritte.map((s) =>
        s.id === schrittId ? { ...s, erledigt: !s.erledigt } : s
      )
    )
  }
  function addSchritt(zyklus, zielId, text) {
    const t = text.trim()
    if (!t) return
    aendereZielSchritte(zyklus, zielId, (schritte) => [
      ...schritte,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: t,
        erledigt: false,
      },
    ])
  }

  return (
    <div className="mb-6 space-y-3">
      {aktive.map(({ zyklus, status }) => (
        <ZyklusKarte
          key={zyklus.id}
          zyklus={zyklus}
          status={status}
          projekte={projekte}
          todos={todos}
          onNavigate={onNavigate}
          onToggleErledigt={toggleErledigt}
          onToggleSchritt={toggleSchritt}
          onAddSchritt={addSchritt}
          dunkel={variant === "dunkel"}
        />
      ))}
    </div>
  )
}

// Farbton der Restlaufzeit-Plakette nach Dringlichkeit.
function restStil(tageUebrig, dunkel) {
  if (tageUebrig <= 7)
    return dunkel ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600"
  if (tageUebrig <= 30)
    return dunkel
      ? "bg-amber-500/20 text-amber-300"
      : "bg-amber-50 text-amber-700"
  return dunkel ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500"
}

function ZyklusKarte({
  zyklus,
  status,
  projekte,
  todos,
  onNavigate,
  onToggleErledigt,
  onToggleSchritt,
  onAddSchritt,
  dunkel,
}) {
  const [offenZielId, setOffenZielId] = useState(null)
  // Verknüpfte Projekte mit ihren Periodenzielen; archivierte/gelöschte raus.
  const eintraege = zyklusProjekte(zyklus)
    .map((e) => ({ ...e, projekt: projekte.find((p) => p.id === e.projektId) }))
    .filter((e) => e.projekt && !e.projekt.archiviert)
  const eigeneZiele = zyklusZiele(zyklus)
  const ziele = zieleErreicht(zyklus)
  // Aktuell laufende Zwischenphase („Aufteilung") dieser Periode, falls es
  // welche gibt und gerade eine aktiv ist.
  const hatPhasen = zyklusPhasen(zyklus).length > 0
  const phase = aktivePhase(zyklus)
  const phaseS = phase ? phaseStatus(phase.phase) : null
  // Ziele, die genau dieser aktiven Phase zugeordnet sind – das „was ist
  // jetzt dran?" der Periode (Projekt- wie eigene Ziele).
  const phaseZiele = phase
    ? [
        ...eintraege
          .filter((e) => e.phaseId === phase.phase.id)
          .map((e) => ({
            id: `p-${e.projektId}`,
            text: e.projekt.name,
            fertig: !!e.erledigt,
          })),
        ...eigeneZiele
          .filter((z) => z.phaseId === phase.phase.id)
          .map((z) => {
            const { erledigt, gesamt } = zielFortschritt(z)
            return {
              id: `z-${z.id}`,
              text: z.text,
              fertig: gesamt > 0 && erledigt === gesamt,
            }
          }),
      ]
    : []

  return (
    <div
      className={`rounded-2xl border p-4 ${
        dunkel
          ? "border-accent-500/30 bg-accent-500/10"
          : "border-gray-200 bg-white shadow-sm shadow-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-500">
            Fokus-Periode
          </p>
          <h3
            className={`truncate text-base font-semibold ${dunkel ? "text-white" : "text-gray-900"}`}
          >
            {zyklus.titel}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${restStil(status.tageUebrig, dunkel)}`}
        >
          {restText(status.tageUebrig)}
        </span>
      </div>

      {zyklus.ziel && (
        <p
          className={`mt-1.5 font-serif text-sm italic ${dunkel ? "text-white/70" : "text-gray-500"}`}
        >
          {zyklus.ziel}
        </p>
      )}

      {/* Zeit-Fortschritt */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className={dunkel ? "text-white/50" : "text-gray-400"}>
            Tag {status.verstrichen} von {status.tageGesamt}
          </span>
          <span className={dunkel ? "text-white/50" : "text-gray-400"}>
            {ziele.gesamt > 0 && `${ziele.erreicht}/${ziele.gesamt} Ziele · `}
            {status.prozentZeit}%
          </span>
        </div>
        <div
          className={`h-1.5 overflow-hidden rounded-full ${dunkel ? "bg-white/10" : "bg-gray-100"}`}
        >
          <div
            className="h-full rounded-full bg-accent-500 transition-all"
            style={{ width: `${status.prozentZeit}%` }}
          />
        </div>
      </div>

      {/* Zwischenphasen („Aufteilungen"): Zeitstrahl + aktuelle Phase */}
      {hatPhasen && (
        <div className="mt-3">
          <PhasenZeitstrahl zyklus={zyklus} dunkel={dunkel} />

          {phase && (
            <div
              className={`mt-2 rounded-xl px-3 py-2 ${
                dunkel ? "bg-white/5" : "bg-gray-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium">
                  <span className="text-accent-500">
                    Phase {phase.nummer}/{phase.gesamt}
                  </span>
                  {phase.phase.titel && (
                    <span
                      className={`ml-1.5 ${dunkel ? "text-white/80" : "text-gray-700"}`}
                    >
                      {phase.phase.titel}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-[11px] ${dunkel ? "text-white/50" : "text-gray-400"}`}
                >
                  {restText(phaseS.tageUebrig)}
                </span>
              </div>
              <div
                className={`h-1 overflow-hidden rounded-full ${dunkel ? "bg-white/10" : "bg-gray-200"}`}
              >
                <div
                  className="h-full rounded-full bg-accent-500/70 transition-all"
                  style={{ width: `${phaseS.prozentZeit}%` }}
                />
              </div>

              {/* Was ist in dieser Phase dran? */}
              {phaseZiele.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {phaseZiele.map((z) => (
                    <li
                      key={z.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className={
                          z.fertig
                            ? "text-emerald-500"
                            : dunkel
                              ? "text-white/30"
                              : "text-gray-300"
                        }
                      >
                        {z.fertig ? "✓" : "○"}
                      </span>
                      <span
                        className={`min-w-0 truncate ${
                          z.fertig
                            ? dunkel
                              ? "text-white/40 line-through"
                              : "text-gray-400 line-through"
                            : dunkel
                              ? "text-white/70"
                              : "text-gray-600"
                        }`}
                      >
                        {z.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verknüpfte Projekte mit Periodenziel, Abhaken & Fortschritt */}
      {eintraege.length > 0 && (
        <ul className="mt-3 space-y-1">
          {eintraege.map((e) => (
            <li
              key={e.projektId}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                dunkel ? "hover:bg-white/5" : "hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={!!e.erledigt}
                onChange={() => onToggleErledigt(zyklus, e.projektId)}
                title="Periodenziel erreicht"
                className="h-4 w-4 shrink-0 accent-accent-500"
              />
              <button
                onClick={() => onNavigate?.("projekte", e.projektId)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={`block truncate text-sm ${
                    e.erledigt
                      ? dunkel
                        ? "text-white/40 line-through"
                        : "text-gray-400 line-through"
                      : dunkel
                        ? "text-white/90"
                        : "text-gray-800"
                  }`}
                >
                  {e.projekt.name}
                </span>
                {e.ziel && (
                  <span
                    className={`block truncate text-xs ${dunkel ? "text-white/50" : "text-gray-400"}`}
                  >
                    {e.ziel}
                  </span>
                )}
              </button>
              <span className="w-20 shrink-0 sm:w-24">
                <Fortschrittsbalken {...projektFortschrittWerte(e.projekt, todos)} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Eigene, projektunabhängige Ziele – anklicken und Teilschritte abhaken */}
      {eigeneZiele.length > 0 && (
        <ul className="mt-3 space-y-1">
          {eigeneZiele.map((z) => {
            const schritte = zielSchritte(z)
            const { erledigt, gesamt } = zielFortschritt(z)
            const fertig = gesamt > 0 && erledigt === gesamt
            const offen = offenZielId === z.id
            return (
              <li key={z.id}>
                <button
                  onClick={() => setOffenZielId(offen ? null : z.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${
                    dunkel ? "hover:bg-white/5" : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`shrink-0 text-xs transition-transform ${
                      offen ? "rotate-90" : ""
                    } ${dunkel ? "text-white/40" : "text-gray-400"}`}
                  >
                    ▸
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      fertig
                        ? dunkel
                          ? "text-white/40 line-through"
                          : "text-gray-400 line-through"
                        : dunkel
                          ? "text-white/90"
                          : "text-gray-800"
                    }`}
                  >
                    {z.text}
                  </span>
                  {gesamt > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        fertig
                          ? dunkel
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-emerald-50 text-emerald-600"
                          : dunkel
                            ? "bg-white/10 text-white/60"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {erledigt}/{gesamt}
                    </span>
                  )}
                </button>

                {offen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {schritte.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={!!s.erledigt}
                          onChange={() => onToggleSchritt(zyklus, z.id, s.id)}
                          className="h-4 w-4 shrink-0 accent-accent-500"
                        />
                        <span
                          className={`min-w-0 flex-1 text-sm ${
                            s.erledigt
                              ? dunkel
                                ? "text-white/40 line-through"
                                : "text-gray-400 line-through"
                              : dunkel
                                ? "text-white/80"
                                : "text-gray-700"
                          }`}
                        >
                          {s.text}
                        </span>
                      </label>
                    ))}
                    <SchrittEingabe
                      dunkel={dunkel}
                      onAdd={(text) => onAddSchritt(zyklus, z.id, text)}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Kleines Eingabefeld, um im Dashboard direkt einen Teilschritt zu ergänzen.
function SchrittEingabe({ onAdd, dunkel }) {
  const [text, setText] = useState("")
  function add() {
    if (!text.trim()) return
    onAdd(text)
    setText("")
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          add()
        }
      }}
      onBlur={add}
      placeholder="+ Teilschritt"
      className={`w-full rounded-md border px-2 py-1 text-sm outline-none transition-colors ${
        dunkel
          ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30"
          : "border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-accent-400"
      }`}
    />
  )
}
