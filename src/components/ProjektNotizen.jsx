import { useEffect, useMemo, useRef, useState } from "react"
import useStored from "../lib/useStored"
import LoeschKnopf from "./LoeschKnopf"
import {
  WIKILINK_REGEX,
  findeZiel,
  sammleBacklinks,
  projektSeitenTexte,
} from "../lib/wikilinks"
import { teileMitTags, sammleTags } from "../lib/tags"
import { leseDateiAlsDataUri, istBild, formatBytes } from "../lib/wissen"

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
  // Merkt sich die zuletzt neu angelegte Notiz, damit sie direkt im
  // Schreib-Modus (statt Lese-Modus) geöffnet wird.
  const [frischId, setFrischId] = useState(null)

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
    setFrischId(neue.id)
  }

  function updateNotiz(neu) {
    const gestempelt = { ...neu, aktualisiertAm: Date.now() }
    setAlleNotizen(alleNotizen.map((n) => (n.id === neu.id ? gestempelt : n)))
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
          onClose={() => {
            setBearbeiteId(null)
            setFrischId(null)
          }}
          startImBearbeiten={bearbeiteteNotiz.id === frischId}
          wissen={wissen}
          projekte={projekte}
          notizen={alleNotizen}
          onZielKlick={zielKlick}
          onTagKlick={() => onNavigate?.("sammeln", "tags")}
        />
      )}
    </div>
  )
}

// Notiz-Liste für Titel + Vorschau – von ProjektNotizen und der
// projektfreien Wissensbasis (SammelnSeite) gemeinsam genutzt. layout
// wählt zwischen Karten-Raster (Default) und kompakter Zeilen-Liste.
// leerText erlaubt kontextabhängige Leer-Hinweise.
function NotizenRaster({
  notizen,
  onOeffnen,
  onRemove,
  layout = "raster",
}) {
  if (notizen.length === 0) return null

  if (layout === "liste") {
    return (
      <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {notizen.map((notiz) => (
          <li key={notiz.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50">
            <button
              onClick={() => onOeffnen(notiz.id)}
              className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
            >
              <span className="shrink-0 truncate text-sm font-medium text-gray-900">
                {notiz.titel || "Ohne Titel"}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                {notiz.inhalt || "Leer – klicken zum Schreiben."}
              </span>
            </button>
            <LoeschKnopf
              onLoeschen={() => onRemove(notiz.id)}
              titel="Notiz löschen"
              klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
            />
          </li>
        ))}
      </ul>
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
          <span className="absolute right-2 top-2">
            <LoeschKnopf
              onLoeschen={() => onRemove(notiz.id)}
              titel="Notiz löschen"
              klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
            />
          </span>
        </div>
      ))}
    </div>
  )
}

// Erkennt "@query" am Textende (gleiches Prinzip wie BlockEditor.jsx'
// Slash-Menü) – Auswahl fügt "[[Titel]]" ein.
const MENTION_ERKENNEN = /(?:^|\s)@([^\s@]*)$/
const MENTION_ENTFERNEN = /(?:^|\s)@[^\s@]*$/

// Analog für "#Schlagwort" am Textende – öffnet die Tag-Autovervollständigung.
const TAG_ERKENNEN = /(?:^|\s)#([\p{L}\d_-]*)$/u
const TAG_ENTFERNEN = /(?:^|\s)#[\p{L}\d_-]*$/u

// Vorschlagsliste für die #-Eingabe: passende vorhandene Tags plus – wenn der
// getippte Tag noch nicht existiert – ein „neu"-Eintrag zum Anlegen.
function tagVorschlaege(alleTags, query) {
  const q = query.toLowerCase()
  const liste = alleTags
    .filter((t) => t.includes(q))
    .slice(0, 8)
    .map((tag) => ({ tag, neu: false }))
  if (q && !alleTags.includes(q)) liste.unshift({ tag: q, neu: true })
  return liste
}

