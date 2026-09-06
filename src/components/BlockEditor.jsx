import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import { Fortschrittsbalken, DeadlineChip } from "./Bausteine"
import { projektFortschrittWerte } from "../lib/projekte"
import LoeschKnopf from "./LoeschKnopf"
import { WIKILINK_REGEX, findeZiel } from "../lib/wikilinks"
import { neueBlockId as neueId } from "../lib/bloecke"

// Block-Editor für Projekt-Seiten (Notion-artig): eine Seite ist eine
// Liste von Blöcken. Blöcke: Text, Überschrift, Tabelle, Dashboard und
// eingebettete Bereiche (die bestehenden Module inline).

const BEREICH_LABELS = {
  ziel: "Ziel",
  workflow: "Workflow",
  board: "Board",
  todos: "Todos",
  inhalte: "Inhalte",
  notizen: "Notizen",
  artikel: "Artikel",
  karten: "Karteikarten",
  kalender: "Kalender",
}

// Einfügbare Basis-Blöcke. `neu()` liefert je Aufruf frische Inhalte,
// damit eingefügte Blöcke keine Datenstrukturen teilen.
const BASIS_BLOECKE = [
  { label: "Text", typ: "text", neu: () => ({ text: "" }) },
  { label: "Überschrift", typ: "ueberschrift", neu: () => ({ text: "" }) },
  // Unterseite: legt beim Einfügen eine eigene Seite im Projekt an und
  // verweist hier nur darauf (wie eine Seite in einem Textdokument).
  { label: "Seite", typ: "seite", neu: () => ({}) },
  {
    label: "Tabelle",
    typ: "tabelle",
    neu: () => ({
      zeilen: [
        ["", ""],
        ["", ""],
      ],
    }),
  },
  { label: "Dashboard", typ: "dashboard", neu: () => ({}) },
  {
    label: "Checkliste",
    typ: "checkliste",
    neu: () => ({ items: [{ id: neueId(), text: "", erledigt: false }] }),
  },
  // Verweis auf einen Eintrag aus Sammeln – die Notiz bleibt dort, das
  // Projekt zeigt nur darauf.
  { label: "Notiz aus Sammeln", typ: "notiz", neu: () => ({ wissenId: null }) },
  { label: "Trenner", typ: "trenner", neu: () => ({}) },
  { label: "Callout", typ: "callout", neu: () => ({ text: "", emoji: "💡" }) },
  { label: "Link", typ: "link", neu: () => ({ url: "", titel: "" }) },
  { label: "Bild", typ: "bild", neu: () => ({ url: "", alt: "" }) },
]

// Alle einfügbaren Optionen: Basis-Blöcke + einbettbare Bereiche.
function optionenFuer(projekt, ausschluss = []) {
  const bereiche = [
    ...Object.keys(BEREICH_LABELS),
    ...(projekt.eigeneModule ?? []).map((m) => m.key),
  ]
    .filter((key) => !ausschluss.includes(key))
    .map((key) => {
      const label =
        BEREICH_LABELS[key] ??
        (projekt.eigeneModule ?? []).find((m) => m.key === key)?.label ??
        key
      return { label, typ: "bereich", neu: () => ({ key }) }
    })
  return [...BASIS_BLOECKE, ...bereiche]
}

