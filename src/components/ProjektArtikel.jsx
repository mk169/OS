import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"

// Artikel: ein Substack-artiges Schreibwerkzeug für Projekte. Jedes Projekt
// kann mehrere Artikel/Entwürfe halten (Karten-Liste), die im Vollbild-Editor
// mit einer Formatierungsleiste (fett, kursiv, Überschriften, Zitat, Listen,
// Link, Markierung) geschrieben werden. Gespeichert wird als HTML-String.
// Bewusst ohne externe Editor-Bibliothek – contentEditable + execCommand.

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// HTML → reiner Text (für Vorschau und Statistik).
function nurText(html) {
  if (!html) return ""
  const d = document.createElement("div")
  d.innerHTML = html
  return (d.textContent || "").replace(/\s+/g, " ").trim()
}

function statistik(html) {
  const text = nurText(html)
  const woerter = text ? text.split(/\s+/).length : 0
  const minuten = Math.max(1, Math.round(woerter / 200))
  return { woerter, minuten }
}

export default function ProjektArtikel({ projekt }) {
  const [alle, setAlle] = useStored("artikel", [])
  const artikel = alle.filter((a) => a.projektId === projekt.id)
  const [offenId, setOffenId] = useState(null)
  const [titelEntwurf, setTitelEntwurf] = useState("")

  const offener = alle.find((a) => a.id === offenId)

  function addArtikel(e) {
    e.preventDefault()
    const neu = {
      id: Date.now(),
      projektId: projekt.id,
      titel: titelEntwurf.trim() || "Unbenannter Artikel",
      untertitel: "",
      html: "",
      aktualisiertAm: Date.now(),
    }
    setAlle([...alle, neu])
    setTitelEntwurf("")
    setOffenId(neu.id)
  }

  function updateArtikel(neu) {
    setAlle(alle.map((a) => (a.id === neu.id ? { ...neu, aktualisiertAm: Date.now() } : a)))
  }

  function removeArtikel(id) {
    setAlle(alle.filter((a) => a.id !== id))
    if (offenId === id) setOffenId(null)
  }

  return (
    <div>
      <form onSubmit={addArtikel} className="flex gap-2 border-b border-gray-100 pb-4">
        <input
          value={titelEntwurf}
          onChange={(e) => setTitelEntwurf(e.target.value)}
          placeholder="Neuer Artikel, z.B. Ausgabe 01 – Warum Systeme schlagen Ziele"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          <Icon className="h-4 w-4"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
          Schreiben
        </button>
      </form>

      {artikel.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          Noch kein Artikel. Gib oben einen Titel ein und leg los.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {[...artikel]
            .sort((a, b) => (b.aktualisiertAm ?? b.id) - (a.aktualisiertAm ?? a.id))
            .map((a) => {
              const { woerter, minuten } = statistik(a.html)
              const vorschau = nurText(a.html)
              return (
                <li key={a.id} className="group relative">
                  <button
                    onClick={() => setOffenId(a.id)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-400"
                  >
                    <p className="truncate pr-6 font-serif text-lg font-medium text-gray-900">
                      {a.titel}
                    </p>
                    {a.untertitel && (
                      <p className="mt-0.5 truncate text-sm text-gray-500">{a.untertitel}</p>
                    )}
                    <p className="mt-1.5 line-clamp-2 text-xs text-gray-400">
                      {vorschau || "Leerer Entwurf – klicken zum Schreiben."}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {woerter} {woerter === 1 ? "Wort" : "Wörter"}
                      {woerter > 0 && ` · ~${minuten} Min Lesezeit`}
                    </p>
                  </button>
                  <button
                    onClick={() => removeArtikel(a.id)}
                    title="Artikel löschen"
                    className="absolute right-3 top-3 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              )
            })}
        </ul>
      )}

      {offener && (
        <ArtikelSchreiben
          key={offener.id}
          artikel={offener}
          onChange={updateArtikel}
          onClose={() => setOffenId(null)}
        />
      )}
    </div>
  )
}

// Kleiner Werkzeugleisten-Knopf. onMouseDown verhindert Fokusverlust, damit
// die Textauswahl im Editor erhalten bleibt.
function Werkzeug({ onClick, titel, children, breit }) {
  return (
    <button
      type="button"
      title={titel}
      aria-label={titel}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 items-center justify-center rounded-md text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 ${
        breit ? "px-2" : "w-8"
      }`}
    >
      {children}
    </button>
  )
}

function Trenner() {
  return <span className="mx-0.5 h-5 w-px bg-gray-200" />
}

function ArtikelSchreiben({ artikel, onChange, onClose }) {
  const koerperRef = useRef(null)
  const [stats, setStats] = useState(() => statistik(artikel.html))

  // Inhalt genau einmal je Artikel setzen (unkontrolliert), damit der Cursor
  // beim Tippen nicht springt.
  useEffect(() => {
    if (koerperRef.current) koerperRef.current.innerHTML = artikel.html || ""
    setStats(statistik(artikel.html))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artikel.id])

  function speichere() {
    const html = koerperRef.current?.innerHTML ?? ""
    onChange({ ...artikel, html })
    setStats(statistik(html))
  }

  function befehl(cmd, wert = null) {
    if (cmd === "hiliteColor") document.execCommand("styleWithCSS", false, true)
    document.execCommand(cmd, false, wert)
    koerperRef.current?.focus()
    speichere()
  }

  function block(tag) {
    befehl("formatBlock", tag)
  }

  function link() {
    const url = window.prompt("Link-Adresse (https://…):")
    if (url) befehl("createLink", url.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Kopfzeile */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Gespeichert
          </span>
          <span className="tabular-nums">
            {stats.woerter} {stats.woerter === 1 ? "Wort" : "Wörter"}
            {stats.woerter > 0 && ` · ~${stats.minuten} Min`}
          </span>
          <button onClick={onClose} className="font-medium hover:text-gray-900">
            Fertig
          </button>
        </div>

        {/* Formatierungsleiste */}
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-0.5 px-3 pb-2">
          <Werkzeug titel="Fließtext" breit onClick={() => block("p")}>
            <span className="text-xs font-medium">Text</span>
          </Werkzeug>
          <Werkzeug titel="Überschrift" breit onClick={() => block("h2")}>
            <span className="text-sm font-bold">H2</span>
          </Werkzeug>
          <Werkzeug titel="Zwischenüberschrift" breit onClick={() => block("h3")}>
            <span className="text-xs font-bold">H3</span>
          </Werkzeug>
          <Werkzeug titel="Zitat" onClick={() => block("blockquote")}>
            <Icon><path d="M7 7h4v6H7zM13 7h4v6h-4z" /><path d="M7 13c0 2-1 3-3 3M17 13c0 2-1 3-3 3" /></Icon>
          </Werkzeug>
          <Trenner />
          <Werkzeug titel="Fett" onClick={() => befehl("bold")}>
            <span className="text-sm font-bold">B</span>
          </Werkzeug>
          <Werkzeug titel="Kursiv" onClick={() => befehl("italic")}>
            <span className="font-serif text-sm italic">I</span>
          </Werkzeug>
          <Werkzeug titel="Durchgestrichen" onClick={() => befehl("strikeThrough")}>
            <span className="text-sm line-through">S</span>
          </Werkzeug>
          <Werkzeug titel="Markieren" onClick={() => befehl("hiliteColor", "#fef08a")}>
            <Icon><path d="m9 11 6 6M4 20l3-1 9.5-9.5a2.1 2.1 0 0 0-3-3L4 16Z" /></Icon>
          </Werkzeug>
          <Trenner />
          <Werkzeug titel="Aufzählung" onClick={() => befehl("insertUnorderedList")}>
            <Icon><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Icon>
          </Werkzeug>
          <Werkzeug titel="Nummerierte Liste" onClick={() => befehl("insertOrderedList")}>
            <Icon><path d="M10 6h11M10 12h11M10 18h11" /><path d="M4 4v4M3 8h2M3 4h1M3 16h2v4H3v-2h2" /></Icon>
          </Werkzeug>
          <Werkzeug titel="Link" onClick={link}>
            <Icon><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></Icon>
          </Werkzeug>
        </div>
      </div>

      {/* Schreibfläche */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
        <input
          value={artikel.titel}
          onChange={(e) => onChange({ ...artikel, titel: e.target.value })}
          placeholder="Titel"
          className="w-full border-none bg-transparent font-serif text-3xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />
        <input
          value={artikel.untertitel ?? ""}
          onChange={(e) => onChange({ ...artikel, untertitel: e.target.value })}
          placeholder="Untertitel hinzufügen…"
          className="mt-2 w-full border-none bg-transparent font-serif text-lg text-gray-500 outline-none placeholder:text-gray-300"
        />
        <div
          ref={koerperRef}
          contentEditable
          suppressContentEditableWarning
          onInput={speichere}
          onBlur={speichere}
          data-placeholder="Schreib deinen Artikel – markiere Text für Formatierung. Speichert automatisch."
          className="artikel-koerper mt-5 min-h-[45vh] w-full text-[16px] leading-relaxed text-gray-800 outline-none"
        />
      </div>
    </div>
  )
}
