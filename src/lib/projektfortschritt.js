// Fortschritt eines Projekts – eine Quelle für die Projekte-Seite, das
// Dashboard und alle eingebetteten Fortschrittsanzeigen.
//
// Gezählt wird der Workflow, also die bewusst gesetzten Schritte eines
// Projekts. Hat ein Projekt keinen Workflow, treten die ihm zugeordneten
// Todos an dessen Stelle – sonst stünde jedes Projekt ohne Ablaufplan
// dauerhaft bei 0 %. `gesamt === 0` heißt „nichts zum Abhaken".

import { tageBisZahl } from "./datum"

export function projektFortschrittWerte(projekt, todos) {
  const schritte = projekt.workflow ?? []
  if (schritte.length > 0) {
    return {
      erledigt: schritte.filter((s) => s.erledigt).length,
      gesamt: schritte.length,
    }
  }
  const eigene = todos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  return {
    erledigt: eigene.filter((t) => t.erledigt).length,
    gesamt: eigene.length,
  }
}

export function prozentVon({ erledigt, gesamt }) {
  return gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0
}

// Erster noch offener Workflow-Schritt – die konkrete nächste Handlung.
export function naechsterSchritt(projekt) {
  return (projekt.workflow ?? []).find((s) => !s.erledigt) ?? null
}

// Läuft dieses Projekt gerade? Areas sind Lebensbereiche ohne Ende und
// zählen hier bewusst nicht mit, archivierte und erledigte ebenso wenig.
export function istLaufend(p) {
  return (
    !p.archiviert &&
    (p.typ ?? "projekt") !== "area" &&
    (p.status ?? "offen") !== "fertig"
  )
}

// Alles, was eine Fortschrittszeile über ein Projekt wissen muss.
export function projektMetrik(projekt, todos) {
  const werte = projektFortschrittWerte(projekt, todos)
  const schritte = projekt.workflow ?? []
  const tageUebrig = projekt.deadline ? tageBisZahl(projekt.deadline) : null
  return {
    projekt,
    ...werte,
    offen: werte.gesamt - werte.erledigt,
    prozent: prozentVon(werte),
    // Woraus der Fortschritt stammt – die Anzeige beschriftet sich danach.
    quelle: schritte.length > 0 ? "workflow" : werte.gesamt > 0 ? "todos" : "leer",
    schritt: naechsterSchritt(projekt),
    tageUebrig,
    ueberfaellig: tageUebrig != null && tageUebrig < 0,
    fertig: werte.gesamt > 0 && werte.erledigt === werte.gesamt,
  }
}

// Laufende Projekte, nach Dringlichkeit sortiert: überfällige zuerst, dann
// nach Restzeit. Projekte ohne Deadline stehen hinten – sie drängen nicht –,
// dort entscheidet der weitere Fortschritt (fast fertig vor kaum begonnen).
export function projektMetriken(projekte, todos) {
  return projekte
    .filter(istLaufend)
    .map((p) => projektMetrik(p, todos))
    .sort((a, b) => {
      const ra = a.tageUebrig ?? Infinity
      const rb = b.tageUebrig ?? Infinity
      if (ra !== rb) return ra - rb
      return b.prozent - a.prozent
    })
}

// Kennzahlen über alle laufenden Projekte – der Kopf der Projekte-Seite und
// die Zeile über dem Dashboard-Block. „durchschnitt" ist der Mittelwert der
// Projekt-Prozente (jedes Projekt zählt gleich viel), nicht das Verhältnis
// aller Häkchen – sonst würde ein Projekt mit 80 Schritten alles erschlagen.
export function portfolioKennzahlen(metriken) {
  const mitAufgaben = metriken.filter((m) => m.gesamt > 0)
  const summe = mitAufgaben.reduce((s, m) => s + m.prozent, 0)
  return {
    laufend: metriken.length,
    verfolgt: mitAufgaben.length,
    durchschnitt:
      mitAufgaben.length > 0 ? Math.round(summe / mitAufgaben.length) : 0,
    offen: metriken.reduce((s, m) => s + m.offen, 0),
    ueberfaellig: metriken.filter((m) => m.ueberfaellig).length,
    dieseWoche: metriken.filter(
      (m) => m.tageUebrig != null && m.tageUebrig >= 0 && m.tageUebrig <= 7
    ).length,
  }
}
