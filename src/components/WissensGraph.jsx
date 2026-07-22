import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { extrahiereWikilinks, findeZiel } from "../lib/wikilinks"
import { NotizBearbeiten } from "./ProjektNotizen"

// Visuelle Übersicht aller "[[Titel]]"-Verlinkungen zwischen Wissen,
// Projekten/Areas und einzelnen Projekt-Notizen (auch über Projekte
// hinweg). Layout per einfacher, selbstgeschriebener Kräfte-Simulation
// (keine neue Abhängigkeit nötig für die Notizmenge einer persönlichen
// App): Abstoßung zwischen allen Knotenpaaren, Federkraft entlang der
// Kanten, leichte Zentrierung. O(n²) pro Iteration × 200 Iterationen –
// bei sehr vielen verlinkten Notizen irgendwann ein Punkt für eine
// spätere Perf-Überarbeitung, für den Umfang einer persönlichen
// Notizsammlung aber unproblematisch.

const BREITE = 760
const HOEHE = 480
const FARBE = {
  wissen: "#3b82f6",
  projekt: "#10b981",
  area: "#8b5cf6",
  notiz: "#f59e0b",
}

function berechneLayout(knoten, kanten, iterationen = 200) {
  const pos = new Map(
    knoten.map((k, i) => {
      const winkel = (i / Math.max(knoten.length, 1)) * Math.PI * 2
      return [
        k.id,
        {
          x: BREITE / 2 + Math.cos(winkel) * 150,
          y: HOEHE / 2 + Math.sin(winkel) * 150,
        },
      ]
    })
  )

  for (let iter = 0; iter < iterationen; iter++) {
    const kraft = new Map(knoten.map((k) => [k.id, { x: 0, y: 0 }]))

    for (let i = 0; i < knoten.length; i++) {
      for (let j = i + 1; j < knoten.length; j++) {
        const a = pos.get(knoten[i].id)
        const b = pos.get(knoten[j].id)
        let dx = a.x - b.x
        let dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const staerke = 2200 / (dist * dist)
        dx = (dx / dist) * staerke
        dy = (dy / dist) * staerke
        kraft.get(knoten[i].id).x += dx
        kraft.get(knoten[i].id).y += dy
        kraft.get(knoten[j].id).x -= dx
        kraft.get(knoten[j].id).y -= dy
      }
    }

    for (const kante of kanten) {
      const a = pos.get(kante.von)
      const b = pos.get(kante.nach)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const staerke = (dist - 140) * 0.02
      const fx = (dx / dist) * staerke
      const fy = (dy / dist) * staerke
      kraft.get(kante.von).x += fx
      kraft.get(kante.von).y += fy
      kraft.get(kante.nach).x -= fx
      kraft.get(kante.nach).y -= fy
    }

    for (const k of knoten) {
      const p = pos.get(k.id)
      const f = kraft.get(k.id)
      f.x += (BREITE / 2 - p.x) * 0.01
      f.y += (HOEHE / 2 - p.y) * 0.01
      p.x = Math.max(30, Math.min(BREITE - 30, p.x + f.x * 0.06))
      p.y = Math.max(30, Math.min(HOEHE - 30, p.y + f.y * 0.06))
    }
  }
  return pos
}

