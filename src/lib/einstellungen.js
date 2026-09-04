// App-weite Grundeinstellungen an einer Stelle.
//
// Sowohl die App-Hülle (App.jsx) als auch die Einstellungs-Seite und der
// Einrichtungsassistent brauchen dieselben Vorgabewerte. Früher stand jede
// Fassung für sich – die Listen liefen auseinander, sodass ein Bereich je
// nach Einstiegspunkt fehlte. Deshalb liegt der Standard nur noch hier.

import { AKZENT_STANDARD } from "./akzent"
import { STIL_STANDARD } from "./stil"

// Alle Module der Hauptnavigation in ihrer Vorgabe-Reihenfolge.
// „dashboard" steht immer vorn und lässt sich nicht ausblenden.
export const STANDARD_SEITEN = [
  "dashboard",
  "lockedin",
  "kalender",
  "todos",
  "sammeln",
  "habits",
  "vitalitaet",
  "deepwork",
  "projekte",
  "periode",
  "finanzen",
  "beruf",
  "leisure",
  "dailyops",
]

export const EINSTELLUNGEN_STANDARD = {
  onboardingAbgeschlossen: false,
  profil: "komplett",
  sichtbareSeiten: STANDARD_SEITEN,
  appName: "OS",
  startseite: "dashboard",
  akzent: AKZENT_STANDARD,
  stil: STIL_STANDARD,
}
