import { fristTon, tageBis } from "../lib/datum"

// Kleine Bausteine, die mehrere Seiten teilen. Sie wohnten vorher in
// OrdnerSeite.jsx und TodosSeite.jsx – jede Seite, die einen Fortschrittsbalken
// brauchte, zog damit eine 45-KB-Seitendatei mit. Hier stehen sie da, wo
// geteilte Darstellung hingehört.

// Farben der Dringlichkeit. Eine Quelle für beide Chips: „heute" sah vorher
// je nach Seite einmal rot und einmal amber aus.
const FRIST_TON = {
  vorbei: "bg-red-50 text-red-600",
  heute: "bg-amber-50 text-amber-700",
  bald: "bg-gray-100 text-gray-600",
  fern: "text-gray-400",
}

// Frist in einer Todo-Zeile. `gedaempft` für erledigte Einträge – die sollen
// nicht weiter nach Dringlichkeit schreien.
export function FristChip({ datum, gedaempft = false }) {
  const ton = fristTon(datum)
  if (!ton) return null
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        gedaempft ? "text-gray-400" : FRIST_TON[ton]
      }`}
    >
      {tageBis(datum)}
    </span>
  )
}

// Dieselbe Information, kleiner gesetzt – für Projektkarten und Listen, in
// denen die Frist ein Detail neben dem Titel ist.
export function DeadlineChip({ datum }) {
  const ton = fristTon(datum)
  if (!ton) return null
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${FRIST_TON[ton]}`}
    >
      {tageBis(datum)}
    </span>
  )
}

// Schlanker Fortschrittsbalken mit erledigt/gesamt-Beschriftung.
export function Fortschrittsbalken({ erledigt, gesamt }) {
  if (gesamt === 0) {
    return <span className="text-xs text-gray-300">Noch keine Aufgaben</span>
  }
  const prozent = Math.round((erledigt / gesamt) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all"
          style={{ width: `${prozent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-gray-400">
        {erledigt}/{gesamt}
      </span>
    </div>
  )
}