export default function WissensGraph({ onNavigate }) {
  const [wissen, setWissen] = useStored("wissen", [])
  const [projekte] = useStored("projekte", [])
  const [notizen] = useStored("notizen", [])
  const [bearbeiteId, setBearbeiteId] = useState(null)

  // Nur Notizen aus nicht-archivierten Projekten überhaupt berücksichtigen –
  // konsistent mit der Archiv-Filterung der Projekt-Knoten unten. Gilt nur
  // für diese Graph-Darstellung, nicht für Verlinkung/Navigation anderswo
  // (dort sollen auch Links in archivierte Projekte weiter auflösen).
  const notizenSichtbar = useMemo(() => {
    const nichtArchiviert = new Set(
      projekte.filter((pr) => !pr.archiviert).map((pr) => pr.id)
    )
    return notizen.filter((n) =>
      nichtArchiviert.has(n.projektId ?? n.kursId)
    )
  }, [notizen, projekte])

  const kanten = useMemo(() => {
    const liste = []
    for (const n of wissen) {
      for (const titel of extrahiereWikilinks(n.inhalt)) {
        const ziel = findeZiel(titel, wissen, projekte, notizenSichtbar)
        if (!ziel) continue
        liste.push({
          von: `wissen-${n.id}`,
          nach: `${ziel.typ}-${ziel.id}`,
        })
      }
    }
    for (const n of notizenSichtbar) {
      for (const titel of extrahiereWikilinks(n.inhalt)) {
        const ziel = findeZiel(titel, wissen, projekte, notizenSichtbar)
        if (!ziel) continue
        liste.push({
          von: `notiz-${n.id}`,
          nach: `${ziel.typ}-${ziel.id}`,
        })
      }
    }
    return liste
  }, [wissen, projekte, notizenSichtbar])

  // Notizen fluten sonst schnell den Graphen (jedes Projekt kann viele
  // belanglose Notizen haben) – nur wer per Verlinkung tatsächlich Teil des
  // Netzwerks ist, wird als eigener Knoten angezeigt.
  const verlinkteNotizIds = useMemo(() => {
    const ids = new Set()
    for (const k of kanten) {
      if (k.von.startsWith("notiz-")) ids.add(Number(k.von.slice(6)))
      if (k.nach.startsWith("notiz-")) ids.add(Number(k.nach.slice(6)))
    }
    return ids
  }, [kanten])

  const knoten = useMemo(() => {
    const w = wissen.map((n) => ({
      id: `wissen-${n.id}`,
      typ: "wissen",
      refId: n.id,
      titel: n.titel,
    }))
    const p = projekte
      .filter((pr) => !pr.archiviert)
      .map((pr) => ({
        id: `projekt-${pr.id}`,
        typ: (pr.typ ?? "projekt") === "area" ? "area" : "projekt",
        refId: pr.id,
        titel: pr.name,
      }))
    const n = notizenSichtbar
      .filter((notiz) => verlinkteNotizIds.has(notiz.id))
      .map((notiz) => ({
        id: `notiz-${notiz.id}`,
        typ: "notiz",
        refId: notiz.id,
        titel: notiz.titel,
        projektId: notiz.projektId ?? notiz.kursId,
      }))
    return [...w, ...p, ...n]
  }, [wissen, projekte, notizenSichtbar, verlinkteNotizIds])

  const positionen = useMemo(
    () => berechneLayout(knoten, kanten),
    [knoten, kanten]
  )

  const bearbeiteteNotiz = wissen.find((w) => w.id === bearbeiteId)

  function klick(k) {
    if (k.typ === "wissen") setBearbeiteId(k.refId)
    else if (k.typ === "notiz")
      onNavigate?.("projekte", { projektId: k.projektId, notizId: k.refId })
    else onNavigate?.("projekte", k.refId)
  }

  function zielKlick(ziel) {
    if (ziel.typ === "wissen") setBearbeiteId(ziel.id)
    else if (ziel.typ === "notiz")
      onNavigate?.("projekte", {
        projektId: ziel.projektId,
        notizId: ziel.id,
      })
    else onNavigate?.("projekte", ziel.id)
  }

  function updateWissen(neu) {
    setWissen(wissen.map((w) => (w.id === neu.id ? neu : w)))
  }

  return (
    <div className="mt-4">
      {knoten.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Noch nichts zu verlinken. Lege Wissen-Einträge oder Projekte an und
          verweise mit „@" aufeinander.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <svg viewBox={`0 0 ${BREITE} ${HOEHE}`} className="h-[480px] w-full">
            {kanten.map((k, i) => {
              const a = positionen.get(k.von)
              const b = positionen.get(k.nach)
              if (!a || !b) return null
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#e7e5e1"
                  strokeWidth="1.5"
                />
              )
            })}
            {knoten.map((k) => {
              const p = positionen.get(k.id)
              if (!p) return null
              return (
                <g
                  key={k.id}
                  onClick={() => klick(k)}
                  className="cursor-pointer"
                >
                  <circle cx={p.x} cy={p.y} r="7" fill={FARBE[k.typ]} />
                  <text
                    x={p.x + 11}
                    y={p.y + 4}
                    className="fill-gray-600 text-[11px]"
                  >
                    {k.titel}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: FARBE.wissen }}
          />
          Wissen
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: FARBE.projekt }}
          />
          Projekt
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: FARBE.area }}
          />
          Area
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: FARBE.notiz }}
          />
          Notiz (nur verlinkte werden angezeigt)
        </span>
      </div>

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
        />
      )}
    </div>
  )
}
