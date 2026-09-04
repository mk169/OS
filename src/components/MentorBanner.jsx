import { useMemo } from "react"
import useStored from "../lib/useStored"
import { berechneBefunde } from "../lib/insights"
import { berechneGleichung, momentumLabel, STANDARD_GLEICHUNG } from "../lib/gleichung"

// Kompakter Mentor-Block für die Startseite: zeigt das übergeordnete Momentum
// der Gleichung (falls gesetzt) und den stärksten Befund. Führt in den
// Wochenrückblick, wo der Mentor jetzt sitzt.
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

  const dunkel = variant === "dunkel" || variant === "mono"
  // Der Locked-In-Stil verträgt keine Akzentfarbe: dort trägt der Banner
  // dieselbe Schwarz-Weiß-Sprache wie der Rest des Screens.
  const mono = variant === "mono"

  return (
    <button
      onClick={() => onNavigate("review")}
      className={`mb-6 flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
        mono
          ? "border-white/15 bg-white/5 hover:bg-white/10"
          : dunkel
            ? "rounded-2xl border-accent-500/40 bg-accent-500/15 hover:bg-accent-500/25"
            : "rounded-2xl border-accent-200 bg-accent-50 hover:bg-accent-100"
      }`}
    >
      {zeigeMomentum ? (
        <span
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white ${
            mono ? "border border-white/20" : farbeFuer(ergebnis.gesamt)
          }`}
        >
          <span className="text-sm font-bold leading-none">{ergebnis.gesamt}</span>
          <span className="text-[8px] uppercase tracking-wide opacity-80">%</span>
        </span>
      ) : (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
            mono ? "border border-white/20" : "bg-accent-500"
          }`}
        >
          {topBefund?.emoji ?? "✨"}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-semibold ${
            mono ? "text-white" : dunkel ? "text-accent-200" : "text-accent-700"
          }`}
        >
          {zeigeMomentum
            ? ergebnis.nordstern?.trim()
              ? ergebnis.nordstern
              : `Momentum ${momentumLabel(ergebnis.gesamt)}`
            : topBefund.titel}
        </span>
        <span
          className={`block truncate text-xs ${
            mono ? "text-white/50" : dunkel ? "text-accent-200/70" : "text-accent-600/70"
          }`}
        >
          {zeigeMomentum && topBefund ? topBefund.titel : topBefund?.text ?? ""}
        </span>
      </span>

      <span
        className={`shrink-0 text-sm font-medium ${
          mono
            ? "text-[11px] uppercase tracking-[0.2em] text-white/50"
            : dunkel
              ? "text-accent-300"
              : "text-accent-600"
        }`}
      >
        Rückblick →
      </span>
    </button>
  )
}
