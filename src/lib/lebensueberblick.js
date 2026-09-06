// Der Lebens-Überblick der Startseite.
//
// Die App hat vierzehn Bereiche, aber die Startseite zeigte bislang nur den
// Tag: Todos, Termine, Habits, Routinen, Lernen. Finanzen, Beruf, Periode,
// Vitalität und Leisure sah man nur, wenn man hinklickte – bei einer App,
// die „alles zusammenfassen" will, genau das Falsche.
//
// Diese Datei rechnet nichts Neues aus. Sie fragt die vorhandenen
// Bibliotheken (finanzen, beruf, zyklen, vitalitaet) und macht daraus eine
// Handvoll Zeilen. Alles, wozu keine Daten da sind, fällt weg: Wer keine
// Finanzen pflegt, sieht keine Finanz-Zeile.

import { geld, kontoSaldo, summeMonat, monatsSchluessel } from "./finanzen"
import { offeneFristen } from "./beruf"
import { zyklusStatus } from "./zyklen"
import { eintragVon, istAusgefuellt } from "./vitalitaet"

// Eine Zeile: `ziel` ist der Navigations-Schlüssel des Bereichs (dieselben
// Keys wie in der Hauptnavigation), `ton` nur die Farbe.
function zeile(key, label, wert, ziel, ton = "neutral") {
  return { key, label, wert, ziel, ton }
}

function finanzenZeile({ konten = [], transaktionen = [], waehrung = "EUR" }, monat) {
  if (konten.length === 0 && transaktionen.length === 0) return null

  const vermoegen = konten.reduce(
    (summe, k) => summe + kontoSaldo(k.id, k.startsaldo, transaktionen),
    0
  )
  const ausgaben = summeMonat(transaktionen, monat, "ausgabe")
  const einnahmen = summeMonat(transaktionen, monat, "einnahme")

  // Der Monatssaldo sagt mehr als der Kontostand: Er zeigt, wohin es geht.
  const saldo = einnahmen - ausgaben
  return zeile(
    "finanzen",
    konten.length > 0 ? geld(vermoegen, waehrung) : geld(saldo, waehrung),
    konten.length > 0
      ? `diesen Monat ${saldo >= 0 ? "+" : ""}${geld(saldo, waehrung)}`
      : "diesen Monat",
    "finanzen",
    saldo < 0 ? "achtung" : "gut"
  )
}

function berufZeile({ bewerbungen = [] }) {
  if (bewerbungen.length === 0) return null

  const fristen = offeneFristen(bewerbungen, 14)
  if (fristen.length === 0) {
    const offen = bewerbungen.filter((b) => b.status !== "absage").length
    if (offen === 0) return null
    return zeile(
      "beruf",
      `${offen} ${offen === 1 ? "Bewerbung" : "Bewerbungen"}`,
      "laufen gerade",
      "beruf"
    )
  }

  const naechste = fristen[0]
  const wann =
    naechste.tage < 0
      ? "überfällig"
      : naechste.tage === 0
        ? "heute fällig"
        : `in ${naechste.tage} ${naechste.tage === 1 ? "Tag" : "Tagen"}`
  return zeile(
    "beruf",
    naechste.firma?.trim() || naechste.rolle?.trim() || "Bewerbung",
    wann,
    "beruf",
    naechste.tage <= 2 ? "achtung" : "neutral"
  )
}

function periodeZeile({ zyklen = [] }) {
  const laufend = zyklen
    .map((z) => ({ zyklus: z, status: zyklusStatus(z) }))
    .find((x) => x.status.aktiv)
  if (!laufend) return null

  const { zyklus, status } = laufend
  return zeile(
    "periode",
    zyklus.titel?.trim() || zyklus.ziel?.trim() || "Fokus-Periode",
    status.tageUebrig === 0
      ? "letzter Tag"
      : `noch ${status.tageUebrig} ${status.tageUebrig === 1 ? "Tag" : "Tage"}`,
    "periode",
    status.tageUebrig <= 3 ? "achtung" : "neutral"
  )
}

function vitalitaetZeile({ vitalitaet = [] }, heuteDatum) {
  if (vitalitaet.length === 0) return null

  const eintrag = eintragVon(vitalitaet, heuteDatum)
  if (!istAusgefuellt(eintrag)) {
    return zeile("vitalitaet", "Check-in offen", "wie geht's dir heute?", "dailyops")
  }
  const teile = []
  if (eintrag.schlaf != null) teile.push(`${eintrag.schlaf} h Schlaf`)
  if (eintrag.energie != null) teile.push(`Energie ${eintrag.energie}/5`)
  if (teile.length === 0) teile.push("Check-in erledigt")
  return zeile("vitalitaet", teile[0], teile.slice(1).join(" · "), "dailyops", "gut")
}

function leisureZeile({ medien = [] }) {
  const dabei = medien.filter((m) => (m.status ?? "geplant") === "dabei")
  if (dabei.length === 0) return null
  return zeile(
    "leisure",
    dabei[0].titel,
    dabei.length > 1 ? `und ${dabei.length - 1} weitere` : "gerade dabei",
    "leisure"
  )
}

// Alle Zeilen des Überblicks, in fester Reihenfolge. Leere Bereiche fehlen.
export function lebensZeilen(daten = {}, heuteDatum) {
  const monat = monatsSchluessel(heuteDatum)
  return [
    finanzenZeile(daten, monat),
    berufZeile(daten),
    periodeZeile(daten),
    vitalitaetZeile(daten, heuteDatum),
    leisureZeile(daten),
  ].filter(Boolean)
}
