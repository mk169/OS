import { useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  bewerteKarte,
  intervallText,
  parseAnkiExport,
} from "../lib/spacedRepetition"

export default function ProjektKarten({ projekt }) {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [vorne, setVorne] = useState("")
  const [hinten, setHinten] = useState("")
  const [lernModus, setLernModus] = useState(false)
  const [importMeldung, setImportMeldung] = useState("")
  const dateiInput = useRef(null)

  const karten = alleKarten.filter((k) => k.projektId === projekt.id || k.kursId === projekt.id)
  const faellig = karten.filter((k) => !k.faellig || k.faellig <= heute())

  function addKarte(e) {
    e.preventDefault()
    if (!vorne.trim() || !hinten.trim()) return
    setAlleKarten([
      ...alleKarten,
      {
        id: Date.now(),
        projektId: projekt.id,
        vorne: vorne.trim(),
        hinten: hinten.trim(),
        intervall: 0,
        ease: 2.5,
        faellig: heute(),
      },
    ])
    setVorne("")
    setHinten("")
  }

  function removeKarte(id) {
    setAlleKarten(alleKarten.filter((k) => k.id !== id))
  }

  function bewerte(karte, stufe) {
    const neu = bewerteKarte(karte, stufe)
    setAlleKarten(
      alleKarten.map((k) => (k.id === karte.id ? { ...k, ...neu } : k))
    )
  }

  function importiereDatei(e) {
    const datei = e.target.files?.[0]
    if (!datei) return
    const reader = new FileReader()
    reader.onload = () => {
      const importiert = parseAnkiExport(String(reader.result))
      if (importiert.length === 0) {
        setImportMeldung(
          "Keine Karten gefunden. Exportiere in Anki über Datei → Exportieren → „Notizen als Textdatei“."
        )
        return
      }
      const basisId = Date.now()
      setAlleKarten([
        ...alleKarten,
        ...importiert.map((k, i) => ({
          id: basisId + i,
          projektId: projekt.id,
          vorne: k.vorne,
          hinten: k.hinten,
          intervall: 0,
          ease: 2.5,
          faellig: heute(),
        })),
      ])
      setImportMeldung(
        `${importiert.length} ${importiert.length === 1 ? "Karte" : "Karten"} aus Anki importiert.`
      )
    }
    reader.readAsText(datei)
    e.target.value = ""
  }

  if (lernModus) {
    return (
      <LernModus
        faellig={faellig}
        onBewerte={bewerte}
        onEnde={() => setLernModus(false)}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {karten.length} {karten.length === 1 ? "Karte" : "Karten"}
          </p>
          <p className="text-xs text-gray-400">
            {faellig.length === 0
              ? "Nichts fällig – alles wiederholt."
              : `${faellig.length} ${faellig.length === 1 ? "Karte" : "Karten"} fällig zum Wiederholen`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dateiInput.current?.click()}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Anki-Import
          </button>
          <input
            ref={dateiInput}
            type="file"
            accept=".txt,.csv,.tsv"
            onChange={importiereDatei}
            className="hidden"
          />
          <button
            onClick={() => setLernModus(true)}
            disabled={faellig.length === 0}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            Jetzt lernen
          </button>
        </div>
      </div>

      {importMeldung && (
        <p className="mt-2 text-xs text-gray-500">{importMeldung}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        Import aus Anki: Datei → Exportieren → „Notizen als Textdatei (.txt)“,
        dann hier hochladen.
      </p>

      <form
        onSubmit={addKarte}
        className="mt-4 flex flex-wrap items-end gap-2 border-b border-gray-100 pb-4"
      >
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Vorderseite
          <input
            value={vorne}
            onChange={(e) => setVorne(e.target.value)}
            placeholder="Frage"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Rückseite
          <input
            value={hinten}
            onChange={(e) => setHinten(e.target.value)}
            placeholder="Antwort"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      {karten.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {karten.map((karte) => (
            <li
              key={karte.id}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="flex-1 truncate text-sm text-gray-800">
                {karte.vorne}
              </span>
              <span className="text-xs text-gray-400">
                {!karte.faellig || karte.faellig <= heute()
                  ? "fällig"
                  : `wieder am ${new Date(karte.faellig).toLocaleDateString("de-DE")}`}
              </span>
              <button
                onClick={() => removeKarte(karte.id)}
                title="Karte löschen"
                className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STUFEN = [
  { key: "nochmal", label: "Nochmal", stil: "border-red-200 text-red-600 hover:bg-red-50" },
  { key: "schwer", label: "Schwer", stil: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { key: "gut", label: "Gut", stil: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  { key: "einfach", label: "Einfach", stil: "border-blue-200 text-blue-700 hover:bg-blue-50" },
]

function LernModus({ faellig, onBewerte, onEnde }) {
  const [zeigeAntwort, setZeigeAntwort] = useState(false)

  if (faellig.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <h3 className="text-sm font-medium text-gray-900">
          Fertig für heute.
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          Alle fälligen Karten sind wiederholt.
        </p>
        <button
          onClick={onEnde}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  const karte = faellig[0]

  function antwortUndWeiter(stufe) {
    setZeigeAntwort(false)
    onBewerte(karte, stufe)
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Noch {faellig.length} {faellig.length === 1 ? "Karte" : "Karten"}
        </span>
        <button onClick={onEnde} className="hover:text-gray-900">
          Beenden ×
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Frage
        </p>
        <p className="mt-2 text-lg font-medium text-gray-900">{karte.vorne}</p>

        {zeigeAntwort && (
          <>
            <hr className="mx-auto my-6 max-w-xs border-gray-100" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Antwort
            </p>
            <p className="mt-2 text-lg text-gray-700">{karte.hinten}</p>
          </>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {!zeigeAntwort ? (
          <button
            onClick={() => setZeigeAntwort(true)}
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Antwort zeigen
          </button>
        ) : (
          STUFEN.map((stufe) => (
            <button
              key={stufe.key}
              onClick={() => antwortUndWeiter(stufe.key)}
              className={`flex flex-col items-center rounded-md border bg-white px-5 py-2 text-sm font-medium transition-colors ${stufe.stil}`}
            >
              {stufe.label}
              <span className="text-[10px] font-normal text-gray-400">
                {intervallText(bewerteKarte(karte, stufe.key).intervall)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
