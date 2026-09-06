// Optionale Blöcke der Startseite, die sich in den Einstellungen ein- und
// ausblenden lassen. Der Aufgaben-/Fokus-Kern bleibt immer sichtbar; hier
// geht es um die ergänzenden Panels. Gilt stilübergreifend (Todo, Terminal,
// Clean Girl, …), soweit ein Stil den jeweiligen Block überhaupt zeigt.

export const DASHBOARD_BLOECKE = [
  {
    key: "mentor",
    label: "Mentor",
    beschreibung: "Momentum deiner Gleichung & stärkster Befund",
  },
  {
    key: "fokusPeriode",
    label: "Fokus-Periode",
    beschreibung: "Laufende Zyklen mit Ziel & verknüpften Projekten",
  },
  {
    key: "lernen",
    label: "Lern-Erinnerung",
    beschreibung: "Hinweis auf fällige Karteikarten",
  },
  {
    key: "habits",
    label: "Habits",
    beschreibung: "Heutige Gewohnheiten zum Abhaken",
  },
  {
    key: "routinen",
    label: "Routinen",
    beschreibung: "Heutige Abläufe aus Daily Operations zum Abhaken",
  },
  {
    key: "leben",
    label: "Leben",
    beschreibung: "Finanzen, Beruf, Periode, Körper & Leisure in einer Reihe",
  },
  {
    key: "kennzahlen",
    label: "Kennzahlen",
    beschreibung: "Zahlen-Kacheln (offen, erledigt, …)",
  },
  {
    key: "kalender",
    label: "Heute (Kalender)",
    beschreibung: "Heutige Termine direkt auf der Startseite",
  },
]

const STANDARD = {
  mentor: true,
  fokusPeriode: true,
  lernen: true,
  habits: true,
  routinen: true,
  leben: true,
  kennzahlen: true,
  kalender: true,
}

// Dashboard-Konfiguration mit Standardwerten (fehlende Schlüssel = an).
export function dashboardConfig(einstellungen) {
  return { ...STANDARD, ...(einstellungen?.dashboard ?? {}) }
}
