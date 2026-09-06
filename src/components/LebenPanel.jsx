import { useMemo } from "react"
import useStored from "../lib/useStored"
import { heute } from "../lib/datum"
import { lebensZeilen } from "../lib/lebensueberblick"

// „Alles auf einen Blick": die Bereiche, die man nicht täglich öffnet –
// Finanzen, Beruf, Periode, Vitalität, Leisure – als eine Reihe kurzer
// Kacheln auf der Startseite. Jede führt mit einem Klick in ihren Bereich.
//
// Die Rechnung steckt in lib/lebensueberblick.js; hier steht nur die
// Darstellung. „hell"/„dunkel"/„mono" wie bei MentorBanner und LernBanner,
// damit die Reihe in allen sechs Dashboard-Stilen sitzt.

export default function LebenPanel({ onNavigate, variant = "hell", ohnePeriode = false }) {
  const [konten] = useStored("finanzen_konten", [])
  const [transaktionen] = useStored("finanzen_transaktionen", [])
  const [finEinstellung] = useStored("finanzen_einstellung", { waehrung: "EUR" })
  const [bewerbungen] = useStored("beruf_bewerbungen", [])
  const [zyklen] = useStored("zyklen", [])
  const [vitalitaet] = useStored("vitalitaet", [])
  const [medien] = useStored("medien", [])

  const heuteDatum = heute()
  const alle = useMemo(
    () =>
      lebensZeilen(
        {
          konten,
          transaktionen,
          waehrung: finEinstellung?.waehrung ?? "EUR",
          bewerbungen,
          zyklen,
          vitalitaet,
          medien,
        },
        heuteDatum
      ),
    [konten, transaktionen, finEinstellung, bewerbungen, zyklen, vitalitaet, medien, heuteDatum]
  )

  // In den meisten Stilen steht die Fokus-Periode direkt darüber als eigenes
  // Widget – dann gehört sie hier nicht noch einmal hin.
  const zeilen = ohnePeriode ? alle.filter((z) => z.key !== "periode") : alle

  // Wer nichts davon nutzt, sieht auch nichts davon.
  if (zeilen.length === 0) return null

  const mono = variant === "mono"
  const dunkel = variant === "dunkel" || mono

  return (
    <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {zeilen.map((z) => (
        <button
          key={z.key}
          onClick={() => onNavigate(z.ziel)}
          className={`flex flex-col items-start border px-3.5 py-2.5 text-left transition-colors ${
            mono
              ? "border-white/15 bg-white/5 hover:bg-white/10"
              : dunkel
                ? "rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                : "rounded-xl border-gray-200 bg-white hover:border-gray-400"
          }`}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${
              dunkel ? "text-white/40" : "text-gray-400"
            }`}
          >
            {BEREICH_LABEL[z.key] ?? z.key}
          </span>
          <span
            className={`mt-0.5 truncate text-sm font-medium ${
              dunkel ? "text-white" : "text-gray-900"
            }`}
          >
            {z.label}
          </span>
          {z.wert && (
            // Farbe trägt nur die Zeile darunter, und nur bei „achtung": Sie
            // sagt, was dringend ist – eine grüne Wand sagt gar nichts.
            <span
              className={`truncate text-xs ${
                z.ton === "achtung"
                  ? dunkel
                    ? "text-rose-300"
                    : "text-rose-600"
                  : dunkel
                    ? "text-white/50"
                    : "text-gray-400"
              }`}
            >
              {z.wert}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

const BEREICH_LABEL = {
  finanzen: "Finanzen",
  beruf: "Beruf",
  periode: "Periode",
  vitalitaet: "Körper",
  leisure: "Leisure",
}
