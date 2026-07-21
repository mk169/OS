import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  bewerteKarte,
  intervallText,
  parseTxtImport,
  mische,
} from "../lib/spacedRepetition"

// Bild einlesen und auf max. 900px herunterskalieren (als komprimierte
// JPEG-Data-URL, damit es kompakt im Speicher liegt).
function ladeBild(datei) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 900
        let { width, height } = img
        if (width > max || height > max) {
          const f = Math.min(max / width, max / height)
          width = Math.round(width * f)
          height = Math.round(height * f)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        canvas.getContext("2d").drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(datei)
  })
}

// Kleiner Bild-Anhänger für das Erstellen-Formular.
function BildFeld({ bild, setBild, label }) {
  const ref = useRef(null)
  async function waehle(e) {
    const datei = e.target.files?.[0]
    if (datei) setBild(await ladeBild(datei))
    e.target.value = ""
  }
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={waehle}
        className="hidden"
      />
      {bild ? (
        <div className="group/b relative">
          <img
            src={bild}
            alt=""
            className="h-12 w-12 rounded-md border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => setBild(null)}
            title="Bild entfernen"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[10px] text-white"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="rounded-md border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
        >
          + {label}
        </button>
      )}
    </div>
  )
}

export default function ProjektKarten({ projekt }) {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [vorne, setVorne] = useState("")
  const [hinten, setHinten] = useState("")
  const [bildVorne, setBildVorne] = useState(null)
  const [bildHinten, setBildHinten] = useState(null)
  const [lernModus, setLernModus] = useState(false)
  const [importMeldung, setImportMeldung] = useState("")
  const dateiInput = useRef(null)

  const karten = alleKarten.filter(
    (k) => k.projektId === projekt.id || k.kursId === projekt.id
  )
  const faellig = karten.filter((k) => !k.faellig || k.faellig <= heute())

  function addKarte(e) {
    e.preventDefault()
    if ((!vorne.trim() && !bildVorne) || (!hinten.trim() && !bildHinten)) return
    setAlleKarten([
      ...alleKarten,
      {
        id: Date.now(),
        projektId: projekt.id,
        vorne: vorne.trim(),
        hinten: hinten.trim(),
        vorneBild: bildVorne,
        hintenBild: bildHinten,
        intervall: 0,
        ease: 2.5,
        wiederholungen: 0,
        lapses: 0,
        faellig: heute(),
      },
    ])
    setVorne("")
    setHinten("")
    setBildVorne(null)
    setBildHinten(null)
  }

  function removeKarte(id) {
    setAlleKarten(alleKarten.filter((k) => k.id !== id))
  }

  function bewerte(karte, stufe, sekunden = null) {
    const neu = bewerteKarte(karte, stufe, sekunden)
    setAlleKarten(
      alleKarten.map((k) => (k.id === karte.id ? { ...k, ...neu } : k))
    )
  }

  function starteLernen() {
    setLernModus(true)
    // Echtes Vollbild (falls erlaubt) – innerhalb der Klick-Geste.
    try {
      document.documentElement.requestFullscreen?.()
    } catch {
      /* nicht unterstützt – Overlay reicht */
    }
  }

  function beendeLernen() {
    setLernModus(false)
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()
    } catch {
      /* egal */
    }
  }

  function importiereDatei(e) {
    const datei = e.target.files?.[0]
    if (!datei) return
    const reader = new FileReader()
    reader.onload = () => {
      const importiert = parseTxtImport(String(reader.result))
      if (importiert.length === 0) {
        setImportMeldung(
          "Keine Karten gefunden. Erwartet: eine Karte pro Zeile, Vorder- und Rückseite durch Tab, Semikolon, Komma oder | getrennt."
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
          wiederholungen: 0,
          lapses: 0,
          faellig: heute(),
        })),
      ])
      setImportMeldung(
        `${importiert.length} ${importiert.length === 1 ? "Karte" : "Karten"} importiert.`
      )
    }
    reader.readAsText(datei)
    e.target.value = ""
  }

  if (lernModus) {
    return (
      <LernModus faellig={faellig} onBewerte={bewerte} onEnde={beendeLernen} />
    )
  }

  const gelernt = karten.length - faellig.length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {karten.length} {karten.length === 1 ? "Karte" : "Karten"}
            {karten.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {faellig.length} fällig · {gelernt} im Plan
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {faellig.length === 0
              ? "Nichts fällig – alles wiederholt."
              : "Bereit zum Wiederholen."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dateiInput.current?.click()}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            TXT-Import
          </button>
          <input
            ref={dateiInput}
            type="file"
            accept=".txt,.csv,.tsv"
            onChange={importiereDatei}
            className="hidden"
          />
          <button
            onClick={starteLernen}
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
        TXT-Import: eine Karte pro Zeile, Vorder- und Rückseite mit Tab/;/,/|
        getrennt.
      </p>

      <form
        onSubmit={addKarte}
        className="mt-4 space-y-2 border-b border-gray-100 pb-4"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
            Vorderseite
            <input
              value={vorne}
              onChange={(e) => setVorne(e.target.value)}
              placeholder="Frage"
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <BildFeld bild={bildVorne} setBild={setBildVorne} label="Bild" />
          <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
            Rückseite
            <input
              value={hinten}
              onChange={(e) => setHinten(e.target.value)}
              placeholder="Antwort"
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <BildFeld bild={bildHinten} setBild={setBildHinten} label="Bild" />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Hinzufügen
          </button>
        </div>
      </form>

      {karten.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {karten.map((karte) => {
            const dran = !karte.faellig || karte.faellig <= heute()
            return (
              <li
                key={karte.id}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                {karte.vorneBild && (
                  <img
                    src={karte.vorneBild}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {karte.vorne || "Bildkarte"}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {karte.hinten || (karte.hintenBild ? "Bild" : "")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
                    dran
                      ? "bg-amber-50 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {dran
                    ? "fällig"
                    : new Date(karte.faellig).toLocaleDateString("de-DE")}
                </span>
                <button
                  onClick={() => removeKarte(karte.id)}
                  title="Karte löschen"
                  className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const STUFEN = [
  {
    key: "nochmal",
    label: "Nochmal",
    taste: "1",
    stil: "border-red-200 text-red-600 hover:bg-red-50",
  },
  {
    key: "schwer",
    label: "Schwer",
    taste: "2",
    stil: "border-amber-200 text-amber-700 hover:bg-amber-50",
  },
  {
    key: "gut",
    label: "Gut",
    taste: "3",
    stil: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  },
  {
    key: "einfach",
    label: "Einfach",
    taste: "4",
    stil: "border-blue-200 text-blue-700 hover:bg-blue-50",
  },
]

function LernModus({ faellig, onBewerte, onEnde }) {
  const [zeigeAntwort, setZeigeAntwort] = useState(false)
  const [start] = useState(faellig.length)
  // Gemischte Warteschlange der Karten-IDs; „Nochmal" reiht hinten ein,
  // damit die Karte später in derselben Session erneut kommt.
  const [queue, setQueue] = useState(() => mische(faellig.map((k) => k.id)))
  const anzeigeSeit = useRef(Date.now())

  const karte = queue
    .map((id) => faellig.find((k) => k.id === id))
    .find(Boolean)

  function antwortUndWeiter(stufe) {
    const sekunden = Math.round((Date.now() - anzeigeSeit.current) / 1000)
    setZeigeAntwort(false)
    setQueue((q) => {
      const rest = q.filter((id) => id !== karte.id)
      return stufe === "nochmal" ? [...rest, karte.id] : rest
    })
    onBewerte(karte, stufe, sekunden)
    anzeigeSeit.current = Date.now()
  }

  // Tastatursteuerung: Leertaste/Enter deckt auf, 1–4 bewerten.
  useEffect(() => {
    function taste(e) {
      if (!karte) return
      if (!zeigeAntwort) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault()
          setZeigeAntwort(true)
        }
        return
      }
      const stufe = STUFEN.find((s) => s.taste === e.key)
      if (stufe) {
        e.preventDefault()
        antwortUndWeiter(stufe.key)
      }
    }
    window.addEventListener("keydown", taste)
    return () => window.removeEventListener("keydown", taste)
  }, [karte, zeigeAntwort])

  const erledigt = start - faellig.length

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:py-8">
        {!karte ? (
          <div className="m-auto rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-2xl">🎉</p>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
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
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                {faellig.length} {faellig.length === 1 ? "Karte" : "Karten"}{" "}
                übrig
              </span>
              <button onClick={onEnde} className="hover:text-gray-900">
                Beenden ×
              </button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{ width: `${start ? (erledigt / start) * 100 : 0}%` }}
              />
            </div>

            <div
              onClick={() => setZeigeAntwort(!zeigeAntwort)}
              title="Klicken zum Umdrehen"
              className="mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Frage
              </p>
              {karte.vorne && (
                <p className="mt-3 text-2xl font-medium text-gray-900">
                  {karte.vorne}
                </p>
              )}
              {karte.vorneBild && (
                <img
                  src={karte.vorneBild}
                  alt=""
                  className="mt-4 max-h-[40vh] max-w-full rounded-lg border border-gray-200"
                />
              )}

              {zeigeAntwort && (
                <>
                  <hr className="mx-auto my-6 w-24 border-gray-200" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Antwort
                  </p>
                  {karte.hinten && (
                    <p className="mt-3 text-2xl text-gray-700">
                      {karte.hinten}
                    </p>
                  )}
                  {karte.hintenBild && (
                    <img
                      src={karte.hintenBild}
                      alt=""
                      className="mt-4 max-h-[40vh] max-w-full rounded-lg border border-gray-200"
                    />
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!zeigeAntwort ? (
                <button
                  onClick={() => setZeigeAntwort(true)}
                  className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Antwort zeigen{" "}
                  <span className="ml-1 text-xs text-gray-400">Leertaste</span>
                </button>
              ) : (
                STUFEN.map((stufe) => (
                  <button
                    key={stufe.key}
                    onClick={() => antwortUndWeiter(stufe.key)}
                    className={`flex min-w-20 flex-col items-center rounded-md border bg-white px-4 py-2 text-sm font-medium transition-colors ${stufe.stil}`}
                  >
                    <span>
                      {stufe.label}
                      <span className="ml-1 text-[10px] font-normal text-gray-400">
                        {stufe.taste}
                      </span>
                    </span>
                    <span className="text-[10px] font-normal text-gray-400">
                      {intervallText(bewerteKarte(karte, stufe.key).intervall)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
