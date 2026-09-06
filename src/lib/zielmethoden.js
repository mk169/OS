// Methoden zur Zielformulierung.
//
// Eine Fokus-Periode hatte bisher ein Feld „Ziel" und darunter ein Textfeld
// pro Vorhaben. Das ist ehrlich, aber es hilft nicht dabei, aus „mehr Sport"
// ein Ziel zu machen, an dem man am Ende ablesen kann, ob man es erreicht
// hat. Diese Datei stellt vier erprobte Methoden bereit, aus denen sich pro
// Ziel eine wählen lässt:
//
//   frei   Ein Satz, wie bisher. Bleibt die Vorgabe.
//   smart  Spezifisch, Messbar, Attraktiv, Realistisch, Terminiert.
//          Fünf kurze Felder, die zusammen den Zielsatz ergeben.
//   okr    Ein Objective und 2–4 Key Results mit Zahl und Fortschritt.
//          Passt zu Zwischenphasen, weil der Zeitraum die Messperiode ist.
//   woop   Wunsch, Ergebnis, Hindernis, Plan. Für Ziele, an denen man
//          erfahrungsgemäß scheitert – aus dem Hindernis wird ein
//          Wenn-dann-Satz, den man vorher festlegt statt im Moment.
//
// Für das Zusammenstellen der Ziele einer ganzen Periode gibt es zusätzlich
// die 5/25-Regel (weiter unten): 25 sammeln, 5 wählen, die anderen 20
// ausdrücklich stehen lassen.
//
// Ein Ziel im Store `zyklen` sieht damit so aus:
//   { id, text, schritte: [], phaseId?, methode?: "smart"|"okr"|"woop",
//     smart?: { spezifisch, messbar, attraktiv, realistisch, terminiert },
//     keyResults?: [{ id, text, start, ziel, ist, einheit }],
//     woop?: { wunsch, ergebnis, hindernis, plan } }
// Fehlt `methode`, ist es ein freies Ziel wie bisher – alte Perioden
// bleiben also unverändert gültig.

export const METHODEN = [
  {
    key: "frei",
    label: "Frei",
    kurz: "Ein Satz",
    beschreibung: "Ein Satz, mehr nicht. Gut für Selbstverständliches.",
  },
  {
    key: "smart",
    label: "SMART",
    kurz: "Fünf Kriterien",
    beschreibung:
      "Spezifisch, Messbar, Attraktiv, Realistisch, Terminiert – fünf kurze Felder ergeben den Zielsatz.",
  },
  {
    key: "okr",
    label: "OKR",
    kurz: "Ziel + Kennzahlen",
    beschreibung:
      "Ein Ziel und 2–4 messbare Key Results. Der Fortschritt ergibt sich aus den Zahlen.",
  },
  {
    key: "woop",
    label: "WOOP",
    kurz: "Wenn-dann-Plan",
    beschreibung:
      "Wunsch, Ergebnis, Hindernis, Plan. Für Vorhaben, an denen du schon einmal gescheitert bist.",
  },
]

export function methodeVon(key) {
  return METHODEN.find((m) => m.key === key) ?? METHODEN[0]
}

/* ── SMART ──────────────────────────────────────────────────────────────── */

export const SMART_FELDER = [
  {
    key: "spezifisch",
    buchstabe: "S",
    label: "Spezifisch",
    frage: "Was genau willst du tun?",
    platzhalter: "Die Einleitung der Bachelorarbeit schreiben",
    hinweis: "Noch zu vage – was genau tust du?",
  },
  {
    key: "messbar",
    buchstabe: "M",
    label: "Messbar",
    frage: "Woran misst du, dass es erreicht ist?",
    platzhalter: "8 Seiten, Rohfassung steht",
    hinweis: "Ohne Zahl oder klaren Endpunkt bleibt offen, wann du fertig bist.",
  },
  {
    key: "attraktiv",
    buchstabe: "A",
    label: "Attraktiv",
    frage: "Warum ist es dir wichtig?",
    platzhalter: "Danach läuft der Rest der Arbeit von allein",
    hinweis: "Ohne Grund fällt ein Ziel bei der ersten Störung um.",
  },
  {
    key: "realistisch",
    buchstabe: "R",
    label: "Realistisch",
    frage: "Was macht es in dieser Periode machbar?",
    platzhalter: "3 Vormittage pro Woche sind frei",
    hinweis: "Prüfe, ob die Zeit dafür in dieser Periode wirklich da ist.",
  },
  {
    key: "terminiert",
    buchstabe: "T",
    label: "Terminiert",
    frage: "Bis wann?",
    platzhalter: "bis zum Ende der Phase „Rohfassung“",
    hinweis: "Ohne Termin verschiebt sich ein Ziel bis ans Periodenende.",
  },
]

