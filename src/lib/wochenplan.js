// Rechnungen der Wochenplan-Seite.
//
// Der Wochenplan beantwortet drei Fragen: Was ist das Ziel dieser Woche, was
// liegt an welchem Tag, und was ist schon geschafft. Die Daten dafür liegen
// alle schon da (Store `todos`); neu sind nur das eigene Wochenziel und die
// drei Tages-Prioritäten. Wie überall im Repo: hier wird gerechnet, die
// Darstellung steht in components/WochenplanSeite.jsx.

import { WOCHENTAGE, montagVon, schluessel } from "./datum"
import { EINTEILUNGEN, erledigtTag } from "./todos"
import { wochenEndeVon } from "./wochenbericht"

// Die sieben Tage einer Woche ab ihrem Montag – Schlüssel, Kurzname und
// Tagesziffer für die Spaltenköpfe.
export function wochenTage(montagKey) {
  const start = new Date(montagKey)
  return WOCHENTAGE.map((name, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const key = schluessel(d)
    return { key, name, tag: key.slice(8), monat: key.slice(5, 7) }
  })
}

// Montag der Woche, die `versatz` Wochen von heute entfernt liegt
// (0 = laufende Woche, -1 = vorige, 1 = nächste).
export function montagMitVersatz(versatz = 0, jetzt = new Date()) {
  const montag = montagVon(jetzt)
  montag.setDate(montag.getDate() + versatz * 7)
  return schluessel(montag)
}

function imZeitraum(datum, von, bis) {
  return typeof datum === "string" && datum >= von && datum <= bis
}

// Offene Aufgaben, die in dieser Woche liegen. Überfälliges zählt mit: Was
// aus der Vorwoche liegen blieb, ist diese Woche zu tun und darf nicht
// unsichtbar werden, nur weil sein Datum älter ist.
export function offeneDerWoche(todos, montagKey) {
  const bis = wochenEndeVon(montagKey)
  return todos.filter((t) => !t.erledigt && t.datum && t.datum <= bis)
}

// Aufgaben eines einzelnen Tages – die Tagesspalten des Wochenrasters.
export function aufgabenAmTag(todos, tagKey) {
  return todos.filter((t) => t.datum === tagKey)
}

// In einem Zeitraum abgehakt (Woche oder einzelner Tag).
export function erledigtImZeitraum(todos, von, bis = von) {
  return todos.filter((t) => t.erledigt && imZeitraum(erledigtTag(t), von, bis))
}

// Aufgaben auf die vier Eisenhower-Felder verteilen – in der Reihenfolge
// von EINTEILUNGEN, damit „wichtig & dringend" immer zuerst steht.
export function nachQuadranten(todos) {
  return EINTEILUNGEN.map((e) => ({
    ...e,
    todos: todos
      .filter((t) => e.passt(t))
      .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999")),
  }))
}

// ── Wochenziel und Tages-Prioritäten ─────────────────────────────────────
//
// Beide liegen als flache Zuordnung „Datum → Inhalt" in eigenen Stores:
// `wochenziele` am Montag der Woche, `tagesprioritaeten` am Tag. Flach,
// weil so weder eine Migration nötig ist noch etwas aufräumt werden muss –
// wer nichts einträgt, erzeugt keinen Eintrag.
//
// Bewusst getrennt von den Wochenzielen einer Fokus-Periode (Store `zyklen`):
// Die Periode ist ein Vorhaben über Wochen hinweg, der Wochenplan ist diese
// eine Woche. Die Seite zeigt ein Perioden-Wochenziel zusätzlich an, statt
// es zu überschreiben.

export function wochenzielVon(wochenziele, montagKey) {
  return wochenziele?.[montagKey] ?? ""
}

export function setzeWochenziel(wochenziele, montagKey, text) {
  const naechste = { ...(wochenziele ?? {}) }
  if (text.trim()) naechste[montagKey] = text
  else delete naechste[montagKey]
  return naechste
}

// Drei Prioritäten je Tag, als Text mit Häkchen. Absichtlich kein Verweis
// auf Todo-IDs: Die wichtigste Sache des Tages ist oft keine Aufgabe aus
// der Liste („Gespräch führen", „nicht ausweichen") – und eine, die es ist,
// steht ohnehin schon im Raster darunter.
export const PRIORITAETEN_PRO_TAG = 3

export function top3Von(prioritaeten, tagKey) {
  const roh = prioritaeten?.[tagKey] ?? []
  return Array.from({ length: PRIORITAETEN_PRO_TAG }, (_, i) => ({
    text: roh[i]?.text ?? "",
    erledigt: Boolean(roh[i]?.erledigt),
  }))
}

export function setzeTop3(prioritaeten, tagKey, eintraege) {
  const naechste = { ...(prioritaeten ?? {}) }
  const gefuellt = eintraege.filter((e) => e.text.trim())
  if (gefuellt.length > 0) naechste[tagKey] = eintraege
  else delete naechste[tagKey]
  return naechste
}