// Text mit "[[Titel]]"-Vorkommen (klickbare Link-Chips) und "#Schlagwort"
// (klickbare Tag-Chips) gerendert (Ansicht-Modus). Unbekannte Link-Ziele
// bleiben dezent und nicht klickbar.
function TextMitLinks({ text, wissen, projekte, notizen, onZielKlick, onTagKlick }) {
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
          <TextMitTags key={i} text={teil} onTagKlick={onTagKlick} />
        )
      )}
    </>
  )
}

// Einfache Inline-Formatierung im Markdown-Stil: **fett**, *kursiv*, `Code`,
// ~~durchgestrichen~~. Bewusst schlank gehalten (keine Abhängigkeit).
const INLINE_FORMAT = /(\*\*[^*\n]+\*\*|`[^`\n]+`|~~[^~\n]+~~|\*[^*\n]+\*)/g
function formatiereInline(text) {
  return text.split(INLINE_FORMAT).map((t, i) => {
    if (!t) return null
    if (t.startsWith("**") && t.endsWith("**"))
      return <strong key={i}>{t.slice(2, -2)}</strong>
    if (t.startsWith("~~") && t.endsWith("~~"))
      return <del key={i}>{t.slice(2, -2)}</del>
    if (t.startsWith("`") && t.endsWith("`"))
      return (
        <code
          key={i}
          className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800"
        >
          {t.slice(1, -1)}
        </code>
      )
    if (t.length > 2 && t.startsWith("*") && t.endsWith("*"))
      return <em key={i}>{t.slice(1, -1)}</em>
    return <span key={i}>{t}</span>
  })
}

// Rendert einen Klartext-Abschnitt und hebt darin "#Schlagworte" als Chips
// hervor (Klick öffnet die Tag-Übersicht, falls ein Handler übergeben ist).
function TextMitTags({ text, onTagKlick }) {
  const stuecke = teileMitTags(text)
  if (stuecke.length === 0) return null
  return (
    <>
      {stuecke.map((s, i) =>
        s.typ === "tag" ? (
          <button
            key={i}
            type="button"
            disabled={!onTagKlick}
            onClick={() => onTagKlick?.(s.wert.toLowerCase())}
            className="rounded-sm px-0.5 font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            #{s.wert}
          </button>
        ) : (
          <span key={i}>{formatiereInline(s.wert)}</span>
        )
      )}
    </>
  )
}

// Rendert Notiz-Inhalt als leichtes Markdown-Dokument: Überschriften (#/##/###),
// Aufzählungen (- / *), Zitate (>) und Absätze – mit Inline-Formatierung sowie
// den bestehenden "[[Links]]" und "#Tags". Macht Notizen zu übersichtlichen,
// lesbaren Wissenseinträgen statt reinem Fließtext.
function NotizInhalt(props) {
  const { text } = props
  const zeilen = (text ?? "").split("\n")
  const nodes = []
  let liste = null
  const flush = () => {
    if (liste) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc space-y-0.5 pl-5">
          {liste}
        </ul>
      )
      liste = null
    }
  }
  zeilen.forEach((zeile, i) => {
    const h = zeile.match(/^(#{1,3})\s+(.*)$/)
    const li = zeile.match(/^\s*[-*]\s+(.*)$/)
    const q = zeile.match(/^>\s+(.*)$/)
    if (li) {
      liste = liste ?? []
      liste.push(
        <li key={i}>
          <TextMitLinks {...props} text={li[1]} />
        </li>
      )
      return
    }
    flush()
    if (h) {
      const lvl = h[1].length
      const cls =
        lvl === 1
          ? "mt-4 text-xl font-semibold"
          : lvl === 2
            ? "mt-4 text-lg font-semibold"
            : "mt-3 text-base font-semibold"
      nodes.push(
        <p key={i} className={`${cls} text-gray-900`}>
          <TextMitLinks {...props} text={h[2]} />
        </p>
      )
    } else if (q) {
      nodes.push(
        <blockquote
          key={i}
          className="border-l-2 border-gray-300 pl-3 italic text-gray-500"
        >
          <TextMitLinks {...props} text={q[1]} />
        </blockquote>
      )
    } else if (zeile.trim() === "") {
      nodes.push(<div key={i} className="h-2.5" />)
    } else {
      nodes.push(
        <p key={i} className="leading-relaxed">
          <TextMitLinks {...props} text={zeile} />
        </p>
      )
    }
  })
  flush()
  return <div className="space-y-1">{nodes}</div>
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
// Knopf der Formatierungsleiste. onMouseDown/preventDefault hält den Fokus
// im Textarea, damit die aktuelle Auswahl beim Klick erhalten bleibt.
function FmtBtn({ onClick, title, children, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm leading-none transition-colors hover:bg-gray-100 hover:text-gray-900 ${className}`}
    >
      {children}
    </button>
  )
}

