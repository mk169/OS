import { useEffect, useState } from "react"
import useStored from "../lib/useStored"
import { WIKILINK_REGEX, findeZiel, sammleBacklinks } from "../lib/wikilinks"

// Lehrinhalte: eigene Notizen und Zusammenfassungen zum Projekt, als
// Karten-Raster zum Sammeln und Stapeln. Klick öffnet die Notiz groß in
// einem eigenen Schreib-Overlay (wie ein offenes Dokument). Der Overlay
// unterstützt "[[Titel]]"-Verlinkung zu Wissen/Projekten/anderen
// Projekt-Notizen samt Rückverlinkung (siehe NotizBearbeiten) – dieselbe
// Komponente wird auch von der projektfreien Wissensbasis (SammelnSeite)
// genutzt. startNotizId/onOeffneZiel/onNavigate ermöglichen das direkte
// Anspringen einer Notiz von außen (z.B. per Link-Klick aus einem anderen
// Projekt oder aus dem Graphen).
export default function ProjektNotizen({
  projekt,
  startNotizId = null,
  onOeffneZiel,
  onNavigate,
}) {
  const [alleNotizen, setAlleNotizen] = useStored("notizen", [])
  const [wissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [titel, setTitel] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(startNotizId)

  useEffect(() => {
    if (startNotizId != null) setBearbeiteId(startNotizId)
  }, [startNotizId])

  const notizen = alleNotizen.filter(
    (n) => n.projektId === projekt.id || n.kursId === projekt.id
  )
  // Volle Liste durchsuchen statt nur der projekt-eigenen: eine von außen
  // angesprungene Notiz kann kurzzeitig noch nicht in `notizen` auftauchen
  // (z.B. während OrdnerSeite gerade erst das Projekt wechselt).
  const bearbeiteteNotiz = alleNotizen.find((n) => n.id === bearbeiteId)

  // Verlinkungsziel öffnen: Wissen springt auf die Sammeln-Seite (kein
  // Deep-Link auf die genaue Notiz dort, bewusste Scope-Grenze), Projekt/
  // Notiz werden über den durchgereichten Handler direkt angesprungen.
  function zielKlick(ziel) {
    if (ziel.typ === "wissen") onNavigate?.("sammeln")
    else onOeffneZiel?.(ziel)
  }

  function addNotiz(e) {
    e.preventDefault()
    if (!titel.trim()) return
    const neue = {
      id: Date.now(),
      projektId: projekt.id,
      titel: titel.trim(),
      inhalt: "",
    }
    setAlleNotizen([...alleNotizen, neue])
    setTitel("")
    setBearbeiteId(neue.id)
  }

  function updateNotiz(neu) {
    setAlleNotizen(alleNotizen.map((n) => (n.id === neu.id ? neu : n)))
  }

  function remove(id) {
    setAlleNotizen(alleNotizen.filter((n) => n.id !== id))
    if (bearbeiteId === id) setBearbeiteId(null)
  }

  return (
    <div>
      <form
        onSubmit={addNotiz}
        className="flex gap-2 border-b border-gray-100 pb-4"
      >
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Neue Notiz oder Zusammenfassung, z.B. Kapitel 2 – Verteilungen"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anlegen
        </button>
      </form>

      <NotizenRaster
        notizen={notizen}
        onOeffnen={setBearbeiteId}
        onRemove={remove}
      />

      {bearbeiteteNotiz && (
        <NotizBearbeiten
          key={bearbeiteteNotiz.id}
          notiz={bearbeiteteNotiz}
          onChange={updateNotiz}
          onClose={() => setBearbeiteId(null)}
          wissen={wissen}
          projekte={projekte}
          notizen={alleNotizen}
          onZielKlick={zielKlick}
        />
      )}
    </div>
  )
}

// Karten-Raster für Notizen (Titel + Vorschau) – von ProjektNotizen und
// der projektfreien Wissensbasis (SammelnSeite) gemeinsam genutzt.
export function NotizenRaster({ notizen, onOeffnen, onRemove }) {
  if (notizen.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
        Noch keine Lehrinhalte. Lege eine Notiz an und schreibe direkt los.
      </p>
    )
  }
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notizen.map((notiz) => (
        <div key={notiz.id} className="group relative">
          <button
            onClick={() => onOeffnen(notiz.id)}
            className="h-32 w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-400"
          >
            <p className="line-clamp-1 text-sm font-medium text-gray-900">
              {notiz.titel}
            </p>
            <p className="mt-1.5 line-clamp-4 text-xs text-gray-400">
              {notiz.inhalt || "Leer – klicken zum Schreiben."}
            </p>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(notiz.id)
            }}
            title="Notiz löschen"
            className="absolute right-2 top-2 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// Erkennt "@query" am Textende (gleiches Prinzip wie BlockEditor.jsx'
// Slash-Menü) – Auswahl fügt "[[Titel]]" ein.
const MENTION_ERKENNEN = /(?:^|\s)@([^\s@]*)$/
const MENTION_ENTFERNEN = /(?:^|\s)@[^\s@]*$/

// Text mit "[[Titel]]"-Vorkommen als klickbare Chips gerendert (Ansicht-
// Modus). Unbekannte Ziele bleiben dezent und nicht klickbar.
function TextMitLinks({ text, wissen, projekte, notizen, onZielKlick }) {
  if (!text) return null
  const teile = text.split(WIKILINK_REGEX)
  return (
    <>
      {teile.map((teil, i) =>
        i % 2 === 1 ? (
          <LinkChip
            key={i}
            titel={teil}
            wissen={wissen}
            projekte={projekte}
            notizen={notizen}
            onZielKlick={onZielKlick}
          />
        ) : (
          <span key={i}>{teil}</span>
        )
      )}
    </>
  )
}

function LinkChip({ titel, wissen, projekte, notizen, onZielKlick }) {
  const ziel = findeZiel(titel, wissen, projekte, notizen)
  return (
    <button
      type="button"
      disabled={!ziel}
      onClick={() => ziel && onZielKlick?.(ziel)}
      className={`rounded-sm px-1 font-medium ${
        ziel
          ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      {titel}
    </button>
  )
}

// Vollbild-Schreib-Overlay für eine einzelne Notiz. Titel/Inhalt speichern
// automatisch, kein Speichern-Button. Ansicht-Modus (Default) zeigt den
// Text mit klickbaren "[[Titel]]"-Verlinkungen; Klick auf den Text (oder
// den Stift) wechselt in den Bearbeiten-Modus mit "@"-Autocomplete.
// wissen/projekte = mögliche Linkziele; onZielKlick(ziel) navigiert dorthin
// (optional – Aufrufer ohne Navigationskontext lassen Chips nicht-klickbar
// wirken, indem sie onZielKlick weglassen; Wissen-Ziele lassen sich dann
// trotzdem visuell erkennen, nur Rücksprung fehlt).
export function NotizBearbeiten({
  notiz,
  onChange,
  onClose,
  wissen = [],
  projekte = [],
  notizen = [],
  onZielKlick,
}) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [mention, setMention] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  const zielOptionen = [
    ...wissen
      .filter((w) => w.id !== notiz.id)
      .map((w) => ({ typ: "wissen", titel: w.titel })),
    ...projekte
      .filter((p) => !p.archiviert)
      .map((p) => ({ typ: "projekt", titel: p.name })),
    ...notizen
      .filter((n) => n.id !== notiz.id)
      .map((n) => ({
        typ: "notiz",
        titel: n.titel,
        projektName: projekte.find((p) => p.id === (n.projektId ?? n.kursId))
          ?.name,
      })),
  ]
  const mentionOptionen = mention
    ? zielOptionen
        .filter((o) => o.titel.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 8)
    : []

  // Eigener Typ der gerade bearbeiteten Notiz – Projekt-Notizen tragen
  // projektId/kursId, projektfreie Wissens-Einträge nicht. Bestimmt, welcher
  // Backlink-Treffer als "verweist auf sich selbst" auszuschließen ist.
  const eigenerTyp = notiz.projektId ?? notiz.kursId ? "notiz" : "wissen"
  const backlinks = sammleBacklinks(
    notiz.titel,
    wissen,
    projekte,
    notizen
  ).filter((b) => !(b.typ === eigenerTyp && b.id === notiz.id))

  function inhaltOnChange(text) {
    onChange({ ...notiz, inhalt: text })
    const m = MENTION_ERKENNEN.exec(text)
    if (m) {
      setMention({ query: m[1] })
      setMentionIndex(0)
    } else {
      setMention(null)
    }
  }

  function waehleMention(option) {
    const text = notiz.inhalt ?? ""
    const match = MENTION_ENTFERNEN.exec(text)
    if (!match) return
    const vorher = text.slice(0, match.index)
    const leerzeichen = /^\s/.test(match[0]) ? match[0][0] : ""
    onChange({ ...notiz, inhalt: `${vorher}${leerzeichen}[[${option.titel}]] ` })
    setMention(null)
  }

  function mentionKeyDown(e) {
    if (!mention) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMentionIndex((i) => Math.min(i + 1, mentionOptionen.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setMentionIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      if (mentionOptionen[mentionIndex]) {
        e.preventDefault()
        waehleMention(mentionOptionen[mentionIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setMention(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:py-8">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Notiz</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBearbeiten(!bearbeiten)}
              className="hover:text-gray-900"
            >
              {bearbeiten ? "Fertig" : "Bearbeiten"}
            </button>
            <button onClick={onClose} className="hover:text-gray-900">
              Schließen ×
            </button>
          </div>
        </div>
        <input
          value={notiz.titel}
          onChange={(e) => onChange({ ...notiz, titel: e.target.value })}
          placeholder="Titel"
          autoFocus={bearbeiten}
          className="mt-4 w-full border-none bg-transparent text-2xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />

        {bearbeiten ? (
          <div className="relative mt-4 flex-1">
            <textarea
              value={notiz.inhalt}
              onChange={(e) => inhaltOnChange(e.target.value)}
              onKeyDown={mentionKeyDown}
              onBlur={() => setMention(null)}
              placeholder="Schreib hier deine Zusammenfassung – speichert automatisch. Tippe @ um auf Wissen oder ein Projekt zu verlinken."
              autoFocus
              className="h-full w-full resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
            />
            {mention && mentionOptionen.length > 0 && (
              <div className="absolute bottom-4 left-0 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {mentionOptionen.map((o, i) => (
                  <button
                    key={`${o.typ}-${o.titel}-${i}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => waehleMention(o)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      i === mentionIndex
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="rounded-sm bg-gray-100 px-1 text-[10px] uppercase tracking-wide text-gray-400">
                      {o.typ === "wissen"
                        ? "Wissen"
                        : o.typ === "notiz"
                          ? "Notiz"
                          : "Projekt"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.titel}</span>
                    {o.typ === "notiz" && o.projektName && (
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {o.projektName}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setBearbeiten(true)}
            className="mt-4 min-h-[40vh] flex-1 cursor-text whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800"
          >
            {notiz.inhalt ? (
              <TextMitLinks
                text={notiz.inhalt}
                wissen={wissen}
                projekte={projekte}
                notizen={notizen}
                onZielKlick={onZielKlick}
              />
            ) : (
              <span className="text-gray-300">
                Leer – klicken zum Schreiben.
              </span>
            )}
          </div>
        )}

        {backlinks.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Erwähnt in
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {backlinks.map((b) => (
                <button
                  key={`${b.typ}-${b.id}`}
                  onClick={() => onZielKlick?.(b)}
                  disabled={!onZielKlick}
                  className="rounded-sm bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:cursor-default disabled:hover:bg-gray-100"
                >
                  {b.titel}
                  {b.typ === "notiz" && (
                    <span className="ml-1 text-gray-400">
                      · {projekte.find((p) => p.id === b.projektId)?.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
