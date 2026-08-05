import { useMemo } from "react"
import useStored from "../lib/useStored"
import { berechneBefunde } from "../lib/insights"
import { berechneGleichung, momentumLabel, STANDARD_GLEICHUNG } from "../lib/gleichung"

// Kompakter Mentor-Block für die Startseite: zeigt das übergeordnete Momentum
// der Gleichung (falls gesetzt) und den stärksten Befund. Führt in den Mentor.
// „hell"/„dunkel" analog zu LernBanner, damit er in jedem Dashboard-Stil passt.

function farbeFuer(gesamt) {
  if (gesamt == null) return "bg-gray-400"
  if (gesamt >= 80) return "bg-emerald-500"
  if (gesamt >= 60) return "bg-cyan-500"
  if (gesamt >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

export default function MentorBanner({ onNavigate, variant = "hell" }) {
  const [todos] = useStored("todos", [])
  const [habits] = useStored("habits", [])
  const [deepwork] = useStored("deepwork", [])
  const [transaktionen] = useStored("finanzen_transaktionen", [])
  const [vitalitaet] = useStored("vitalitaet", [])
  const [karten] = useStored("karten", [])
  const [finEinstellung] = useStored("finanzen_einstellung", { waehrung: "EUR" })
  const [gleichung] = useStored("gleichung", STANDARD_GLEICHUNG)

  const daten = useMemo(
    () => ({
      todos, habits, deepwork, transaktionen, vitalitaet, karten,
      waehrung: finEinstellung?.waehrung ?? "EUR",
    }),
    [todos, habits, deepwork, transaktionen, vitalitaet, karten, finEinstellung]
  )

  const befunde = useMemo(() => berechneBefunde(daten), [daten])
  const ergebnis = useMemo(() => berechneGleichung(gleichung, daten), [gleichung, daten])

  const topBefund =
    befunde.find((b) => b.art !== "info") ?? befunde[0] ?? null
  const zeigeMomentum = ergebnis.aktiv && ergebnis.gesamt != null

  // Nichts anzeigen, wenn es weder Momentum noch einen Befund gibt.
  if (!zeigeMomentum && !topBefund) return null

  const dunkel = variant === "dunkel"

  return (
    <button
      onClick={() => onNavigate("mentor")}
      className={`mb-6 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
        dunkel
          ? "border-accent-500/40 bg-accent-500/15 hover:bg-accent-500/25"
          : "border-accent-200 bg-accent-50 hover:bg-accent-100"
      }`}
    >
      {zeigeMomentum ? (
        <span
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white ${farbeFuer(ergebnis.gesamt)}`}
        >
          <span className="text-sm font-bold leading-none">{ergebnis.gesamt}</span>
          <span className="text-[8px] uppercase tracking-wide opacity-80">%</span>
        </span>
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-lg">
          {topBefund?.emoji ?? "✨"}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${dunkel ? "text-accent-200" : "text-accent-700"}`}>
          {zeigeMomentum
            ? ergebnis.nordstern?.trim()
              ? ergebnis.nordstern
              : `Momentum ${momentumLabel(ergebnis.gesamt)}`
            : topBefund.titel}
        </span>
        <span className={`block truncate text-xs ${dunkel ? "text-accent-200/70" : "text-accent-600/70"}`}>
          {zeigeMomentum && topBefund ? topBefund.titel : topBefund?.text ?? ""}
        </span>
      </span>

      <span className={`shrink-0 text-sm font-medium ${dunkel ? "text-accent-300" : "text-accent-600"}`}>
        Mentor →
      </span>
    </button>
  )
}
