import { useMemo, useRef, useState } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"
import { NotizBearbeiten } from "./ProjektNotizen"
import WissensGraph from "./WissensGraph"
import TagsAnsicht from "./TagsAnsicht"
import LernenGlobal from "./LernenGlobal"
import { Suchfeld, SortMenu } from "./ListenControls"
import { erkenneDatum, erkenneProjekt } from "../lib/erkennung"
import { tageBis } from "../lib/datum"
import { VORLAGEN } from "../lib/wissen"
import { extrahiereWikilinks } from "../lib/wikilinks"

const WISSEN_SORT = [
  { value: "bearbeitet", label: "Zuletzt bearbeitet" },
  { value: "neueste", label: "Neueste" },
  { value: "aelteste", label: "Älteste" },
  { value: "titel", label: "Titel A–Z" },
]

// Sammeln: der reibungslose Einfangpunkt für alles ("zweites Gehirn").
// Inbox = schnell erfassen, später verarbeiten (GTD-Prinzip). Wissen =
// projektfreie Referenz-Notizen mit "[[Titel]]"-Verlinkung zu anderem
// Wissen/Projekten (siehe NotizBearbeiten). Graph = visuelle Übersicht
// aller Verlinkungen.

const ANSICHTEN = [
  { key: "inbox", label: "Inbox" },
  { key: "wissen", label: "Wissen" },
  { key: "tags", label: "Tags" },
  { key: "lernen", label: "Lernen" },
  { key: "graph", label: "Graph" },
]