export function smartFelder(ziel) {
  return ziel?.smart ?? {}
}

// Enthält der Text eine Zahl? Grundlage der Messbarkeits-Heuristik: „drei
// Kapitel" zählt genauso wie „3 Kapitel".
const ZAHLWOERTER =
  /\b(ein|eine|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|zwölf|zwanzig|dreißig|fünfzig|hundert)\b/iu

function hatZahl(text) {
  return /\d/.test(text) || ZAHLWOERTER.test(text)
}

// Wörter, die ein Ziel unspezifisch machen: Sie beschreiben eine Richtung,
// aber keinen Zustand, den man erreichen kann.
const VAGE = /\b(mehr|weniger|besser|irgendwie|etwas|mal|öfter|regelmäßig)\b/iu

// Prüft ein Ziel gegen die fünf SMART-Kriterien. Sind die SMART-Felder
// gefüllt, zählt deren Inhalt; sonst wird der freie Zieltext geprüft, so
// gut das ohne Sprachverständnis geht. Das Ergebnis ist ein Hinweis, kein
// Urteil – die Entscheidung bleibt beim Nutzer.
export function smartPruefung(ziel) {
  const felder = smartFelder(ziel)
  const text = (ziel?.text ?? "").trim()
  const hatTermin = Boolean(ziel?.phaseId) || Boolean(felder.terminiert?.trim())

  return SMART_FELDER.map((f) => {
    const wert = (felder[f.key] ?? "").trim()
    let erfuellt = wert.length > 0
    if (!erfuellt) {
      // Aus dem freien Zieltext ableiten, was sich ableiten lässt.
      if (f.key === "spezifisch") {
        erfuellt = text.split(/\s+/).filter(Boolean).length >= 3 && !VAGE.test(text)
      } else if (f.key === "messbar") {
        erfuellt = hatZahl(text)
      } else if (f.key === "terminiert") {
        erfuellt = hatTermin
      }
    }
    return { ...f, wert, erfuellt }
  })
}

export function smartWert(ziel) {
  return smartPruefung(ziel).filter((f) => f.erfuellt).length
}

// Baut aus den SMART-Feldern einen Zielsatz. Er landet im normalen
// `text`-Feld, damit ein SMART-Ziel überall dort auftaucht, wo Ziele
// auftauchen – in der Übersicht, im Wochenrückblick, in der Suche.
export function smartSatz(felder = {}) {
  const teile = []
  if (felder.spezifisch?.trim()) teile.push(felder.spezifisch.trim())
  if (felder.messbar?.trim()) teile.push(`(${felder.messbar.trim()})`)
  if (felder.terminiert?.trim()) teile.push(`bis ${felder.terminiert.trim()}`)
  return teile.join(" ")
}

/* ── OKR ────────────────────────────────────────────────────────────────── */

export function keyResults(ziel) {
  return ziel?.keyResults ?? []
}

// Fortschritt eines Key Results als Anteil zwischen 0 und 1. `start` ist der
// Ausgangswert (meist 0), `ziel` der angestrebte. Ein Key Result, dessen
// Zielwert gleich dem Startwert ist, hat keinen Fortschritt – sonst würde
// durch null geteilt.
export function krFortschritt(kr) {
  // Ohne gesetzten Zielwert gibt es nichts zu messen. Das ist der Normalfall
  // eines frisch angelegten Key Results – es darf nicht als „erreicht"
  // durchgehen, nur weil Start und Ziel beide leer sind.
  if (kr?.ziel == null || kr.ziel === "") return 0
  const start = Number(kr.start ?? 0)
  const ziel = Number(kr.ziel)
  const ist = Number(kr.ist ?? 0)
  if (!Number.isFinite(start) || !Number.isFinite(ziel) || !Number.isFinite(ist)) {
    return 0
  }
  // Gleicher Start- und Zielwert: ein Halte-Ziel („bleib bei 5"). Erfüllt,
  // sobald der Istwert ihn erreicht.
  if (ziel === start) return ist >= ziel ? 1 : 0
  const anteil = (ist - start) / (ziel - start)
  return Math.min(1, Math.max(0, anteil))
}

