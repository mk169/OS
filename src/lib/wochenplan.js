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

// ── Wochenziel ───────────────────────────────────────────────────────────
//
// Das Wochenziel liegt als flache Zuordnung „Montag → Text" im Store
// `wochenziele`. Flach, weil so weder eine Migration nötig ist noch etwas
// aufgeräumt werden muss – wer nichts einträgt, erzeugt keinen Eintrag.
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

// ── Die drei Prioritäten eines Tages ─────────────────────────────────────
//
// Sie sind echte Aufgaben, keine zweite Liste daneben: Ein Todo trägt das
// Feld `fokus` mit dem Tag, an dem es Priorität ist. Damit hakt man dieselbe
// Sache nur einmal ab, und was hier oben steht, taucht unten in der Matrix
// und im Wochenraster als dasselbe Todo auf.
//
// Drei Plätze, nicht mehr: Der Sinn der Übung ist das Weglassen.
export const MAX_FOKUS = 3

export function fokusTodos(todos, tag) {
  return todos.filter((t) => t.fokus === tag).slice(0, MAX_FOKUS)
}

// Eine Aufgabe zur Priorität des Tages machen. Sind die drei Plätze belegt,
// bleibt die Liste unverändert – lieber eine klare Grenze als ein stilles
// Verdrängen dessen, was man sich vorgenommen hat.
export function setzeFokus(todos, id, tag) {
  if (fokusTodos(todos, tag).length >= MAX_FOKUS) return todos
  return todos.map((t) => (t.id === id ? { ...t, fokus: tag } : t))
}

// Aus den Prioritäten nehmen – die Aufgabe selbst bleibt bestehen.
export function loeseFokus(todos, id) {
  return todos.map((t) => {
    if (t.id !== id) return t
    const { fokus: _weg, ...rest } = t
    return rest
  })
}

// Woraus man wählen kann: offene Aufgaben, die heute noch keine Priorität
// sind. Was heute fällig oder überfällig ist, steht oben – danach der Rest
// nach Eisenhower-Rang.
export function fokusKandidaten(todos, tag) {
  const rang = (t) => EINTEILUNGEN.findIndex((e) => e.passt(t))
  return todos
    .filter((t) => !t.erledigt && t.fokus !== tag)
    .sort((a, b) => {
      const aFaellig = a.datum && a.datum <= tag ? 0 : 1
      const bFaellig = b.datum && b.datum <= tag ? 0 : 1
      return (
        aFaellig - bFaellig ||
        rang(a) - rang(b) ||
        (a.datum || "9999").localeCompare(b.datum || "9999")
      )
    })
}
