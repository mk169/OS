import { useEffect, useState } from "react"
import useStored from "../lib/useStored"
import { tageBis, tageBisZahl } from "../lib/datum"
import ProjektDetail, {
  STATUS_OPTIONEN,
  PRIORITAETEN,
} from "./ProjektDetail"
import Seitenkopf from "./Seitenkopf"
import LoeschKnopf from "./LoeschKnopf"
import { PROJEKT_VORLAGEN, vorlageAnwenden } from "../lib/projektvorlagen"
import { vorlageZuBloecken } from "../lib/wissen"
import { neueBlockId } from "./BlockEditor"
import { SortMenu, LayoutUmschalter } from "./ListenControls"
import {
  projektFortschrittWerte,
  projektMetrik,
  projektMetriken,
  portfolioKennzahlen,
  prozentVon,
} from "../lib/projektfortschritt"

const ORDNER_SORT = [
  { value: "name", label: "Name A–Z" },
  { value: "faellig", label: "Fälligkeit" },
  { value: "fortschritt", label: "Fortschritt" },
  { value: "neueste", label: "Neueste" },
]

// Ordnersystem: Projekte liegen in beliebig verschachtelbaren Ordnern
// (z.B. Uni → 4. Semester → Statistik). Jedes Projekt wird individuell
// erstellt und bringt nur die Bereiche mit, die es braucht.

// Die Fortschritts-Rechnung liegt in lib/projektfortschritt.js – hier nur
// weitergereicht, weil etliche Bereiche sie seit jeher von der Projekte-Seite
// importieren (Periode, Zyklus-Widget, Block-Editor …).
export { projektFortschrittWerte }

export function projektFortschritt(projekt, todos) {
  const { erledigt, gesamt } = projektFortschrittWerte(projekt, todos)
  return gesamt > 0 ? `${erledigt}/${gesamt}` : "–"
}

// Farbiger Deadline-Chip – Farbe nach Dringlichkeit, Text via tageBis.
export function DeadlineChip({ datum }) {
  if (!datum) return null
  const tage = tageBisZahl(datum)
  const stil =
    tage < 0
      ? "bg-rose-50 text-rose-600 ring-rose-100"
      : tage <= 3
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-gray-50 text-gray-500 ring-gray-200"
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${stil}`}
    >
      {tageBis(datum)}
    </span>
  )
}

// Schlanker Fortschrittsbalken. Standardmäßig mit erledigt/gesamt-
// Beschriftung; `prozent` stellt stattdessen den Prozentwert daneben.
// Ein fertiger Balken wird grün, ein überfälliger rot – die Farbe soll die
// Zahl bestätigen, nicht nur schmücken.
export function Fortschrittsbalken({
  erledigt,
  gesamt,
  prozent = false,
  ueberfaellig = false,
  leerText = "Noch keine Aufgaben",
}) {
  if (gesamt === 0) {
    return <span className="text-xs text-gray-300">{leerText}</span>
  }
  const anteil = prozentVon({ erledigt, gesamt })
  const farbe =
    anteil === 100
      ? "bg-emerald-500"
      : ueberfaellig
        ? "bg-rose-500"
        : "bg-accent-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${farbe}`}
          style={{ width: `${anteil}%` }}
          role="progressbar"
          aria-valuenow={anteil}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
        {prozent ? `${anteil} %` : `${erledigt}/${gesamt}`}
      </span>
    </div>
  )
}

// Status-Punkt: ein Blick genügt – rot überfällig, bernstein diese Woche,
// grün fertig, grau ruhend, sonst Akzent.
function StatusPunkt({ metrik }) {
  const farbe = metrik.ueberfaellig
    ? "bg-rose-500"
    : metrik.fertig
      ? "bg-emerald-500"
      : metrik.tageUebrig != null && metrik.tageUebrig <= 7
        ? "bg-amber-500"
        : metrik.gesamt === 0
          ? "bg-gray-300"
          : "bg-accent-500"
  return <span className={`h-2 w-2 shrink-0 rounded-full ${farbe}`} />
}

