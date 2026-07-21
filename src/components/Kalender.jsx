import { useState } from "react"
import { heute } from "../lib/datum"

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

export const EINTRAG_TYPEN = {
  termin: { chip: "bg-blue-50 text-blue-700", punkt: "bg-blue-500", name: "Termin" },
  fokus: { chip: "bg-violet-50 text-violet-700", punkt: "bg-violet-500", name: "Fokus" },
  pruefung: { chip: "bg-red-50 text-red-600", punkt: "bg-red-500", name: "Prüfung" },
  aufgabe: { chip: "bg-gray-100 text-gray-600", punkt: "bg-gray-400", name: "Aufgabe" },
  projekt: { chip: "bg-emerald-50 text-emerald-700", punkt: "bg-emerald-500", name: "Projekt" },
  schritt: { chip: "bg-gray-100 text-gray-600", punkt: "bg-gray-400", name: "Schritt" },
}

export function schluessel(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function datumLang(key) {
  const d = new Date(key)
  return `${WOCHENTAGE[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`
}

function montagVon(d) {
  const kopie = new Date(d)
  kopie.setDate(kopie.getDate() - ((kopie.getDay() + 6) % 7))
  return kopie
}

// Wiederverwendbarer Kalender mit Tages-, Wochen- und Monatsansicht.
// eintraegeAm(key) liefert die Einträge eines Tages:
//   { typ, label, zeit?, onRemove? }
// tagesdetail: Google-Stil – Tag im Monat antippen wählt ihn aus und
// zeigt sein Zeitraster unter dem Monatsraster.
export default function Kalender({
  eintraegeAm,
  legende = [],
  onNeu,
  tagesdetail = false,
}) {
  const [ansicht, setAnsicht] = useState("monat")
  const [cursor, setCursor] = useState(heute())
  const [auswahl, setAuswahl] = useState(heute())
  const heuteKey = heute()
  const cursorDate = new Date(cursor)

  function blaettern(richtung) {
    const d = new Date(cursor)
    if (ansicht === "monat") d.setMonth(d.getMonth() + richtung)
    else if (ansicht === "woche") d.setDate(d.getDate() + richtung * 7)
    else d.setDate(d.getDate() + richtung)
    setCursor(schluessel(d))
  }

  const titel =
    ansicht === "monat"
      ? `${MONATE[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`
      : ansicht === "woche"
        ? `Woche ab ${datumLang(schluessel(montagVon(cursorDate)))}`
        : datumLang(cursor)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold tracking-tight text-gray-900">
          {titel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
            {[
              { key: "tag", label: "Tag" },
              { key: "woche", label: "Woche" },
              { key: "monat", label: "Monat" },
            ].map((a) => (
              <button
                key={a.key}
                onClick={() => setAnsicht(a.key)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  ansicht === a.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCursor(heuteKey)}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Heute
          </button>
          <button
            onClick={() => blaettern(-1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            ‹
          </button>
          <button
            onClick={() => blaettern(1)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            ›
          </button>
          {onNeu && (
            <button
              onClick={() => onNeu(ansicht === "tag" ? cursor : heuteKey)}
              className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
            >
              + Neu
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {ansicht === "monat" && (
          <MonatsAnsicht
            cursorDate={cursorDate}
            heuteKey={heuteKey}
            auswahl={tagesdetail ? auswahl : null}
            eintraegeAm={eintraegeAm}
            onTagKlick={(key) => {
              if (tagesdetail) {
                setAuswahl(key)
              } else {
                setCursor(key)
                setAnsicht("tag")
              }
            }}
          />
        )}
        {tagesdetail && ansicht === "monat" && (
          <TagesDetail
            auswahl={auswahl}
            heuteKey={heuteKey}
            eintraegeAm={eintraegeAm}
            onNeu={onNeu}
          />
        )}
        {ansicht === "woche" && (
          <WochenAnsicht
            cursorDate={cursorDate}
            heuteKey={heuteKey}
            eintraegeAm={eintraegeAm}
            onTagKlick={(key) => {
              setCursor(key)
              setAnsicht("tag")
            }}
          />
        )}
        {ansicht === "tag" && (
          <TagesAnsicht cursor={cursor} eintraegeAm={eintraegeAm} onNeu={onNeu} />
        )}
      </div>

      {legende.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          {legende.map((typ) => (
            <span key={typ} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${EINTRAG_TYPEN[typ].punkt}`} />
              {EINTRAG_TYPEN[typ].name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Monatsraster im Google-Stil: keine Zellen-Boxen, nur feine Zeilen-
// Hairlines; Tageszahl zentriert, Einträge als bis zu 3 farbige Punkte.
function MonatsAnsicht({ cursorDate, heuteKey, auswahl, eintraegeAm, onTagKlick }) {
  const jahr = cursorDate.getFullYear()
  const monat = cursorDate.getMonth()
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate()
  const startOffset = (new Date(jahr, monat, 1).getDay() + 6) % 7

  const zellen = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: tageImMonat }, (_, i) => i + 1),
  ]
  while (zellen.length % 7 !== 0) zellen.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {WOCHENTAGE.map((w) => (
          <div key={w} className="pb-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {zellen.map((tag, i) => {
          const hairline = i >= 7 ? "border-t border-gray-100" : ""
          if (tag == null)
            return <div key={`leer-${i}`} className={`h-14 ${hairline}`} />
          const key = `${jahr}-${String(monat + 1).padStart(2, "0")}-${String(tag).padStart(2, "0")}`
          const eintraege = eintraegeAm(key)
          const istHeute = key === heuteKey
          const istAuswahl = auswahl === key && !istHeute
          return (
            <button
              key={key}
              onClick={() => onTagKlick(key)}
              className={`flex h-14 flex-col items-center justify-center gap-1 transition-colors hover:bg-gray-50 ${hairline}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  istHeute
                    ? "bg-gray-900 font-medium text-white"
                    : istAuswahl
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-700"
                }`}
              >
                {tag}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {eintraege.slice(0, 3).map((e, j) => (
                  <span
                    key={j}
                    className={`h-1.5 w-1.5 rounded-full ${EINTRAG_TYPEN[e.typ].punkt}`}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Kopf + Zeitraster des ausgewählten Tags unter dem Monat (Google-Stil).
function TagesDetail({ auswahl, heuteKey, eintraegeAm, onNeu }) {
  const d = new Date(auswahl)
  const istHeute = auswahl === heuteKey
  const eintraege = eintraegeAm(auswahl)

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center gap-4 pb-2">
        <div className="flex w-12 flex-col items-center gap-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${
              istHeute ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {WOCHENTAGE[(d.getDay() + 6) % 7]}
          </span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
              istHeute
                ? "bg-gray-900 font-medium text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {d.getDate()}
          </span>
        </div>
        {eintraege.length === 0 && (
          <span className="text-sm text-gray-400">Nichts geplant.</span>
        )}
      </div>
      <TagesAnsicht cursor={auswahl} eintraegeAm={eintraegeAm} onNeu={onNeu} />
    </div>
  )
}

function WochenAnsicht({ cursorDate, heuteKey, eintraegeAm, onTagKlick }) {
  const montag = montagVon(cursorDate)

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(montag)
        d.setDate(d.getDate() + i)
        const key = schluessel(d)
        const eintraege = eintraegeAm(key)
        const istHeute = key === heuteKey
        return (
          <button
            key={key}
            onClick={() => onTagKlick(key)}
            className={`flex min-h-28 flex-col gap-1 rounded-lg border p-2 text-left transition-colors hover:border-gray-400 ${
              istHeute ? "border-gray-900" : "border-gray-200"
            }`}
          >
            <span
              className={`text-xs font-medium ${istHeute ? "text-gray-900" : "text-gray-400"}`}
            >
              {WOCHENTAGE[i]} {d.getDate()}.
            </span>
            {eintraege.map((e, j) => (
              <span
                key={j}
                className={`truncate rounded-sm px-1.5 py-0.5 text-xs ${EINTRAG_TYPEN[e.typ].chip}`}
              >
                {e.zeit && <span className="font-medium">{e.zeit} </span>}
                {e.label}
              </span>
            ))}
          </button>
        )
      })}
    </div>
  )
}

// Tagesansicht als Zeitraster (Timestacking): Einträge mit Uhrzeit werden
// als Blöcke im Tagesverlauf gestapelt, ihre Höhe entspricht der Dauer.
const TAG_START = 6
const TAG_ENDE = 22
const PX_PRO_STUNDE = 48

function TagesAnsicht({ cursor, eintraegeAm, onNeu }) {
  const eintraege = eintraegeAm(cursor)
  const ohneZeit = eintraege.filter((e) => !e.zeit)
  const mitZeit = eintraege.filter((e) => e.zeit)

  return (
    <div>
      {ohneZeit.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {ohneZeit.map((e, i) => (
            <li
              key={i}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <span
                className={`rounded px-2 py-0.5 text-xs ${EINTRAG_TYPEN[e.typ].chip}`}
              >
                {EINTRAG_TYPEN[e.typ].name}
              </span>
              <span className="flex-1 text-sm text-gray-800">{e.label}</span>
              {e.onRemove && (
                <button
                  onClick={e.onRemove}
                  title="Eintrag löschen"
                  className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        className="relative"
        style={{ height: (TAG_ENDE - TAG_START) * PX_PRO_STUNDE }}
      >
        {Array.from({ length: TAG_ENDE - TAG_START }).map((_, i) => (
          <div key={i}>
            <span
              className="absolute w-10 -translate-y-1/2 text-right text-[10px] text-gray-400"
              style={{ top: i * PX_PRO_STUNDE }}
            >
              {String(TAG_START + i).padStart(2, "0")}:00
            </span>
            <div
              className="absolute left-12 right-0 border-t border-gray-100"
              style={{ top: i * PX_PRO_STUNDE }}
            />
          </div>
        ))}

        {/* „Jetzt"-Linie mit Punkt (nur am heutigen Tag) */}
        {cursor === heute() &&
          (() => {
            const jetzt = new Date()
            const std = jetzt.getHours() + jetzt.getMinutes() / 60
            if (std < TAG_START || std > TAG_ENDE) return null
            return (
              <div
                className="pointer-events-none absolute left-12 right-0 z-10"
                style={{ top: (std - TAG_START) * PX_PRO_STUNDE }}
              >
                <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-gray-900" />
                <div className="h-px bg-gray-900" />
              </div>
            )
          })()}

        {mitZeit.map((e, i) => {
          const [h, m] = e.zeit.split(":").map(Number)
          const start = Math.max(h + m / 60, TAG_START)
          const dauer = e.dauer ?? 60
          const top = (start - TAG_START) * PX_PRO_STUNDE
          const hoehe = Math.max(24, (dauer / 60) * PX_PRO_STUNDE)
          return (
            <div
              key={i}
              className={`group absolute right-0 overflow-hidden border-l-2 border-white px-2 py-1 text-xs ${EINTRAG_TYPEN[e.typ].chip}`}
              style={{ top, height: hoehe, left: "3.25rem" }}
            >
              <span className="font-medium">
                {e.zeit}
                {e.bis ? `–${e.bis}` : ""}
              </span>{" "}
              {e.label}
              {!e.bis && <span className="ml-1 opacity-60">({dauer} Min.)</span>}
              {e.onRemove && (
                <button
                  onClick={e.onRemove}
                  title="Eintrag löschen"
                  className="pointer-events-auto absolute right-1.5 top-1 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {onNeu && (
        <button
          onClick={() => onNeu(cursor)}
          className="mt-3 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          + Eintrag an diesem Tag
        </button>
      )}
    </div>
  )
}
