import useStored from "../lib/useStored"
import { zyklusStatus, restText } from "../lib/zyklen"
import { projektFortschrittWerte, Fortschrittsbalken } from "./OrdnerSeite"

// Dashboard-Karte(n) für die aktuell laufenden Fokus-Perioden: zeigt Ziel,
// Restlaufzeit, verstrichenen Zeitanteil und die verknüpften Projekte mit
// ihrem Fortschritt. Erscheint nur, wenn gerade ein Zyklus aktiv ist.
// „dunkel" für dunkle Dashboard-Stile (Arcade).
export default function ZyklusWidget({ onNavigate, variant = "hell" }) {
  const [zyklen] = useStored("zyklen", [])
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])

  const aktive = zyklen
    .map((z) => ({ zyklus: z, status: zyklusStatus(z) }))
    .filter((x) => x.status.aktiv)
    // Dringendste (am wenigsten Restzeit) zuerst.
    .sort((a, b) => a.status.tageUebrig - b.status.tageUebrig)

  if (aktive.length === 0) return null

  return (
    <div className="mb-6 space-y-3">
      {aktive.map(({ zyklus, status }) => (
        <ZyklusKarte
          key={zyklus.id}
          zyklus={zyklus}
          status={status}
          projekte={projekte}
          todos={todos}
          onNavigate={onNavigate}
          dunkel={variant === "dunkel"}
        />
      ))}
    </div>
  )
}

// Farbton der Restlaufzeit-Plakette nach Dringlichkeit.
function restStil(tageUebrig, dunkel) {
  if (tageUebrig <= 7)
    return dunkel ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600"
  if (tageUebrig <= 30)
    return dunkel
      ? "bg-amber-500/20 text-amber-300"
      : "bg-amber-50 text-amber-700"
  return dunkel ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500"
}

function ZyklusKarte({ zyklus, status, projekte, todos, onNavigate, dunkel }) {
  const verknuepft = (zyklus.projektIds ?? [])
    .map((id) => projekte.find((p) => p.id === id))
    .filter((p) => p && !p.archiviert)

  return (
    <div
      className={`rounded-2xl border p-4 ${
        dunkel
          ? "border-accent-500/30 bg-accent-500/10"
          : "border-gray-200 bg-white shadow-sm shadow-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-500">
            Fokus-Periode
          </p>
          <h3
            className={`truncate text-base font-semibold ${dunkel ? "text-white" : "text-gray-900"}`}
          >
            {zyklus.titel}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${restStil(status.tageUebrig, dunkel)}`}
        >
          {restText(status.tageUebrig)}
        </span>
      </div>

      {zyklus.ziel && (
        <p
          className={`mt-1.5 font-serif text-sm italic ${dunkel ? "text-white/70" : "text-gray-500"}`}
        >
          {zyklus.ziel}
        </p>
      )}

      {/* Zeit-Fortschritt */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className={dunkel ? "text-white/50" : "text-gray-400"}>
            Tag {status.verstrichen} von {status.tageGesamt}
          </span>
          <span className={dunkel ? "text-white/50" : "text-gray-400"}>
            {status.prozentZeit}%
          </span>
        </div>
        <div
          className={`h-1.5 overflow-hidden rounded-full ${dunkel ? "bg-white/10" : "bg-gray-100"}`}
        >
          <div
            className="h-full rounded-full bg-accent-500 transition-all"
            style={{ width: `${status.prozentZeit}%` }}
          />
        </div>
      </div>

      {/* Verknüpfte Projekte mit ihrem Fortschritt */}
      {verknuepft.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {verknuepft.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onNavigate?.("projekte", p.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  dunkel ? "hover:bg-white/5" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${dunkel ? "text-white/90" : "text-gray-800"}`}
                >
                  {p.name}
                </span>
                <span className="w-28 shrink-0">
                  <Fortschrittsbalken {...projektFortschrittWerte(p, todos)} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
