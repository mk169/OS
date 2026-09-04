// Geteilte Spiel-Logik für den Gamified-Stil (Todos „Quest Board" &
// Habits „Training"). Hält XP-/Level-Berechnung und Quest-Ränge an einem
// Ort, damit beide Screens konsistent bleiben.

import { einteilungVon } from "./todos"

// Eisenhower-Schlüssel (siehe EINTEILUNGEN in lib/todos.js) → Rang-Meta.
// `farbe` verweist auf lib/farben.js (FARBEN).
export const QUEST_RANGE = {
  "wichtig-dringend": { label: "BOSS", emoji: "🐉", xp: 50, farbe: "rose" },
  wichtig: { label: "EPISCH", emoji: "⭐", xp: 30, farbe: "amber" },
  dringend: { label: "EILIG", emoji: "⚡", xp: 20, farbe: "amber" },
  sonstige: { label: "NEBENQUEST", emoji: "🗺️", xp: 10, farbe: "cyan" },
}

export const RANG_STANDARD = { label: "QUEST", emoji: "🗺️", xp: 10, farbe: "gray" }

// Rang-Meta zu einem Eisenhower-Key.
export function rangVon(key) {
  return QUEST_RANGE[key] ?? RANG_STANDARD
}

// XP aus erledigten Todos: Summe der Rang-Belohnungen.
export function xpVonTodos(todos) {
  return todos
    .filter((t) => t.erledigt)
    .reduce((summe, t) => summe + rangVon(einteilungVon(t)?.key).xp, 0)
}

const XP_PRO_LEVEL = 100

// Level + Fortschritt aus Gesamt-XP.
export function levelVon(xp) {
  const level = Math.floor(xp / XP_PRO_LEVEL) + 1
  const xpInLevel = xp % XP_PRO_LEVEL
  return {
    level,
    xpInLevel,
    xpProLevel: XP_PRO_LEVEL,
    fortschritt: Math.round((xpInLevel / XP_PRO_LEVEL) * 100),
  }
}

// Attribut-Level eines Habit-Bereichs aus der Anzahl aller Completions in
// diesem Bereich (alle 12 Completions ein Level; startet bei Lv 1).
export function attributLevel(anzahlCompletions) {
  const proLevel = 12
  const level = Math.floor(anzahlCompletions / proLevel) + 1
  const imLevel = anzahlCompletions % proLevel
  return {
    level,
    imLevel,
    proLevel,
    fortschritt: Math.round((imLevel / proLevel) * 100),
  }
}