// Randlose, automatisch mitwachsende Schreibfläche.
function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  onBlur,
  autoFocus,
  placeholder,
  className,
}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      autoFocus={autoFocus}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none border-none bg-transparent outline-none placeholder:text-gray-300 ${className}`}
    />
  )
}

// Textblock. Enthält der Text "[[Titel]]"-Verweise, wird er außerhalb des
// Schreibens als Fließtext mit klickbaren Verweisen gezeigt (ein Klick
// hinein macht ihn wieder editierbar). So sind Verknüpfungen nach Sammeln
// nicht nur Syntax, sondern echte Wege.
function TextBlock({ block, onChange, onKeyDown, linkKontext }) {
  const [schreiben, setSchreiben] = useState(false)
  const text = block.text ?? ""
  const hatLinks = WIKILINK_REGEX.test(text)
  WIKILINK_REGEX.lastIndex = 0

  if (hatLinks && !schreiben) {
    return (
      <p
        onClick={() => setSchreiben(true)}
        className="cursor-text text-[15px] leading-relaxed text-gray-800"
      >
        {text.split(WIKILINK_REGEX).map((teil, i) =>
          i % 2 === 1 ? (
            <WikiLink key={i} titel={teil} kontext={linkKontext} />
          ) : (
            <span key={i}>{teil}</span>
          )
        )}
      </p>
    )
  }

  return (
    <AutoTextarea
      value={text}
      onChange={(t) => onChange({ ...block, text: t })}
      onKeyDown={onKeyDown}
      onBlur={() => setSchreiben(false)}
      autoFocus={schreiben}
      placeholder="Schreib etwas, oder tippe / für einen Block …"
      className="text-[15px] leading-relaxed text-gray-800"
    />
  )
}

// Ein "[[Titel]]"-Verweis: führt in Sammeln, in ein Projekt oder in eine
// Projekt-Notiz. Unbekannte Ziele bleiben dezent und nicht klickbar.
function WikiLink({ titel, kontext }) {
  const { wissen = [], projekte = [], notizen = [], onZielKlick } = kontext ?? {}
  const ziel = findeZiel(titel, wissen, projekte, notizen)
  if (!ziel) {
    return (
      <span
        title="Kein Ziel mit diesem Titel"
        className="rounded-sm bg-gray-100 px-1 text-gray-400"
      >
        {titel}
      </span>
    )
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onZielKlick?.(ziel)
      }}
      className="rounded-sm px-0.5 font-medium text-accent-600 underline decoration-accent-200 underline-offset-4 hover:bg-accent-50"
    >
      {ziel.titel}
    </button>
  )
}

// Verweis auf einen Sammeln-Eintrag: zeigt Titel und Anfang des Inhalts,
// Klick öffnet ihn in Sammeln. Ohne Auswahl steht hier ein Wähler.
function NotizBlock({ block, onChange, kontext }) {
  const { wissen = [], onNotizOeffnen, onNotizNeu } = kontext ?? {}
  const [neuerTitel, setNeuerTitel] = useState("")
  const notiz = wissen.find((w) => w.id === block.wissenId)

  if (!notiz) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-3">
        <p className="text-xs text-gray-400">Notiz aus Sammeln wählen</p>
        <select
          value=""
          onChange={(e) =>
            onChange({ ...block, wissenId: Number(e.target.value) })
          }
          className="mt-1.5 w-full cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-gray-900"
        >
          <option value="">– Notiz wählen –</option>
          {wissen.map((w) => (
            <option key={w.id} value={w.id}>
              {w.titel?.trim() || "Ohne Titel"}
            </option>
          ))}
        </select>
        {onNotizNeu && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!neuerTitel.trim()) return
              const id = onNotizNeu(neuerTitel.trim())
              setNeuerTitel("")
              if (id != null) onChange({ ...block, wissenId: id })
            }}
            className="mt-1.5 flex gap-1.5"
          >
            <input
              value={neuerTitel}
              onChange={(e) => setNeuerTitel(e.target.value)}
              placeholder="… oder neue Notiz anlegen"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              In Sammeln anlegen
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onNotizOeffnen?.(notiz.id)}
      className="flex w-full items-start gap-2.5 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-gray-400"
    >
      <span className="text-gray-400">📝</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">
          {notiz.titel?.trim() || "Ohne Titel"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-gray-400">
          {(notiz.inhalt ?? "").replace(/\s+/g, " ").slice(0, 90) || "Leer"}
        </span>
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-widest text-gray-300">
        Sammeln
      </span>
    </button>
  )
}

function UeberschriftBlock({ block, onChange, onKeyDown }) {
  return (
    <AutoTextarea
      value={block.text ?? ""}
      onChange={(text) => onChange({ ...block, text })}
      onKeyDown={onKeyDown}
      placeholder="Überschrift"
      className="text-xl font-semibold tracking-tight text-gray-900"
    />
  )
}

function TabelleBlock({ block, onChange }) {
  const zeilen = block.zeilen ?? [
    ["", ""],
    ["", ""],
  ]
  const spalten = zeilen[0]?.length ?? 1

  function setCell(r, c, v) {
    onChange({
      ...block,
      zeilen: zeilen.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? v : cell))
      ),
    })
  }
  const addSpalte = () =>
    onChange({ ...block, zeilen: zeilen.map((row) => [...row, ""]) })
  const addZeile = () =>
    onChange({ ...block, zeilen: [...zeilen, Array(spalten).fill("")] })
  const removeZeile = () =>
    zeilen.length > 1 && onChange({ ...block, zeilen: zeilen.slice(0, -1) })
  const removeSpalte = () =>
    spalten > 1 &&
    onChange({ ...block, zeilen: zeilen.map((row) => row.slice(0, -1)) })

  return (
    <div className="py-1">
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <tbody>
            {zeilen.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-gray-200 p-0">
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      placeholder={r === 0 ? "Spalte" : ""}
                      className={`w-full min-w-28 bg-transparent px-2.5 py-1.5 outline-none transition-colors focus:bg-gray-50 ${
                        r === 0
                          ? "font-medium text-gray-900 placeholder:text-gray-300"
                          : "text-gray-700"
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1 text-xs text-gray-400">
        {[
          ["+ Zeile", addZeile],
          ["+ Spalte", addSpalte],
          ["− Zeile", removeZeile],
          ["− Spalte", removeSpalte],
        ].map(([label, fn]) => (
          <button
            key={label}
            onClick={fn}
            className="rounded-sm px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-900"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Kachel({ label, children }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function DashboardBlock({ projekt }) {
  const [todos] = useStored("todos", [])
  const [karten] = useStored("karten", [])
  const [deepwork] = useStored("deepwork", [])
  const gehoert = (e) => e.projektId === projekt.id || e.kursId === projekt.id

  const eigene = todos.filter(gehoert)
  const offen = eigene.filter((t) => !t.erledigt).length
  const fortschritt = projektFortschrittWerte(projekt, todos)
  const faellig = karten.filter(
    (k) => gehoert(k) && (!k.faellig || k.faellig <= heute())
  ).length
  const fokusMin = deepwork
    .filter((s) => s.projektId === projekt.id)
    .reduce((summe, s) => summe + (s.minuten ?? 0), 0)
  const fokusText =
    fokusMin === 0
      ? "—"
      : fokusMin >= 60
        ? `${Math.floor(fokusMin / 60)} Std ${fokusMin % 60} Min`
        : `${fokusMin} Min`

  return (
    <div className="grid gap-3 py-1 sm:grid-cols-2">
      <Kachel label="Fortschritt">
        <Fortschrittsbalken {...fortschritt} />
      </Kachel>
      <Kachel label="Offene Todos">
        <p className="text-2xl font-semibold tracking-tight text-gray-900">
          {offen}
          <span className="ml-1 text-sm font-normal text-gray-400">
            / {eigene.length}
          </span>
        </p>
      </Kachel>
      <Kachel label="Nächste Deadline">
        {projekt.deadline ? (
          <span className="flex items-center gap-2 text-sm text-gray-700">
            {new Date(projekt.deadline).toLocaleDateString("de-DE")}
            <DeadlineChip datum={projekt.deadline} />
          </span>
        ) : (
          <span className="text-sm text-gray-400">Keine</span>
        )}
      </Kachel>
      <Kachel label="Fällige Karteikarten">
        <p className="text-2xl font-semibold tracking-tight text-gray-900">
          {faellig}
        </p>
      </Kachel>
      <Kachel label="Fokuszeit">
        <p className="text-2xl font-semibold tracking-tight text-gray-900">
          {fokusText}
        </p>
      </Kachel>
    </div>
  )
}

function ChecklisteBlock({ block, onChange }) {
  const items = block.items ?? []
  const setItem = (id, patch) =>
    onChange({
      ...block,
      items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    })
  const addItem = () =>
    onChange({
      ...block,
      items: [...items, { id: neueId(), text: "", erledigt: false }],
    })
  const removeItem = (id) =>
    onChange({ ...block, items: items.filter((it) => it.id !== id) })

  return (
    <ul className="space-y-1 py-1">
      {items.map((it) => (
        <li key={it.id} className="group/z flex items-center gap-2">
          <input
            type="checkbox"
            checked={it.erledigt}
            onChange={(e) => setItem(it.id, { erledigt: e.target.checked })}
            className="h-4 w-4 accent-gray-900"
          />
          <input
            value={it.text}
            onChange={(e) => setItem(it.id, { text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addItem()
              }
            }}
            placeholder="Listenpunkt"
            className={`flex-1 border-none bg-transparent text-sm outline-none placeholder:text-gray-300 ${
              it.erledigt ? "text-gray-400 line-through" : "text-gray-800"
            }`}
          />
          <LoeschKnopf
            onLoeschen={() => removeItem(it.id)}
            titel="Punkt löschen"
            klasse="text-gray-300 opacity-0 group-hover/z:opacity-100"
          />
        </li>
      ))}
      <li>
        <button
          onClick={addItem}
          className="text-xs text-gray-400 transition-colors hover:text-gray-900"
        >
          + Punkt
        </button>
      </li>
    </ul>
  )
}

function TrennerBlock() {
  return <hr className="my-3 border-gray-200" />
}

function CalloutBlock({ block, onChange }) {
  return (
    <div className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <input
        value={block.emoji ?? "💡"}
        onChange={(e) => onChange({ ...block, emoji: e.target.value })}
        maxLength={2}
        className="w-6 shrink-0 border-none bg-transparent text-center text-base outline-none"
      />
      <AutoTextarea
        value={block.text ?? ""}
        onChange={(text) => onChange({ ...block, text })}
        placeholder="Hinweis, Merksatz, Warnung …"
        className="text-sm leading-relaxed text-gray-700"
      />
    </div>
  )
}

function LinkBlock({ block, onChange }) {
  const [bearbeiten, setBearbeiten] = useState(!block.url)
  if (bearbeiten) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2">
        <input
          value={block.url ?? ""}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="https://…"
          className="min-w-40 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <input
          value={block.titel ?? ""}
          onChange={(e) => onChange({ ...block, titel: e.target.value })}
          placeholder="Titel (optional)"
          className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          onClick={() => block.url && setBearbeiten(false)}
          className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
        >
          OK
        </button>
      </div>
    )
  }
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-400"
    >
      <span className="text-gray-400">🔗</span>
      <span className="flex-1 truncate text-sm font-medium text-gray-900">
        {block.titel || block.url}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault()
          setBearbeiten(true)
        }}
        className="text-xs text-gray-400 hover:text-gray-900"
      >
        bearbeiten
      </button>
    </a>
  )
}

