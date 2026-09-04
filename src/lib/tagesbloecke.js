// Tagesblöcke: wiederverwendbare Vorlagen für den Kalender-Tagesplan
// (Name, Farbe, Standarddauer). Ein paar sind vorgegeben, eigene lassen
// sich jederzeit ergänzen – gleiches Prinzip wie die Habit-Bereiche.

import useStored from "./useStored"

export const STANDARD_TAGESBLOECKE = [
  { id: "deepwork", name: "Deep Work", farbe: "violet", dauer: 90 },
  { id: "sport", name: "Sport", farbe: "emerald", dauer: 60 },
  { id: "pause", name: "Pause", farbe: "amber", dauer: 15 },
]

export function useTagesblockVorlagen() {
  const [bloecke, setBloecke] = useStored("tagesbloecke", STANDARD_TAGESBLOECKE)
  return { bloecke, setBloecke }
}
