import { useState } from "react"
import {
  FUENF25_SAMMELN,
  FUENF25_WAEHLEN,
  fuenf25Aufteilen,
  fuenf25Status,
} from "../lib/zielmethoden"

// Die 5/25-Regel als geführte Übung beim Einrichten einer Periode.
//
// Der Ablauf hat zwei Schritte, und der zweite ist der eigentliche:
//   1. Sammeln – alles aufschreiben, was man in dieser Periode vorhat.
//   2. Wählen – genau fünf markieren. Die übrigen zwanzig verschwinden
//      nicht, sondern werden zur „Nicht jetzt"-Liste. Das ist der Punkt der
//      Regel: Es sind die zwanzig, die einen von den fünf abhalten, und
//      genau deshalb müssen sie sichtbar bleiben.
//
// Das Ergebnis übernimmt der Aufrufer: die fünf als Periodenziele, die
// übrigen als `nichtJetzt` am Zyklus.

export default function Fuenf25({ onUebernehmen, onAbbrechen, neueId }) {
  const [schritt, setSchritt] = useState("sammeln")
  const [kandidaten, setKandidaten] = useState(() => [
    { id: neueId(), text: "", gewaehlt: false },
  ])

  const status = fuenf25Status(kandidaten)

  function setzeText(id, text) {
    const neu = kandidaten.map((k) => (k.id === id ? { ...k, text } : k))
    // Immer genau eine leere Zeile am Ende, solange noch Platz ist.
    const letzte = neu[neu.length - 1]
    if (letzte.text.trim() && neu.length < FUENF25_SAMMELN) {
      neu.push({ id: neueId(), text: "", gewaehlt: false })
    }
    setKandidaten(neu)
  }

  function toggle(id) {
    setKandidaten(
      kandidaten.map((k) => (k.id === id ? { ...k, gewaehlt: !k.gewaehlt } : k))
    )
  }

  function uebernehmen() {
    onUebernehmen(fuenf25Aufteilen(kandidaten))
  }

  const gefuellt = kandidaten.filter((k) => k.text.trim())

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">5/25-Regel</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
          {schritt === "sammeln"
            ? `Schreib auf, was du dir für diese Periode vornimmst – bis zu ${FUENF25_SAMMELN} Punkte. Noch ohne zu sortieren.`
            : `Markiere die ${FUENF25_WAEHLEN} wichtigsten. Der Rest kommt nicht auf „später“, sondern auf „nicht jetzt“ – das sind die Punkte, die dich sonst von den fünf abhalten.`}
        </p>
      </div>

      {schritt === "sammeln" ? (
        <>
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {kandidaten.map((k, i) => (
              <div key={k.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-gray-300">
                  {i + 1}
                </span>
                <input
                  value={k.text}
                  onChange={(e) => setzeText(k.id, e.target.value)}
                  placeholder={i === 0 ? "z.B. Bachelorarbeit abgeben" : ""}
                  className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-900 placeholder:text-gray-300"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">
              {status.gesammelt} von {FUENF25_SAMMELN} gesammelt
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAbbrechen}
                className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={status.gesammelt === 0}
                onClick={() => setSchritt("waehlen")}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
              >
                Weiter zum Wählen
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {gefuellt.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => toggle(k.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${
                    k.gewaehlt
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] ${
                      k.gewaehlt ? "border-white" : "border-gray-300"
                    }`}
                  >
                    {k.gewaehlt ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{k.text}</span>
                </button>
              </li>
            ))}
          </ul>

          <p
            className={`text-xs ${
              status.zuViele ? "text-amber-600" : "text-gray-400"
            }`}
          >
            {status.zuViele
              ? `${status.gewaehlt} gewählt – die Regel lebt davon, dass es fünf bleiben. Du entscheidest.`
              : status.offen > 0
                ? `${status.gewaehlt} von ${FUENF25_WAEHLEN} gewählt – noch ${status.offen} frei.`
                : `${FUENF25_WAEHLEN} gewählt. Die übrigen ${
                    status.gesammelt - status.gewaehlt
                  } kommen auf „nicht jetzt“.`}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSchritt("sammeln")}
              className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
            >
              Zurück
            </button>
            <button
              type="button"
              disabled={!status.bereit}
              onClick={uebernehmen}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              Als Periodenziele übernehmen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Die „Nicht jetzt"-Liste in der Periodenübersicht. Sie ist kein Archiv,
// sondern eine Erinnerung: Das hier ist bewusst nicht dran.
export function NichtJetztListe({ eintraege, onEntfernen, ohneKopf = false }) {
  if (!eintraege || eintraege.length === 0) return null
  return (
    <div>
      {!ohneKopf && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Nicht jetzt · {eintraege.length}
        </p>
      )}
      <p className={`text-xs text-gray-400 ${ohneKopf ? "" : "mt-0.5"}`}>
        Bewusst liegen gelassen – das ist der Sinn der 5/25-Regel.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {eintraege.map((text, i) => (
          <li
            key={`${text}-${i}`}
            className="group flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500"
          >
            {text}
            {onEntfernen && (
              <button
                type="button"
                onClick={() => onEntfernen(i)}
                title="Von der Liste nehmen"
                className="text-gray-300 transition-colors hover:text-gray-700"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
