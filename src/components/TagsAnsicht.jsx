import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { sammleTags } from "../lib/tags"
import { Suchfeld } from "./ListenControls"
import { NotizBearbeiten } from "./ProjektNotizen"

// Übersicht aller vergebenen Schlagworte (#tags) quer über Wissen,
// Projekt-Notizen und Projekte. Ein Klick auf ein Schlagwort zeigt alles,
// was es trägt; von dort springt man direkt zum Eintrag. Ergänzt die
// [[Wikilinks]] um eine thematische, nicht-hierarchische Wiederfindung.

const TYP_LABEL = {
  wissen: "Wissen",
  notiz: "Notiz",
  projekt: "Projekt",
  area: "Area",
}

export default function TagsAnsicht({ onNavigate, startTag = null }) {
  const [wissen, setWissen] = useStored("wissen", [])
  const [notizen] = useStored("notizen", [])
  const [projekte] = useStored("projekte", [])
  const [aktiverTag, setAktiverTag] = useState(startTag)
  const [suche, setSuche] = useState("")
  const [bearbeiteId, setBearbeiteId] = useState(null)

  const tags = useMemo(
    () => sammleTags(wissen, notizen, projekte),
    [wissen, notizen, projekte]
  )

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    return q ? tags.filter((t) => t.tag.includes(q)) : tags
  }, [tags, suche])

  // Der aktive Tag muss noch existieren (z.B. nach dem Entfernen im Text).
  const aktiv = tags.find((t) => t.tag === aktiverTag)
  const bearbeiteteNotiz = wissen.find((w) => w.id === bearbeiteId)

  function updateWissen(neu) {
    const gestempelt = { ...neu, aktualisiertAm: Date.now() }
    setWissen(wissen.map((w) => (w.id === neu.id ? gestempelt : w)))
  }

  function oeffneEintrag(e) {
    if (e.typ === "wissen") setBearbeiteId(e.id)
    else if (e.typ === "notiz")
      onNavigate?.("projekte", { projektId: e.projektId, notizId: e.id })
    else onNavigate?.("projekte", e.id)
  }

  // Wikilink-Ziel aus dem Wissen-Overlay öffnen (wie in WissenAnsicht).
  function zielKlick(ziel) {
    if (ziel.typ === "wissen") setBearbeiteId(ziel.id)
    else if (ziel.typ === "notiz")
      onNavigate?.("projekte", { projektId: ziel.projektId, notizId: ziel.id })
    else onNavigate?.("projekte", ziel.id)
  }

  if (tags.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
        Noch keine Schlagworte. Schreibe „#Thema" in eine Wissen-Notiz, eine
        Projekt-Notiz oder die Beschreibung eines Projekts – hier laufen dann
        alle zusammen.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <Suchfeld
        wert={suche}
        onChange={setSuche}
        placeholder="Schlagwort suchen…"
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {gefiltert.map(({ tag, eintraege }) => (
          <button
            key={tag}
            onClick={() => setAktiverTag(tag === aktiverTag ? null : tag)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              tag === aktiverTag
                ? "bg-gray-900 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            #{tag}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                tag === aktiverTag
                  ? "bg-white/20 text-white"
                  : "bg-white/70 text-blue-500"
              }`}
            >
              {eintraege.length}
            </span>
          </button>
        ))}
        {gefiltert.length === 0 && (
          <p className="py-4 text-sm text-gray-400">
            Kein Schlagwort zu dieser Suche.
          </p>
        )}
      </div>

      {aktiv && (
        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            #{aktiv.tag} · {aktiv.eintraege.length}{" "}
            {aktiv.eintraege.length === 1 ? "Eintrag" : "Einträge"}
          </p>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {aktiv.eintraege.map((e) => (
              <li
                key={`${e.typ}-${e.id}`}
                onClick={() => oeffneEintrag(e)}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {e.titel || "Ohne Titel"}
                </span>
                {e.typ === "notiz" && e.projektId && (
                  <span className="hidden max-w-32 shrink-0 truncate text-xs text-gray-400 sm:inline">
                    {projekte.find((p) => p.id === e.projektId)?.name}
                  </span>
                )}
                <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                  {TYP_LABEL[e.typ] ?? e.typ}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          onTagKlick={(tag) => {
            setBearbeiteId(null)
            setAktiverTag(tag)
          }}
        />
      )}
    </div>
  )
}