function BildBlock({ block, onChange }) {
  return (
    <div className="py-1">
      {block.url && (
        <img
          src={block.url}
          alt={block.alt ?? ""}
          className="max-h-96 max-w-full rounded-lg border border-gray-200"
        />
      )}
      <input
        value={block.url ?? ""}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
        placeholder="Bild-URL (https://…)"
        className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-gray-900"
      />
    </div>
  )
}

function BereichBlock({ block, bereichRenderer, projekt }) {
  const label =
    BEREICH_LABELS[block.key] ??
    (projekt.eigeneModule ?? []).find((m) => m.key === block.key)?.label ??
    "Bereich"
  const inhalt = bereichRenderer?.(block.key)
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      {inhalt ?? (
        <p className="text-sm text-gray-400">Bereich nicht verfügbar.</p>
      )}
    </div>
  )
}

// Verweis auf eine Unterseite – schlanke Zeile, Klick öffnet die Seite.
function SeiteBlock({ block, seiten, onOeffnen }) {
  const seite = seiten.find((s) => s.id === block.seiteId)
  if (!seite) {
    return (
      <p className="px-1 py-1.5 text-sm text-gray-400">Seite nicht gefunden.</p>
    )
  }
  const anzahl = (seite.bloecke ?? []).length
  return (
    <button
      onClick={() => onOeffnen?.(seite.id)}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-gray-100/70"
    >
      <span className="text-gray-400">📄</span>
      <span className="min-w-0 flex-1 truncate text-[15px] text-gray-800 underline decoration-gray-200 underline-offset-4">
        {seite.titel?.trim() || "Unbenannte Seite"}
      </span>
      <span className="shrink-0 text-xs text-gray-300">
        {anzahl === 0 ? "leer" : `${anzahl} Blöcke`}
      </span>
    </button>
  )
}