// Kennzahlen über alle laufenden Projekte, direkt unter dem Seitenkopf:
// wie viele laufen, wie weit sie im Mittel sind, was diese Woche fällig ist
// und was schon überfällig ist. Der breite Balken zeigt den Mittelwert.
function PortfolioLeiste({ kennzahlen }) {
  if (kennzahlen.laufend === 0) return null
  const zahlen = [
    { wert: kennzahlen.laufend, label: "laufend" },
    { wert: kennzahlen.offen, label: "offene Schritte" },
    {
      wert: kennzahlen.dieseWoche,
      label: "diese Woche fällig",
      ton: kennzahlen.dieseWoche > 0 ? "text-amber-600" : null,
    },
    {
      wert: kennzahlen.ueberfaellig,
      label: "überfällig",
      ton: kennzahlen.ueberfaellig > 0 ? "text-rose-600" : null,
    },
  ]

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Ø Fortschritt
          </p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums leading-none text-gray-900">
            {kennzahlen.durchschnitt}
            <span className="ml-0.5 text-lg font-medium text-gray-400">%</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-3">
          {zahlen.map((z) => (
            <div key={z.label}>
              <p
                className={`text-lg font-semibold tabular-nums leading-none ${z.ton ?? "text-gray-900"}`}
              >
                {z.wert}
              </p>
              <p className="mt-1 text-[11px] font-medium text-gray-400">
                {z.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-accent-500 transition-all duration-500"
          style={{ width: `${kennzahlen.durchschnitt}%` }}
          role="progressbar"
          aria-valuenow={kennzahlen.durchschnitt}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Durchschnittlicher Projektfortschritt"
        />
      </div>
      {kennzahlen.verfolgt < kennzahlen.laufend && (
        <p className="mt-2 text-[11px] text-gray-400">
          {kennzahlen.laufend - kennzahlen.verfolgt} Projekt
          {kennzahlen.laufend - kennzahlen.verfolgt === 1 ? "" : "e"} ohne
          Ablauf – zählt im Mittel nicht mit.
        </p>
      )}
    </div>
  )
}

// Freundlicher Leerzustand statt einer stummen Seite: sagt, was hier
// hingehört, und bietet den nächsten Schritt an.
function Leerzustand({ titel, text, aktion }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-900">{titel}</p>
      {text && (
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-gray-400">
          {text}
        </p>
      )}
      {aktion && <div className="mt-4">{aktion}</div>}
    </div>
  )
}

function OrdnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-gray-400"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

export default function OrdnerSeite({
  startProjektId = null,
  startNotizId = null,
  startModul = null,
  onNavigate,
}) {
  const [ordner, setOrdner] = useStored("ordner", [])
  const [projekte, setProjekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])
  // Nur für den Zähler an der Ansichts-Leiste – gepflegt wird der Backlog
  // in BacklogAnsicht (derselbe Speicher, dieselben Daten).
  const [ideen] = useStored("projektIdeen", [])

  const [aktuellerOrdnerId, setAktuellerOrdnerId] = useState(null)
  const [offenesProjektId, setOffenesProjektId] = useState(startProjektId)
  const [offeneNotizId, setOffeneNotizId] = useState(startNotizId)
  const [offenesModul, setOffenesModul] = useState(startModul)
  const [ordnerFormOffen, setOrdnerFormOffen] = useState(false)
  const [ordnerName, setOrdnerName] = useState("")
  // Formular für neue Projekte/Areas: der Wert ist zugleich der Starttyp.
  const [projektFormOffen, setProjektFormOffen] = useState(false)
  const [formTyp, setFormTyp] = useState("projekt")
  const [ansicht, setAnsicht] = useState("ordner")
  const [ordnerSort, setOrdnerSort] = useStored("projekteOrdnerSort", "name")
  const [ordnerLayout, setOrdnerLayout] = useStored("projekteOrdnerLayout", "raster")

  // Von außen (App.jsx) angestoßene Navigation nachziehen – OrdnerSeite
  // bleibt bei aktiver "projekte"-Seite dauerhaft gemountet, ein bloßer
  // Prop-Wechsel würde die obigen useState-Initialwerte sonst nicht
  // erneut greifen lassen.
  useEffect(() => {
    if (startProjektId != null) setOffenesProjektId(startProjektId)
    setOffeneNotizId(startNotizId)
    setOffenesModul(startModul)
  }, [startProjektId, startNotizId, startModul])

  function updateProjekt(aktualisiert) {
    setProjekte(
      projekte.map((p) => (p.id === aktualisiert.id ? aktualisiert : p))
    )
  }

  // Verlinkungsziel aus einer Projekt-Notiz öffnen: Projekt wechselt direkt
  // innerhalb dieser Seite, eine Notiz öffnet zusätzlich das Notizen-Tab.
  function oeffneZiel(ziel) {
    if (ziel.typ === "notiz") {
      setOffenesProjektId(ziel.projektId)
      setOffeneNotizId(ziel.id)
    } else if (ziel.typ === "projekt") {
      setOffenesProjektId(ziel.id)
    }
  }

  const offenesProjekt = projekte.find((p) => p.id === offenesProjektId)
  if (offenesProjekt) {
    return (
      <ProjektDetail
        key={offenesProjekt.id}
        projekt={offenesProjekt}
        onUpdate={updateProjekt}
        onBack={() => setOffenesProjektId(null)}
        startNotizId={offeneNotizId}
        startModul={offenesModul}
        onOeffneZiel={oeffneZiel}
        onNavigate={onNavigate}
      />
    )
  }

  // Archivierte Projekte bleiben gespeichert, tauchen aber nur in der
  // Archiv-Ansicht auf.
  const aktive = projekte.filter((p) => !p.archiviert)
  const archivierte = projekte.filter((p) => p.archiviert)
  // Areas bekommen eine eigene Ansicht – Ordner/Alle/Board zeigen nur
  // echte Projekte. Anstehend/Dashboard filtern bewusst nicht nach typ,
  // damit Areas' datierte Todos/Deadlines dort trotzdem auftauchen.
  const aktiveProjekte = aktive.filter((p) => (p.typ ?? "projekt") !== "area")
  const areas = aktive.filter((p) => (p.typ ?? "projekt") === "area")

  // Portfolio-Blick über alle laufenden Projekte (Kopf der Seite) und die
  // Zähler an der Ansichts-Leiste.
  const metriken = projektMetriken(projekte, todos)
  const kennzahlen = portfolioKennzahlen(metriken)
  const zaehler = {
    alle: aktiveProjekte.length,
    backlog: ideen.length,
    areas: areas.length,
    archiv: archivierte.length,
    // Zählt dasselbe, was die Anstehend-Ansicht listet – aber nur das, was
    // wirklich drängt: überfällig oder innerhalb der nächsten sieben Tage.
    anstehend: sammleTermine(aktive, todos).filter(
      (e) => tageBisZahl(e.datum) <= 7
    ).length,
  }

  const unterordner = ordner
    .filter((o) => (o.parentId ?? null) === aktuellerOrdnerId)
    .sort((a, b) =>
      ordnerSort === "neueste"
        ? b.id - a.id
        : (a.name ?? "").localeCompare(b.name ?? "")
    )
  const hiesigeProjekte = aktiveProjekte
    .filter((p) => (p.ordnerId ?? null) === aktuellerOrdnerId)
    .sort((a, b) => {
      if (ordnerSort === "faellig")
        return (a.deadline || "9999").localeCompare(b.deadline || "9999")
      if (ordnerSort === "neueste") return b.id - a.id
      if (ordnerSort === "fortschritt") {
        const pa = projektFortschrittWerte(a, todos)
        const pb = projektFortschrittWerte(b, todos)
        const ra = pa.gesamt ? pa.erledigt / pa.gesamt : -1
        const rb = pb.gesamt ? pb.erledigt / pb.gesamt : -1
        return rb - ra
      }
      return (a.name ?? "").localeCompare(b.name ?? "")
    })

  // Brotkrumen-Pfad vom Start bis zum aktuellen Ordner
  const pfad = []
  let zeiger = aktuellerOrdnerId
  while (zeiger != null) {
    const o = ordner.find((x) => x.id === zeiger)
    if (!o) break
    pfad.unshift(o)
    zeiger = o.parentId ?? null
  }

  function addOrdner(e) {
    e.preventDefault()
    if (!ordnerName.trim()) return
    setOrdner([
      ...ordner,
      { id: Date.now(), name: ordnerName.trim(), parentId: aktuellerOrdnerId },
    ])
    setOrdnerName("")
    setOrdnerFormOffen(false)
  }

  function removeOrdner(id) {
    const hatInhalt =
      ordner.some((o) => o.parentId === id) ||
      projekte.some((p) => p.ordnerId === id)
    if (hatInhalt) return
    setOrdner(ordner.filter((o) => o.id !== id))
  }

  // Rückfrage stellt der Löschknopf selbst (LoeschKnopf), daher hier ohne
  // Systemdialog.
  function removeProjekt(id) {
    setProjekte(projekte.filter((x) => x.id !== id))
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        eyebrow={
          kennzahlen.laufend > 0
            ? `${kennzahlen.laufend} ${kennzahlen.laufend === 1 ? "Projekt läuft" : "Projekte laufen"}`
            : "Portfolio"
        }
        titel="Projekte"
        unterzeile="Ordner, Areas und alles, was gerade in Arbeit ist."
        aktion={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOrdnerFormOffen(!ordnerFormOffen)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              + Ordner
            </button>
            <button
              onClick={() => {
                setFormTyp("projekt")
                setProjektFormOffen(!projektFormOffen)
              }}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
            >
              + Projekt
            </button>
          </div>
        }
      />

      <PortfolioLeiste kennzahlen={kennzahlen} />

      <AnsichtToggle ansicht={ansicht} setAnsicht={setAnsicht} zaehler={zaehler} />

      {ordnerFormOffen && (
        <form
          onSubmit={addOrdner}
          className="mt-4 flex gap-2 rounded-xl border border-gray-300 bg-white p-4"
        >
          <input
            value={ordnerName}
            onChange={(e) => setOrdnerName(e.target.value)}
            placeholder="Ordnername, z.B. Uni oder 4. Semester"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Anlegen
          </button>
          <button
            type="button"
            onClick={() => setOrdnerFormOffen(false)}
            className="px-2 py-2 text-sm text-gray-400 hover:text-gray-900"
          >
            Abbrechen
          </button>
        </form>
      )}

      {projektFormOffen && (
        <ProjektErstellen
          key={formTyp}
          startTyp={formTyp}
          ordnerId={aktuellerOrdnerId}
          projekte={projekte}
          setProjekte={setProjekte}
          onFertig={() => setProjektFormOffen(false)}
        />
      )}

      {ansicht === "alle" && (
        <AlleAnsicht
          projekte={aktiveProjekte}
          todos={todos}
          onOeffnen={setOffenesProjektId}
          onRemove={removeProjekt}
        />
      )}
      {ansicht === "backlog" && (
        <BacklogAnsicht
          ordner={ordner}
          projekte={projekte}
          setProjekte={setProjekte}
          aktuellerOrdnerId={aktuellerOrdnerId}
          onOeffnen={setOffenesProjektId}
        />
      )}
      {ansicht === "board" && (
        <BoardAnsicht
          projekte={projekte.filter((p) => (p.typ ?? "projekt") !== "area")}
          setProjekte={setProjekte}
          onOeffnen={setOffenesProjektId}
        />
      )}
      {ansicht === "areas" && (
        <AreasAnsicht
          projekte={aktive}
          todos={todos}
          onOeffnen={setOffenesProjektId}
          onRemove={removeProjekt}
          onNeueArea={() => {
            setFormTyp("area")
            setProjektFormOffen(true)
          }}
        />
      )}
      {ansicht === "anstehend" && (
        <AnstehendAnsicht
          projekte={aktive}
          todos={todos}
          onOeffnen={setOffenesProjektId}
        />
      )}
      {ansicht === "archiv" && (
        <ArchivAnsicht
          archivierte={archivierte}
          projekte={projekte}
          setProjekte={setProjekte}
          onOeffnen={setOffenesProjektId}
        />
      )}

      {ansicht === "ordner" && (
        <div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-400">
              <button
                onClick={() => setAktuellerOrdnerId(null)}
                className={
                  aktuellerOrdnerId === null
                    ? "font-medium text-gray-900"
                    : "hover:text-gray-900"
                }
              >
                Start
              </button>
              {pfad.map((o) => (
                <span key={o.id} className="flex items-center gap-1">
                  <span>/</span>
                  <button
                    onClick={() => setAktuellerOrdnerId(o.id)}
                    className={
                      o.id === aktuellerOrdnerId
                        ? "font-medium text-gray-900"
                        : "hover:text-gray-900"
                    }
                  >
                    {o.name}
                  </button>
                </span>
              ))}
            </nav>
            {(unterordner.length > 0 || hiesigeProjekte.length > 0) && (
              <div className="flex items-center gap-2">
                <SortMenu wert={ordnerSort} onChange={setOrdnerSort} optionen={ORDNER_SORT} />
                <LayoutUmschalter layout={ordnerLayout} setLayout={setOrdnerLayout} />
              </div>
            )}
          </div>

      {unterordner.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Ordner
          </h2>
          {ordnerLayout === "liste" ? (
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {unterordner.map((o) => {
                const anzahl =
                  ordner.filter((x) => x.parentId === o.id).length +
                  projekte.filter((p) => p.ordnerId === o.id).length
                return (
                  <li
                    key={o.id}
                    onClick={() => setAktuellerOrdnerId(o.id)}
                    className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <OrdnerIcon />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900">
                      {o.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">{anzahl}</span>
                    {anzahl === 0 && (
                      <LoeschKnopf
                        onLoeschen={() => removeOrdner(o.id)}
                        titel="Leeren Ordner löschen"
                        klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unterordner.map((o) => {
                const anzahl =
                  ordner.filter((x) => x.parentId === o.id).length +
                  projekte.filter((p) => p.ordnerId === o.id).length
                return (
                  <div
                    key={o.id}
                    onClick={() => setAktuellerOrdnerId(o.id)}
                    className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400"
                  >
                    <OrdnerIcon />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900">
                      {o.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {anzahl}
                    </span>
                    {anzahl === 0 && (
                      <LoeschKnopf
                        onLoeschen={() => removeOrdner(o.id)}
                        titel="Leeren Ordner löschen"
                        klasse="text-gray-300 opacity-0 group-hover:opacity-100"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {hiesigeProjekte.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Projekte
          </h2>
          {ordnerLayout === "liste" ? (
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {hiesigeProjekte.map((p) => (
                <ProjektZeile
                  key={p.id}
                  p={p}
                  todos={todos}
                  onOeffnen={setOffenesProjektId}
                  onRemove={removeProjekt}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hiesigeProjekte.map((p) => (
                <ProjektKarte
                  key={p.id}
                  p={p}
                  todos={todos}
                  onOeffnen={setOffenesProjektId}
                  onRemove={removeProjekt}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {unterordner.length === 0 && hiesigeProjekte.length === 0 && (
        <Leerzustand
          titel={
            aktuellerOrdnerId === null
              ? "Noch nichts angelegt."
              : "Dieser Ordner ist leer."
          }
          text="Ordner sortieren, Projekte arbeiten. Lege ein Projekt an – oder halte die Idee erst im Backlog fest, wenn sie noch nicht so weit ist."
          aktion={
            <button
              onClick={() => {
                setFormTyp("projekt")
                setProjektFormOffen(true)
              }}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              + Projekt anlegen
            </button>
          }
        />
      )}

        </div>
      )}
    </div>
  )
}

const ANSICHTEN = [
  { key: "ordner", label: "Ordner" },
  { key: "alle", label: "Alle" },
  { key: "backlog", label: "Backlog" },
  { key: "areas", label: "Areas" },
  { key: "board", label: "Board" },
  { key: "anstehend", label: "Anstehend" },
  { key: "archiv", label: "Archiv" },
]

const PRIO_RANG = { hoch: 3, mittel: 2, niedrig: 1, "": 0 }

// Ansichts-Leiste als Reiter statt als Pillen-Gruppe: sieben Ansichten in
// einer Pillen-Leiste wirken wie sieben gleichrangige Knöpfe, Reiter mit
// Unterstrich lesen sich als eine Seite mit mehreren Blickwinkeln. Die Zähler
// ersparen den Klick ins Leere.
//
// Auf schmalen Handys passen die Reiter nicht nebeneinander. Statt die Seite
// zu verbreitern (horizontaler Overflow), wird die Leiste auf die
// Viewport-Breite begrenzt und scrollt bei Bedarf intern. `100vw − 3rem`
// entspricht der Seitenpolsterung (px-6) des umgebenden Containers.
function AnsichtToggle({ ansicht, setAnsicht, zaehler = {} }) {
  return (
    <div className="mb-2 flex max-w-[calc(100vw-3rem)] items-center gap-5 overflow-x-auto border-b border-gray-200 sm:gap-6">
      {ANSICHTEN.map((a) => {
        const aktiv = ansicht === a.key
        const anzahl = zaehler[a.key]
        return (
          <button
            key={a.key}
            onClick={() => setAnsicht(a.key)}
            aria-current={aktiv ? "page" : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              aktiv
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {a.label}
            {anzahl > 0 && (
              <span
                className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  aktiv ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {anzahl}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Wiederverwendbare Projektkarte (Ordner- und Alle-Ansicht). Die Karte
// beantwortet drei Fragen auf einen Blick: Wie weit bin ich (Prozent +
// Leiste), was ist der nächste Griff (offener Workflow-Schritt) und wie
// eilig ist es (Statuspunkt + Deadline-Chip).
function ProjektKarte({ p, todos, onOeffnen, onRemove }) {
  const m = projektMetrik(p, todos)
  const prio = PRIORITAETEN.find((x) => x.value === (p.prioritaet ?? ""))

  return (
    <div
      onClick={() => onOeffnen(p.id)}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md hover:shadow-gray-200/60"
    >
      {onRemove && (
        <span className="absolute right-3 top-3">
          <LoeschKnopf
            onLoeschen={() => onRemove(p.id)}
            titel="Projekt löschen"
            klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
          />
        </span>
      )}

      <div className="flex items-center gap-2 pr-6">
        <StatusPunkt metrik={m} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
          {p.name}
        </h3>
      </div>

      {p.beschreibung && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-400">
          {p.beschreibung}
        </p>
      )}

      {/* mt-auto: In einer Kartenreihe strecken sich alle Karten auf dieselbe
       * Höhe – der Fortschritt soll dann auch auf derselben Linie sitzen,
       * egal wie lang die Beschreibung darüber ist. */}
      <div className="mt-auto flex items-baseline justify-between gap-2 pt-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {m.quelle === "todos" ? "Aufgaben" : "Workflow"}
        </span>
        <span className="text-lg font-semibold tabular-nums leading-none text-gray-900">
          {m.prozent}
          <span className="ml-0.5 text-xs font-medium text-gray-400">%</span>
        </span>
      </div>
      <div className="mt-1.5">
        <Fortschrittsbalken
          erledigt={m.erledigt}
          gesamt={m.gesamt}
          ueberfaellig={m.ueberfaellig}
          leerText="Noch kein Ablauf"
        />
      </div>

      {m.schritt && (
        <p className="mt-2.5 truncate text-xs text-gray-500">
          <span className="text-gray-300">▸</span> {m.schritt.text}
        </p>
      )}

      {(p.deadline || (prio && prio.value)) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <DeadlineChip datum={p.deadline} />
          {prio && prio.value && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${prio.tag}`}
            >
              {prio.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Kompakte Projekt-Zeile für die Listen-Ansicht (Ordneransicht).
function ProjektZeile({ p, todos, onOeffnen, onRemove }) {
  const m = projektMetrik(p, todos)
  return (
    <li
      onClick={() => onOeffnen(p.id)}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
    >
      <StatusPunkt metrik={m} />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">
          {p.name}
        </span>
        {m.schritt && (
          <span className="block truncate text-xs text-gray-400">
            {m.schritt.text}
          </span>
        )}
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-gray-500">
        {m.gesamt > 0 ? `${m.prozent}%` : "–"}
      </span>
      <div className="hidden w-24 shrink-0 sm:block">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              m.prozent === 100
                ? "bg-emerald-500"
                : m.ueberfaellig
                  ? "bg-rose-500"
                  : "bg-accent-500"
            }`}
            style={{ width: `${m.prozent}%` }}
          />
        </div>
      </div>
      {p.deadline && <DeadlineChip datum={p.deadline} />}
      {onRemove && (
        <LoeschKnopf
          onLoeschen={() => onRemove(p.id)}
          titel="Projekt löschen"
          klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
        />
      )}
    </li>
  )
}

// Backlog: der Sammelplatz für alles, was noch kein Projekt ist – Ideen,
// Vorhaben, Vielleicht-irgendwann. Festhalten geht in einer Zeile; erst
// wenn etwas daraus wird, macht ein Klick ein Projekt daraus (die Notiz
// wird dessen Beschreibung).
function BacklogAnsicht({
  ordner,
  projekte,
  setProjekte,
  aktuellerOrdnerId,
  onOeffnen,
}) {
  const [ideen, setIdeen] = useStored("projektIdeen", [])
  const [text, setText] = useState("")
  const [offeneId, setOffeneId] = useState(null)
  const [zielOrdner, setZielOrdner] = useStored("backlogZielOrdner", "")

  // Neueste zuerst – frisch Notiertes steht oben.
  const liste = [...ideen].sort((a, b) => b.id - a.id)

  function addIdee(e) {
    e.preventDefault()
    if (!text.trim()) return
    // Bewusst ohne Notizfeld aufzuklappen: schnelles Festhalten bleibt
    // einzeilig, die Notiz kommt später über „Notiz".
    setIdeen([...ideen, { id: Date.now(), text: text.trim(), notiz: "" }])
    setText("")
  }

  function setIdee(id, patch) {
    setIdeen(ideen.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  // Aus einer Idee ein Projekt machen: Titel wird Projektname, die Notiz
  // die Beschreibung. Die Idee verlässt damit den Backlog.
  function zuProjekt(idee) {
    const id = Date.now()
    const ordnerId = zielOrdner ? Number(zielOrdner) : (aktuellerOrdnerId ?? null)
    setProjekte([
      ...projekte,
      {
        id,
        name: idee.text.trim(),
        beschreibung: (idee.notiz ?? "").trim(),
        ordnerId,
        deadline: "",
        typ: "projekt",
        module: [],
        ziel: "",
        workflow: [],
      },
    ])
    setIdeen(ideen.filter((i) => i.id !== idee.id))
    onOeffnen(id)
  }

  return (
    <div className="mt-4">
      <form
        onSubmit={addIdee}
        className="flex gap-2 rounded-xl border border-gray-300 bg-white p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Idee festhalten – alles, was noch kein Projekt ist"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Merken
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">
          {liste.length === 0
            ? "Der Backlog ist leer."
            : `${liste.length} ${liste.length === 1 ? "Idee" : "Ideen"}`}
        </p>
        {ordner.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            Neue Projekte in
            <select
              value={zielOrdner}
              onChange={(e) => setZielOrdner(e.target.value)}
              className="cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-gray-900"
            >
              <option value="">Kein Ordner</option>
              {ordner.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {liste.length > 0 && (
        <ul className="mt-3 space-y-2">
          {liste.map((idee) => {
            const offen = offeneId === idee.id
            return (
              <li
                key={idee.id}
                className="group rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={idee.text}
                    onChange={(e) => setIdee(idee.id, { text: e.target.value })}
                    className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-gray-900 outline-none"
                  />
                  <button
                    onClick={() => setOffeneId(offen ? null : idee.id)}
                    title="Notiz"
                    className={`shrink-0 text-xs transition-colors hover:text-gray-900 ${
                      idee.notiz?.trim() ? "text-gray-500" : "text-gray-300"
                    }`}
                  >
                    Notiz
                  </button>
                  <button
                    onClick={() => zuProjekt(idee)}
                    title="Daraus ein Projekt machen"
                    className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    → Projekt
                  </button>
                  <LoeschKnopf
                    onLoeschen={() =>
                      setIdeen(ideen.filter((i) => i.id !== idee.id))
                    }
                    titel="Idee verwerfen"
                    klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
                  />
                </div>
                {(offen || idee.notiz?.trim()) && (
                  <textarea
                    value={idee.notiz ?? ""}
                    onChange={(e) => setIdee(idee.id, { notiz: e.target.value })}
                    rows={offen ? 3 : 2}
                    placeholder="Notiz – worum geht es, warum, was wäre der erste Schritt?"
                    className="mt-2 w-full resize-none rounded-md bg-gray-50/60 px-3 py-2 text-sm leading-relaxed text-gray-700 outline-none placeholder:text-gray-300 focus:bg-gray-50"
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// „Alle Projekte" ordnerübergreifend mit Sortierung und Filtern.
function AlleAnsicht({ projekte, todos, onOeffnen, onRemove }) {
  const [sortierung, setSortierung] = useState("faellig")
  const [statusFilter, setStatusFilter] = useState("")
  const [prioFilter, setPrioFilter] = useState("")

  const gefiltert = projekte.filter((p) => {
    if (statusFilter && (p.status ?? "offen") !== statusFilter) return false
    if (prioFilter && (p.prioritaet ?? "") !== prioFilter) return false
    return true
  })
  const liste = [...gefiltert].sort((a, b) => {
    if (sortierung === "faellig")
      return (a.deadline || "9999").localeCompare(b.deadline || "9999")
    if (sortierung === "prioritaet")
      return (
        (PRIO_RANG[b.prioritaet ?? ""] ?? 0) -
        (PRIO_RANG[a.prioritaet ?? ""] ?? 0)
      )
    if (sortierung === "status")
      return (a.status ?? "offen").localeCompare(b.status ?? "offen")
    return a.name.localeCompare(b.name)
  })

  const selektStil =
    "rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-800 outline-none focus:border-gray-900"

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <label className="flex items-center gap-1.5">
          Sortieren
          <select
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
            className={selektStil}
          >
            <option value="faellig">Fälligkeit</option>
            <option value="prioritaet">Priorität</option>
            <option value="status">Status</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selektStil}
          >
            <option value="">Alle</option>
            {STATUS_OPTIONEN.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          Priorität
          <select
            value={prioFilter}
            onChange={(e) => setPrioFilter(e.target.value)}
            className={selektStil}
          >
            <option value="">Alle</option>
            {PRIORITAETEN.filter((p) => p.value).map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {liste.length === 0 ? (
        <Leerzustand
          titel={
            projekte.length === 0
              ? "Noch keine Projekte."
              : "Kein Projekt passt zu diesem Filter."
          }
          text={
            projekte.length === 0
              ? "Sobald du ein Projekt anlegst, erscheint es hier – ordnerübergreifend, sortierbar nach Fälligkeit, Priorität und Status."
              : "Setze Status oder Priorität zurück, um wieder alle Projekte zu sehen."
          }
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((p) => (
            <ProjektKarte
              key={p.id}
              p={p}
              todos={todos}
              onOeffnen={onOeffnen}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Areas: dauerhafte Lebensbereiche (Gesundheit, Finanzen, Wohnung …). Anders
// als ein Ordner, der nur sortiert, bündelt eine Area laufende Vorhaben und
// zeigt, wie es um den Bereich steht: laufende Projekte, offene und
// überfällige Aufgaben. Eine Area ohne laufendes Projekt fällt hier auf –
// genau dafür sind Areas da.
function AreaKarte({ area, projekte, todos, onOeffnen, onRemove }) {
  const zugeordnet = projekte.filter(
    (p) => p.areaId === area.id && !p.archiviert
  )
  const laufend = zugeordnet.filter((p) => (p.status ?? "offen") !== "fertig")
  // Aufgaben der Area: direkt an ihr hängende plus die ihrer Projekte.
  const gehoert = (t) => {
    const ziel = t.projektId ?? t.kursId
    return ziel === area.id || zugeordnet.some((p) => p.id === ziel)
  }
  const offen = todos.filter((t) => !t.erledigt && gehoert(t))
  const ueberfaellig = offen.filter((t) => t.datum && tageBisZahl(t.datum) < 0)

  return (
    <div
      onClick={() => onOeffnen(area.id)}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-400"
    >
      {onRemove && (
        <span className="absolute right-3 top-3">
          <LoeschKnopf
            onLoeschen={() => onRemove(area.id)}
            titel="Area löschen"
            klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
          />
        </span>
      )}
      <h3 className="truncate pr-4 text-sm font-medium text-gray-900">
        {area.name}
      </h3>
      {area.beschreibung && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
          {area.beschreibung}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            laufend.length === 0
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {laufend.length === 0
            ? "kein laufendes Projekt"
            : `${laufend.length} ${laufend.length === 1 ? "Projekt" : "Projekte"}`}
        </span>
        {offen.length > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {offen.length} offen
          </span>
        )}
        {ueberfaellig.length > 0 && (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            {ueberfaellig.length} überfällig
          </span>
        )}
      </div>

      {laufend.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
          {laufend.slice(0, 3).map((p) => (
            <li key={p.id}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOeffnen(p.id)
                }}
                className="block w-full truncate text-left text-xs text-gray-500 transition-colors hover:text-gray-900"
              >
                → {p.name}
              </button>
            </li>
          ))}
          {laufend.length > 3 && (
            <li className="text-[10px] text-gray-400">
              +{laufend.length - 3} weitere
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function AreasAnsicht({ projekte, todos, onOeffnen, onRemove, onNeueArea }) {
  const areas = projekte.filter((p) => (p.typ ?? "projekt") === "area")
  const ohneArea = projekte.filter(
    (p) =>
      (p.typ ?? "projekt") !== "area" && !p.archiviert && p.areaId == null
  )

  return (
    <div className="mt-4">
      {areas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            Noch keine Area angelegt.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">
            Eine Area ist ein dauerhafter Lebensbereich ohne Enddatum –
            Gesundheit, Finanzen, Wohnung, Beruf. Projekte laufen darin ab und
            hören auf; die Area bleibt.
          </p>
          <button
            onClick={onNeueArea}
            className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            + Area anlegen
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {areas.length} {areas.length === 1 ? "Area" : "Areas"}
            </p>
            <button
              onClick={onNeueArea}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              + Area
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((a) => (
              <AreaKarte
                key={a.id}
                area={a}
                projekte={projekte}
                todos={todos}
                onOeffnen={onOeffnen}
                onRemove={onRemove}
              />
            ))}
          </div>

          {ohneArea.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Projekte ohne Area
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Zuordnen im Projekt unter „Area" – oder bewusst so lassen.
              </p>
              <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {ohneArea.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => onOeffnen(p.id)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                      {p.name}
                    </span>
                    {p.deadline && <DeadlineChip datum={p.deadline} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// Kanban-Board nach Status, Projekte per Drag&Drop verschiebbar.
function BoardAnsicht({ projekte, setProjekte, onOeffnen }) {
  const [ziehId, setZiehId] = useState(null)

  function setzeStatus(id, status) {
    setProjekte(projekte.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {STATUS_OPTIONEN.map((sp) => {
        const spalte = projekte.filter(
          (p) => !p.archiviert && (p.status ?? "offen") === sp.value
        )
        return (
          <div
            key={sp.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (ziehId != null) setzeStatus(ziehId, sp.value)
              setZiehId(null)
            }}
            className="rounded-xl border border-gray-200 bg-gray-50/40 p-2"
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${sp.tag}`}
              >
                {sp.label}
              </span>
              <span className="text-xs text-gray-400">{spalte.length}</span>
            </div>
            <div className="mt-1 space-y-2">
              {spalte.map((p) => {
                const pr = PRIORITAETEN.find((x) => x.value === p.prioritaet)
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setZiehId(p.id)}
                    onDragEnd={() => setZiehId(null)}
                    onClick={() => onOeffnen(p.id)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-400"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {pr && pr.value && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${pr.tag}`}
                        >
                          {pr.label}
                        </span>
                      )}
                      {p.deadline && (
                        <span className="ml-auto">
                          <DeadlineChip datum={p.deadline} />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {spalte.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-gray-300">
                  Hierher ziehen
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Rohliste aller terminierten Einträge (Projekt-Deadlines, Workflow-
// Schritte mit Datum, Todos mit Datum) – unsortiert, ungekürzt. Gemeinsam
// genutzt von AnstehendAnsicht und dem Wochen-Review (ReviewSeite).
export function sammleTermine(projekte, todos) {
  const eintraege = []
  for (const p of projekte) {
    if (p.deadline)
      eintraege.push({
        datum: p.deadline,
        label: `Deadline: ${p.name}`,
        projektId: p.id,
        typ: "Deadline",
      })
    for (const s of p.workflow ?? []) {
      if (s.datum && !s.erledigt)
        eintraege.push({
          datum: s.datum,
          label: s.text,
          projektId: p.id,
          typ: "Schritt",
        })
    }
  }
  for (const t of todos) {
    const pid = t.projektId ?? t.kursId
    if (t.datum && !t.erledigt && pid && projekte.some((p) => p.id === pid))
      eintraege.push({
        datum: t.datum,
        label: t.text,
        projektId: pid,
        typ: "Todo",
      })
  }
  return eintraege
}

// Projektübergreifend: nächste Deadlines, terminierte Schritte, Todos.
function AnstehendAnsicht({ projekte, todos, onOeffnen }) {
  const projektName = (id) => projekte.find((p) => p.id === id)?.name ?? ""
  const liste = sammleTermine(projekte, todos)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 25)

  return (
    <div className="mt-4">
      {liste.length === 0 ? (
        <Leerzustand
          titel="Nichts terminiert."
          text="Hier sammeln sich Projekt-Deadlines, datierte Workflow-Schritte und Aufgaben mit Datum. Gib einem Schritt ein Datum, und er taucht auf."
        />
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {liste.map((e, i) => (
            <li
              key={i}
              onClick={() => onOeffnen(e.projektId)}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <span className="w-20 shrink-0 text-xs text-gray-500">
                {new Date(e.datum).toLocaleDateString("de-DE")}
              </span>
              <DeadlineChip datum={e.datum} />
              <span className="flex-1 truncate text-sm text-gray-800">
                {e.label}
              </span>
              <span className="hidden max-w-32 truncate text-xs text-gray-400 sm:inline">
                {projektName(e.projektId)}
              </span>
              <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {e.typ}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Archivierte Projekte: wiederherstellen oder endgültig löschen.
function ArchivAnsicht({ archivierte, projekte, setProjekte, onOeffnen }) {
  function wiederherstellen(id) {
    setProjekte(
      projekte.map((p) => (p.id === id ? { ...p, archiviert: false } : p))
    )
  }
  function loeschen(id) {
    setProjekte(projekte.filter((p) => p.id !== id))
  }

  return (
    <div className="mt-4">
      {archivierte.length === 0 ? (
        <Leerzustand
          titel="Das Archiv ist leer."
          text="Abgeschlossene Projekte legst du im Projekt unter „Archivieren“ ab. Sie bleiben gespeichert, verschwinden aber aus den übrigen Ansichten."
        />
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {archivierte.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <button
                onClick={() => onOeffnen(p.id)}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-900"
              >
                {p.name}
              </button>
              {p.deadline && <DeadlineChip datum={p.deadline} />}
              <button
                onClick={() => wiederherstellen(p.id)}
                className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Wiederherstellen
              </button>
              <LoeschKnopf
                onLoeschen={() => loeschen(p.id)}
                titel="Endgültig löschen"
                frageText="Endgültig löschen?"
                klasse="text-gray-300"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProjektErstellen({
  ordnerId,
  projekte,
  setProjekte,
  onFertig,
  startTyp = "projekt",
}) {
  const [typ, setTyp] = useState(startTyp)
  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [deadline, setDeadline] = useState("")
  const [vorlage, setVorlage] = useState("leer")

  // Ein Projekt startet leer – oder mit der Struktur einer Vorlage
  // (Bereiche, Seiten, Ablauf). Areas bleiben bewusst schlicht.
  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return
    const gewaehlt =
      typ === "area"
        ? null
        : PROJEKT_VORLAGEN.find((v) => v.key === vorlage) ?? null
    const struktur = gewaehlt
      ? vorlageAnwenden(gewaehlt, (t) => vorlageZuBloecken(t, neueBlockId), () =>
          neueBlockId()
        )
      : { module: [], workflow: [], seiten: [], seitenTabs: [], uebersichtMigriert: true }
    setProjekte([
      ...projekte,
      {
        id: Date.now(),
        name: name.trim(),
        beschreibung: beschreibung.trim(),
        ordnerId,
        deadline: typ === "area" ? "" : deadline,
        typ,
        ziel: "",
        ...struktur,
      },
    ])
    onFertig()
  }

  return (
    <form
      onSubmit={speichern}
      className="mt-4 rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="mb-3 flex w-fit rounded-md border border-gray-200 p-0.5 text-xs">
        {[
          { key: "projekt", label: "Projekt" },
          { key: "area", label: "Area" },
        ].map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setTyp(o.key)}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              typ === o.key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {typ === "projekt" && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Vorlage
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PROJEKT_VORLAGEN.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVorlage(v.key)}
                title={v.beschreibung}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  vorlage === v.key
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-500 hover:text-gray-900"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {PROJEKT_VORLAGEN.find((v) => v.key === vorlage)?.beschreibung}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={typ === "area" ? "z.B. Finanzen" : "z.B. Statistik I"}
            autoFocus
            className="mt-1 w-52 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Beschreibung
          <input
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="optional"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        {typ === "projekt" && (
          <label className="flex flex-col text-xs text-gray-500">
            Deadline / Prüfung
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onFertig}
          className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Projekt anlegen
        </button>
      </div>
    </form>
  )
}
