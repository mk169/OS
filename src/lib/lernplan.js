import { heute } from "./datum"

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
