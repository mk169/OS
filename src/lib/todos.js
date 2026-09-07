// Eisenhower-Einteilung der Todos (wichtig × dringend).
//
// Die Vier-Felder-Matrix und ihre Farben werden überall gebraucht: beim
// Erstellen, in der Todo-Liste, im Dashboard, in Locked In und im Gamified-
// Stil (lib/spiel.js). Deshalb liegen sie hier und nicht in einer Komponente.

export const EINTEILUNGEN = [
  {
    key: "wichtig-dringend",
    label: "Wichtig & dringend",
    punkt: "bg-red-500",
    text: "text-red-600",
    passt: (t) => t.wichtig && t.dringend,
  },
  {
    key: "wichtig",
    label: "Wichtig, nicht dringend",
    punkt: "bg-yellow-400",
    text: "text-yellow-600",
    passt: (t) => t.wichtig && !t.dringend,
  },
  {
    key: "dringend",
    label: "Dringend, nicht wichtig",
    punkt: "bg-orange-500",
    text: "text-orange-600",
    passt: (t) => !t.wichtig && t.dringend,
  },
  {
    key: "sonstige",
    label: "Sonstige",
    punkt: "bg-gray-400",
    text: "text-gray-500",
    passt: (t) => !t.wichtig && !t.dringend,
  },
]

export function einteilungVon(todo) {
  return EINTEILUNGEN.find((e) => e.passt(todo))
}

// Eine Aufgabe abhaken oder wieder öffnen.
//
// Bis hierher stand in jeder Seite dieselbe Zeile `{...t, erledigt: !t.erledigt}`
// – sechsmal dasselbe. Das reichte, solange niemand wissen wollte, *wann*
// etwas erledigt wurde. Der Wochenplan will genau das („diese Woche
// erledigt", „heute erledigt"), also hält diese Funktion zusätzlich den Tag
// fest. Beim Wiederöffnen fällt er weg, damit keine falsche Spur bleibt.
//
// Altdaten haben kein `erledigtAm`; wer danach filtert, braucht einen
// Rückfall auf `datum` (siehe lib/wochenplan.js).
export function todoUmschalten(todos, id, tag) {
  return todos.map((t) => {
    if (t.id !== id) return t
    if (t.erledigt) {
      const { erledigtAm: _weg, ...rest } = t
      return { ...rest, erledigt: false }
    }
    return { ...t, erledigt: true, erledigtAm: tag }
  })
}

// Wann gilt eine Aufgabe als erledigt? Seit dem Wochenplan hält
// `todoUmschalten` den Tag in `erledigtAm` fest. Altdaten haben das Feld
// nicht – dort bleibt das geplante Datum als beste Schätzung, und wo auch
// das fehlt, gibt es keine Antwort (null).
export function erledigtTag(todo) {
  return todo.erledigtAm ?? todo.datum ?? null
}
