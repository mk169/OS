import { heute, inTagen, tageBisZahl } from "./datum"

// Ein Lernplan ist die Menge der Todos, die aus den Inhalten eines Projekts
// erzeugt wurden (ProjektInhalte → „Lernplan erstellen"). Neu erzeugte
// Schritte tragen `lernplan: true` und die `inhaltId` ihres Themas; ältere
// Schritte werden weiterhin über ihren Text („<Inhalt> lernen") erkannt,
// damit bestehende Pläne in der Übersicht nicht verschwinden.

export const SCHRITT_SUFFIX = " lernen"

export function schrittText(titel) {
  return `${titel}${SCHRITT_SUFFIX}`
}

const normalisiere = (s) => (s ?? "").trim().toLowerCase()

// Gehört ein Eintrag (Todo, Inhalt, Karte) zu diesem Projekt? `kursId` ist
// der alte Schlüssel aus der Kurs-Zeit und wird weiterhin mitgelesen.
export function gehoertZu(eintrag, projektId) {
  return eintrag.projektId === projektId || eintrag.kursId === projektId
}

export function istLernschritt(todo, titelSet) {
  if (todo.lernplan) return true
  const text = todo.text ?? ""
  if (!text.endsWith(SCHRITT_SUFFIX)) return false
  return titelSet.has(normalisiere(text.slice(0, -SCHRITT_SUFFIX.length)))
}

// Offene Schritte zuerst nach Datum (ohne Datum ans Ende), damit „als
// nächstes dran" stabil und nachvollziehbar ist.
function nachDatum(a, b) {
  return (a.datum || "9999").localeCompare(b.datum || "9999") || a.id - b.id
}

// Der Lernplan eines Projekts – oder null, wenn es weder Inhalte noch
// Schritte gibt (dann hat das Projekt schlicht keinen Lernbezug).
export function lernplanVon(projekt, todos, ablage) {
  const inhalte = ablage.filter((e) => gehoertZu(e, projekt.id))
  const titelSet = new Set(inhalte.map((i) => normalisiere(i.titel)))
  const schritte = todos.filter(
    (t) => gehoertZu(t, projekt.id) && istLernschritt(t, titelSet)
  )
  if (inhalte.length === 0 && schritte.length === 0) return null

  const offene = schritte.filter((t) => !t.erledigt).sort(nachDatum)
  const heuteK = heute()
  const erledigt = schritte.length - offene.length

  // Inhalte, für die noch kein Schritt existiert – Hinweis darauf, dass der
  // Plan im Projekt neu erzeugt werden kann.
  const abgedeckt = new Set()
  for (const s of schritte) {
    if (s.inhaltId != null) abgedeckt.add(s.inhaltId)
    const text = s.text ?? ""
    if (text.endsWith(SCHRITT_SUFFIX))
      abgedeckt.add(normalisiere(text.slice(0, -SCHRITT_SUFFIX.length)))
  }
  const ohneSchritt = inhalte.filter(
    (i) => !abgedeckt.has(i.id) && !abgedeckt.has(normalisiere(i.titel))
  )

  return {
    projektId: projekt.id,
    name: projekt.name,
    deadline: projekt.deadline || "",
    schritte,
    offene,
    gesamt: schritte.length,
    erledigt,
    ueberfaellig: offene.filter((t) => t.datum && t.datum < heuteK).length,
    heuteFaellig: offene.filter((t) => t.datum === heuteK).length,
    naechster: offene[0] ?? null,
    fortschritt: schritte.length ? erledigt / schritte.length : 0,
    inhalte: inhalte.length,
    ohneSchritt: ohneSchritt.length,
  }
}

// Alle Lernpläne über sämtliche (nicht archivierten) Projekte hinweg.
// Reihenfolge: was drängt, steht oben – überfällige Pläne zuerst, dann nach
// dem Datum des nächsten Schritts, abgeschlossene Pläne zuletzt.
export function alleLernplaene(projekte, todos, ablage) {
  const plaene = projekte
    .filter((p) => !p.archiviert)
    .map((p) => lernplanVon(p, todos, ablage))
    .filter(Boolean)

  return plaene.sort((a, b) => {
    if ((a.ueberfaellig > 0) !== (b.ueberfaellig > 0))
      return a.ueberfaellig > 0 ? -1 : 1
    if (!a.naechster !== !b.naechster) return a.naechster ? -1 : 1
    if (a.naechster && b.naechster) {
      const d = (a.naechster.datum || "9999").localeCompare(
        b.naechster.datum || "9999"
      )
      if (d !== 0) return d
    }
    return (a.name ?? "").localeCompare(b.name ?? "")
  })
}

