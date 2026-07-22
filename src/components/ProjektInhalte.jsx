import { useRef, useState } from "react"
import useStored from "../lib/useStored"
import { heute, inTagen } from "../lib/datum"

const KATEGORIEN = ["Kapitel", "Skript", "Übung", "Altklausur", "Dokument", "Sonstiges"]

const PRIORITAETEN = {
  Hoch: { gewicht: 0, badge: "bg-red-50 text-red-600" },
  Mittel: { gewicht: 1, badge: "bg-amber-50 text-amber-700" },
  Niedrig: { gewicht: 2, badge: "bg-gray-100 text-gray-500" },
}

// Inhalte eines Projekts: Themen, Materialien und Dokumente mit Kategorie,
// Priorität und optionalem Link. Aus den Inhalten kann ein Lernplan
// generiert werden – als Todos verteilt bis zur Projekt-Deadline.

export default function ProjektInhalte({ projekt }) {
  const [alleEintraege, setAlleEintraege] = useStored("ablage", [])
  const [alleTodos, setAlleTodos] = useStored("todos", [])
  const [titel, setTitel] = useState("")
  const [link, setLink] = useState("")
  const [kategorie, setKategorie] = useState(KATEGORIEN[0])
  const [prioritaet, setPrioritaet] = useState("Mittel")
  const [filter, setFilter] = useState("Alle")
  const [katFilter, setKatFilter] = useState("Alle")
  const [meldung, setMeldung] = useState("")
  const dateiInput = useRef(null)

  const gehoertZumProjekt = (e) =>
    e.projektId === projekt.id || e.kursId === projekt.id
  const eintraege = alleEintraege.filter(gehoertZumProjekt)

  function addEintrag(e) {
    e.preventDefault()
    if (!titel.trim()) return
    setAlleEintraege([
      ...alleEintraege,
      {
        id: Date.now(),
        projektId: projekt.id,
        titel: titel.trim(),
        link: link.trim(),
        kategorie,
        prioritaet,
        datum: heute(),
      },
    ])
    setTitel("")
    setLink("")
  }

  function uploadDateien(e) {
    const dateien = [...(e.target.files ?? [])]
    if (dateien.length === 0) return
    const basisId = Date.now()
    setAlleEintraege([
      ...alleEintraege,
      ...dateien.map((d, i) => ({
        id: basisId + i,
        projektId: projekt.id,
        titel: d.name,
        link: "",
        kategorie: "Dokument",
        prioritaet: "Mittel",
        datum: heute(),
      })),
    ])
    setMeldung(
      `${dateien.length} ${dateien.length === 1 ? "Datei" : "Dateien"} erfasst. Die Dateiinhalte selbst werden erst mit der Datenbank-Anbindung gespeichert.`
    )
    e.target.value = ""
  }

  function removeEintrag(id) {
    setAlleEintraege(alleEintraege.filter((e) => e.id !== id))
  }

  function generiereLernplan() {
    const themen = [...eintraege].sort(
      (a, b) =>
        PRIORITAETEN[a.prioritaet]?.gewicht - PRIORITAETEN[b.prioritaet]?.gewicht
    )
    if (themen.length === 0) {
      setMeldung("Lege zuerst Inhalte an – daraus entsteht der Lernplan.")
      return
    }

    const projektTodos = alleTodos.filter(
      (t) => t.projektId === projekt.id || t.kursId === projekt.id
    )
    const neu = themen.filter(
      (thema) => !projektTodos.some((t) => t.text === `${thema.titel} lernen`)
    )
    if (neu.length === 0) {
      setMeldung("Alle Inhalte sind bereits im Lernplan.")
      return
    }

    let verfuegbareTage
    if (projekt.deadline && projekt.deadline > heute()) {
      const diff = Math.floor(
        (new Date(projekt.deadline) - new Date(heute())) / (1000 * 60 * 60 * 24)
      )
      verfuegbareTage = Math.max(1, diff - 2) // Puffer vor der Deadline
    } else {
      verfuegbareTage = neu.length * 7 // ohne Deadline: ein Thema pro Woche
    }

    const basisId = Date.now()
    const aufgaben = neu.map((thema, i) => ({
      id: basisId + i,
      projektId: projekt.id,
      text: `${thema.titel} lernen`,
      datum: inTagen(
        Math.max(1, Math.round(((i + 1) * verfuegbareTage) / neu.length))
      ),
      wichtig: thema.prioritaet === "Hoch",
      dringend: false,
      erledigt: false,
    }))

    setAlleTodos([...alleTodos, ...aufgaben])
    setMeldung(
      `${aufgaben.length} ${aufgaben.length === 1 ? "Aufgabe" : "Aufgaben"} erstellt${
        projekt.deadline ? " – verteilt bis zur Deadline." : " – im Wochenrhythmus."
      }`
    )
  }

  const sichtbar = eintraege
    .filter((e) => filter === "Alle" || e.prioritaet === filter)
    .filter((e) => katFilter === "Alle" || e.kategorie === katFilter)
    .sort(
      (a, b) =>
        (PRIORITAETEN[a.prioritaet]?.gewicht ?? 1) -
        (PRIORITAETEN[b.prioritaet]?.gewicht ?? 1)
    )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {eintraege.length} {eintraege.length === 1 ? "Inhalt" : "Inhalte"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dateiInput.current?.click()}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Dateien hochladen
          </button>
          <input
            ref={dateiInput}
            type="file"
            multiple
            onChange={uploadDateien}
            className="hidden"
          />
          <button
            onClick={generiereLernplan}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Lernplan erstellen
          </button>
        </div>
      </div>

      {meldung && <p className="mt-2 text-xs text-gray-500">{meldung}</p>}

      <form
        onSubmit={addEintrag}
        className="mt-4 flex flex-wrap items-end gap-2 border-b border-gray-100 pb-4"
      >
        <label className="flex min-w-0 flex-1 flex-col text-xs text-gray-500">
          Inhalt / Thema
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Kapitel 3: Hypothesentests"
            className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Link (optional)
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-40 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Kategorie
          <select
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            {KATEGORIEN.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Priorität
          <select
            value={prioritaet}
            onChange={(e) => setPrioritaet(e.target.value)}
            className="mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            {Object.keys(PRIORITAETEN).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium uppercase tracking-wide text-gray-400">
          Priorität
        </span>
        {["Alle", ...Object.keys(PRIORITAETEN)].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-500 hover:text-gray-900"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-3 font-medium uppercase tracking-wide text-gray-400">
          Kategorie
        </span>
        {["Alle", ...KATEGORIEN].map((k) => (
          <button
            key={k}
            onClick={() => setKatFilter(k)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              katFilter === k
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-500 hover:text-gray-900"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {sichtbar.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
          {eintraege.length === 0
            ? "Noch keine Inhalte. Trage Themen ein oder lade Dateien hoch."
            : "Nichts entspricht dem Filter."}
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {sichtbar.map((eintrag) => (
            <li
              key={eintrag.id}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {eintrag.link ? (
                <a
                  href={
                    eintrag.link.startsWith("http")
                      ? eintrag.link
                      : `https://${eintrag.link}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-sm text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-900"
                >
                  {eintrag.titel}
                </a>
              ) : (
                <span className="flex-1 truncate text-sm text-gray-800">
                  {eintrag.titel}
                </span>
              )}
              <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {eintrag.kategorie}
              </span>
              {PRIORITAETEN[eintrag.prioritaet] && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITAETEN[eintrag.prioritaet].badge}`}
                >
                  {eintrag.prioritaet}
                </span>
              )}
              <button
                onClick={() => removeEintrag(eintrag.id)}
                title="Eintrag löschen"
                className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