function AnsichtToggle({ ansicht, setAnsicht }) {
  return (
    <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
      {ANSICHTEN.map((a) => (
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
  )
}

export default function SammelnSeite({ onNavigate, startAnsicht = null }) {
  const [ansicht, setAnsicht] = useState(() =>
    ANSICHTEN.some((a) => a.key === startAnsicht) ? startAnsicht : "inbox"
  )
  // Vorgemerktes Schlagwort (z.B. per Klick auf einen Tag-Chip): beim Wechsel
  // in die Tags-Ansicht direkt geöffnet, bei manuellem Tab-Wechsel verworfen.
  const [tagWunsch, setTagWunsch] = useState(null)

  function waehleAnsicht(key) {
    setTagWunsch(null)
    setAnsicht(key)
  }

  function oeffneTag(tag) {
    setTagWunsch(tag)
    setAnsicht("tags")
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf
        titel="Sammeln"
        aktion={<AnsichtToggle ansicht={ansicht} setAnsicht={waehleAnsicht} />}
      />
      {ansicht === "inbox" && <InboxAnsicht />}
      {ansicht === "wissen" && (
        <WissenAnsicht onNavigate={onNavigate} onTagKlick={oeffneTag} />
      )}
      {ansicht === "tags" && (
        <TagsAnsicht onNavigate={onNavigate} startTag={tagWunsch} />
      )}
      {ansicht === "lernen" && <LernenGlobal />}
      {ansicht === "graph" && (
        <WissensGraph onNavigate={onNavigate} onTagKlick={oeffneTag} />
      )}
    </div>
  )
}

function InboxAnsicht() {
  const [inbox, setInbox] = useStored("inbox", [])
  const [todos, setTodos] = useStored("todos", [])
  const [wissen, setWissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [text, setText] = useState("")
  const [sort, setSort] = useStored("inboxSort", "neueste")

  const sortiert = [...inbox].sort((a, b) =>
    sort === "aelteste" ? a.id - b.id : b.id - a.id
  )

  function addInboxItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setInbox([
      ...inbox,
      { id: Date.now(), text: text.trim(), erstelltAm: new Date().toISOString() },
    ])
    setText("")
  }

  function verarbeiteAlsTodo(item, projektId = null, datum = "") {
    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: item.text,
        projektId: projektId ? Number(projektId) : null,
        kursId: null,
        dauer: null,
        datum,
        wichtig: false,
        dringend: false,
        erledigt: false,
      },
    ])
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  function verarbeiteAlsNotiz(item) {
    setWissen([...wissen, { id: Date.now(), titel: item.text, inhalt: "" }])
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  function verwerfe(item) {
    setInbox(inbox.filter((i) => i.id !== item.id))
  }

  return (
    <div>
      <form onSubmit={addInboxItem} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was auch immer dir gerade durch den Kopf geht…"
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Erfassen
        </button>
      </form>

      {inbox.length === 0 ? null : (
        <>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {inbox.length} {inbox.length === 1 ? "Eintrag" : "Einträge"}
          </span>
          <SortMenu
            wert={sort}
            onChange={setSort}
            optionen={[
              { value: "neueste", label: "Neueste" },
              { value: "aelteste", label: "Älteste" },
            ]}
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {sortiert.map((item) => {
            const erkanntesDatum = erkenneDatum(item.text)
            const erkanntesProjekt = erkenneProjekt(item.text, projekte)
            return (
              <li
                key={item.id}
                className="group flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                  {item.text}
                </span>
                {(erkanntesDatum || erkanntesProjekt) && (
                  <div className="flex items-center gap-1.5">
                    {erkanntesDatum && (
                      <span
                        title="Erkanntes Datum"
                        className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                      >
                        📅 {tageBis(erkanntesDatum)}
                      </span>
                    )}
                    {erkanntesProjekt && (
                      <span
                        title="Erkanntes Projekt"
                        className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                      >
                        📁 {erkanntesProjekt.name}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() =>
                      verarbeiteAlsTodo(
                        item,
                        erkanntesProjekt?.id ?? null,
                        erkanntesDatum ?? ""
                      )
                    }
                    className="rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    → Todo
                  </button>
                  <select
                    defaultValue={erkanntesProjekt ? String(erkanntesProjekt.id) : ""}
                    onChange={(e) => {
                      if (e.target.value)
                        verarbeiteAlsTodo(item, e.target.value, erkanntesDatum ?? "")
                    }}
                    className="rounded-sm border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 outline-none"
                  >
                    <option value="">→ Projekt…</option>
                    {projekte.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => verarbeiteAlsNotiz(item)}
                    className="rounded-sm bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    → Wissen
                  </button>
                  <button
                    onClick={() => verwerfe(item)}
                    title="Verwerfen"
                    className="px-1 text-gray-300 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        </>
      )}
    </div>
  )
}

function WissenAnsicht({ onNavigate, onTagKlick }) {
  const [wissen, setWissen] = useStored("wissen", [])
  const [ordner, setOrdner] = useStored("wissenOrdner", [])
  const [projekte] = useStored("projekte", [])
  const [notizen] = useStored("notizen", [])
  const [bearbeiteId, setBearbeiteId] = useState(null)
  const [suche, setSuche] = useState("")
  const [sort, setSort] = useStored("wissenSort", "bearbeitet")
  // Aktiver Ordner-Filter: "alle" | "angepinnt" | <ordnerId>.
  const [aktiverOrdner, setAktiverOrdner] = useState("alle")
  const [neuOffen, setNeuOffen] = useState(false)

  const bearbeiteteNotiz = wissen.find((w) => w.id === bearbeiteId)

  // Eingehende Verlinkungen je Titel (für die ↩-Zahl auf den Karten) und
  // Anzahl Einträge je Ordner (für die Zähler in der Ordner-Leiste).
  const eingehend = useMemo(() => {
    const map = new Map()
    for (const w of wissen)
      for (const t of extrahiereWikilinks(w.inhalt)) {
        const k = t.toLowerCase()
        map.set(k, (map.get(k) ?? 0) + 1)
      }
    return map
  }, [wissen])

  const ordnerCounts = useMemo(() => {
    const m = new Map()
    for (const w of wissen)
      if (w.ordnerId) m.set(w.ordnerId, (m.get(w.ordnerId) ?? 0) + 1)
    return m
  }, [wissen])

  const angepinntCount = wissen.filter((w) => w.angepinnt).length

  // Gefiltert (Ordner + Suche), sortiert; Angeheftete zuerst (außer im
  // expliziten „Angeheftet"-Filter).
  const sichtbareWissen = useMemo(() => {
    const q = suche.trim().toLowerCase()
    let liste = wissen
    if (aktiverOrdner === "angepinnt") liste = liste.filter((w) => w.angepinnt)
    else if (aktiverOrdner !== "alle") {
      const ids = ordnerMitNachkommen(aktiverOrdner, ordner)
      liste = liste.filter((w) => ids.has(w.ordnerId))
    }
    if (q)
      liste = liste.filter(
        (w) =>
          (w.titel ?? "").toLowerCase().includes(q) ||
          (w.inhalt ?? "").toLowerCase().includes(q)
      )
    const sortiert = [...liste].sort((a, b) => {
      if (sort === "titel") return (a.titel ?? "").localeCompare(b.titel ?? "")
      if (sort === "aelteste") return a.id - b.id
      if (sort === "neueste") return b.id - a.id
      return (b.aktualisiertAm ?? b.id) - (a.aktualisiertAm ?? a.id)
    })
    if (aktiverOrdner === "angepinnt") return sortiert
    return [...sortiert].sort(
      (a, b) => (b.angepinnt ? 1 : 0) - (a.angepinnt ? 1 : 0)
    )
  }, [wissen, suche, sort, aktiverOrdner, ordner])

  function erstelle(vorlage) {
    const neu = {
      id: Date.now(),
      titel: "",
      inhalt: vorlage.inhalt,
      aktualisiertAm: Date.now(),
      ordnerId:
        aktiverOrdner !== "alle" && aktiverOrdner !== "angepinnt"
          ? aktiverOrdner
          : null,
    }
    setWissen([...wissen, neu])
    setNeuOffen(false)
    setBearbeiteId(neu.id)
  }

  function updateWissen(neu) {
    setWissen(
      wissen.map((w) =>
        w.id === neu.id ? { ...neu, aktualisiertAm: Date.now() } : w
      )
    )
  }
  function removeWissen(id) {
    setWissen(wissen.filter((w) => w.id !== id))
    if (bearbeiteId === id) setBearbeiteId(null)
  }
  function togglePin(id) {
    setWissen(
      wissen.map((w) => (w.id === id ? { ...w, angepinnt: !w.angepinnt } : w))
    )
  }
  function setzeOrdner(id, ordnerId) {
    setWissen(wissen.map((w) => (w.id === id ? { ...w, ordnerId } : w)))
  }

  // Neuer Ordner: liegt im gerade aktiven Ordner (→ Unterordner), sonst oben.
  function addOrdner(name) {
    const n = name.trim()
    if (!n) return
    const parentId =
      aktiverOrdner !== "alle" && aktiverOrdner !== "angepinnt"
        ? aktiverOrdner
        : null
    const neu = { id: `o-${Date.now()}`, name: n, parentId }
    setOrdner([...ordner, neu])
    setAktiverOrdner(neu.id)
  }
  // Löschen: Unterordner und Notizen wandern eine Ebene nach oben (zum
  // übergeordneten Ordner bzw. „ohne Ordner"), nichts geht verloren.
  function removeOrdner(id) {
    const elternId = ordner.find((o) => o.id === id)?.parentId ?? null
    setOrdner(
      ordner
        .filter((o) => o.id !== id)
        .map((o) => (o.parentId === id ? { ...o, parentId: elternId } : o))
    )
    setWissen(
      wissen.map((w) => (w.ordnerId === id ? { ...w, ordnerId: elternId } : w))
    )
    if (aktiverOrdner === id) setAktiverOrdner(elternId ?? "alle")
  }
  function renameOrdner(id, name) {
    setOrdner(ordner.map((o) => (o.id === id ? { ...o, name } : o)))
  }

  // Wissen-Ziel öffnet sich inline im selben Overlay, Projekt-/Notiz-Ziel
  // navigiert auf App-Ebene (siehe App.jsx/OrdnerSeite.jsx).
  function zielKlick(ziel) {
    if (ziel.typ === "wissen") setBearbeiteId(ziel.id)
    else if (ziel.typ === "notiz")
      onNavigate?.("projekte", { projektId: ziel.projektId, notizId: ziel.id })
    else onNavigate?.("projekte", ziel.id)
  }

  return (
    <div>
      {/* Erstellen mit Vorlagen */}
      <div className="relative flex flex-wrap items-center gap-2">
        <button
          onClick={() => setNeuOffen((o) => !o)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          + Neuer Eintrag
        </button>
        {neuOffen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setNeuOffen(false)}
            />
            <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Vorlage wählen
              </p>
              {VORLAGEN.map((v) => (
                <button
                  key={v.key}
                  onClick={() => erstelle(v)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <span className="text-base">{v.emoji}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <OrdnerLeiste
        ordner={ordner}
        aktiv={aktiverOrdner}
        setAktiv={setAktiverOrdner}
        alleCount={wissen.length}
        angepinntCount={angepinntCount}
        ordnerCounts={ordnerCounts}
        onAdd={addOrdner}
        onRemove={removeOrdner}
        onRename={renameOrdner}
      />

      {wissen.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Suchfeld wert={suche} onChange={setSuche} placeholder="Wissen durchsuchen…" />
          <SortMenu wert={sort} onChange={setSort} optionen={WISSEN_SORT} />
        </div>
      )}

      <WissenListe
        eintraege={sichtbareWissen}
        ordner={ordner}
        aktiverOrdner={aktiverOrdner}
        suche={suche}
        eingehend={eingehend}
        onOeffnen={setBearbeiteId}
        onPin={togglePin}
        onRemove={removeWissen}
        onMove={setzeOrdner}
      />

      {bearbeiteteNotiz && (
        <NotizBearbeiten
          key={bearbeiteteNotiz.id}
          notiz={bearbeiteteNotiz}
          onChange={updateWissen}
          onClose={() => setBearbeiteId(null)}
          wissen={wissen}
          projekte={projekte}
          notizen={notizen}
          onZielKlick={zielKlick}
          onTagKlick={onTagKlick}
          ordner={ordner}
          onOrdnerWechsel={(oid) => setzeOrdner(bearbeiteteNotiz.id, oid)}
          onPinToggle={() => togglePin(bearbeiteteNotiz.id)}
        />
      )}
    </div>
  )
}

// Ordner-Leiste: Filter-Chips (Alle / Angeheftet / Ordner) plus Anlegen,
// Umbenennen (Doppelklick) und Löschen des aktiven Ordners. Auf schmalen
// Handys horizontal scrollbar statt überzulaufen.
function OrdnerLeiste({
  ordner,
  aktiv,
  setAktiv,
  alleCount,
  angepinntCount,
  ordnerCounts,
  onAdd,
  onRemove,
  onRename,
}) {
  const [formOffen, setFormOffen] = useState(false)
  const [name, setName] = useState("")
  const [renameId, setRenameId] = useState(null)
  const [renameWert, setRenameWert] = useState("")

  const chip = (an) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      an
        ? "bg-gray-900 text-white"
        : "border border-gray-200 text-gray-500 hover:text-gray-900"
    }`

  function bestaetigeName() {
    if (name.trim()) onAdd(name)
    setName("")
    setFormOffen(false)
  }
  function bestaetigeRename(id) {
    if (renameWert.trim()) onRename(id, renameWert.trim())
    setRenameId(null)
  }

  return (
    <div className="mt-4 flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
      <button className={chip(aktiv === "alle")} onClick={() => setAktiv("alle")}>
        Alle <span className="opacity-60">{alleCount}</span>
      </button>
      {angepinntCount > 0 && (
        <button
          className={chip(aktiv === "angepinnt")}
          onClick={() => setAktiv("angepinnt")}
        >
          📌 {angepinntCount}
        </button>
      )}
      {ordner.map((o) =>
        renameId === o.id ? (
          <input
            key={o.id}
            value={renameWert}
            autoFocus
            onChange={(e) => setRenameWert(e.target.value)}
            onBlur={() => bestaetigeRename(o.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") bestaetigeRename(o.id)
              if (e.key === "Escape") setRenameId(null)
            }}
            className="w-32 shrink-0 rounded-full border border-gray-900 px-3 py-1 text-xs outline-none"
          />
        ) : (
          <span
            key={o.id}
            data-drop-ordner={o.id}
            title="Notiz hierher ziehen, um sie in diesen Ordner zu verschieben"
            className={`flex items-center ${chip(aktiv === o.id)}`}
          >
            <button
              onClick={() => setAktiv(o.id)}
              onDoubleClick={() => {
                setRenameId(o.id)
                setRenameWert(o.name)
              }}
              title="Klicken zum Filtern · Doppelklick zum Umbenennen"
            >
              {o.parentId ? "› " : "📁 "}
              {o.name}{" "}
              <span className={aktiv === o.id ? "text-white/60" : "text-gray-400"}>
                {ordnerCounts.get(o.id) ?? 0}
              </span>
            </button>
            {aktiv === o.id && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Ordner „${o.name}" löschen? Unterordner und Einträge wandern eine Ebene nach oben.`
                    )
                  )
                    onRemove(o.id)
                }}
                title="Ordner löschen"
                className="ml-1.5 text-white/60 hover:text-white"
              >
                ×
              </button>
            )}
          </span>
        )
      )}
      {formOffen ? (
        <input
          value={name}
          autoFocus
          placeholder="Ordnername"
          onChange={(e) => setName(e.target.value)}
          onBlur={bestaetigeName}
          onKeyDown={(e) => {
            if (e.key === "Enter") bestaetigeName()
            if (e.key === "Escape") {
              setName("")
              setFormOffen(false)
            }
          }}
          className="w-32 shrink-0 rounded-full border border-gray-900 px-3 py-1 text-xs outline-none"
        />
      ) : (
        <button
          onClick={() => setFormOffen(true)}
          title={
            aktiv !== "alle" && aktiv !== "angepinnt"
              ? "Unterordner im aktiven Ordner anlegen"
              : "Ordner anlegen"
          }
          className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          {aktiv !== "alle" && aktiv !== "angepinnt" ? "+ Unterordner" : "+ Ordner"}
        </button>
      )}
    </div>
  )
}

// Kleines Dokument-Icon für die ruhige Notizliste.
function DocIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4 shrink-0 text-gray-300"
      aria-hidden="true"
    >
      <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  )
}

