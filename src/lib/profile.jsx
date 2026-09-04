// App-Profile: vordefinierte Konfigurationen für verschiedene Nutzungs-
// szenarien. Der Einrichtungsassistent bietet sie beim ersten Start an, die
// Einstellungen jederzeit danach – deshalb liegen sie hier und nicht in
// einer der beiden Seiten. Die Datei ist .jsx, weil jedes Profil sein Icon
// als SVG-Pfade mitbringt.

import { STANDARD_SEITEN } from "./einstellungen"

// `seiten` listet nur die Module der Hauptnavigation. Start und Wochen-
// rückblick sind immer erreichbar und stehen deshalb in keiner Liste.

export const PROFILE = [
  {
    id: "produktivitaet",
    name: "Produktivitäts-Planer",
    beschreibung: "Kalender, Todos, Fokus-Timer und Projekte – alles für strukturiertes Arbeiten.",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    seiten: ["dashboard", "lockedin", "kalender", "todos", "deepwork", "projekte"],
  },
  {
    id: "habits",
    name: "Habit-Tracker",
    beschreibung: "Gewohnheiten aufbauen, Streaks verfolgen und Wochen-Reviews machen.",
    icon: (
      <path d="M12 3c.5 3 3.5 4 3.5 8a3.5 3.5 0 0 1-7 0c0-1 .4-1.8.8-2.4.3 1 .9 1.6 1.7 1.6-.8-2 .5-5 1-7.2Z" />
    ),
    seiten: ["dashboard", "habits", "vitalitaet", "todos", "kalender"],
  },
  {
    id: "second-brain",
    name: "Second Brain",
    beschreibung: "Gedanken sammeln, Wissen vernetzen, Projekte als intellektuelle Ökosysteme führen.",
    icon: (
      <>
        <ellipse cx="12" cy="12" rx="9" ry="7" />
        <path d="M9 9c.5-1.5 2-2 3-1.5M12 15v2M8.5 14.5c.5 1 2 2 3.5 2s3-.9 3.5-2" />
      </>
    ),
    seiten: ["dashboard", "sammeln", "projekte", "todos"],
  },
  {
    id: "komplett",
    name: "Komplett",
    beschreibung: "Alle Funktionen aktiv – das vollständige holistische OS für Geist und Leben.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
      </>
    ),
    // „Komplett" heisst wirklich komplett: dieselbe Liste wie der
    // App-Standard, damit kein Bereich versehentlich fehlt.
    seiten: STANDARD_SEITEN,
  },
  {
    id: "lockedin",
    name: "Locked In",
    beschreibung: "Maximale Effizienz. Ein Kommandozentrum für Disziplin, Aufgaben, Fokus & Ziele – monochrom, ohne Ablenkung.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    seiten: ["lockedin", "habits", "todos", "deepwork", "projekte"],
    stil: "lockedin",
    startseite: "lockedin",
  },
]
