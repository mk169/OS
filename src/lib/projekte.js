// Projekt-Grundlagen: Standard-Bereiche eines Projekts, die Auswahlwerte
// für Priorität und Status sowie zwei Rechnungen, die quer durch die App
// gebraucht werden (Fortschritt und terminierte Einträge).

export const STANDARD_MODULE = ["ziel", "workflow", "todos", "lernen", "kalender"]

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
