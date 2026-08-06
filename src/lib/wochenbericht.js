import { montagVon, wochenSchluessel } from "./datum"

// Wochenabschluss: Am Ende einer Woche wird festgehalten, was sie enthielt –
// erledigte Aufgaben, Fokuszeit, Habits und das Wochenziel der Periode. Die
// erledigten Todos werden dabei aus der Liste genommen (sie sind erledigt,
// ihr Wert steckt im Bericht), sodass die Todo-Liste wieder nur zeigt, was
// noch aussteht.
//
// Ein Bericht im Store `wochenberichte`:
//   { woche: "JJJJ-MM-TT" (Montag), von, bis, erstelltAm,
//     todos: [{ text, projekt, datum }], fokusMinuten, fokusSessions,
//     habits: { erreicht, gesamt }, wochenziel: { text, erledigt, gesamt },
//     notiz }

export function wochenStartVon(datum = new Date()) {
  return wochenSchluessel(datum)
}

// Sonntag (letzter Tag) der Woche, die mit `montagKey` beginnt.
export function wochenEndeVon(montagKey) {
  const d = new Date(montagKey)
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Die zuletzt abgeschlossene Woche liegt hinter uns: Vorschlag zum Abschließen
// ist immer die laufende Woche (ab Sonntag) bzw. jede noch offene Woche davor.
export function letzteWoche(datum = new Date()) {
  const m = montagVon(datum)
  m.setDate(m.getDate() - 7)
  return wochenSchluessel(m)
}

export function istSonntag(datum = new Date()) {
  return datum.getDay() === 0
}

// Kalenderwoche (ISO) für die Beschriftung.
export function kalenderwoche(montagKey) {
  const d = new Date(montagKey)
  const donnerstag = new Date(d)
  donnerstag.setDate(d.getDate() + 3)
  const jahresstart = new Date(donnerstag.getFullYear(), 0, 1)
  const tage = Math.round((donnerstag - jahresstart) / 86_400_000)
  return Math.floor(tage / 7) + 1
}

function imZeitraum(datum, von, bis) {
  return typeof datum === "string" && datum >= von && datum <= bis
}

// Stellt den Bericht einer Woche aus den vorhandenen Daten zusammen. Reine
// Rechnung ohne Seiteneffekte – das Speichern und Aufräumen macht der Aufrufer.
export function baueBericht({
  woche,
  todos = [],
  deepwork = [],
  habits = [],
  zyklen = [],
  wochenZielErreicht,
}) {
  const von = woche
  const bis = wochenEndeVon(woche)

  // Erledigte Todos der Woche: alles, was ein Datum in der Woche hat, plus
  // erledigte ohne Datum (die sonst nie in einem Bericht landen würden).
  const erledigt = todos.filter((t) => t.erledigt)
  const derWoche = erledigt.filter(
    (t) => !t.datum || imZeitraum(t.datum, von, bis)
  )

  const sessions = deepwork.filter((s) => imZeitraum(s.datum, von, bis))
  const fokusMinuten = sessions.reduce(
    (summe, s) => summe + (Number(s.minuten) || 0),
    0
  )

  const habitBilanz =
    typeof wochenZielErreicht === "function" && habits.length > 0
      ? {
          erreicht: habits.filter((h) => wochenZielErreicht(h, new Date(von)))
            .length,
          gesamt: habits.length,
        }
      : { erreicht: 0, gesamt: 0 }

  // Wochenziel aus einer Periode, die diese Woche enthält.
  let wochenziel = null
  for (const z of zyklen) {
    const treffer = (z.wochen ?? []).find((w) => w.start === woche)
    if (treffer) {
      const unter = treffer.unterziele ?? []
      wochenziel = {
        text: treffer.text ?? "",
        erledigt: unter.filter((u) => u.erledigt).length,
        gesamt: unter.length,
        periode: z.titel ?? "",
      }
      break
    }
  }

  return {
    woche,
    von,
    bis,
    erstelltAm: Date.now(),
    todos: derWoche.map((t) => ({
      id: t.id,
      text: t.text,
      datum: t.datum ?? "",
      projektId: t.projektId ?? t.kursId ?? null,
    })),
    fokusMinuten,
    fokusSessions: sessions.length,
    habits: habitBilanz,
    wochenziel,
    notiz: "",
  }
}

export function fokusText(minuten) {
  if (!minuten) return "0 Min"
  if (minuten < 60) return `${minuten} Min`
  const std = Math.floor(minuten / 60)
  const rest = minuten % 60
  return rest === 0 ? `${std} Std` : `${std} Std ${rest} Min`
}
