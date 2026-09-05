// Projekt-Grundlagen: Standard-Bereiche eines Projekts, die Auswahlwerte
// für Priorität und Status sowie zwei Rechnungen, die quer durch die App
// gebraucht werden (Fortschritt und terminierte Einträge).

// Fallback für Projekte aus der Zeit vor den Vorlagen, die keine eigene
// Bereichsliste tragen. Bewusst unverändert: Eine Kürzung würde bei alten
// Projekten Bereiche ausblenden, in denen Daten liegen.
export const STANDARD_MODULE = ["ziel", "workflow", "todos", "lernen", "kalender"]

// Womit ein frisch angelegtes Projekt startet: das, was fast jedes Vorhaben
// braucht. Lernstoff, Ablauf und Board kommen über „Bereiche anpassen" dazu,
// wenn sie gebraucht werden.
export const NEUES_PROJEKT_MODULE = ["ziel", "todos", "notizen"]

// Die Bereiche eines Projekts, gebündelt nach dem, wofür man sie öffnet.
// Zehn Namen nebeneinander sagen wenig – „Inhalte", „Lernen" und
// „Karteikarten" sind ohne Erklärung kaum auseinanderzuhalten. Deshalb
// gehört zu jedem Bereich ein Satz, was er tut.
export const MODUL_GRUPPEN = [
  { key: "arbeiten", label: "Arbeiten" },
  { key: "schreiben", label: "Schreiben" },
  { key: "lernen", label: "Lernen" },
  { key: "termine", label: "Termine" },
]

export const MODULE = [
  {
    key: "ziel",
    label: "Ziel",
    gruppe: "arbeiten",
    beschreibung: "Worum es geht – und woran du merkst, dass es fertig ist.",
  },
  {
    key: "todos",
    label: "Todos",
    gruppe: "arbeiten",
    beschreibung: "Aufgaben des Projekts; sie stehen auch in deiner Todo-Liste.",
  },
  {
    key: "workflow",
    label: "Workflow",
    gruppe: "arbeiten",
    beschreibung: "Etappen der Reihe nach, jede mit Datum – für alles mit Ablauf.",
  },
  {
    key: "board",
    label: "Board",
    gruppe: "arbeiten",
    beschreibung: "Karten von Inbox über In Arbeit nach Fertig, zum Schieben.",
  },
  {
    key: "notizen",
    label: "Notizen",
    gruppe: "schreiben",
    beschreibung: "Kurze Notizen, mit [[Titel]] untereinander verknüpfbar.",
  },
  {
    key: "artikel",
    label: "Artikel",
    gruppe: "schreiben",
    beschreibung: "Längere Texte mit Formatierung – Entwürfe, Ausarbeitungen.",
  },
  {
    key: "inhalte",
    label: "Inhalte",
    gruppe: "lernen",
    beschreibung: "Der Stoff als Liste: Kapitel, Skripte, Übungen, Altklausuren.",
  },
  {
    key: "lernen",
    label: "Lernen",
    gruppe: "lernen",
    beschreibung: "Lernplan aus den Inhalten, dazu die heute fälligen Karten.",
  },
  {
    key: "karten",
    label: "Karteikarten",
    gruppe: "lernen",
    beschreibung: "Karten mit Wiederholung nach Spaced Repetition.",
  },
  {
    key: "kalender",
    label: "Kalender",
    gruppe: "termine",
    beschreibung: "Termine und Fristen, die nur dieses Projekt betreffen.",
  },
]

// Bereiche einer Gruppe, in der Reihenfolge oben.
export function moduleDerGruppe(gruppe, eigene = []) {
  const fest = MODULE.filter((m) => m.gruppe === gruppe)
  // Eigene Bereiche haben keine Gruppe – sie hängen hinten bei „Arbeiten".
  return gruppe === "arbeiten" ? [...fest, ...eigene] : fest
}

// Auswahlwerte für die Eigenschaften Priorität und Status (Notion-artige
// Tags). Farbe pro Wert; leerer Wert = dezentes „Keine“.
export const PRIORITAETEN = [
  { value: "", label: "Keine", tag: "bg-gray-100 text-gray-500" },
  { value: "niedrig", label: "Niedrig", tag: "bg-gray-100 text-gray-600" },
  { value: "mittel", label: "Mittel", tag: "bg-amber-50 text-amber-700" },
  { value: "hoch", label: "Hoch", tag: "bg-red-50 text-red-600" },
]

export const STATUS_OPTIONEN = [
  { value: "offen", label: "Nicht begonnen", tag: "bg-gray-100 text-gray-600" },
  { value: "aktiv", label: "In Arbeit", tag: "bg-blue-50 text-blue-700" },
  { value: "fertig", label: "Erledigt", tag: "bg-emerald-50 text-emerald-700" },
]

// Fortschritt eines Projekts als Werte: erst der Workflow, sonst die
// zugeordneten Todos. gesamt === 0 heißt „nichts zum Abhaken“.
export function projektFortschrittWerte(projekt, todos) {
  const schritte = projekt.workflow ?? []
  if (schritte.length > 0) {
    return { erledigt: schritte.filter((s) => s.erledigt).length, gesamt: schritte.length }
  }
  const eigene = todos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  return { erledigt: eigene.filter((t) => t.erledigt).length, gesamt: eigene.length }
}

// Rohliste aller terminierten Einträge (Projekt-Deadlines, Workflow-
// Schritte mit Datum, Todos mit Datum) – unsortiert, ungekürzt. Gemeinsam
// genutzt von AnstehendAnsicht und dem Wochen-Review (ReviewSeite).
export function sammleTermine(projekte, todos) {
  const eintraege = []
  for (const p of projekte) {
    if (p.deadline)
      eintraege.push({
        datum: p.deadline,
        label: `Deadline: ${p.name}`,
        projektId: p.id,
        typ: "Deadline",
      })
    for (const s of p.workflow ?? []) {
      if (s.datum && !s.erledigt)
        eintraege.push({
          datum: s.datum,
          label: s.text,
          projektId: p.id,
          typ: "Schritt",
        })
    }
  }
  for (const t of todos) {
    const pid = t.projektId ?? t.kursId
    if (t.datum && !t.erledigt && pid && projekte.some((p) => p.id === pid))
      eintraege.push({
        datum: t.datum,
        label: t.text,
        projektId: pid,
        typ: "Todo",
      })
  }
  return eintraege
}
