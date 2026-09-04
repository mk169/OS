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