// Eine ruhige Notizzeile: Griff + Icon + Titel, dezente Meta-Symbole (nur
// Desktop), Anheften/Löschen bei Hover bzw. auf dem Handy sichtbar. Über den
// Griff lässt sich die Notiz in einen anderen Ordner ziehen.
function WissenZeile({ w, eingehend, onOeffnen, onPin, onRemove, onZiehStart, wirdGezogen }) {
  const aus = extrahiereWikilinks(w.inhalt).length
  const ein = eingehend.get((w.titel ?? "").toLowerCase()) ?? 0
  const anh = (w.anhaenge ?? []).length
  return (
    <li
      onClick={() => onOeffnen(w.id)}
      className={`group flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors hover:bg-gray-50 ${wirdGezogen ? "opacity-40" : ""}`}
    >
      <span
        onPointerDown={(e) => onZiehStart?.(w.id, e)}
        onClick={(e) => e.stopPropagation()}
        title="Zum Verschieben ziehen"
        style={{ touchAction: "none" }}
        className="shrink-0 cursor-grab select-none px-0.5 text-gray-200 transition-colors hover:text-gray-500"
      >
        ⠿
      </span>
      <DocIcon />
      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
        {w.angepinnt && <span className="mr-1 text-amber-500">📌</span>}
        {w.titel || "Ohne Titel"}
      </span>
      {(anh > 0 || aus > 0 || ein > 0) && (
        <span className="hidden shrink-0 items-center gap-2 text-[11px] text-gray-300 sm:flex">
          {anh > 0 && <span title="Anhänge">📎 {anh}</span>}
          {aus > 0 && <span title="Verlinkt auf">🔗 {aus}</span>}
          {ein > 0 && <span title="Erwähnt in">↩ {ein}</span>}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPin(w.id)
          }}
          title={w.angepinnt ? "Nicht mehr anheften" : "Anheften"}
          className={w.angepinnt ? "text-amber-500" : "text-gray-300 hover:text-amber-500"}
        >
          📌
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(w.id)
          }}
          title="Löschen"
          className="text-gray-300 hover:text-red-500"
        >
          ×
        </button>
      </div>
    </li>
  )
}