// Fortschritt eines OKR-Ziels: der Mittelwert seiner Key Results. Ohne Key
// Results gibt es keinen Fortschritt zu berechnen – dann null, damit die
// Oberfläche „noch nichts gemessen" von „0 %" unterscheiden kann.
export function okrFortschritt(ziel) {
  const krs = keyResults(ziel)
  if (krs.length === 0) return null
  const summe = krs.reduce((s, kr) => s + krFortschritt(kr), 0)
  return summe / krs.length
}

export function okrErreicht(ziel) {
  const wert = okrFortschritt(ziel)
  return wert != null && wert >= 1
}

/* ── WOOP ───────────────────────────────────────────────────────────────── */

export const WOOP_FELDER = [
  {
    key: "wunsch",
    label: "Wunsch",
    frage: "Was willst du in dieser Periode erreichen?",
    platzhalter: "Dreimal pro Woche laufen gehen",
  },
  {
    key: "ergebnis",
    label: "Ergebnis",
    frage: "Wie fühlt es sich an, wenn es geklappt hat?",
    platzhalter: "Abends klarer im Kopf, Treppe ohne Puste",
  },
  {
    key: "hindernis",
    label: "Hindernis",
    frage: "Was hält dich in dir selbst davon ab?",
    platzhalter: "Nach der Uni bin ich zu müde und bleibe sitzen",
  },
  {
    key: "plan",
    label: "Plan",
    frage: "Was tust du, wenn genau das eintritt?",
    platzhalter: "ziehe ich die Schuhe an und gehe zehn Minuten – mehr muss nicht",
  },
]

export function woopFelder(ziel) {
  return ziel?.woop ?? {}
}

// Der Kern der Methode: ein vorab festgelegter Wenn-dann-Satz. Er ist
// wirksamer als ein Vorsatz, weil im Moment des Hindernisses nichts mehr
// entschieden werden muss.
export function woopPlanSatz(woop = {}) {
  const hindernis = (woop.hindernis ?? "").trim()
  const plan = (woop.plan ?? "").trim()
  if (!hindernis || !plan) return ""
  return `Wenn ${hindernis}, dann ${plan}.`
}

export function woopVollstaendig(woop = {}) {
  return WOOP_FELDER.every((f) => (woop[f.key] ?? "").trim().length > 0)
}

/* ── 5/25-Regel ─────────────────────────────────────────────────────────── */

// Die Übung, die Warren Buffett zugeschrieben wird: 25 Ziele aufschreiben,
// die fünf wichtigsten auswählen – und die anderen zwanzig nicht etwa
// „später" machen, sondern bewusst liegen lassen. Genau dieses Liegenlassen
// ist der Punkt: Es sind die zwanzig, die einen sonst von den fünf
// abhalten. Deshalb verschwinden sie hier nicht, sondern stehen als
// „Nicht jetzt"-Liste sichtbar in der Periode.

export const FUENF25_SAMMELN = 25
export const FUENF25_WAEHLEN = 5

export function fuenf25Status(kandidaten = []) {
  const gefuellt = kandidaten.filter((k) => (k.text ?? "").trim().length > 0)
  const gewaehlt = gefuellt.filter((k) => k.gewaehlt)
  return {
    gesammelt: gefuellt.length,
    gewaehlt: gewaehlt.length,
    offen: Math.max(0, FUENF25_WAEHLEN - gewaehlt.length),
    // Weitermachen darf man, sobald überhaupt gewählt wurde – die 25 sind
    // ein Richtwert, kein Türsteher.
    bereit: gewaehlt.length > 0,
    zuViele: gewaehlt.length > FUENF25_WAEHLEN,
  }
}

// Teilt die Kandidaten in die gewählten Ziele und die „Nicht jetzt"-Liste.
export function fuenf25Aufteilen(kandidaten = []) {
  const gefuellt = kandidaten.filter((k) => (k.text ?? "").trim().length > 0)
  return {
    ziele: gefuellt.filter((k) => k.gewaehlt).map((k) => k.text.trim()),
    nichtJetzt: gefuellt.filter((k) => !k.gewaehlt).map((k) => k.text.trim()),
  }
}

export function nichtJetzt(zyklus) {
  return zyklus?.nichtJetzt ?? []
}
