import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import {
  projektFortschrittWerte,
  Fortschrittsbalken,
  DeadlineChip,
} from "./OrdnerSeite"

// Block-Editor für Projekt-Seiten (Notion-artig): eine Seite ist eine
// Liste von Blöcken. Blöcke: Text, Überschrift, Tabelle, Dashboard und
// eingebettete Bereiche (die bestehenden Module inline).

const BEREICH_LABELS = {
  ziel: "Ziel",
  workflow: "Workflow",
  todos: "Todos",
  inhalte: "Inhalte",
  notizen: "Notizen",
  karten: "Karteikarten",
  kalender: "Kalender",
}

// Liefert die Blockliste einer Quelle (Projekt oder eigener Bereich).
// Migration: ein altes Freitext-Feld wird zu einem einzelnen Text-Block.
export function bloeckeVon(quelle, textFeld = "uebersicht") {
  if (Array.isArray(quelle?.bloecke)) return quelle.bloecke
  const text = quelle?.[textFeld]
  if (typeof text === "string" && text.trim()) {
    return [{ id: 1, typ: "text", text }]
  }
  return []
}

let idZaehler = Date.now()
function neueId() {
  idZaehler += 1
  return idZaehler
}

// Randlose, automatisch mitwachsende Schreibfläche.
function AutoTextarea({ value, onChange, placeholder, className }) {
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
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none border-none bg-transparent outline-none placeholder:text-gray-300 ${className}`}
    />
  )
}

function TextBlock({ block, onChange }) {
  return (
    <AutoTextarea
      value={block.text ?? ""}
      onChange={(text) => onChange({ ...block, text })}
      placeholder="Schreib etwas, oder füge unten einen Block ein …"
      className="text-[15px] leading-relaxed text-gray-800"
    />
  )
}

function UeberschriftBlock({ block, onChange }) {
  return (
    <AutoTextarea
      value={block.text ?? ""}
      onChange={(text) => onChange({ ...block, text })}
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
            className="rounded px-1.5 py-0.5 hover:bg-gray-100 hover:text-gray-900"
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
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function DashboardBlock({ projekt }) {
  const [todos] = useStored("todos", [])
  const [karten] = useStored("karten", [])
  const gehoert = (e) => e.projektId === projekt.id || e.kursId === projekt.id

  const eigene = todos.filter(gehoert)
  const offen = eigene.filter((t) => !t.erledigt).length
  const fortschritt = projektFortschrittWerte(projekt, todos)
  const faellig = karten.filter(
    (k) => gehoert(k) && (!k.faellig || k.faellig <= heute())
  ).length

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
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      {inhalt ?? (
        <p className="text-sm text-gray-400">Bereich nicht verfügbar.</p>
      )}
    </div>
  )
}

function MenuBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
    >
      {children}
    </button>
  )
}

export default function BlockEditor({
  bloecke,
  onChange,
  bereichRenderer,
  projekt,
  ausschluss = [],
}) {
  const [menuOffen, setMenuOffen] = useState(false)
  const [bereichMenu, setBereichMenu] = useState(false)

  const updateBlock = (id, neu) =>
    onChange(bloecke.map((b) => (b.id === id ? neu : b)))
  const removeBlock = (id) => onChange(bloecke.filter((b) => b.id !== id))
  function moveBlock(i, dir) {
    const j = i + dir
    if (j < 0 || j >= bloecke.length) return
    const neu = [...bloecke]
    ;[neu[i], neu[j]] = [neu[j], neu[i]]
    onChange(neu)
  }
  function addBlock(typ, extra = {}) {
    onChange([...bloecke, { id: neueId(), typ, ...extra }])
    setMenuOffen(false)
    setBereichMenu(false)
  }

  const verfuegbareBereiche = [
    ...Object.keys(BEREICH_LABELS),
    ...(projekt.eigeneModule ?? []).map((m) => m.key),
  ].filter((key) => !ausschluss.includes(key))

  return (
    <div>
      <div className="space-y-1">
        {bloecke.map((block, i) => (
          <div
            key={block.id}
            className="group relative rounded-md px-1 py-0.5 transition-colors hover:bg-gray-50/60"
          >
            <div className="absolute right-0 top-0.5 z-10 flex items-center gap-0.5 rounded-md bg-white/80 px-1 text-sm opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              <button
                onClick={() => moveBlock(i, -1)}
                title="Nach oben"
                className="rounded px-1 text-gray-300 hover:text-gray-900"
              >
                ↑
              </button>
              <button
                onClick={() => moveBlock(i, 1)}
                title="Nach unten"
                className="rounded px-1 text-gray-300 hover:text-gray-900"
              >
                ↓
              </button>
              <button
                onClick={() => removeBlock(block.id)}
                title="Block löschen"
                className="rounded px-1 text-gray-300 hover:text-red-500"
              >
                ×
              </button>
            </div>

            {block.typ === "text" && (
              <TextBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "ueberschrift" && (
              <UeberschriftBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "tabelle" && (
              <TabelleBlock
                block={block}
                onChange={(n) => updateBlock(block.id, n)}
              />
            )}
            {block.typ === "dashboard" && <DashboardBlock projekt={projekt} />}
            {block.typ === "bereich" && (
              <BereichBlock
                block={block}
                bereichRenderer={bereichRenderer}
                projekt={projekt}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        {!menuOffen ? (
          <button
            onClick={() => setMenuOffen(true)}
            className="rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            + Block einfügen
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 p-2">
            <MenuBtn onClick={() => addBlock("text", { text: "" })}>
              Text
            </MenuBtn>
            <MenuBtn onClick={() => addBlock("ueberschrift", { text: "" })}>
              Überschrift
            </MenuBtn>
            <MenuBtn
              onClick={() =>
                addBlock("tabelle", {
                  zeilen: [
                    ["", ""],
                    ["", ""],
                  ],
                })
              }
            >
              Tabelle
            </MenuBtn>
            <MenuBtn onClick={() => addBlock("dashboard")}>Dashboard</MenuBtn>
            <div className="relative">
              <MenuBtn onClick={() => setBereichMenu(!bereichMenu)}>
                Bereich einbetten ▾
              </MenuBtn>
              {bereichMenu && (
                <div className="absolute left-0 z-20 mt-1 flex w-44 flex-col rounded-lg border border-gray-200 bg-white p-1 shadow-md">
                  {verfuegbareBereiche.map((key) => (
                    <button
                      key={key}
                      onClick={() => addBlock("bereich", { key })}
                      className="rounded px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    >
                      {BEREICH_LABELS[key] ??
                        (projekt.eigeneModule ?? []).find((m) => m.key === key)
                          ?.label ??
                        key}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setMenuOffen(false)
                setBereichMenu(false)
              }}
              className="ml-auto px-1.5 py-1 text-xs text-gray-400 hover:text-gray-900"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
