import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"

// Lebensbereich „Leisure & Kultur": eine kleine Medienbibliothek – Filme,
// Serien, Bücher, Podcasts & Spiele als Watch/Read-Later-Liste mit Status
// (geplant → dabei → fertig). Store „medien" = [{ id, titel, typ, status,
// link, erstelltAm }].

const TYPEN = [
  { key: "film", label: "Film", emoji: "🎬" },
  { key: "serie", label: "Serie", emoji: "📺" },
  { key: "buch", label: "Buch", emoji: "📚" },
  { key: "podcast", label: "Podcast", emoji: "🎧" },
  { key: "spiel", label: "Spiel", emoji: "🎮" },
  { key: "sonstiges", label: "Sonstiges", emoji: "✨" },
]
const TYP = Object.fromEntries(TYPEN.map((t) => [t.key, t]))

const STATUS = [
  { key: "geplant", label: "Watch/Read Later", kurz: "Später", stil: "bg-amber-50 text-amber-700" },
  { key: "dabei", label: "Dabei", kurz: "Dabei", stil: "bg-blue-50 text-blue-700" },
  { key: "fertig", label: "Fertig", kurz: "Fertig", stil: "bg-emerald-50 text-emerald-700" },
]
const STATUS_MAP = Object.fromEntries(STATUS.map((s) => [s.key, s]))

export default function LeisureSeite() {
  const [medien, setMedien] = useStored("medien", [])
  const [titel, setTitel] = useState("")
  const [typ, setTyp] = useState("film")
  const [filter, setFilter] = useState("alle") // "alle" | typ-key

  const sichtbar = useMemo(
    () => (filter === "alle" ? medien : medien.filter((m) => m.typ === filter)),
    [medien, filter]
  )

  // Nach Status gruppieren, in fester Reihenfolge (geplant → dabei → fertig).
  const gruppen = STATUS.map((s) => ({
    status: s,
    items: sichtbar
      .filter((m) => (m.status ?? "geplant") === s.key)
      .sort((a, b) => (b.erstelltAm ?? b.id) - (a.erstelltAm ?? a.id)),
  })).filter((g) => g.items.length > 0)

  function hinzufuegen(e) {
    e.preventDefault()
    if (!titel.trim()) return
    setMedien([
      ...medien,
      {
        id: Date.now(),
        titel: titel.trim(),
        typ,
        status: "geplant",
        link: "",
        erstelltAm: Date.now(),
      },
    ])
    setTitel("")
  }

  function setStatus(id, status) {
    setMedien(medien.map((m) => (m.id === id ? { ...m, status } : m)))
  }
  function entferne(id) {
    setMedien(medien.filter((m) => m.id !== id))
  }

  const anzahlProTyp = (key) => medien.filter((m) => m.typ === key).length

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Seitenkopf
        titel="Leisure & Kultur"
        unterzeile="Deine Medienbibliothek – Filme, Serien, Bücher & mehr."
      />

      {/* Erfassen */}
      <form onSubmit={hinzufuegen} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Titel, z.B. Dune – Teil 2"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <select
          value={typ}
          onChange={(e) => setTyp(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        >
          {TYPEN.map((t) => (
            <option key={t.key} value={t.key}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      {/* Typ-Filter */}
      {medien.length > 0 && (
        <div className="mt-4 flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
          <FilterChip aktiv={filter === "alle"} onClick={() => setFilter("alle")}>
            Alle {medien.length}
          </FilterChip>
          {TYPEN.filter((t) => anzahlProTyp(t.key) > 0).map((t) => (
            <FilterChip
              key={t.key}
              aktiv={filter === t.key}
              onClick={() => setFilter(t.key)}
            >
              {t.emoji} {t.label} {anzahlProTyp(t.key)}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Liste, nach Status gruppiert */}
      <div className="mt-4 space-y-6">
        {gruppen.map(({ status, items }) => (
          <div key={status.key}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {status.label} · {items.length}
            </p>
            <ul className="space-y-1.5">
              {items.map((m) => (
                <li
                  key={m.id}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <span className="text-lg leading-none">
                    {TYP[m.typ]?.emoji ?? "✨"}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      m.status === "fertig"
                        ? "text-gray-400 line-through"
                        : "text-gray-800"
                    }`}
                  >
                    {m.titel}
                  </span>
                  <select
                    value={m.status ?? "geplant"}
                    onChange={(e) => setStatus(m.id, e.target.value)}
                    className={`shrink-0 cursor-pointer rounded-full border-none px-2 py-1 text-[11px] font-medium outline-none ${STATUS_MAP[m.status ?? "geplant"].stil}`}
                  >
                    {STATUS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.kurz}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => entferne(m.id)}
                    title="Entfernen"
                    className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 max-md:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterChip({ aktiv, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        aktiv
          ? "bg-gray-900 text-white"
          : "border border-gray-200 text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  )
}