// ── Plan erzeugen und umdatieren ────────────────────────────────────────────
//
// Dieselbe Verteil-Logik nutzen alle Stellen, an denen ein Plan entsteht oder
// neu geordnet wird: der Inhalte-Bereich, der Lernbereich des Projekts und die
// projektübergreifende Lern-Übersicht.

const PRIO_GEWICHT = { Hoch: 0, Mittel: 1, Niedrig: 2 }

export function prioGewicht(prioritaet) {
  return PRIO_GEWICHT[prioritaet] ?? 1
}

// `anzahl` Termine gleichmäßig auf die verfügbare Zeit verteilen: bis zwei
// Tage vor der Deadline (Puffer) oder – ohne Deadline – im Wochenrhythmus.
// Der erste Termin liegt frühestens morgen.
export function verteilteDaten(anzahl, deadline) {
  if (anzahl <= 0) return []
  const tage =
    deadline && deadline > heute()
      ? Math.max(1, tageBisZahl(deadline) - 2)
      : anzahl * 7
  return Array.from({ length: anzahl }, (_, i) =>
    inTagen(Math.max(1, Math.round(((i + 1) * tage) / anzahl)))
  )
}

// Schritte für alle noch nicht eingeplanten Inhalte eines Projekts. Mit
// `nurIds` lässt sich ein einzelner Inhalt nachträglich einplanen.
// Reihenfolge: hohe Priorität zuerst – so liegt das Wichtige vorn.
export function erzeugeSchritte(projekt, ablage, todos, nurIds = null) {
  const inhalte = ablage
    .filter((e) => gehoertZu(e, projekt.id))
    .filter((e) => !nurIds || nurIds.includes(e.id))
    .sort((a, b) => prioGewicht(a.prioritaet) - prioGewicht(b.prioritaet))

  const projektTodos = todos.filter((t) => gehoertZu(t, projekt.id))
  const neu = inhalte.filter(
    (thema) =>
      !projektTodos.some(
        (t) => t.inhaltId === thema.id || t.text === schrittText(thema.titel)
      )
  )
  if (neu.length === 0) return []

  const daten = verteilteDaten(neu.length, projekt.deadline)
  const basisId = Date.now()
  return neu.map((thema, i) => ({
    id: basisId + i,
    projektId: projekt.id,
    // Markierung für die Lern-Übersicht: so bleiben die Schritte auch dann
    // erkennbar, wenn ihr Text später geändert wird.
    lernplan: true,
    inhaltId: thema.id,
    text: schrittText(thema.titel),
    datum: daten[i],
    wichtig: thema.prioritaet === "Hoch",
    dringend: false,
    erledigt: false,
  }))
}

// Offene Schritte neu über die verbleibende Zeit verteilen (z.B. nachdem die
// Deadline verschoben wurde oder etwas liegen geblieben ist). Erledigte
// Schritte bleiben unangetastet; die bisherige Reihenfolge bleibt erhalten.
export function neuVerteilt(offene, deadline) {
  const daten = verteilteDaten(offene.length, deadline)
  return offene.map((s, i) => ({ ...s, datum: daten[i] }))
}

// Kennzahlen über alle Lernpläne zusammen – für die Kopfzeile der Übersicht.
export function lernplanSumme(plaene) {
  return plaene.reduce(
    (s, p) => ({
      plaene: s.plaene + (p.gesamt > 0 ? 1 : 0),
      schritte: s.schritte + p.gesamt,
      erledigt: s.erledigt + p.erledigt,
      offen: s.offen + p.offene.length,
      ueberfaellig: s.ueberfaellig + p.ueberfaellig,
      heuteFaellig: s.heuteFaellig + p.heuteFaellig,
    }),
    {
      plaene: 0,
      schritte: 0,
      erledigt: 0,
      offen: 0,
      ueberfaellig: 0,
      heuteFaellig: 0,
    }
  )
}