// Ein Eintrag im Einfügen-Menü.
function MenuEintrag({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </button>
  )
}

const SLASH_ERKENNEN = /(?:^|\s)\/([^\s/]*)$/
const SLASH_ENTFERNEN = /(?:^|\s)\/[^\s/]*$/

export default function BlockEditor({
  bloecke,
  onChange,
  bereichRenderer,
  projekt,
  ausschluss = [],
  // Unterseiten des Projekts: Liste plus Rückrufe zum Anlegen, Öffnen und
  // Löschen. Fehlen sie, verhält sich der Editor wie zuvor.
  seiten = [],
  onSeiteNeu,
  onSeiteOeffnen,
  onSeiteLoeschen,
  // Verknüpfungen: Ziele für "[[Titel]]"-Verweise und Notiz-Blöcke.
  linkKontext,
}) {
  const [menuOffen, setMenuOffen] = useState(false)
  // Slash-Menü: { blockId, query } | null, plus markierter Eintrag.
  const [slash, setSlash] = useState(null)
  const [slashIndex, setSlashIndex] = useState(0)
  // Index des gerade gezogenen Blocks (Drag&Drop-Reihenfolge).
  const [ziehIndex, setZiehIndex] = useState(null)

  // Ohne Seiten-Rückrufe (z.B. eingebettete Editoren) bleibt „Seite" außen vor.
  const optionen = optionenFuer(projekt, ausschluss).filter(
    (o) => o.typ !== "seite" || onSeiteNeu
  )
  const basisOptionen = optionen.filter((o) => o.typ !== "bereich")
  const bereichOptionen = optionen.filter((o) => o.typ === "bereich")
  const slashOptionen = slash
    ? optionen.filter((o) =>
        o.label.toLowerCase().includes(slash.query.toLowerCase())
      )
    : []

  const updateBlock = (id, neu) =>
    onChange(bloecke.map((b) => (b.id === id ? neu : b)))

  // Neuer Block; ein Seiten-Block legt zugleich die Seite selbst an.
  function neuerBlock(option) {
    const block = { id: neueId(), typ: option.typ, ...option.neu() }
    if (option.typ === "seite") block.seiteId = onSeiteNeu?.() ?? null
    return block
  }

  // Mit dem Verweis verschwindet auch die Seite dahinter (samt ihrer
  // eigenen Unterseiten) – sonst bliebe sie unerreichbar liegen. Erst
  // vormerken, dann speichern: onChange schreibt beides in einem Zug.
  function removeBlock(id) {
    const block = bloecke.find((b) => b.id === id)
    if (block?.typ === "seite" && block.seiteId) onSeiteLoeschen?.(block.seiteId)
    onChange(bloecke.filter((b) => b.id !== id))
  }
  function moveBlock(i, dir) {
    const j = i + dir
    if (j < 0 || j >= bloecke.length) return
    const neu = [...bloecke]
    ;[neu[i], neu[j]] = [neu[j], neu[i]]
    onChange(neu)
  }
  function dropAuf(zielIndex) {
    if (ziehIndex == null || ziehIndex === zielIndex) return
    const neu = [...bloecke]
    const [gezogen] = neu.splice(ziehIndex, 1)
    neu.splice(zielIndex, 0, gezogen)
    onChange(neu)
    setZiehIndex(null)
  }
  function addBlock(option) {
    onChange([...bloecke, neuerBlock(option)])
    setMenuOffen(false)
  }

  // Änderung in einem Text-/Überschrift-Block: speichern und prüfen, ob
  // ein „/…" am Ende steht (Slash-Menü öffnen/filtern).
  function textOnChange(block, neu) {
    updateBlock(block.id, neu)
    const m = SLASH_ERKENNEN.exec(neu.text ?? "")
    if (m) {
      setSlash({ blockId: block.id, query: m[1] })
      setSlashIndex(0)
    } else if (slash?.blockId === block.id) {
      setSlash(null)
    }
  }

  // Auswahl aus dem Slash-Menü: „/…" entfernen; ist die Zeile danach
  // leer, den Block ersetzen, sonst neuen Block dahinter einfügen.
  function waehle(option) {
    if (!slash) return
    const block = bloecke.find((b) => b.id === slash.blockId)
    setSlash(null)
    if (!block) return
    const rest = (block.text ?? "").replace(SLASH_ENTFERNEN, "")
    const eingefuegt = neuerBlock(option)
    if (rest.trim() === "") {
      onChange(bloecke.map((b) => (b.id === block.id ? eingefuegt : b)))
    } else {
      const neu = []
      for (const b of bloecke) {
        neu.push(b.id === block.id ? { ...b, text: rest } : b)
        if (b.id === block.id) neu.push(eingefuegt)
      }
      onChange(neu)
    }
  }

  function slashKeyDown(block, e) {
    if (!slash || slash.blockId !== block.id) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSlashIndex((i) => Math.min(i + 1, slashOptionen.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSlashIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      if (slashOptionen[slashIndex]) {
        e.preventDefault()
        waehle(slashOptionen[slashIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSlash(null)
    }
  }

  return (
    <div>
      <div className="space-y-1">
        {bloecke.map((block, i) => (
          <div
            key={block.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropAuf(i)}
            className={`group relative rounded-md px-1 py-0.5 transition-colors hover:bg-gray-50/60 ${
              ziehIndex === i ? "opacity-40" : ""
            }`}
          >
            <div className="absolute right-0 top-0.5 z-10 flex items-center gap-0.5 rounded-md bg-white/80 px-1 text-sm opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              <span
                draggable
                onDragStart={() => setZiehIndex(i)}
                onDragEnd={() => setZiehIndex(null)}
                title="Zum Verschieben ziehen"
                className="cursor-grab select-none px-1 text-gray-300 hover:text-gray-600"
              >
                ⠿
              </span>
              <button
                onClick={() => moveBlock(i, -1)}
                title="Nach oben"
                className="rounded-sm px-1 text-gray-300 hover:text-gray-900"
              >
                ↑
              </button>
              <button
                onClick={() => moveBlock(i, 1)}
                title="Nach unten"
                className="rounded-sm px-1 text-gray-300 hover:text-gray-900"
              >
                ↓
              </button>
              <LoeschKnopf
                onLoeschen={() => removeBlock(block.id)}
                titel={block.typ === "seite" ? "Seite löschen" : "Block löschen"}
                frageText={
                  block.typ === "seite" ? "Seite löschen?" : "Block löschen?"
                }
                klasse="rounded-sm px-1 text-gray-300"
              />
            </div>

            {block.typ === "text" && (
              <TextBlock
                block={block}
                onChange={(n) => textOnChange(block, n)}
                onKeyDown={(e) => slashKeyDown(block, e)}
                linkKontext={linkKontext}
              />
            )}
            {block.typ === "ueberschrift" && (
              <UeberschriftBlock
                block={block}
                onChange={(n) => textOnChange(block, n)}
                onKeyDown={(e) => slashKeyDown(block, e)}
              />
            )}
            {block.typ === "tabelle" && (
              <TabelleBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "dashboard" && <DashboardBlock projekt={projekt} />}
            {block.typ === "checkliste" && (
              <ChecklisteBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "trenner" && <TrennerBlock />}
            {block.typ === "callout" && (
              <CalloutBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "link" && (
              <LinkBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "bild" && (
              <BildBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "notiz" && (
              <NotizBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
                kontext={linkKontext}
              />
            )}
            {block.typ === "seite" && (
              <SeiteBlock
                block={block}
                seiten={seiten}
                onOeffnen={onSeiteOeffnen}
              />
            )}
            {block.typ === "bereich" && (
              <BereichBlock
                block={block}
                bereichRenderer={bereichRenderer}
                projekt={projekt}
              />
            )}

            {slash && slash.blockId === block.id && (
              <div className="absolute left-2 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
                {slashOptionen.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-gray-400">
                    Keine Treffer
                  </p>
                ) : (
                  slashOptionen.map((o, idx) => (
                    <button
                      key={o.label + idx}
                      onMouseEnter={() => setSlashIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => waehle(o)}
                      className={`block w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                        idx === slashIndex
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Einfügen: ein schmales Menü statt einer Knopfleiste – dieselbe
          Liste, die auch das Slash-Menü zeigt. */}
      <div className="relative mt-2">
        <button
          onClick={() => setMenuOffen(!menuOffen)}
          className="rounded-md px-1 py-1 text-sm text-gray-300 transition-colors hover:text-gray-900"
        >
          + Einfügen <span className="text-xs">oder „/“ tippen</span>
        </button>
        {menuOffen && (
          <>
            <div
              onClick={() => setMenuOffen(false)}
              className="fixed inset-0 z-20"
            />
            <div className="absolute left-0 z-30 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-md">
              <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Blöcke
              </p>
              {basisOptionen.map((o) => (
                <MenuEintrag key={o.typ} onClick={() => addBlock(o)}>
                  {o.label}
                </MenuEintrag>
              ))}
              {bereichOptionen.length > 0 && (
                <>
                  <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Bereich einbetten
                  </p>
                  {bereichOptionen.map((o) => (
                    <MenuEintrag key={o.label} onClick={() => addBlock(o)}>
                      {o.label}
                    </MenuEintrag>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