// Ruhige Notizliste im Datei-Explorer-Stil. In der „Alle"-Ansicht (ohne Suche)
// nach Ordnern gruppiert – jede Gruppe aufklappbar. Sonst eine flache Liste.
function WissenListe({
  eintraege,
  ordner,
  aktiverOrdner,
  suche,
  eingehend,
  onOeffnen,
  onPin,
  onRemove,
  onMove,
}) {
  const [zu, setZu] = useState(() => new Set())
  // Ziehen einer Notiz in einen anderen Ordner (Maus & Touch via Pointer-Events).
  const [ziehId, setZiehId] = useState(null)
  const [ueberId, setUeberId] = useState(null)
  const [pos, setPos] = useState(null)
  const ziehRef = useRef(null)
  const ueberRef = useRef(null)

  function starteZiehen(notizId, e) {
    e.preventDefault()
    e.stopPropagation()
    ziehRef.current = notizId
    ueberRef.current = null
    setZiehId(notizId)
    setPos({ x: e.clientX, y: e.clientY })
    const move = (ev) => {
      setPos({ x: ev.clientX, y: ev.clientY })
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const t = el?.closest("[data-drop-ordner]")
      const id = t ? t.getAttribute("data-drop-ordner") : null
      ueberRef.current = id
      setUeberId(id)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      const nid = ziehRef.current
      const ziel = ueberRef.current
      if (nid != null && ziel != null)
        onMove?.(nid, ziel === "__none__" ? null : ziel)
      ziehRef.current = null
      ueberRef.current = null
      setZiehId(null)
      setUeberId(null)
      setPos(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  if (eintraege.length === 0) return null

  const zeile = (w) => (
    <WissenZeile
      key={w.id}
      w={w}
      eingehend={eingehend}
      onOeffnen={onOeffnen}
      onPin={onPin}
      onRemove={onRemove}
      onZiehStart={starteZiehen}
      wirdGezogen={ziehId === w.id}
    />
  )

  // Schwebendes Etikett der gezogenen Notiz.
  const gezogen = ziehId != null ? eintraege.find((w) => w.id === ziehId) : null
  const ghost =
    gezogen && pos ? (
      <div
        className="pointer-events-none fixed z-[60] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-lg"
        style={{ left: pos.x + 12, top: pos.y + 12 }}
      >
        📄 {gezogen.titel || "Ohne Titel"}
      </div>
    ) : null

  const gruppiert = aktiverOrdner === "alle" && !suche.trim()
  if (!gruppiert) {
    return (
      <>
        {ghost}
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {eintraege.map(zeile)}
        </ul>
      </>
    )
  }

  const toggle = (k) =>
    setZu((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  // Notizen je Ordner und Unterordner je Elternteil (für den Ordnerbaum).
  const notizenProOrdner = new Map()
  for (const w of eintraege) {
    const k = w.ordnerId ?? "__ohne__"
    if (!notizenProOrdner.has(k)) notizenProOrdner.set(k, [])
    notizenProOrdner.get(k).push(w)
  }
  const kinder = new Map()
  for (const o of ordner) {
    const p = o.parentId ?? "__root__"
    if (!kinder.has(p)) kinder.set(p, [])
    kinder.get(p).push(o)
  }

  const renderOrdner = (o, tiefe) => {
    const offen = !zu.has(o.id)
    const subs = kinder.get(o.id) ?? []
    const notizen = notizenProOrdner.get(o.id) ?? []
    return (
      <div key={o.id}>
        <button
          onClick={() => toggle(o.id)}
          data-drop-ordner={o.id}
          style={{ paddingLeft: 12 + tiefe * 16 }}
          className={`flex w-full items-center gap-1.5 py-1.5 pr-3 text-left transition-colors ${
            ueberId === o.id
              ? "bg-accent-50 ring-1 ring-inset ring-accent-400"
              : "hover:bg-gray-50"
          }`}
        >
          <span
            className={`text-[11px] text-gray-400 transition-transform ${offen ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          <span className="text-sm">📁</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
            {o.name}
          </span>
          <span className="shrink-0 text-xs text-gray-300">
            {notizen.length}
          </span>
        </button>
        {offen && (subs.length > 0 || notizen.length > 0) && (
          <div>
            {subs.map((s) => renderOrdner(s, tiefe + 1))}
            <ul style={{ paddingLeft: (tiefe + 1) * 16 }}>
              {notizen.map(zeile)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const topOrdner = kinder.get("__root__") ?? []
  const ohne = notizenProOrdner.get("__ohne__") ?? []

  return (
    <>
      {ghost}
      <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {topOrdner.map((o) => renderOrdner(o, 0))}
        {(ohne.length > 0 || ziehId != null) && (
          <div
            data-drop-ordner="__none__"
            className={
              ueberId === "__none__"
                ? "bg-accent-50 ring-1 ring-inset ring-accent-400"
                : ""
            }
          >
            {topOrdner.length > 0 && (
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Ohne Ordner
              </p>
            )}
            {ohne.length > 0 ? (
              <ul>{ohne.map(zeile)}</ul>
            ) : (
              <p className="px-3 py-2 text-xs text-gray-300">
                Hierher ziehen, um aus dem Ordner zu nehmen
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// Alle Nachkommen-Ordner-IDs eines Ordners (inklusive des Ordners selbst),
// damit ein übergeordneter Ordner auch die Notizen seiner Unterordner zeigt.
function ordnerMitNachkommen(id, ordner) {
  const set = new Set([id])
  let neu = true
  while (neu) {
    neu = false
    for (const o of ordner) {
      if (o.parentId != null && set.has(o.parentId) && !set.has(o.id)) {
        set.add(o.id)
        neu = true
      }
    }
  }
  return set
}
