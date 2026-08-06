import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import { faelltAuf } from "../lib/wiederholung"
import Kalender from "./Kalender"
import TodoErstellen from "./TodoErstellen"
import { TodoZeile } from "./TodosSeite"
import ProjektInhalte from "./ProjektInhalte"
import ProjektNotizen from "./ProjektNotizen"
import ProjektArtikel from "./ProjektArtikel"
import ProjektKarten from "./ProjektKarten"
import ProjektLernen from "./ProjektLernen"
import ProjektBoard from "./ProjektBoard"
import BlockEditor, { bloeckeVon, neueBlockId } from "./BlockEditor"
import { VORLAGEN, vorlageZuBloecken } from "../lib/wissen"
import {
  DeadlineChip,
  Fortschrittsbalken,
  projektFortschrittWerte,
} from "./OrdnerSeite"
import LoeschKnopf from "./LoeschKnopf"

// Alle Bereiche, die ein Projekt enthalten kann. Beim Erstellen (und
// jederzeit über „Bereiche anpassen“) wählbar – so wird aus demselben
// System ein Uni-Kurs, ein Lernprojekt oder ein privates Vorhaben.

export const MODULE = [
  { key: "ziel", label: "Ziel" },
  { key: "workflow", label: "Workflow" },
  { key: "board", label: "Board" },
  { key: "todos", label: "Todos" },
  { key: "inhalte", label: "Inhalte" },
  { key: "lernen", label: "Lernen" },
  { key: "notizen", label: "Notizen" },
  { key: "artikel", label: "Artikel" },
  { key: "karten", label: "Karteikarten" },
  { key: "kalender", label: "Kalender" },
]

export const STANDARD_MODULE = ["ziel", "workflow", "todos", "lernen", "kalender"]

// Auswahlwerte für die Eigenschaften Priorität und Status (Notion-artige
// Tags). Farbe pro Wert; leerer Wert = dezentes „Keine“.
export const PRIORITAETEN = [
  { value: "", label: "Keine", tag: "bg-gray-100 text-gray-500" },
  { value: "niedrig", label: "Niedrig", tag: "bg-gray-100 text-gray-600" },
  { value: "mittel", label: "Mittel", tag: "bg-amber-50 text-amber-700" },
  { value: "hoch", label: "Hoch", tag: "bg-red-50 text-red-600" },
]

export const STATUS_OPTIONEN = [
  { value: "offen", label: "Nicht begonnen", tag: "bg-gray-100 text-gray-600" },
  { value: "aktiv", label: "In Arbeit", tag: "bg-blue-50 text-blue-700" },
  { value: "fertig", label: "Erledigt", tag: "bg-emerald-50 text-emerald-700" },
]

// Kleines 16er-Linien-Icon.
function PropIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Eine Eigenschaftszeile: Icon + Label links, Wert rechts.
function EigenschaftsZeile({ icon, label, children }) {
  return (
    <div className="flex items-center gap-2 rounded-md py-0.5">
      <span className="flex w-32 shrink-0 items-center gap-2 px-1 text-sm text-gray-400">
        {icon}
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// Wert als farbiger Tag, der zugleich ein Auswahlmenü ist.
function TagSelect({ value, options, onChange }) {
  const aktiv = options.find((o) => o.value === value) ?? options[0]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer appearance-none rounded-sm px-2 py-0.5 text-xs font-medium outline-none ${aktiv.tag}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-white text-gray-800">
          {o.label}
        </option>
      ))}
    </select>
  )
}