export function NotizBearbeiten({
  notiz,
  onChange,
  onClose,
  wissen = [],
  projekte = [],
  notizen = [],
  onZielKlick,
  onTagKlick,
  // Frisch angelegte Notizen öffnen direkt im Schreib-Modus, damit man sofort
  // lostippen kann, statt erst „Bearbeiten" zu drücken.
  startImBearbeiten = false,
  // Nur im Wissens-Kontext (SammelnSeite) gesetzt: Ordner-Zuordnung & Anheften.
  ordner = null,
  onOrdnerWechsel,
  onPinToggle,
}) {
  const [bearbeiten, setBearbeiten] = useState(startImBearbeiten)
  // Beim direkten Öffnen im Schreib-Modus: ohne Titel zuerst ins Titelfeld
  // springen (man will benennen), mit Titel direkt in den Fließtext.
  const titelZuerst = useRef(startImBearbeiten && !notiz.titel)
  const [mention, setMention] = useState(null) // { modus: "link"|"tag", query }
  const [mentionIndex, setMentionIndex] = useState(0)
  const dateiInput = useRef(null)
  const textRef = useRef(null)
  const [anhangFehler, setAnhangFehler] = useState("")

  // ── Formatierungsleiste: bearbeitet den Text direkt im Textarea ───────────
  // Umschließt die Auswahl mit einem Marker (z. B. ** für fett).
  function umschliesse(marker) {
    const el = textRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e)
    const neu = value.slice(0, s) + marker + sel + marker + value.slice(e)
    onChange({ ...notiz, inhalt: neu })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + marker.length, e + marker.length)
    })
  }
  // Setzt am Zeilenanfang ein Präfix (z. B. „## " oder „- ").
  function zeilenPraefix(praefix) {
    const el = textRef.current
    if (!el) return
    const { selectionStart: s, value } = el
    const zeilenStart = value.lastIndexOf("\n", s - 1) + 1
    const neu = value.slice(0, zeilenStart) + praefix + value.slice(zeilenStart)
    onChange({ ...notiz, inhalt: neu })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + praefix.length, s + praefix.length)
    })
  }
  // Fügt am Cursor ein (nutzt inhaltOnChange, damit @/# die Vorschläge auslösen).
  function einfuegen(str) {
    const el = textRef.current
    if (!el) {
      inhaltOnChange((notiz.inhalt ?? "") + str)
      return
    }
    const { selectionStart: s, selectionEnd: e, value } = el
    const neu = value.slice(0, s) + str + value.slice(e)
    inhaltOnChange(neu)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + str.length, s + str.length)
    })
  }

  const anhaenge = notiz.anhaenge ?? []

  async function dateienHinzufuegen(dateiListe) {
    const neue = []
    const fehler = []
    for (const datei of Array.from(dateiListe)) {
      try {
        neue.push(await leseDateiAlsDataUri(datei))
      } catch (e) {
        fehler.push(e.message)
      }
    }
    setAnhangFehler(fehler.join(" "))
    if (neue.length) onChange({ ...notiz, anhaenge: [...anhaenge, ...neue] })
  }

  function anhangEntfernen(id) {
    onChange({ ...notiz, anhaenge: anhaenge.filter((a) => a.id !== id) })
  }

  // Vorhandene Schlagworte für die #-Autovervollständigung.
  const alleTags = useMemo(
    () => sammleTags(wissen, notizen, projekte).map((t) => t.tag),
    [wissen, notizen, projekte]
  )

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
  const mentionOptionen = !mention
    ? []
    : mention.modus === "tag"
      ? tagVorschlaege(alleTags, mention.query)
      : zielOptionen
          .filter((o) =>
            o.titel.toLowerCase().includes(mention.query.toLowerCase())
          )
          .slice(0, 8)

  // Eigener Typ der gerade bearbeiteten Notiz – Projekt-Notizen tragen
  // projektId/kursId, projektfreie Wissens-Einträge nicht. Bestimmt, welcher
  // Backlink-Treffer als "verweist auf sich selbst" auszuschließen ist.
  const eigenerTyp = notiz.projektId ?? notiz.kursId ? "notiz" : "wissen"
  const backlinks = sammleBacklinks(
    notiz.titel,
    wissen,
    projekte,
    notizen,
    projektSeitenTexte(projekte)
  ).filter((b) => !(b.typ === eigenerTyp && b.id === notiz.id))

  function inhaltOnChange(text) {
    onChange({ ...notiz, inhalt: text })
    const m = MENTION_ERKENNEN.exec(text)
    if (m) {
      setMention({ modus: "link", query: m[1] })
      setMentionIndex(0)
      return
    }
    const t = TAG_ERKENNEN.exec(text)
    if (t) {
      setMention({ modus: "tag", query: t[1] })
      setMentionIndex(0)
      return
    }
    setMention(null)
  }

  function waehleMention(option) {
    const text = notiz.inhalt ?? ""
    const istTag = mention?.modus === "tag"
    const match = (istTag ? TAG_ENTFERNEN : MENTION_ENTFERNEN).exec(text)
    if (!match) return
    const vorher = text.slice(0, match.index)
    const leerzeichen = /^\s/.test(match[0]) ? match[0][0] : ""
    const eingefuegt = istTag ? `#${option.tag} ` : `[[${option.titel}]] `
    onChange({ ...notiz, inhalt: `${vorher}${leerzeichen}${eingefuegt}` })
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          {ordner ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPinToggle?.()}
                title={notiz.angepinnt ? "Nicht mehr anheften" : "Anheften"}
                className={
                  notiz.angepinnt
                    ? "font-medium text-amber-500"
                    : "hover:text-gray-900"
                }
              >
                {notiz.angepinnt ? "📌 Angeheftet" : "📌 Anheften"}
              </button>
              <select
                value={notiz.ordnerId ?? ""}
                onChange={(e) => onOrdnerWechsel?.(e.target.value || null)}
                title="Ordner"
                className="rounded-sm border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-600 outline-none focus:border-gray-900"
              >
                <option value="">📁 Kein Ordner</option>
                {ordner.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span>Notiz</span>
          )}
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
          autoFocus={titelZuerst.current}
          className="mt-4 w-full border-none bg-transparent text-2xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />

        {bearbeiten ? (
          <div className="relative mt-4 flex flex-1 flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-0.5 border-b border-gray-100 pb-2 text-gray-500">
              <FmtBtn onClick={() => zeilenPraefix("## ")} title="Überschrift">
                H
              </FmtBtn>
              <FmtBtn onClick={() => umschliesse("**")} title="Fett">
                <b>B</b>
              </FmtBtn>
              <FmtBtn onClick={() => umschliesse("*")} title="Kursiv">
                <i>I</i>
              </FmtBtn>
              <FmtBtn
                onClick={() => umschliesse("`")}
                title="Code"
                className="font-mono text-xs"
              >
                &lt;/&gt;
              </FmtBtn>
              <FmtBtn onClick={() => zeilenPraefix("- ")} title="Liste">
                •
              </FmtBtn>
              <FmtBtn onClick={() => zeilenPraefix("> ")} title="Zitat">
                ❝
              </FmtBtn>
              <span className="mx-1 h-4 w-px bg-gray-200" />
              <FmtBtn onClick={() => einfuegen("@")} title="Notiz/Projekt verlinken">
                [[ ]]
              </FmtBtn>
              <FmtBtn onClick={() => einfuegen("#")} title="Schlagwort">
                #
              </FmtBtn>
              <FmtBtn
                onClick={() => dateiInput.current?.click()}
                title="Datei anhängen"
              >
                📎
              </FmtBtn>
            </div>
            <textarea
              ref={textRef}
              value={notiz.inhalt}
              onChange={(e) => inhaltOnChange(e.target.value)}
              onKeyDown={mentionKeyDown}
              onBlur={() => setMention(null)}
              placeholder="Schreib los … **fett**, *kursiv*, ## Überschrift, - Liste. @ verlinkt, # verschlagwortet."
              autoFocus={!titelZuerst.current}
              className="min-h-[40vh] w-full flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
            />
            {mention && mentionOptionen.length > 0 && (
              <div className="absolute bottom-4 left-0 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {mentionOptionen.map((o, i) =>
                  mention.modus === "tag" ? (
                    <button
                      key={`tag-${o.tag}-${i}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => waehleMention(o)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                        i === mentionIndex
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-blue-600">
                        #{o.tag}
                      </span>
                      {o.neu && (
                        <span className="shrink-0 text-[10px] text-gray-400">
                          neu anlegen
                        </span>
                      )}
                    </button>
                  ) : (
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
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setBearbeiten(true)}
            className="mt-4 min-h-[40vh] flex-1 cursor-text text-[15px] leading-relaxed text-gray-800"
          >
            {notiz.inhalt ? (
              <NotizInhalt
                text={notiz.inhalt}
                wissen={wissen}
                projekte={projekte}
                notizen={notizen}
                onZielKlick={onZielKlick}
                onTagKlick={onTagKlick}
              />
            ) : (
              <span className="text-gray-300">
                Leer – klicken zum Schreiben.
              </span>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Anhänge
            </p>
            <button
              onClick={() => dateiInput.current?.click()}
              className="text-xs text-gray-400 transition-colors hover:text-gray-900"
            >
              + Datei hochladen
            </button>
            <input
              ref={dateiInput}
              type="file"
              multiple
              onChange={(e) => {
                dateienHinzufuegen(e.target.files)
                e.target.value = ""
              }}
              className="hidden"
            />
          </div>
          {anhangFehler && (
            <p className="mt-2 text-xs text-red-500">{anhangFehler}</p>
          )}
          {anhaenge.length === 0 ? (
            <p className="mt-2 text-xs text-gray-300">
              Bilder, PDFs oder Dateien hierher hochladen.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {anhaenge.map((a) => (
                <div
                  key={a.id}
                  className="group/anhang relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  {istBild(a.typ) ? (
                    <a href={a.datenUri} target="_blank" rel="noreferrer">
                      <img
                        src={a.datenUri}
                        alt={a.name}
                        className="h-28 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={a.datenUri}
                      download={a.name}
                      className="flex h-28 flex-col items-center justify-center gap-1 p-2 text-center"
                    >
                      <span className="text-2xl">📄</span>
                      <span className="w-full truncate text-[11px] text-gray-600">
                        {a.name}
                      </span>
                    </a>
                  )}
                  <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                    {formatBytes(a.groesse)}
                  </span>
                  <LoeschKnopf
                    onLoeschen={() => anhangEntfernen(a.id)}
                    titel="Anhang entfernen"
                    klasse="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover/anhang:opacity-100"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

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
