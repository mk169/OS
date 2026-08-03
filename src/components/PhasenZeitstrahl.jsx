import { phasenZeitstrahl, zyklusStatus } from "../lib/zyklen"

// Waagerechter Zeitstrahl der Zwischenphasen über die gesamte Periode: jede
// Phase als Segment (Breite = Anteil an der Periode), aktive Phase in der
// Akzentfarbe hervorgehoben, dazu eine „Heute"-Marke. Rendert nichts, wenn
// keine datierten Phasen vorhanden sind. „dunkel" für dunkle Dashboard-Stile.
export default function PhasenZeitstrahl({ zyklus, dunkel = false }) {
  const { segmente } = phasenZeitstrahl(zyklus)
  if (segmente.length === 0) return null

  const s = zyklusStatus(zyklus)
  const heute = s.aktiv ? Math.min(100, Math.max(0, s.prozentZeit)) : null

  const farbe = (status) =>
    status === "aktiv"
      ? "bg-accent-500"
      : status === "vorbei"
        ? dunkel
          ? "bg-white/25"
          : "bg-gray-300"
        : dunkel
          ? "bg-white/10"
          : "bg-gray-200"

  return (
    <div
      className={`relative h-2.5 w-full overflow-hidden rounded-full ${
        dunkel ? "bg-white/5" : "bg-gray-100"
      }`}
    >
      {segmente.map((seg) => (
        <div
          key={seg.id}
          title={seg.titel || "Zwischenphase"}
          className={`absolute top-0 h-full ${farbe(seg.status)}`}
          style={{ left: `${seg.links}%`, width: `${seg.breite}%` }}
        />
      ))}
      {heute != null && (
        <div
          className={`pointer-events-none absolute top-0 h-full w-px ${
            dunkel ? "bg-white" : "bg-gray-900"
          }`}
          style={{ left: `${heute}%` }}
          title="Heute"
        />
      )}
    </div>
  )
}