export default function ProjektDetail({
  projekt,
  onUpdate,
  onBack,
  startNotizId = null,
  startModul = null,
  onOeffneZiel,
  onNavigate,
}) {
  const [ordner] = useStored("ordner", [])
  const [alleProjekte, setAlleProjekte] = useStored("projekte", [])
  // Ziele für Verknüpfungen aus den Seiten heraus (Sammeln & Projekt-Notizen).
  const [wissen, setWissen] = useStored("wissen", [])
  const [notizen] = useStored("notizen", [])
  // Areas = dauerhafte Lebensbereiche, denen Projekte zugeordnet werden.
  const areas = alleProjekte.filter(
    (p) => (p.typ ?? "projekt") === "area" && !p.archiviert
  )
  const istArea = (projekt.typ ?? "projekt") === "area"
  // Kopfbereich (Eigenschaften) ist zuklappbar, damit vom Projekt nur das
  // volle Blatt zu sehen ist. Die Wahl gilt für alle Projekte und bleibt
  // gespeichert.
  const [kopfOffen, setKopfOffen] = useStored("projektKopfOffen", false)
  const module = projekt.module ?? STANDARD_MODULE
  const eigene = projekt.eigeneModule ?? []
  const [neuerBereichName, setNeuerBereichName] = useState("")
  // Unterseiten des Projekts (wie Seiten in einem Textdokument): liegen
  // flach in projekt.seiten, die Verschachtelung ergibt sich aus den
  // „seite"-Blöcken, die auf sie zeigen.
  const seiten = projekt.seiten ?? []
  // Seiten, die oben als Reiter stehen (Reihenfolge = Reihenfolge der Tabs).
  // Unterseiten aus „Seite"-Blöcken stehen bewusst nicht darin.
  const seitenTabs = (projekt.seitenTabs ?? [])
    .map((id) => seiten.find((s) => s.id === id))
    .filter(Boolean)
  const [offeneSeiteId, setOffeneSeiteId] = useState(null)
  const [vorlagenMenu, setVorlagenMenu] = useState(false)
  // Vorgemerkte Seiten-Änderungen (siehe „Unterseiten" weiter unten).
  const vorgemerkt = useRef({ neu: [], weg: [] })

  // Ordnerpfad als Eyebrow – zeigt, wo das Projekt liegt. Läuft von der
  // Projekt-Zuordnung über parentId nach oben (wie in OrdnerSeite).
  const ordnerPfad = []
  let pfadZeiger = projekt.ordnerId ?? null
  while (pfadZeiger != null) {
    const o = ordner.find((x) => x.id === pfadZeiger)
    if (!o) break
    ordnerPfad.unshift(o.name)
    pfadZeiger = o.parentId ?? null
  }
  const eyebrow =
    ordnerPfad.length > 0 ? ordnerPfad.join(" / ") : istArea ? "Area" : "Projekt"

  function modulInfo(key) {
    return (
      MODULE.find((m) => m.key === key) ?? eigene.find((m) => m.key === key)
    )
  }

  const [aktiv, setAktiv] = useState(
    startNotizId ? "notizen" : (startModul ?? null)
  )
  const [anpassen, setAnpassen] = useState(false)

  // Reihenfolge der Tabs folgt der Reihenfolge in projekt.module. Ein von
  // außen angesprungener Bereich (z.B. „Lernen" aus der Lern-Übersicht) wird
  // zusätzlich gezeigt, auch wenn er im Projekt nicht dauerhaft aktiviert
  // ist – angesprungen werden können soll er trotzdem, ohne die Bereichs-
  // Auswahl des Projekts hinter dem Rücken des Nutzers zu ändern.
  const sichtbareModule = module.map(modulInfo).filter(Boolean)
  const gastModul =
    aktiv && !aktiv.startsWith("seite:") && aktiv !== "areaprojekte" && !module.includes(aktiv)
      ? modulInfo(aktiv)
      : null
  const tabModule = gastModul ? [...sichtbareModule, gastModul] : sichtbareModule

  // Früher hatte jedes Projekt automatisch eine „Übersicht". Seiten entstehen
  // jetzt bewusst – vorhandene Übersichts-Inhalte werden einmalig zu einer
  // ganz normalen Seite „Übersicht", leere Übersichten verschwinden.
  useEffect(() => {
    if (projekt.uebersichtMigriert) return
    const alteBloecke = bloeckeVon(projekt, "uebersicht")
    if (alteBloecke.length === 0) {
      onUpdate({ ...projekt, uebersichtMigriert: true })
      return
    }
    const id = Date.now()
    onUpdate({
      ...projekt,
      seiten: [...(projekt.seiten ?? []), { id, titel: "Übersicht", bloecke: alteBloecke }],
      seitenTabs: [id, ...(projekt.seitenTabs ?? [])],
      bloecke: [],
      uebersicht: "",
      uebersichtMigriert: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projekt.id, projekt.uebersichtMigriert])

  // Von außen angesprungene Notiz (z.B. Link-Klick aus einem anderen
  // Projekt): Notizen-Tab erzwingen, auch wenn bereits ein anderer Tab aktiv
  // ist (kein Remount, da dasselbe Projekt geöffnet bleibt).
  useEffect(() => {
    if (startNotizId != null) setAktiv("notizen")
  }, [startNotizId])

  useEffect(() => {
    if (startModul != null) setAktiv(startModul)
  }, [startModul])

  const verfuegbar = [...MODULE, ...eigene].filter(
    (m) => !module.includes(m.key)
  )

  const workflow = projekt.workflow ?? []
  const erledigt = workflow.filter((s) => s.erledigt).length
  const areaProjekte = istArea
    ? alleProjekte.filter((p) => p.areaId === projekt.id && !p.archiviert)
    : []

  function toggleModul(key) {
    const neu = module.includes(key)
      ? module.filter((m) => m !== key)
      : [...module, key]
    onUpdate({ ...projekt, module: neu })
    if (aktiv === key && module.includes(key)) {
      setAktiv(neu[0] ?? "ziel")
    }
  }

  function verschiebeModul(key, richtung) {
    const i = module.indexOf(key)
    const j = i + richtung
    if (i < 0 || j < 0 || j >= module.length) return
    const neu = [...module]
    ;[neu[i], neu[j]] = [neu[j], neu[i]]
    onUpdate({ ...projekt, module: neu })
  }

  function addEigenerBereich(e) {
    e.preventDefault()
    if (!neuerBereichName.trim()) return
    const neu = { key: `eigen-${Date.now()}`, label: neuerBereichName.trim() }
    onUpdate({
      ...projekt,
      eigeneModule: [...eigene, neu],
      module: [...module, neu.key],
    })
    setNeuerBereichName("")
    setAktiv(neu.key)
  }

  function removeEigenerBereich(key) {
    onUpdate({
      ...projekt,
      eigeneModule: eigene.filter((m) => m.key !== key),
      module: module.filter((k) => k !== key),
    })
    if (aktiv === key) setAktiv(module.filter((k) => k !== key)[0] ?? "ziel")
  }

  // Rendert einen Bereich (Modul) inline – für Tabs und für eingebettete
  // „bereich"-Blöcke im Block-Editor (dieselbe Logik, eine Quelle).
  function bereichRenderer(key) {
    if (key === "ziel") return <ZielModul projekt={projekt} onUpdate={onUpdate} />
    if (key === "workflow")
      return <WorkflowModul projekt={projekt} onUpdate={onUpdate} />
    if (key === "board") return <ProjektBoard projekt={projekt} />
    if (key === "todos") return <TodosModul projekt={projekt} />
    if (key === "inhalte")
      return <ProjektInhalte projekt={projekt} onModulWechsel={setAktiv} />
    if (key === "lernen")
      return (
        <ProjektLernen
          projekt={projekt}
          onModulWechsel={setAktiv}
          onNavigate={onNavigate}
        />
      )
    if (key === "notizen")
      return (
        <ProjektNotizen
          projekt={projekt}
          startNotizId={startNotizId}
          onOeffneZiel={onOeffneZiel}
          onNavigate={onNavigate}
        />
      )
    if (key === "artikel") return <ProjektArtikel projekt={projekt} />
    if (key === "karten")
      return <ProjektKarten projekt={projekt} onModulWechsel={setAktiv} />
    if (key === "kalender") return <KalenderModul projekt={projekt} />
    if (key.startsWith("eigen-"))
      return (
        <EigenerModul
          projekt={projekt}
          modulKey={key}
          onBloecke={speichereEigenenBereich}
          bereichRenderer={bereichRenderer}
          seitenProps={seitenProps}
        />
      )
    return null
  }

  // --- Unterseiten -------------------------------------------------------
  //
  // Anlegen und Löschen einer Seite fallen immer zusammen mit einer
  // Änderung an der Blockliste, die sie einbindet. Beides in getrennten
  // onUpdate-Aufrufen zu schreiben würde sich gegenseitig überschreiben
  // (beide gehen vom selben, noch alten `projekt` aus). Darum merken sich
  // seiteNeu/seiteLoeschen ihre Änderung nur vor; geschrieben wird sie
  // zusammen mit den Blöcken im direkt folgenden Speichern.

  function seiteNeu() {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    vorgemerkt.current.neu.push({ id, titel: "", bloecke: [] })
    return id
  }

  function seiteLoeschen(id) {
    vorgemerkt.current.weg.push(id)
  }

  // Seitenliste inklusive der vorgemerkten Änderungen. Gelöscht wird eine
  // Seite mitsamt den Seiten, die nur von ihr aus erreichbar sind – sonst
  // blieben sie ohne Verweis im Projekt zurück.
  function seitenStand() {
    const { neu, weg } = vorgemerkt.current
    vorgemerkt.current = { neu: [], weg: [] }
    let liste = neu.length > 0 ? [...seiten, ...neu] : seiten
    if (weg.length > 0) {
      const raus = new Set()
      const sammle = (sid) => {
        if (raus.has(sid)) return
        raus.add(sid)
        const s = liste.find((x) => x.id === sid)
        for (const b of s?.bloecke ?? []) {
          if (b.typ === "seite" && b.seiteId) sammle(b.seiteId)
        }
      }
      weg.forEach(sammle)
      liste = liste.filter((s) => !raus.has(s.id))
      if (offeneSeiteId != null && raus.has(offeneSeiteId)) {
        setOffeneSeiteId(null)
      }
    }
    return liste
  }

  function speichereSeitenBloecke(id, bloecke) {
    onUpdate({
      ...projekt,
      seiten: seitenStand().map((s) => (s.id === id ? { ...s, bloecke } : s)),
    })
  }

  function speichereSeitenTitel(id, titel) {
    onUpdate({
      ...projekt,
      seiten: seitenStand().map((s) => (s.id === id ? { ...s, titel } : s)),
    })
  }

  function speichereEigenenBereich(modulKey, bloecke) {
    onUpdate({
      ...projekt,
      eigeneModule: eigene.map((m) =>
        m.key === modulKey ? { ...m, bloecke } : m
      ),
      seiten: seitenStand(),
    })
  }

  const seitenProps = {
    seiten,
    onSeiteNeu: seiteNeu,
    onSeiteOeffnen: setOffeneSeiteId,
    onSeiteLoeschen: seiteLoeschen,
    linkKontext: {
      wissen,
      projekte: alleProjekte,
      notizen,
      // "[[Titel]]" führt dorthin, wo das Ziel lebt: Sammeln, ein anderes
      // Projekt oder eine Projekt-Notiz.
      onZielKlick: (ziel) => {
        if (ziel.typ === "wissen") onNavigate?.("sammeln", { wissenId: ziel.id })
        else onOeffneZiel?.(ziel)
      },
      onNotizOeffnen: (id) => onNavigate?.("sammeln", { wissenId: id }),
      // Neue Notiz aus dem Projekt heraus: sie entsteht in Sammeln (und ist
      // dort in Suche, Tags und Graph), das Projekt verweist nur darauf.
      onNotizNeu: (titel) => {
        const id = Date.now() + Math.floor(Math.random() * 1000)
        setWissen((alle) => [
          ...alle,
          { id, titel, inhalt: "", aktualisiertAm: id, ordnerId: null },
        ])
        return id
      },
    },
  }

  // Aktiver Reiter: eine Seite, ein Bereich – oder gar nichts (leeres
  // Projekt). Ein gelöschter oder noch nicht gewählter Reiter fällt auf die
  // erste Seite bzw. den ersten Bereich zurück.
  const aktivTyp = aktiv?.startsWith("seite:") ? "seite" : "modul"
  const aktiveTabSeite =
    aktivTyp === "seite"
      ? seitenTabs.find((s) => `seite:${s.id}` === aktiv) ?? null
      : null
  // `tabModule` statt `sichtbareModule`: ein von außen angesprungener
  // Gast-Bereich (z.B. „Lernen") ist ein gültiger Reiter, auch wenn er im
  // Projekt nicht dauerhaft aktiviert ist.
  const gueltig =
    (aktivTyp === "seite" && aktiveTabSeite) ||
    aktiv === "areaprojekte" ||
    (aktiv && tabModule.some((m) => m.key === aktiv))
  if (!gueltig) {
    const ersatz =
      seitenTabs.length > 0
        ? `seite:${seitenTabs[0].id}`
        : sichtbareModule[0]?.key ?? null
    if (ersatz !== aktiv) setAktiv(ersatz)
  }

  // Neue Seite als Reiter – leer oder aus einer Vorlage (dieselben Vorlagen
  // wie in Sammeln, damit eine Buchnotiz überall gleich aussieht).
  function seiteAusVorlage(vorlage) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const neueSeite = {
      id,
      titel: vorlage.key === "leer" ? "" : vorlage.label,
      bloecke: vorlage.key === "leer" ? [] : vorlageZuBloecken(vorlage.inhalt, neueBlockId),
    }
    onUpdate({
      ...projekt,
      seiten: [...seitenStand(), neueSeite],
      seitenTabs: [...(projekt.seitenTabs ?? []), id],
    })
    setVorlagenMenu(false)
    setAktiv(`seite:${id}`)
  }

  function tabSeiteLoeschen(id) {
    seiteLoeschen(id)
    onUpdate({
      ...projekt,
      seiten: seitenStand(),
      seitenTabs: (projekt.seitenTabs ?? []).filter((x) => x !== id),
    })
    setAktiv(null)
  }

  const offeneSeite = seiten.find((s) => s.id === offeneSeiteId)
  if (offeneSeite) {
    // Pfad zur Seite über die Blöcke der Elternseiten (Schutz gegen Zyklen).
    const pfad = []
    let zeiger = offeneSeite
    const gesehen = new Set()
    while (zeiger && !gesehen.has(zeiger.id)) {
      gesehen.add(zeiger.id)
      pfad.unshift(zeiger)
      zeiger = seiten.find((s) =>
        (s.bloecke ?? []).some(
          (b) => b.typ === "seite" && b.seiteId === zeiger.id
        )
      )
    }

    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.25rem)] w-full max-w-3xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-400">
          <button
            onClick={() => setOffeneSeiteId(null)}
            className="rounded-md px-1 py-0.5 hover:bg-gray-100 hover:text-gray-900"
          >
            ‹ {projekt.name}
          </button>
          {pfad.slice(0, -1).map((s) => (
            <span key={s.id} className="flex items-center gap-1">
              <span>/</span>
              <button
                onClick={() => setOffeneSeiteId(s.id)}
                className="rounded-md px-1 py-0.5 hover:bg-gray-100 hover:text-gray-900"
              >
                {s.titel?.trim() || "Unbenannte Seite"}
              </button>
            </span>
          ))}
        </nav>

        <input
          value={offeneSeite.titel ?? ""}
          onChange={(e) => speichereSeitenTitel(offeneSeite.id, e.target.value)}
          placeholder="Unbenannte Seite"
          className="mt-3 w-full border-none bg-transparent text-3xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />

        <div className="mt-6 flex flex-1 flex-col">
          <BlockEditor
            bloecke={offeneSeite.bloecke ?? []}
            onChange={(bloecke) => speichereSeitenBloecke(offeneSeite.id, bloecke)}
            bereichRenderer={bereichRenderer}
            projekt={projekt}
            {...seitenProps}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.25rem)] w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          title="Zurück"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <PropIcon>
            <path d="m15 18-6-6 6-6" />
          </PropIcon>
        </button>

        {/* Zugeklappt: Titel klein in der Kopfzeile, damit darunter nur das
            Blatt steht. */}
        {!kopfOffen && (
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
            {projekt.name}
          </p>
        )}

        <button
          onClick={() => setKopfOffen(!kopfOffen)}
          title={kopfOffen ? "Kopf zuklappen" : "Details anzeigen"}
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-100 hover:text-gray-900 ${
            kopfOffen ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {kopfOffen ? "Zuklappen" : "Details"}
          <PropIcon>
            <path d={kopfOffen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
          </PropIcon>
        </button>
      </div>

      {kopfOffen && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-medium text-gray-900">
            {projekt.name}
          </h1>
          {projekt.beschreibung && (
            <p className="mt-1.5 font-serif text-[15px] italic text-gray-500">
              {projekt.beschreibung}
            </p>
          )}

          {/* Notion-artige Eigenschaftsliste */}
          <div className="mt-5 max-w-xl">
            <EigenschaftsZeile
              label="Bereich"
              icon={
                <PropIcon>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                </PropIcon>
              }
            >
              <select
                value={projekt.ordnerId ?? ""}
                onChange={(e) =>
                  onUpdate({
                    ...projekt,
                    ordnerId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full cursor-pointer rounded-md bg-transparent px-1.5 py-0.5 text-sm text-gray-800 outline-none hover:bg-gray-100 focus:bg-gray-100"
              >
                <option value="">Kein Ordner</option>
                {ordner.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </EigenschaftsZeile>

            {!istArea && areas.length > 0 && (
              <EigenschaftsZeile
                label="Area"
                icon={
                  <PropIcon>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3v18M3 12h18" />
                  </PropIcon>
                }
              >
                <select
                  value={projekt.areaId ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      ...projekt,
                      areaId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full cursor-pointer rounded-md bg-transparent px-1.5 py-0.5 text-sm text-gray-800 outline-none hover:bg-gray-100 focus:bg-gray-100"
                >
                  <option value="">Keine Area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </EigenschaftsZeile>
            )}

            {!istArea && (
              <EigenschaftsZeile
                label="Fälligkeit"
                icon={
                  <PropIcon>
                    <rect x="3" y="4.5" width="18" height="16" rx="2" />
                    <path d="M3 9.5h18M8 3v3M16 3v3" />
                  </PropIcon>
                }
              >
                <input
                  type="date"
                  value={projekt.deadline ?? ""}
                  onChange={(e) =>
                    onUpdate({ ...projekt, deadline: e.target.value })
                  }
                  className="cursor-pointer rounded-md bg-transparent px-1.5 py-0.5 text-sm text-gray-800 outline-none hover:bg-gray-100 focus:bg-gray-100"
                />
              </EigenschaftsZeile>
            )}

            <EigenschaftsZeile
              label="Priorität"
              icon={
                <PropIcon>
                  <path d="M5 21V4h11l-2 4 2 4H5" />
                </PropIcon>
              }
            >
              <TagSelect
                value={projekt.prioritaet ?? ""}
                options={PRIORITAETEN}
                onChange={(v) => onUpdate({ ...projekt, prioritaet: v })}
              />
            </EigenschaftsZeile>

            {!istArea && (
              <EigenschaftsZeile
                label="Status"
                icon={
                  <PropIcon>
                    <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />
                  </PropIcon>
                }
              >
                <TagSelect
                  value={projekt.status ?? "offen"}
                  options={STATUS_OPTIONEN}
                  onChange={(v) => onUpdate({ ...projekt, status: v })}
                />
              </EigenschaftsZeile>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-1">
              <button
                onClick={() => setAnpassen(!anpassen)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <PropIcon>
                  <path d="M12 5v14M5 12h14" />
                </PropIcon>
                Bereiche anpassen
              </button>
              <button
                onClick={() => {
                  onUpdate({ ...projekt, archiviert: !projekt.archiviert })
                  if (!projekt.archiviert) onBack()
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <PropIcon>
                  <path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4" />
                </PropIcon>
                {projekt.archiviert ? "Wiederherstellen" : "Archivieren"}
              </button>
            </div>
          </div>

          {anpassen && (
            <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  Aktive Bereiche – mit ‹ › verschieben
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {sichtbareModule.map((m) => (
                    <span
                      key={m.key}
                      className="flex items-center gap-0.5 rounded-full bg-gray-900 py-1 pl-1.5 pr-2 text-xs font-medium text-white"
                    >
                      <button
                        onClick={() => verschiebeModul(m.key, -1)}
                        title="Nach vorne"
                        className="rounded-sm px-1 text-gray-400 hover:text-white"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => verschiebeModul(m.key, 1)}
                        title="Nach hinten"
                        className="rounded-sm px-1 text-gray-400 hover:text-white"
                      >
                        ›
                      </button>
                      <button onClick={() => toggleModul(m.key)} title="Ausblenden">
                        {m.label}
                      </button>
                      {m.key.startsWith("eigen-") && (
                        <LoeschKnopf
                          onLoeschen={() => removeEigenerBereich(m.key)}
                          titel="Bereich endgültig löschen"
                          frageText="Bereich löschen?"
                          klasse="ml-1 rounded-sm px-1 text-gray-400"
                        />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  Verfügbar – klicken zum Einblenden
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {[...MODULE, ...eigene]
                    .filter((m) => !module.includes(m.key))
                    .map((m) => (
                      <button
                        key={m.key}
                        onClick={() => toggleModul(m.key)}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-900"
                      >
                        {m.label}
                      </button>
                    ))}
                  <form onSubmit={addEigenerBereich} className="flex gap-1.5">
                    <input
                      value={neuerBereichName}
                      onChange={(e) => setNeuerBereichName(e.target.value)}
                      placeholder="Eigener Bereich, z.B. Recherche"
                      className="w-48 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-900 outline-none focus:border-gray-900"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
                    >
                      + Erstellen
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <nav className="sticky top-12 z-10 mt-4 flex items-center gap-5 overflow-x-auto border-b border-gray-200 bg-white/85 backdrop-blur sm:gap-6 md:top-0">
        {seitenTabs.map((s) => (
          <TabButton
            key={s.id}
            active={aktiv === `seite:${s.id}`}
            onClick={() => setAktiv(`seite:${s.id}`)}
          >
            {s.titel?.trim() || "Unbenannte Seite"}
          </TabButton>
        ))}
        {istArea && (
          <TabButton
            active={aktiv === "areaprojekte"}
            onClick={() => setAktiv("areaprojekte")}
          >
            Projekte
            {areaProjekte.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">
                {areaProjekte.filter((p) => (p.status ?? "offen") !== "fertig").length}
              </span>
            )}
          </TabButton>
        )}
        {tabModule.map((m) => (
          <TabButton
            key={m.key}
            active={aktiv === m.key}
            onClick={() => setAktiv(m.key)}
          >
            {m.label}
            {m.key === "workflow" && workflow.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">
                {erledigt}/{workflow.length}
              </span>
            )}
          </TabButton>
        ))}

        <div className="relative ml-auto shrink-0 pb-1.5 pl-4">
          <button
            onClick={() => setVorlagenMenu(!vorlagenMenu)}
            title="Neue Seite anlegen"
            className="rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            + Seite
          </button>
          {vorlagenMenu && (
            <>
              <div
                onClick={() => setVorlagenMenu(false)}
                className="fixed inset-0 z-20"
              />
              <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
                <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Vorlage
                </p>
                {VORLAGEN.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => seiteAusVorlage(v)}
                    className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <span className="mr-1.5">{v.emoji}</span>
                    {v.key === "leer" ? "Leere Seite" : v.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="mt-6 flex flex-1 flex-col">
        {aktivTyp === "seite" ? (
          <SeitenBlatt
            seite={aktiveTabSeite}
            onTitel={(titel) => speichereSeitenTitel(aktiveTabSeite.id, titel)}
            onBloecke={(b) => speichereSeitenBloecke(aktiveTabSeite.id, b)}
            onLoeschen={() => tabSeiteLoeschen(aktiveTabSeite.id)}
            bereichRenderer={bereichRenderer}
            projekt={projekt}
            seitenProps={seitenProps}
          />
        ) : aktiv === "areaprojekte" ? (
          <AreaProjekte
            area={projekt}
            projekte={alleProjekte}
            setProjekte={setAlleProjekte}
            onOeffnen={(id) => onOeffneZiel?.({ typ: "projekt", id })}
          />
        ) : aktiv ? (
          bereichRenderer(aktiv)
        ) : (
          <LeeresProjekt onNeueSeite={() => setVorlagenMenu(true)} />
        )}
      </div>
    </div>
  )
}

// Die Projekte einer Area: das, was eine Area von einem Ordner unterscheidet
// – sie bündelt laufende Vorhaben eines Lebensbereichs und zeigt, wie es um
// sie steht. Neue Projekte entstehen direkt hier und erben Area und Ordner.
function AreaProjekte({ area, projekte, setProjekte, onOeffnen }) {
  const [todos] = useStored("todos", [])
  const [name, setName] = useState("")

  const zugeordnet = projekte.filter(
    (p) => p.areaId === area.id && !p.archiviert
  )
  const laufend = zugeordnet.filter((p) => (p.status ?? "offen") !== "fertig")
  const fertig = zugeordnet.filter((p) => (p.status ?? "offen") === "fertig")
  // Offene Aufgaben der Area selbst und ihrer Projekte.
  const offeneTodos = todos.filter((t) => {
    if (t.erledigt) return false
    const ziel = t.projektId ?? t.kursId
    return ziel === area.id || zugeordnet.some((p) => p.id === ziel)
  })

  function addProjekt(e) {
    e.preventDefault()
    if (!name.trim()) return
    const neu = {
      id: Date.now(),
      name: name.trim(),
      beschreibung: "",
      ordnerId: area.ordnerId ?? null,
      areaId: area.id,
      deadline: "",
      typ: "projekt",
      module: [],
      ziel: "",
      workflow: [],
    }
    setProjekte((alle) => [...alle, neu])
    setName("")
  }

  function loeseZuordnung(id) {
    setProjekte((alle) =>
      alle.map((p) => (p.id === id ? { ...p, areaId: null } : p))
    )
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-gray-100 pb-4">
        <p className="text-sm font-medium text-gray-900">
          {laufend.length} {laufend.length === 1 ? "laufendes" : "laufende"}{" "}
          {laufend.length === 1 ? "Projekt" : "Projekte"}
        </p>
        <p className="text-xs text-gray-400">
          {fertig.length > 0 && `${fertig.length} erledigt · `}
          {offeneTodos.length} offene {offeneTodos.length === 1 ? "Aufgabe" : "Aufgaben"}
        </p>
      </div>

      {zugeordnet.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">
          Dieser Area ist noch kein Projekt zugeordnet. Lege hier eins an –
          oder wähle die Area in einem bestehenden Projekt unter „Area".
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {[...laufend, ...fertig].map((p) => {
            const status = STATUS_OPTIONEN.find(
              (s) => s.value === (p.status ?? "offen")
            )
            return (
              <li
                key={p.id}
                className="group flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <button
                  onClick={() => onOeffnen(p.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-900"
                >
                  {p.name}
                </button>
                {status && (
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${status.tag}`}
                  >
                    {status.label}
                  </span>
                )}
                {p.deadline && <DeadlineChip datum={p.deadline} />}
                <div className="w-28 shrink-0">
                  <Fortschrittsbalken {...projektFortschrittWerte(p, todos)} />
                </div>
                <LoeschKnopf
                  onLoeschen={() => loeseZuordnung(p.id)}
                  titel="Aus dieser Area lösen (Projekt bleibt bestehen)"
                  frageText="Aus Area lösen?"
                  klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                />
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={addProjekt} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neues Projekt in dieser Area"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Anlegen
        </button>
      </form>
    </div>
  )
}

// Eine Seite als Blatt: Titel zum Überschreiben, darunter der Block-Editor.
function SeitenBlatt({
  seite,
  onTitel,
  onBloecke,
  onLoeschen,
  bereichRenderer,
  projekt,
  seitenProps,
}) {
  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="flex items-start gap-2">
        <input
          value={seite.titel ?? ""}
          onChange={(e) => onTitel(e.target.value)}
          placeholder="Unbenannte Seite"
          className="min-w-0 flex-1 border-none bg-transparent text-2xl font-medium text-gray-900 outline-none placeholder:text-gray-300"
        />
        <LoeschKnopf
          onLoeschen={onLoeschen}
          titel="Seite löschen"
          frageText="Seite löschen?"
          klasse="mt-2 text-gray-300"
        />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <BlockEditor
          bloecke={seite.bloecke ?? []}
          onChange={onBloecke}
          bereichRenderer={bereichRenderer}
          projekt={projekt}
          {...seitenProps}
        />
      </div>
    </div>
  )
}

// Ein Projekt ohne Seite und ohne Bereiche: erklärt, wie es losgeht.
function LeeresProjekt({ onNeueSeite }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
      <p className="text-sm font-medium text-gray-900">Noch keine Seite.</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">
        Ein Projekt bekommt seine Seiten, wenn du sie brauchst – leer oder aus
        einer Vorlage. Bereiche wie Todos oder Kalender kommen über „Bereiche
        anpassen" dazu.
      </p>
      <button
        onClick={onNeueSeite}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        + Seite
      </button>
    </div>
  )
}

// Notion-artiger Tab oben in der Leiste.
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-2 text-sm transition-colors ${
        active
          ? "border-gray-900 font-medium text-gray-900"
          : "border-transparent text-gray-400 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  )
}

// Dokument-Blatt: weißes „Word“-Blatt, das die volle Höhe füllt. Alle
// Schreibflächen sitzen darin, damit jeder Tab dasselbe Layout hat.
function Dokument({ children }) {
  return (
    <div className="flex flex-1 flex-col py-6">{children}</div>
  )
}

// Eigener Bereich – ebenfalls eine Block-Seite.
function EigenerModul({
  projekt,
  modulKey,
  onBloecke,
  bereichRenderer,
  seitenProps,
}) {
  const eigene = projekt.eigeneModule ?? []
  const modul = eigene.find((m) => m.key === modulKey)
  if (!modul) return null

  function setBloecke(bloecke) {
    onBloecke(modulKey, bloecke)
  }

  return (
    <Dokument>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {modul.label}
      </p>
      <BlockEditor
        bloecke={bloeckeVon(modul, "text")}
        onChange={setBloecke}
        bereichRenderer={bereichRenderer}
        projekt={projekt}
        ausschluss={[modulKey]}
        {...seitenProps}
      />
    </Dokument>
  )
}

function ZielModul({ projekt, onUpdate }) {
  return (
    <Dokument>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Zieldefinition
      </p>
      <textarea
        value={projekt.ziel ?? ""}
        onChange={(e) => onUpdate({ ...projekt, ziel: e.target.value })}
        placeholder="Was soll dieses Projekt erreichen? Woran erkennst du, dass es fertig ist? Speichert automatisch."
        className="mt-3 min-h-[40vh] w-full flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
      />
    </Dokument>
  )
}

function WorkflowModul({ projekt, onUpdate }) {
  const [text, setText] = useState("")
  const [datum, setDatum] = useState("")
  const [ansicht, setAnsicht] = useState("timeline")
  const workflow = projekt.workflow ?? []

  function addSchritt(e) {
    e.preventDefault()
    if (!text.trim()) return
    onUpdate({
      ...projekt,
      workflow: [
        ...workflow,
        { id: Date.now(), text: text.trim(), datum, erledigt: false },
      ],
    })
    setText("")
    setDatum("")
  }

  function toggle(id) {
    onUpdate({
      ...projekt,
      workflow: workflow.map((s) =>
        s.id === id ? { ...s, erledigt: !s.erledigt } : s
      ),
    })
  }

  function remove(id) {
    onUpdate({ ...projekt, workflow: workflow.filter((s) => s.id !== id) })
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Ablauf & Termine
      </p>
      <form
        onSubmit={addSchritt}
        className="flex flex-wrap items-end gap-2 border-b border-gray-100 pb-5"
      >
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Schritt
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z.B. Prototyp fertigstellen"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Termin
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
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

      {workflow.length > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
            {[
              { key: "timeline", label: "Timeline" },
              { key: "liste", label: "Liste" },
            ].map((a) => (
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
        </div>
      )}

      {workflow.length === 0 ? null : ansicht === "timeline" ? (
        <WorkflowTimeline
          workflow={workflow}
          onToggle={toggle}
          onRemove={remove}
        />
      ) : (
        <ul className="mt-2 space-y-1.5">
          {workflow.map((s, i) => (
            <li
              key={s.id}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="w-5 text-right text-xs text-gray-300">
                {i + 1}
              </span>
              <input
                type="checkbox"
                checked={s.erledigt}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 accent-gray-900"
              />
              <span
                className={`flex-1 truncate text-sm ${
                  s.erledigt ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              >
                {s.text}
              </span>
              {s.datum && (
                <span className="text-xs text-gray-400">
                  {new Date(s.datum).toLocaleDateString("de-DE")}
                </span>
              )}
              <LoeschKnopf
                onLoeschen={() => remove(s.id)}
                titel="Schritt löschen"
                klasse="text-gray-300 opacity-0 group-hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Workflow als horizontale Timeline: jeder Schritt eine Zeile, waagerecht
// nach Datum positioniert, mit senkrechter „heute“-Linie.
function WorkflowTimeline({ workflow, onToggle, onRemove }) {
  const TAG = 24 * 60 * 60 * 1000
  const mitDatum = workflow.filter((s) => s.datum)
  const ohneDatum = workflow.filter((s) => !s.datum)

  if (mitDatum.length === 0) return null

  const heuteMs = new Date(heute()).getTime()
  const zeiten = mitDatum.map((s) => new Date(s.datum).getTime())
  let min = Math.min(...zeiten, heuteMs)
  let max = Math.max(...zeiten, heuteMs)
  if (max - min < TAG) {
    min -= 3 * TAG
    max += 3 * TAG
  } else {
    // etwas Rand links und rechts
    const rand = (max - min) * 0.08
    min -= rand
    max += rand
  }
  const spanne = max - min
  const pos = (ms) => ((ms - min) / spanne) * 100
  const heutePos = pos(heuteMs)

  const achse = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    links: f * 100,
    label: new Date(min + f * spanne).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
  }))

  const sortiert = [...mitDatum].sort(
    (a, b) => new Date(a.datum) - new Date(b.datum)
  )

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {/* Datumsachse */}
        <div className="relative h-5">
          {achse.map((a, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 text-[10px] text-gray-400"
              style={{ left: `${a.links}%` }}
            >
              {a.label}
            </span>
          ))}
        </div>

        {/* Zeilen mit „heute“-Linie */}
        <div className="relative border-t border-gray-100 pt-2">
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-red-400"
            style={{ left: `${heutePos}%` }}
          >
            <span className="absolute -top-0 left-1 whitespace-nowrap text-[10px] font-medium text-red-400">
              heute
            </span>
          </div>

          <div className="space-y-1.5">
            {sortiert.map((s) => {
              const links = pos(new Date(s.datum).getTime())
              // Karte nicht über den rechten Rand schieben
              const transform = links > 55 ? "translateX(-100%)" : "none"
              return (
                <div key={s.id} className="relative h-8">
                  <div
                    className={`group absolute top-0 flex items-center gap-2 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-sm ${
                      s.erledigt
                        ? "border-gray-100 bg-gray-50 text-gray-400"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                    style={{ left: `${links}%`, transform }}
                  >
                    <input
                      type="checkbox"
                      checked={s.erledigt}
                      onChange={() => onToggle(s.id)}
                      className="h-3.5 w-3.5 accent-gray-900"
                    />
                    <span className={s.erledigt ? "line-through" : ""}>
                      {s.text}
                    </span>
                    <span className="text-gray-300">
                      {new Date(s.datum).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <LoeschKnopf
                      onLoeschen={() => onRemove(s.id)}
                      titel="Schritt löschen"
                      klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {ohneDatum.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Ohne Termin
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {ohneDatum.map((s) => (
              <li
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={s.erledigt}
                  onChange={() => onToggle(s.id)}
                  className="h-4 w-4 accent-gray-900"
                />
                <span
                  className={`flex-1 truncate text-sm ${
                    s.erledigt ? "text-gray-400 line-through" : "text-gray-800"
                  }`}
                >
                  {s.text}
                </span>
                <LoeschKnopf
                  onLoeschen={() => onRemove(s.id)}
                  titel="Schritt löschen"
                  klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TodosModul({ projekt }) {
  const [alleTodos, setAlleTodos] = useStored("todos", [])
  const todos = alleTodos.filter(
    (t) => t.projektId === projekt.id || t.kursId === projekt.id
  )
  const offen = todos.filter((t) => !t.erledigt)
  const erledigt = todos.filter((t) => t.erledigt)

  function toggle(id) {
    setAlleTodos(
      alleTodos.map((t) => (t.id === id ? { ...t, erledigt: !t.erledigt } : t))
    )
  }

  function remove(id) {
    setAlleTodos(alleTodos.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {offen.length} offene {offen.length === 1 ? "Todo" : "Todos"}
        </p>
        <TodoErstellen fest={{ projektId: projekt.id }} />
      </div>

      {todos.length === 0 ? null : (
        <ul className="mt-4 space-y-1.5">
          {[...offen, ...erledigt].map((t) => (
            <TodoZeile key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
      )}
    </div>
  )
}

function KalenderModul({ projekt }) {
  const [alleTodos] = useStored("todos", [])
  const [alleTermine] = useStored("termine", [])
  const workflow = projekt.workflow ?? []

  function eintraegeAm(key) {
    return [
      // Termine aus dem allgemeinen Kalender, die auf dieses Projekt gebucht
      // sind – so zeigen beide Kalender dieselben Termine.
      ...alleTermine
        .filter((t) => faelltAuf(t, key) && t.projektId === projekt.id)
        .map((t) => ({
          typ: t.fokus ? "fokus" : "termin",
          label: t.titel,
          zeit: t.ganztags ? "" : t.zeit,
          bis: t.endeZeit,
          dauer: t.dauer,
        })),
      ...(projekt.deadline === key
        ? [{ typ: "projekt", label: `${projekt.name} – Deadline` }]
        : []),
      ...workflow
        .filter((s) => s.datum === key)
        .map((s) => ({
          typ: "schritt",
          label: s.erledigt ? `${s.text} (erledigt)` : s.text,
        })),
      ...alleTodos
        .filter(
          (t) =>
            (t.projektId === projekt.id || t.kursId === projekt.id) &&
            !t.erledigt &&
            t.datum === key
        )
        .map((t) => ({ typ: "aufgabe", label: t.text, dauer: t.dauer })),
    ].sort((a, b) => (a.zeit || "99:99").localeCompare(b.zeit || "99:99"))
  }

  return (
    <div className="py-2">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Termine im Projekt
      </p>
      <Kalender
        eintraegeAm={eintraegeAm}
        legende={["termin", "fokus", "schritt", "aufgabe", "projekt"]}
      />
    </div>
  )
}
