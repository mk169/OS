import { useEffect, useState } from "react"
import useStored from "../lib/useStored"
import { tageBisZahl } from "../lib/datum"
import { DeadlineChip, Fortschrittsbalken } from "./Bausteine"
import ProjektDetail from "./ProjektDetail"
import {
  NEUES_PROJEKT_MODULE,
  projektFortschrittWerte,
  sammleTermine,
} from "../lib/projekte"
import Seitenkopf from "./Seitenkopf"
import LoeschKnopf from "./LoeschKnopf"
import { SortMenu, LayoutUmschalter } from "./ListenControls"
import LeerHinweis from "./LeerHinweis"
import { SEITE_RASTER } from "../lib/layout"

const ORDNER_SORT = [
  { value: "name", label: "Name A–Z" },
  { value: "faellig", label: "Fälligkeit" },
  { value: "fortschritt", label: "Fortschritt" },
  { value: "neueste", label: "Neueste" },
]

// Projekte: eine Liste und ein Archiv, mehr nicht.
//
// Früher standen hier sieben gleichrangige Reiter (Ordner, Alle, Backlog,
// Areas, Board, Anstehend, Archiv) – vier davon zeigten dieselben Projekte
// nur anders gefiltert, und mit „Ordner" und „Areas" gab es zwei
// konkurrierende Ordnungssysteme nebeneinander. Geblieben sind:
//
//   • Ordner sortieren Projekte (beliebig verschachtelbar) – „Alle zeigen"
//     hebt die Ordnergrenzen für einen Blick über alles auf.
//   • Fristen der nächsten sieben Tage stehen als schmale Leiste oben,
//     statt hinter einem eigenen Reiter.
//   • Archiv bleibt ein Reiter, weil es bewusst aus dem Weg sein soll.

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

  const [aktuellerOrdnerId, setAktuellerOrdnerId] = useState(null)
  const [offenesProjektId, setOffenesProjektId] = useState(startProjektId)
  const [offeneNotizId, setOffeneNotizId] = useState(startNotizId)
  const [offenesModul, setOffenesModul] = useState(startModul)
  const [ordnerFormOffen, setOrdnerFormOffen] = useState(false)
  const [ordnerName, setOrdnerName] = useState("")
  const [projektFormOffen, setProjektFormOffen] = useState(false)
  const [ansicht, setAnsicht] = useState("projekte")
  const [ordnerSort, setOrdnerSort] = useStored("projekteOrdnerSort", "name")
  const [ordnerLayout, setOrdnerLayout] = useStored("projekteOrdnerLayout", "raster")
  // „Alle zeigen" hebt die Ordnergrenzen auf – das, wofür es früher einen
  // eigenen Reiter „Alle" gab.
  const [alleZeigen, setAlleZeigen] = useStored("projekteAlleZeigen", false)

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

  function sortiere(liste) {
    return [...liste].sort((a, b) => {
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
  }

  const unterordner = ordner
    .filter((o) => (o.parentId ?? null) === aktuellerOrdnerId)
    .sort((a, b) =>
      ordnerSort === "neueste"
        ? b.id - a.id
        : (a.name ?? "").localeCompare(b.name ?? "")
    )
  const sichtbareProjekte = sortiere(
    alleZeigen
      ? aktive
      : aktive.filter((p) => (p.ordnerId ?? null) === aktuellerOrdnerId)
  )

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

  const nichtsDa = unterordner.length === 0 && sichtbareProjekte.length === 0

  return (
    <div className={SEITE_RASTER}>
      <Seitenkopf
        titel="Projekte"
        aktion={
          <div className="flex flex-wrap items-center gap-2">
            <AnsichtToggle ansicht={ansicht} setAnsicht={setAnsicht} />
            <button
              onClick={() => setOrdnerFormOffen(!ordnerFormOffen)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              + Ordner
            </button>
            <button
              onClick={() => setProjektFormOffen(!projektFormOffen)}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              + Projekt
            </button>
          </div>
        }
      />

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
          ordnerId={alleZeigen ? null : aktuellerOrdnerId}
          projekte={projekte}
          setProjekte={setProjekte}
          onFertig={() => setProjektFormOffen(false)}
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

      {ansicht === "projekte" && (
        <div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-400">
              {alleZeigen ? (
                <span className="font-medium text-gray-900">Alle Projekte</span>
              ) : (
                <>
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
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              {(ordner.length > 0 || alleZeigen) && (
                <button
                  onClick={() => setAlleZeigen(!alleZeigen)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    alleZeigen
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Alle zeigen
                </button>
              )}
              {!nichtsDa && (
                <>
                  <SortMenu
                    wert={ordnerSort}
                    onChange={setOrdnerSort}
                    optionen={ORDNER_SORT}
                  />
                  <LayoutUmschalter
                    layout={ordnerLayout}
                    setLayout={setOrdnerLayout}
                  />
                </>
              )}
            </div>
          </div>

          <FristenLeiste
            projekte={aktive}
            todos={todos}
            onOeffnen={setOffenesProjektId}
          />

          {!alleZeigen && unterordner.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Ordner
              </h2>
              {ordnerLayout === "liste" ? (
                <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {unterordner.map((o) => (
                    <OrdnerEintrag
                      key={o.id}
                      o={o}
                      ordner={ordner}
                      projekte={projekte}
                      layout="liste"
                      onOeffnen={setAktuellerOrdnerId}
                      onRemove={removeOrdner}
                    />
                  ))}
                </ul>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {unterordner.map((o) => (
                    <OrdnerEintrag
                      key={o.id}
                      o={o}
                      ordner={ordner}
                      projekte={projekte}
                      layout="raster"
                      onOeffnen={setAktuellerOrdnerId}
                      onRemove={removeOrdner}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {sichtbareProjekte.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Projekte
              </h2>
              {ordnerLayout === "liste" ? (
                <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {sichtbareProjekte.map((p) => (
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
                  {sichtbareProjekte.map((p) => (
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

          {nichtsDa && (
            <LeerHinweis
              klasse="mt-8"
              emoji="📁"
              titel={
                aktive.length === 0
                  ? "Noch kein Projekt"
                  : "Dieser Ordner ist leer"
              }
              text={
                aktive.length === 0
                  ? "Ein Projekt ist alles, was mehr als eine Aufgabe braucht – eine Hausarbeit, ein Umzug, ein Nebenprojekt. Ordner sind nur zum Sortieren da; du brauchst sie erst, wenn es viele werden."
                  : "Leg hier ein Projekt an – oder schau dir mit „Alle zeigen“ an, was in den anderen Ordnern liegt."
              }
              aktion="+ Projekt"
              onAktion={() => setProjektFormOffen(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}

const ANSICHTEN = [
  { key: "projekte", label: "Projekte" },
  { key: "archiv", label: "Archiv" },
]

function AnsichtToggle({ ansicht, setAnsicht }) {
  return (
    <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
      {ANSICHTEN.map((a) => (
        <button
          key={a.key}
          onClick={() => setAnsicht(a.key)}
          className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 font-medium transition-colors ${
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

// Ein Ordner als Karte oder Zeile – beide zeigen dasselbe (Name und
// Inhaltsmenge), nur in der Form des gewählten Layouts.
function OrdnerEintrag({ o, ordner, projekte, layout, onOeffnen, onRemove }) {
  const anzahl =
    ordner.filter((x) => x.parentId === o.id).length +
    projekte.filter((p) => p.ordnerId === o.id).length

  const inhalt = (
    <>
      <OrdnerIcon />
      <span className="flex-1 truncate text-sm font-medium text-gray-900">
        {o.name}
      </span>
      <span className="shrink-0 text-xs text-gray-400">{anzahl}</span>
      {anzahl === 0 && (
        <LoeschKnopf
          onLoeschen={() => onRemove(o.id)}
          titel="Leeren Ordner löschen"
          klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
        />
      )}
    </>
  )

  return layout === "liste" ? (
    <li
      onClick={() => onOeffnen(o.id)}
      className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
    >
      {inhalt}
    </li>
  ) : (
    <div
      onClick={() => onOeffnen(o.id)}
      className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-400"
    >
      {inhalt}
    </div>
  )
}

// Wiederverwendbare Projektkarte. Bewusst karg: Name, Beschreibung,
// Fortschritt, Fälligkeit – die Bereichs-Tags von früher haben die
// Übersicht nur zugestellt.
function ProjektKarte({ p, todos, onOeffnen, onRemove }) {
  return (
    <div
      onClick={() => onOeffnen(p.id)}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-400"
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
      <h3 className="truncate pr-4 text-sm font-medium text-gray-900">
        {p.name}
      </h3>
      {p.beschreibung && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
          {p.beschreibung}
        </p>
      )}
      <div className="mt-4">
        <Fortschrittsbalken {...projektFortschrittWerte(p, todos)} />
      </div>
      {p.deadline && (
        <div className="mt-3">
          <DeadlineChip datum={p.deadline} />
        </div>
      )}
    </div>
  )
}

// Kompakte Projekt-Zeile für die Listen-Ansicht.
function ProjektZeile({ p, todos, onOeffnen, onRemove }) {
  return (
    <li
      onClick={() => onOeffnen(p.id)}
      className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
        {p.name}
      </span>
      <div className="hidden w-32 shrink-0 sm:block">
        <Fortschrittsbalken {...projektFortschrittWerte(p, todos)} />
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

// Was in den nächsten sieben Tagen (oder schon überfällig) ansteht – über
// alle Projekte hinweg. Früher ein eigener Reiter „Anstehend"; als Leiste
// sieht man es, ohne danach zu suchen, und sie verschwindet, wenn nichts
// ansteht.
function FristenLeiste({ projekte, todos, onOeffnen }) {
  const liste = sammleTermine(projekte, todos)
    .filter((e) => tageBisZahl(e.datum) <= 7)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 5)

  if (liste.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Diese Woche
      </span>
      {liste.map((e, i) => (
        <button
          key={i}
          onClick={() => onOeffnen(e.projektId)}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <DeadlineChip datum={e.datum} />
          <span className="max-w-48 truncate">{e.label}</span>
        </button>
      ))}
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
        <LeerHinweis
          emoji="📦"
          titel="Das Archiv ist leer"
          text="Fertige Projekte kannst du im geöffneten Projekt archivieren – sie verschwinden dann aus der Übersicht, bleiben aber hier erhalten."
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

// Ein neues Projekt braucht nur einen Namen. Struktur (Bereiche, Seiten,
// Vorlagen) kommt später im Projekt selbst dazu – vorher weiß man ohnehin
// nicht, was man braucht.
function ProjektErstellen({ ordnerId, projekte, setProjekte, onFertig }) {
  const [name, setName] = useState("")
  const [beschreibung, setBeschreibung] = useState("")
  const [deadline, setDeadline] = useState("")

  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return
    setProjekte([
      ...projekte,
      {
        id: Date.now(),
        name: name.trim(),
        beschreibung: beschreibung.trim(),
        ordnerId,
        deadline,
        ziel: "",
        module: [...NEUES_PROJEKT_MODULE],
        workflow: [],
        seiten: [],
        seitenTabs: [],
        uebersichtMigriert: true,
      },
    ])
    onFertig()
  }

  return (
    <form
      onSubmit={speichern}
      className="mt-4 rounded-xl border border-gray-300 bg-white p-4"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Statistik I"
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
        <label className="flex flex-col text-xs text-gray-500">
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
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
