import { useEffect, useRef, useState } from "react"
import useStored from "../lib/useStored"

// Globale Suche als Overlay (Ctrl/Cmd+K): durchsucht Projekte, Todos,
// Notizen, Inhalte, Karteikarten, Termine und Habits. Klick auf einen
// Treffer navigiert direkt zum Ziel.

const MAX_JE_GRUPPE = 8

export default function Suche({ onNavigate, onClose }) {
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])
  const [notizen] = useStored("notizen", [])
  const [ablage] = useStored("ablage", [])
  const [karten] = useStored("karten", [])
  const [termine] = useStored("termine", [])
  const [habits] = useStored("habits", [])

  const [frage, setFrage] = useState("")
  const feld = useRef(null)

  useEffect(() => {
    feld.current?.focus()
  }, [])

  useEffect(() => {
    function taste(e) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", taste)
    return () => window.removeEventListener("keydown", taste)
  }, [onClose])

  const q = frage.trim().toLowerCase()
  const passt = (...felder) =>
    felder.some((f) => (f ?? "").toLowerCase().includes(q))

  const projektName = (id) =>
    projekte.find((p) => p.id === id)?.name ?? ""

  // Treffer je Typ: { label, detail, ziel: [seite, param] }
  const gruppen = q
    ? [
        {
          typ: "Projekte",
          treffer: projekte
            .filter((p) => passt(p.name, p.beschreibung))
            .map((p) => ({
              label: p.name,
              detail: p.archiviert ? "Archiviert" : p.beschreibung,
              ziel: ["projekte", p.id],
            })),
        },
        {
          typ: "Todos",
          treffer: todos
            .filter((t) => passt(t.text))
            .map((t) => ({
              label: t.text,
              detail: t.erledigt
                ? "Erledigt"
                : projektName(t.projektId ?? t.kursId),
              ziel: ["todos", null],
            })),
        },
        {
          typ: "Notizen",
          treffer: [
            ...notizen
              .filter((n) => passt(n.titel, n.inhalt))
              .map((n) => ({
                label: n.titel,
                detail: projektName(n.projektId ?? n.kursId),
                ziel: ["projekte", n.projektId ?? n.kursId],
              })),
            ...ablage
              .filter((a) => passt(a.titel))
              .map((a) => ({
                label: a.titel,
                detail: projektName(a.projektId ?? a.kursId),
                ziel: ["projekte", a.projektId ?? a.kursId],
              })),
          ],
        },
        {
          typ: "Karteikarten",
          treffer: karten
            .filter((k) => passt(k.vorne, k.hinten))
            .map((k) => ({
              label: k.vorne || "Bildkarte",
              detail: projektName(k.projektId ?? k.kursId),
              ziel: ["projekte", k.projektId ?? k.kursId],
            })),
        },
        {
          typ: "Termine",
          treffer: termine
            .filter((t) => passt(t.titel))
            .map((t) => ({
              label: t.titel,
              detail: new Date(t.datum).toLocaleDateString("de-DE"),
              ziel: ["kalender", null],
            })),
        },
        {
          typ: "Habits",
          treffer: habits
            .filter((h) => passt(h.name))
            .map((h) => ({ label: h.name, detail: "", ziel: ["habits", null] })),
        },
      ]
        .map((g) => ({ ...g, treffer: g.treffer.slice(0, MAX_JE_GRUPPE) }))
        .filter((g) => g.treffer.length > 0)
    : []

  function oeffne(t) {
    onNavigate(t.ziel[0], t.ziel[1])
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/20 p-4 pt-[12vh] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-4 w-4 shrink-0 text-gray-400"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={feld}
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            placeholder="Suchen … (Projekte, Todos, Notizen, Karten, Termine, Habits)"
            className="w-full border-none bg-transparent py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-300"
          />
          <button
            onClick={onClose}
            className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {q === "" ? (
            <p className="px-3 py-6 text-center text-sm text-gray-300">
              Tippe, um überall zu suchen.
            </p>
          ) : gruppen.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              Keine Treffer für „{frage}".
            </p>
          ) : (
            gruppen.map((g) => (
              <div key={g.typ} className="mb-2">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {g.typ}
                </p>
                {g.treffer.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => oeffne(t)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                      {t.label}
                    </span>
                    {t.detail && (
                      <span className="max-w-40 shrink-0 truncate text-xs text-gray-400">
                        {t.detail}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
