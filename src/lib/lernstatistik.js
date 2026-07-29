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
