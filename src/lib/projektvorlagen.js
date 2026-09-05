// Projektvorlagen: Ein neues Projekt bringt oft immer dieselbe Struktur mit –
// ein Uni-Kurs braucht Inhalte und Karteikarten, eine Arbeit einen Ablauf mit
// festen Etappen. Eine Vorlage setzt Bereiche, Seiten und Workflow-Schritte in
// einem Rutsch; danach ist es ein ganz normales Projekt.
//
// `seiten` nennt nur Titel und den Vorlagentext (wie in Sammeln), die Blöcke
// entstehen daraus beim Anlegen.

import { NEUES_PROJEKT_MODULE } from "./projekte"

export const PROJEKT_VORLAGEN = [
  {
    key: "leer",
    label: "Standard",
    beschreibung: "Ziel, Todos und Notizen – der Alltagsfall.",
    module: NEUES_PROJEKT_MODULE,
    workflow: [],
    seiten: [],
  },
  {
    key: "kurs",
    label: "Uni-Kurs",
    beschreibung: "Inhalte, Karteikarten, Todos und Kalender.",
    module: ["inhalte", "karten", "todos", "kalender"],
    workflow: [],
    seiten: [
      {
        titel: "Kursüberblick",
        inhalt:
          "## Prüfungsform\n\n## Termine\n- \n\n## Literatur\n- \n\n## Offene Fragen\n- ",
      },
    ],
  },
  {
    key: "arbeit",
    label: "Haus- oder Abschlussarbeit",
    beschreibung: "Ablauf von der Themenwahl bis zur Abgabe, plus Gliederung.",
    module: ["workflow", "notizen", "todos", "kalender"],
    workflow: [
      "Thema eingrenzen",
      "Exposé",
      "Recherche",
      "Gliederung",
      "Rohfassung",
      "Überarbeiten",
      "Korrektur lesen",
      "Abgabe",
    ],
    seiten: [
      {
        titel: "Gliederung",
        inhalt: "## Fragestellung\n\n## Aufbau\n- \n\n## Methodik\n",
      },
      { titel: "Quellen", inhalt: "## Gelesen\n- \n\n## Noch zu lesen\n- " },
    ],
  },
  {
    key: "vorhaben",
    label: "Vorhaben",
    beschreibung: "Ziel, Schritte und Aufgaben – für alles mit klarem Ende.",
    module: ["ziel", "workflow", "todos"],
    workflow: ["Erster Schritt", "Umsetzung", "Abschluss"],
    seiten: [
      {
        titel: "Plan",
        inhalt:
          "## Was soll herauskommen\n\n## Woran erkenne ich, dass es fertig ist\n\n## Nächster Schritt\n- ",
      },
    ],
  },
  {
    key: "recherche",
    label: "Recherche",
    beschreibung: "Fragen, Quellen und Erkenntnisse sammeln.",
    module: ["notizen", "artikel", "todos"],
    workflow: [],
    seiten: [
      {
        titel: "Recherche",
        inhalt: "## Frage\n\n## Quellen\n- \n\n## Erkenntnisse\n- ",
      },
    ],
  },
]

// Baut aus einer Vorlage die Felder eines neuen Projekts. `blockBauer`
// erzeugt aus Vorlagentext die Blöcke (vorlageZuBloecken), `neueId` liefert
// eindeutige IDs für Seiten und Workflow-Schritte.
export function vorlageAnwenden(vorlage, blockBauer, neueId) {
  const seiten = (vorlage?.seiten ?? []).map((s) => ({
    id: neueId(),
    titel: s.titel,
    bloecke: blockBauer(s.inhalt),
  }))
  return {
    module: [...(vorlage?.module ?? [])],
    workflow: (vorlage?.workflow ?? []).map((text) => ({
      id: neueId(),
      text,
      datum: "",
      erledigt: false,
    })),
    seiten,
    seitenTabs: seiten.map((s) => s.id),
    // Frisch angelegte Projekte brauchen die Übersichts-Migration nicht.
    uebersichtMigriert: true,
  }
}
