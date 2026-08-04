// Lebensbereich „Vitalität": ein täglicher Check-in als eigener Sensor.
//
// Grundidee (angelehnt an „jedes Modul ist ein Sensor"): Vitalität schreibt
// jeden Tag ein paar ehrliche Werte in einen Store, den der Mentor
// (lib/insights.js) zusammen mit Habits, Fokus und Finanzen quer auslesen
// kann. Ohne diese Werte fehlt dem Mentor die „Recovery"-Achse.
//
// Datenhaltung (über useStored, also lokal + Cloud-Sync):
//   vitalitaet  [{ datum, schlaf, energie, stimmung, bewegung, gewicht,
//                  notiz, erstelltAm, aktualisiertAm }]
//   – ein Eintrag je Tag (datum "JJJJ-MM-TT" ist der Schlüssel).

// 1–5-Skalen mit ehrlichen Ankern statt bloßer Zahlen. Index 0 bleibt frei,
// damit skala[wert] direkt passt (wert ∈ 1..5).
export const ENERGIE_SKALA = [
  null,
  { wert: 1, label: "Leer", emoji: "🪫", farbe: "rose" },
  { wert: 2, label: "Müde", emoji: "😮‍💨", farbe: "amber" },
  { wert: 3, label: "Okay", emoji: "😐", farbe: "amber" },
  { wert: 4, label: "Wach", emoji: "🙂", farbe: "cyan" },
  { wert: 5, label: "Voller Saft", emoji: "⚡", farbe: "emerald" },
]

export const STIMMUNG_SKALA = [
  null,
  { wert: 1, label: "Mies", emoji: "😞", farbe: "rose" },
  { wert: 2, label: "Flau", emoji: "😕", farbe: "amber" },
  { wert: 3, label: "Neutral", emoji: "😐", farbe: "amber" },
  { wert: 4, label: "Gut", emoji: "😊", farbe: "cyan" },
  { wert: 5, label: "Top", emoji: "😄", farbe: "emerald" },
]

// Schwellen, ab denen wir Schlaf als „gut" bzw. „knapp" werten. Bewusst
// konservativ – der Mentor nutzt sie für die Schlaf↔Energie-Korrelation.
export const SCHLAF_GUT = 7 // Stunden
export const SCHLAF_KNAPP = 6

// Leeres Tagesgerüst für einen neuen Check-in.
export function leererEintrag(datum) {
  return {
    datum,
    schlaf: null, // Stunden (Zahl)
    energie: null, // 1–5
    stimmung: null, // 1–5
    bewegung: false, // hat sich heute bewegt / trainiert
    gewicht: null, // kg (optional)
    notiz: "",
    erstelltAm: Date.now(),
    aktualisiertAm: Date.now(),
  }
}

// Eintrag eines bestimmten Tages finden (oder undefined).
export function eintragVon(vitalitaet, datum) {
  return vitalitaet.find((e) => e.datum === datum)
}

// Ein Check-in gilt als „ausgefüllt", sobald mindestens ein Kernwert gesetzt
// ist. Reine Leer-Gerüste zählen nicht (z. B. für Streak/Statistik).
export function istAusgefuellt(e) {
  if (!e) return false
  return (
    e.energie != null ||
    e.stimmung != null ||
    e.schlaf != null ||
    e.bewegung === true ||
    e.gewicht != null ||
    (e.notiz ?? "").trim() !== ""
  )
}

// Durchschnitt eines Feldes über eine Eintragsliste (nur gesetzte Werte).
// Gibt null zurück, wenn keine verwertbaren Werte vorliegen.
export function durchschnitt(eintraege, feld) {
  const werte = eintraege
    .map((e) => e[feld])
    .filter((v) => typeof v === "number" && Number.isFinite(v))
  if (werte.length === 0) return null
  return werte.reduce((s, v) => s + v, 0) / werte.length
}

// Zahl mit einer Nachkommastelle (deutsch), z. B. 3.5 → „3,5".
export function eineStelle(zahl) {
  if (zahl == null) return "–"
  return zahl.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}
