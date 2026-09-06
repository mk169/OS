import { heute, inTagen } from "./datum"
import { istFaellig } from "./spacedRepetition"

// Kennzahlen über einen Kartenstapel – im Stil von Ankis Statistik.

// Reifegrad der Karten:
//   neu  – noch nie erfolgreich wiederholt (oder Intervall 0)
//   jung – im Aufbau, Intervall 1–20 Tage
//   reif – gefestigt, Intervall ≥ 21 Tage
export function kartenReife(karten) {
  let neu = 0
  let jung = 0
  let reif = 0
  for (const k of karten) {
    const iv = k.intervall ?? 0
    if ((k.wiederholungen ?? 0) === 0 || iv === 0) neu++
    else if (iv < 21) jung++
    else reif++
  }
  return { neu, jung, reif, gesamt: karten.length }
}

// Prognose der fälligen Karten je Tag für die nächsten `tage` Tage. Tag 0
// enthält alle heute fälligen (inkl. überfälliger und neuer) Karten.
export function faelligForecast(karten, tage = 7) {
  const heuteK = heute()
  const liste = []
  for (let i = 0; i < tage; i++) {
    const key = i === 0 ? heuteK : inTagen(i)
    const anzahl =
      i === 0
        ? karten.filter(istFaellig).length
        : karten.filter((k) => k.faellig === key).length
    liste.push({ key, anzahl })
  }
  return liste
}

// Rückblick statt Prognose: wie viele Karten wurden an den letzten `tage`
// Tagen bewertet (Store „lernprotokoll")? Ältester Tag zuerst.
export function lernVerlauf(protokoll, tage = 14) {
  const liste = []
  for (let i = tage - 1; i >= 0; i--) {
    const key = i === 0 ? heute() : inTagen(-i)
    liste.push({ key, anzahl: protokoll?.[key] ?? 0 })
  }
  return liste
}

// Aktuelle Lern-Serie in Tagen: ununterbrochene Tage mit mindestens einer
// bewerteten Karte. Ein noch nicht gelernter heutiger Tag bricht die Serie
// nicht ab – sie zählt dann ab gestern.
export function lernStreak(protokoll, maxTage = 365) {
  if (!protokoll) return 0
  let streak = 0
  for (let i = 0; i < maxTage; i++) {
    const key = i === 0 ? heute() : inTagen(-i)
    if ((protokoll[key] ?? 0) > 0) streak++
    else if (i > 0) break
  }
  return streak
}

// Kartenstapel je Projekt: Anzahl, fällige Karten und Reifegrad – die
// Grundlage der Karteikarten-Übersicht. Karten ohne (existierendes) Projekt
// landen gesammelt unter „Ohne Projekt".
export function kartenNachProjekt(karten, projekte) {
  const namen = new Map(projekte.map((p) => [p.id, p.name]))
  const gruppen = new Map()

  for (const k of karten) {
    const id = k.projektId ?? k.kursId ?? null
    const schluessel = namen.has(id) ? id : "ohne"
    if (!gruppen.has(schluessel))
      gruppen.set(schluessel, {
        projektId: schluessel === "ohne" ? null : schluessel,
        name: schluessel === "ohne" ? "Ohne Projekt" : namen.get(id),
        karten: [],
      })
    gruppen.get(schluessel).karten.push(k)
  }

  return [...gruppen.values()]
    .map((g) => ({
      projektId: g.projektId,
      name: g.name,
      gesamt: g.karten.length,
      faellig: g.karten.filter(istFaellig).length,
      reife: kartenReife(g.karten),
    }))
    .sort(
      (a, b) =>
        b.faellig - a.faellig ||
        b.gesamt - a.gesamt ||
        (a.name ?? "").localeCompare(b.name ?? "")
    )
}
