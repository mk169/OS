import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import LoeschKnopf from "./LoeschKnopf"
import { heute } from "../lib/datum"
import {
  bewerteKarte,
  intervallText,
  parseTxtImport,
  mische,
  istFaellig,
  hatCloze,
  clozeFrage,
  clozeTeile,
} from "../lib/spacedRepetition"
import {
  protokolliereWiederholung,
  protokolliereKarte,
  gelerntHeuteSet,
  tageslimitVon,
  tagesPortion,
} from "../lib/lernprotokoll"

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

export default function ProjektKarten({ projekt, onModulWechsel }) {
  const [alleKarten, setAlleKarten] = useStored("karten", [])
  const [lernTag] = useStored("lernTag", {})
  const [limits, setLimits] = useStored("kartenLimits", {})
  const [modus, setModus] = useState("normal") // "normal" | "cloze"
  const [vorne, setVorne] = useState("")
  const [hinten, setHinten] = useState("")
  const [clozeText, setClozeText] = useState("")
  const [bildVorne, setBildVorne] = useState(null)
  const [bildHinten, setBildHinten] = useState(null)
  const [lernModus, setLernModus] = useState(false)
  const [importMeldung, setImportMeldung] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(null)
  const dateiInput = useRef(null)

  const bearbeiteKarte = alleKarten.find((k) => k.id === bearbeiteId)

  const karten = alleKarten.filter(
    (k) => k.projektId === projekt.id || k.kursId === projekt.id
  )
  const faellig = karten.filter(istFaellig)

  // Tägliches Freischalten: nur `limit` Karten pro Tag zum Lernen.
  const limit = tageslimitVon(limits, projekt.id)
  const heuteSet = gelerntHeuteSet(lernTag, projekt.id)
  const tagesKarten = tagesPortion(faellig, heuteSet, limit)
  const heuteGelernt = heuteSet.size

  function setzeLimit(wert) {
    const n = Math.max(1, Math.min(999, Math.round(Number(wert) || 0)))
    setLimits({ ...limits, [projekt.id]: n })
  }

  const SR_START = {
    intervall: 0,
    ease: 2.5,
    wiederholungen: 0,
    lapses: 0,
    faellig: heute(),
  }

  function addKarte(e) {
    e.preventDefault()
    if (modus === "cloze") {
      if (!hatCloze(clozeText)) return
      setAlleKarten([
        ...alleKarten,
        {
          id: Date.now(),
          projektId: projekt.id,
          typ: "cloze",
          text: clozeText.trim(),
          ...SR_START,
        },
      ])
      setClozeText("")
      return
    }
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
        ...SR_START,
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

  function updateKarte(neu) {
    setAlleKarten(alleKarten.map((k) => (k.id === neu.id ? neu : k)))
  }

  function bewerte(karte, stufe, sekunden = null) {
    const neu = bewerteKarte(karte, stufe, sekunden)
    setAlleKarten(
      alleKarten.map((k) => (k.id === karte.id ? { ...k, ...neu } : k))
    )
    protokolliereWiederholung()
    protokolliereKarte(projekt.id, karte.id)
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
      <LernModus
        faellig={tagesKarten}
        onBewerte={bewerte}
        onEnde={beendeLernen}
      />
    )
  }

  const gelernt = karten.length - faellig.length
  const verfuegbar = tagesKarten.length

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
            <button
              onClick={() => onModulWechsel?.("lernen")}
              title="Lernplan und Karten dieses Projekts"
              className="mr-1.5 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
            >
              Lernbereich →
            </button>
            {karten.length === 0
              ? "Noch keine Karten."
              : verfuegbar > 0
                ? `${verfuegbar} heute freigeschaltet · ${heuteGelernt}/${limit} gelernt`
                : heuteGelernt >= limit && faellig.length > 0
                  ? `Tageslimit erreicht (${heuteGelernt}/${limit}) – morgen geht's weiter.`
                  : `Nichts fällig – alles wiederholt. (${heuteGelernt} heute gelernt)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500">
            <span className="whitespace-nowrap">Pro Tag</span>
            <input
              type="number"
              min="1"
              max="999"
              value={limit}
              onChange={(e) => setzeLimit(e.target.value)}
              title="Wie viele Karten pro Tag freigeschaltet werden"
              className="w-12 rounded-sm border border-gray-200 bg-white px-1.5 py-0.5 text-center text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
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
            disabled={verfuegbar === 0}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            Jetzt lernen
          </button>
        </div>
      </div>

      {importMeldung && (
        <p className="mt-2 text-xs text-gray-500">{importMeldung}</p>
      )}

      <form
        onSubmit={addKarte}
        className="mt-4 space-y-2 border-b border-gray-100 pb-4"
      >
        <div className="flex w-fit rounded-md border border-gray-200 p-0.5 text-xs">
          {[
            { key: "normal", label: "Frage/Antwort" },
            { key: "cloze", label: "Lückentext" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setModus(o.key)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                modus === o.key
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {modus === "cloze" ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
              Lückentext – markiere Lücken mit {"{{…}}"}
              <textarea
                value={clozeText}
                onChange={(e) => setClozeText(e.target.value)}
                rows={2}
                placeholder="z.B. Die Hauptstadt von Frankreich ist {{Paris}}."
                className="mt-1 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Hinzufügen
            </button>
          </div>
        ) : (
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
        )}
      </form>

      {karten.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {karten.map((karte) => {
            const dran = istFaellig(karte)
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
                <button
                  onClick={() => setBearbeiteId(karte.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-gray-900">
                    {karte.typ === "cloze"
                      ? clozeFrage(karte.text)
                      : karte.vorne || "Bildkarte"}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {karte.typ === "cloze"
                      ? "Lückentext"
                      : karte.hinten || (karte.hintenBild ? "Bild" : "")}
                  </p>
                </button>
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
                <LoeschKnopf
                  onLoeschen={() => removeKarte(karte.id)}
                  titel="Karte löschen"
                  klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                />
              </li>
            )
          })}
        </ul>
      )}

      {bearbeiteKarte && (
        <KarteBearbeiten
          key={bearbeiteKarte.id}
          karte={bearbeiteKarte}
          onSpeichern={(neu) => {
            updateKarte(neu)
            setBearbeiteId(null)
          }}
          onLoeschen={() => {
            removeKarte(bearbeiteKarte.id)
            setBearbeiteId(null)
          }}
          onSchliessen={() => setBearbeiteId(null)}
        />
      )}
    </div>
  )
}

// Bearbeiten-Overlay für eine Karte (Text von Frage/Antwort bzw. Lückentext).
// Bilder und Lernfortschritt bleiben unverändert erhalten.
function KarteBearbeiten({ karte, onSpeichern, onLoeschen, onSchliessen }) {
  const istCloze = karte.typ === "cloze"
  const [vorne, setVorne] = useState(karte.vorne ?? "")
  const [hinten, setHinten] = useState(karte.hinten ?? "")
  const [text, setText] = useState(karte.text ?? "")

  function speichern(e) {
    e.preventDefault()
    if (istCloze) {
      if (!hatCloze(text)) return
      onSpeichern({ ...karte, text: text.trim() })
    } else {
      onSpeichern({ ...karte, vorne: vorne.trim(), hinten: hinten.trim() })
    }
  }

  return (
    <div
      onClick={onSchliessen}
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/20 p-4 pt-[15vh] backdrop-blur-sm"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={speichern}
        className="w-full max-w-md space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">Karte bearbeiten</p>
          <button
            type="button"
            onClick={onSchliessen}
            className="text-xs text-gray-400 hover:text-gray-900"
          >
            Schließen ×
          </button>
        </div>

        {istCloze ? (
          <label className="flex flex-col text-xs text-gray-500">
            Lückentext – markiere Lücken mit {"{{…}}"}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              autoFocus
              className="mt-1 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col text-xs text-gray-500">
              Vorderseite
              <input
                value={vorne}
                onChange={(e) => setVorne(e.target.value)}
                autoFocus
                className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-500">
              Rückseite
              <input
                value={hinten}
                onChange={(e) => setHinten(e.target.value)}
                className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
            </label>
          </>
        )}

        <div className="flex items-center justify-between pt-1">
          <LoeschKnopf
            onLoeschen={onLoeschen}
            label="Löschen"
            frageText="Karte löschen?"
            klasse="text-sm text-gray-400"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Speichern
          </button>
        </div>
      </form>
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

export function LernModus({ faellig, onBewerte, onEnde }) {
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

  // Der Tastatur-Handler unten hängt am jeweils aktuellen Stand (Karte,
  // onBewerte). Statt ihn in die Abhängigkeiten zu nehmen und die Listener
  // bei jedem Render neu zu setzen, zeigt eine Ref immer auf die frische
  // Fassung.
  const bewerten = useRef(antwortUndWeiter)
  bewerten.current = antwortUndWeiter

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
        bewerten.current(stufe.key)
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
              {karte.typ === "cloze" ? (
                <p className="mt-3 text-2xl font-medium text-gray-900">
                  {clozeFrage(karte.text)}
                </p>
              ) : (
                <>
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
                </>
              )}

              {zeigeAntwort && (
                <>
                  <hr className="mx-auto my-6 w-24 border-gray-200" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Antwort
                  </p>
                  {karte.typ === "cloze" ? (
                    <p className="mt-3 text-2xl leading-relaxed text-gray-700">
                      {clozeTeile(karte.text).map((t, i) =>
                        t.typ === "cloze" ? (
                          <mark
                            key={i}
                            className="rounded bg-amber-100 px-1 text-gray-900"
                          >
                            {t.wert}
                          </mark>
                        ) : (
                          <span key={i}>{t.wert}</span>
                        )
                      )}
                    </p>
                  ) : (
                    <>
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
