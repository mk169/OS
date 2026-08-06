import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { alleLernplaene, lernplanSumme } from "../lib/lernplan"
import { kartenNachProjekt } from "../lib/lernstatistik"
import { tageBis, tageBisZahl } from "../lib/datum"

// Übersicht über die Lernplattform: Was steht in welchem Projekt an?
// Zwei Blöcke – die Lernpläne (aus den Inhalten erzeugte Schritte) und die
// Karteikartenstapel. Beides projektübergreifend an einer Stelle, mit dem
// direkten Sprung ins jeweilige Projekt.

// Kleiner Fortschrittsbalken; voll = grün, sonst Akzentfarbe.
function Fortschritt({ anteil }) {
  const voll = anteil >= 1
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all ${voll ? "bg-emerald-500" : "bg-accent-500"}`}
        style={{ width: `${Math.round(anteil * 100)}%` }}
      />
    </div>
  )
}

// Datums-Hinweis eines Schritts: überfällig rot (mit dem Rückstand in Tagen,
// „vorbei" wäre hier zu unbestimmt), heute betont, sonst ruhig.
function SchrittDatum({ datum }) {
  if (!datum) return <span className="text-gray-300">ohne Datum</span>
  const tage = tageBisZahl(datum)
  if (tage < 0)
    return (
      <span className="text-red-600">
        {-tage} {tage === -1 ? "Tag" : "Tage"} überfällig
      </span>
    )
  return (
    <span className={tage === 0 ? "text-gray-900" : "text-gray-400"}>
      {tageBis(datum)}
    </span>
  )
}

export function LernplaeneSektion({ onNavigate }) {
  const [projekte] = useStored("projekte", [])
  const [todos, setTodos] = useStored("todos", [])
  const [ablage] = useStored("ablage", [])
  const [offenId, setOffenId] = useState(null)

  const plaene = useMemo(
    () => alleLernplaene(projekte, todos, ablage),
    [projekte, todos, ablage]
  )
  const summe = lernplanSumme(plaene)

  function hakeAb(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, erledigt: true } : t)))
  }

  if (plaene.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center">
        <p className="text-sm font-medium text-gray-700">Noch kein Lernplan</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">
          Lege im Projekt unter <span className="text-gray-500">Inhalte</span>{" "}
          deine Themen an und erzeuge daraus einen Lernplan – die Schritte
          werden bis zur Deadline verteilt und erscheinen dann hier.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Lernpläne
        </p>
        <p className="text-xs text-gray-400">
          {summe.erledigt} von {summe.schritte} Schritten erledigt
          {summe.ueberfaellig > 0 && (
            <span className="text-red-600"> · {summe.ueberfaellig} überfällig</span>
          )}
        </p>
      </div>

      <ul className="mt-3 divide-y divide-gray-100">
        {plaene.map((p) => {
          const offen = offenId === p.projektId
          const fertig = p.gesamt > 0 && p.offene.length === 0
          return (
            <li key={p.projektId} className="py-3">
              <button
                onClick={() => setOffenId(offen ? null : p.projektId)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] text-gray-400 transition-transform ${offen ? "rotate-90" : ""}`}
                  >
                    ▸
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {p.name}
                  </span>
                  {p.ueberfaellig > 0 && (
                    <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      {p.ueberfaellig} überfällig
                    </span>
                  )}
                  {fertig && (
                    <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                      fertig
                    </span>
                  )}
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {p.erledigt}/{p.gesamt}
                  </span>
                </div>

                <div className="mt-2 pl-6">
                  <Fortschritt anteil={p.fortschritt} />
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                    {p.gesamt === 0 ? (
                      <span>
                        {p.inhalte} {p.inhalte === 1 ? "Inhalt" : "Inhalte"} –
                        noch kein Plan erstellt
                      </span>
                    ) : p.naechster ? (
                      <>
                        <span className="truncate text-gray-600">
                          Als Nächstes: {p.naechster.text}
                        </span>
                        <span className="text-gray-300">·</span>
                        <SchrittDatum datum={p.naechster.datum} />
                      </>
                    ) : (
                      <span>Alle Schritte erledigt</span>
                    )}
                    {p.deadline && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>Deadline {tageBis(p.deadline)}</span>
                      </>
                    )}
                  </p>
                </div>
              </button>

              {offen && (
                <div className="mt-3 pl-6">
                  {p.offene.length > 0 ? (
                    <ul className="space-y-1">
                      {p.offene.slice(0, 8).map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                        >
                          <button
                            onClick={() => hakeAb(s.id)}
                            title="Als erledigt markieren"
                            className="h-4 w-4 shrink-0 rounded border border-gray-300 transition-colors hover:border-gray-900 hover:bg-gray-900"
                          />
                          <span className="min-w-0 flex-1 truncate text-gray-700">
                            {s.text}
                          </span>
                          <span className="shrink-0 text-xs">
                            <SchrittDatum datum={s.datum} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2 text-xs text-gray-400">
                      Keine offenen Schritte.
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 px-2">
                    {p.offene.length > 8 && (
                      <span className="text-xs text-gray-400">
                        + {p.offene.length - 8} weitere
                      </span>
                    )}
                    {p.ohneSchritt > 0 && (
                      <span className="text-xs text-gray-400">
                        {p.ohneSchritt}{" "}
                        {p.ohneSchritt === 1 ? "Inhalt" : "Inhalte"} noch ohne
                        Schritt
                      </span>
                    )}
                    <button
                      onClick={() => onNavigate?.("projekte", p.projektId)}
                      className="text-xs font-medium text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
                    >
                      Zum Projekt →
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function KartenSektion({ karten, onNavigate }) {
  const [projekte] = useStored("projekte", [])
  const stapel = useMemo(
    () => kartenNachProjekt(karten, projekte),
    [karten, projekte]
  )

  if (stapel.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Kartenstapel
        </p>
        <p className="text-xs text-gray-400">
          {stapel.length} Stapel · {karten.length}{" "}
          {karten.length === 1 ? "Karte" : "Karten"}
        </p>
      </div>

      <ul className="mt-3 divide-y divide-gray-100">
        {stapel.map((s) => {
          const anteil = (n) => (s.gesamt ? (n / s.gesamt) * 100 : 0)
          return (
            <li key={s.projektId ?? "ohne"} className="py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {s.name}
                </span>
                {s.faellig > 0 && (
                  <span className="shrink-0 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-600">
                    {s.faellig} fällig
                  </span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {s.gesamt}
                </span>
                {s.projektId != null && (
                  <button
                    onClick={() => onNavigate?.("projekte", s.projektId)}
                    title="Zum Projekt"
                    className="shrink-0 text-xs text-gray-300 transition-colors hover:text-gray-900"
                  >
                    →
                  </button>
                )}
              </div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-gray-300"
                  style={{ width: `${anteil(s.reife.neu)}%` }}
                />
                <div
                  className="bg-blue-400"
                  style={{ width: `${anteil(s.reife.jung)}%` }}
                />
                <div
                  className="bg-emerald-500"
                  style={{ width: `${anteil(s.reife.reif)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {s.reife.neu} neu · {s.reife.jung} jung · {s.reife.reif} reif
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
