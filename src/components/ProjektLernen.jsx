import { useState } from "react"
import useStored from "../lib/useStored"
import LoeschKnopf from "./LoeschKnopf"
import { tageBis, tageBisZahl } from "../lib/datum"
import { istFaellig } from "../lib/spacedRepetition"
import {
  lernplanVon,
  erzeugeSchritte,
  neuVerteilt,
  gehoertZu,
  schrittText,
} from "../lib/lernplan"

// Der Lernbereich eines Projekts: hier wird der Lernplan gemacht und
// gepflegt. Er führt die drei Teile zusammen, die bisher nebeneinander
// standen – die Inhalte (woraus der Plan entsteht), die Schritte (wann was
// gelernt wird) und die Karteikarten (womit wiederholt wird). Jeder Teil
// verlinkt in seinen eigenen Bereich, damit man von hier überall hinkommt.

export default function ProjektLernen({ projekt, onModulWechsel, onNavigate }) {
  const [alleTodos, setAlleTodos] = useStored("todos", [])
  const [ablage] = useStored("ablage", [])
  const [karten] = useStored("karten", [])
  const [meldung, setMeldung] = useState("")
  const [erledigteOffen, setErledigteOffen] = useState(false)

  const plan = lernplanVon(projekt, alleTodos, ablage) ?? {
    schritte: [],
    offene: [],
    gesamt: 0,
    erledigt: 0,
    ueberfaellig: 0,
    fortschritt: 0,
    inhalte: 0,
    ohneSchritt: 0,
  }
  const inhalte = ablage.filter((e) => gehoertZu(e, projekt.id))
  const projektKarten = karten.filter((k) => gehoertZu(k, projekt.id))
  const kartenFaellig = projektKarten.filter(istFaellig).length

  const geplant = new Set()
  for (const s of plan.schritte) {
    if (s.inhaltId != null) geplant.add(s.inhaltId)
    geplant.add(s.text)
  }
  const offeneInhalte = inhalte.filter(
    (i) => !geplant.has(i.id) && !geplant.has(schrittText(i.titel))
  )

  const erledigteSchritte = plan.schritte.filter((s) => s.erledigt)

  function planErgaenzen(nurIds = null) {
    const aufgaben = erzeugeSchritte(projekt, ablage, alleTodos, nurIds)
    if (aufgaben.length === 0) {
      setMeldung(
        inhalte.length === 0
          ? "Lege zuerst Inhalte an – daraus entsteht der Lernplan."
          : "Alle Inhalte sind bereits eingeplant."
      )
      return
    }
    setAlleTodos([...alleTodos, ...aufgaben])
    setMeldung(
      `${aufgaben.length} ${aufgaben.length === 1 ? "Schritt" : "Schritte"} eingeplant${
        projekt.deadline ? " – verteilt bis zur Deadline." : " – im Wochenrhythmus."
      }`
    )
  }

  // Offene Schritte gleichmäßig über die verbleibende Zeit verteilen –
  // nützlich nach einer verschobenen Deadline oder wenn etwas liegen blieb.
  function neuVerteilen() {
    if (plan.offene.length === 0) return
    const neu = neuVerteilt(plan.offene, projekt.deadline)
    const datumVon = new Map(neu.map((s) => [s.id, s.datum]))
    setAlleTodos(
      alleTodos.map((t) =>
        datumVon.has(t.id) ? { ...t, datum: datumVon.get(t.id) } : t
      )
    )
    setMeldung(
      `${neu.length} offene ${neu.length === 1 ? "Schritt" : "Schritte"} neu verteilt${
        projekt.deadline ? " – bis zur Deadline." : " – im Wochenrhythmus."
      }`
    )
  }

  function setzeDatum(id, datum) {
    setAlleTodos(alleTodos.map((t) => (t.id === id ? { ...t, datum } : t)))
  }
  function toggleErledigt(id) {
    setAlleTodos(
      alleTodos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }
  function entferne(id) {
    setAlleTodos(alleTodos.filter((t) => t.id !== id))
  }

  return (
    <div>
      {/* Kopf: Fortschritt und die beiden Plan-Aktionen */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {plan.gesamt === 0
              ? "Noch kein Lernplan"
              : `${plan.erledigt} von ${plan.gesamt} Schritten erledigt`}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {plan.ueberfaellig > 0 && (
              <span className="text-red-600">
                {plan.ueberfaellig} überfällig ·{" "}
              </span>
            )}
            {inhalte.length} {inhalte.length === 1 ? "Inhalt" : "Inhalte"}
            {projekt.deadline && ` · Deadline ${tageBis(projekt.deadline)}`}
            {" · "}
            <button
              onClick={() => onNavigate?.("sammeln", "lernen")}
              title="Lernpläne und Karten aller Projekte"
              className="underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
            >
              Alle Projekte →
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.offene.length > 0 && (
            <button
              onClick={neuVerteilen}
              title="Offene Schritte gleichmäßig über die verbleibende Zeit verteilen"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Neu verteilen
            </button>
          )}
          <button
            onClick={() => planErgaenzen()}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {plan.gesamt > 0 ? "Plan ergänzen" : "Lernplan erstellen"}
          </button>
        </div>
      </div>

      {meldung && <p className="mt-2 text-xs text-gray-500">{meldung}</p>}

      {plan.gesamt > 0 && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              plan.fortschritt >= 1 ? "bg-emerald-500" : "bg-accent-500"
            }`}
            style={{ width: `${Math.round(plan.fortschritt * 100)}%` }}
          />
        </div>
      )}

      {/* Offene Schritte – Datum je Schritt direkt änderbar */}
      {plan.offene.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {plan.offene.map((s) => (
            <SchrittZeile
              key={s.id}
              schritt={s}
              onToggle={() => toggleErledigt(s.id)}
              onDatum={(d) => setzeDatum(s.id, d)}
              onEntfernen={() => entferne(s.id)}
              onInhalt={
                s.inhaltId != null ? () => onModulWechsel?.("inhalte") : null
              }
            />
          ))}
        </ul>
      )}

      {plan.gesamt > 0 && plan.offene.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
          Alle Schritte erledigt.
        </p>
      )}

      {/* Noch nicht eingeplante Inhalte */}
      {offeneInhalte.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Noch nicht eingeplant
            </p>
            <button
              onClick={() => onModulWechsel?.("inhalte")}
              className="text-xs text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
            >
              Zu den Inhalten →
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {offeneInhalte.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="min-w-0 flex-1 truncate text-gray-700">
                  {i.titel}
                </span>
                <span className="shrink-0 text-[10px] text-gray-400">
                  {i.kategorie}
                </span>
                <button
                  onClick={() => planErgaenzen([i.id])}
                  className="shrink-0 rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-900"
                >
                  + einplanen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erledigte Schritte – zusammengeklappt, damit die Liste ruhig bleibt */}
      {erledigteSchritte.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <button
            onClick={() => setErledigteOffen((o) => !o)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-900"
          >
            <span
              className={`transition-transform ${erledigteOffen ? "rotate-90" : ""}`}
            >
              ▸
            </span>
            Erledigt ({erledigteSchritte.length})
          </button>
          {erledigteOffen && (
            <ul className="mt-2 space-y-1">
              {erledigteSchritte.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <button
                    onClick={() => toggleErledigt(s.id)}
                    title="Wieder öffnen"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-900 bg-gray-900 text-[10px] text-white"
                  >
                    ✓
                  </button>
                  <span className="min-w-0 flex-1 truncate text-gray-400 line-through">
                    {s.text}
                  </span>
                  <LoeschKnopf
                    onLoeschen={() => entferne(s.id)}
                    titel="Schritt löschen"
                    klasse="text-gray-300"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Karteikarten des Projekts – der zweite Teil des Lernens */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Karteikarten
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {projektKarten.length === 0
              ? "Noch keine Karten in diesem Projekt"
              : `${projektKarten.length} ${projektKarten.length === 1 ? "Karte" : "Karten"}${
                  kartenFaellig > 0 ? ` · ${kartenFaellig} fällig` : " · nichts fällig"
                }`}
          </p>
        </div>
        <button
          onClick={() => onModulWechsel?.("karten")}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {projektKarten.length === 0 ? "Karten anlegen" : "Zu den Karteikarten →"}
        </button>
      </div>
    </div>
  )
}

// Eine Schritt-Zeile: abhaken, umdatieren, zum Inhalt springen, löschen.
function SchrittZeile({ schritt, onToggle, onDatum, onEntfernen, onInhalt }) {
  const tage = schritt.datum ? tageBisZahl(schritt.datum) : null
  const datumKlasse =
    tage == null
      ? "text-gray-300"
      : tage < 0
        ? "text-red-600"
        : tage === 0
          ? "text-gray-900"
          : "text-gray-500"

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <button
        onClick={onToggle}
        title="Als erledigt markieren"
        className="h-4 w-4 shrink-0 rounded border border-gray-300 transition-colors hover:border-gray-900 hover:bg-gray-900"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
        {schritt.text}
      </span>
      {onInhalt && (
        <button
          onClick={onInhalt}
          title="Zugehörigen Inhalt anzeigen"
          className="shrink-0 text-[10px] text-gray-400 underline decoration-gray-200 underline-offset-2 transition-colors hover:text-gray-900"
        >
          Inhalt
        </button>
      )}
      {schritt.datum && (
        <span className={`shrink-0 text-[11px] tabular-nums ${datumKlasse}`}>
          {tage < 0 ? `${-tage} ${tage === -1 ? "Tag" : "Tage"} über` : tageBis(schritt.datum)}
        </span>
      )}
      <input
        type="date"
        value={schritt.datum ?? ""}
        onChange={(e) => onDatum(e.target.value)}
        title="Schritt umdatieren"
        className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none focus:border-gray-900"
      />
      <LoeschKnopf
        onLoeschen={onEntfernen}
        titel="Schritt löschen"
        klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}
