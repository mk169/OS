import useStored from "../lib/useStored"
import { tageBis } from "../lib/datum"
import {
  projektMetriken,
  portfolioKennzahlen,
} from "../lib/projektfortschritt"

// Projekt-Fortschritt auf der Startseite: je laufendes Projekt eine Zeile mit
// Prozentwert und Leiste, darunter der nächste offene Workflow-Schritt und
// die Restzeit bis zur Deadline. Genau das, was man morgens wissen will –
// „wo stehe ich, was ist der nächste Griff" – ohne die Projekte-Seite zu
// öffnen. Ein Klick führt direkt ins Projekt.
//
// Erscheint nur, wenn es überhaupt laufende Projekte gibt.

const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

// Vier Skins, damit der Block sich in jeden Dashboard-Stil einfügt statt
// überall gleich auszusehen: Karte (hell), Terminal (dunkel), Pastell
// (clean) und Haarlinie ohne Karte (notion).
const STILE = {
  hell: {
    rahmen:
      "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100",
    kopf: "text-sm font-semibold text-gray-900",
    kopfPfeil: "text-gray-300 group-hover:text-accent-600",
    meta: "text-xs font-medium text-gray-400",
    zeile: "-mx-2 rounded-xl px-2 py-2 hover:bg-gray-50",
    name: "text-sm font-medium text-gray-800",
    unter: "text-xs text-gray-400",
    prozent: "text-sm font-semibold tabular-nums text-gray-900",
    spur: "bg-gray-100",
    balken: "bg-accent-500",
    mehr: "text-xs text-gray-400 hover:text-gray-900",
  },
  dunkel: {
    rahmen: "rounded-lg border border-white/10 p-3",
    kopf: "text-xs uppercase tracking-widest text-zinc-500 hover:text-cyan-400",
    kopfPfeil: "text-zinc-700",
    meta: "text-xs text-zinc-600",
    zeile: "-mx-2 rounded px-2 py-2 hover:bg-white/5",
    name: "text-sm text-zinc-300",
    unter: "text-xs text-zinc-600",
    prozent: "text-sm font-medium tabular-nums text-cyan-400",
    spur: "bg-white/10",
    balken: "bg-cyan-400",
    mehr: "text-xs text-zinc-600 hover:text-cyan-400",
  },
  clean: {
    rahmen:
      "rounded-3xl bg-white/70 p-5 shadow-[0_20px_50px_-30px_rgba(219,112,147,0.7)] backdrop-blur-sm",
    kopf: "text-lg italic text-rose-950/70 hover:text-rose-500",
    kopfPfeil: "text-rose-200",
    meta: "text-xs lowercase tracking-wide text-rose-400",
    zeile: "-mx-2 rounded-2xl px-2 py-2 hover:bg-rose-50/60",
    name: "text-[15px] text-rose-950/80",
    unter: "text-xs text-rose-400",
    prozent: "text-sm font-semibold tabular-nums text-rose-500",
    spur: "bg-rose-100/80",
    balken: "bg-rose-400",
    mehr: "text-xs text-rose-400 hover:text-rose-600",
  },
  notion: {
    rahmen: "",
    kopf: "text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700",
    kopfPfeil: "text-gray-300",
    meta: "text-xs text-gray-400",
    zeile: "-mx-2 rounded-md px-2 py-1.5 hover:bg-gray-50",
    name: "text-[15px] text-gray-700",
    unter: "text-xs text-gray-400",
    prozent: "text-sm font-medium tabular-nums text-gray-800",
    spur: "bg-gray-100",
    balken: "bg-gray-800",
    mehr: "text-xs text-gray-400 hover:text-gray-800",
  },
}

// Ein überfälliges Projekt soll man sehen, ohne die Zahl zu lesen; ein
// fertiges ebenso. Sonst bleibt es beim Ton des jeweiligen Stils.
function balkenFarbe(metrik, stil, variant) {
  if (metrik.ueberfaellig) return variant === "dunkel" ? "bg-rose-400" : "bg-rose-500"
  if (metrik.fertig) return variant === "dunkel" ? "bg-emerald-400" : "bg-emerald-500"
  return stil.balken
}

// Beschriftung unter dem Namen: der nächste Griff, sonst der Zählerstand.
function unterzeileVon(m) {
  if (m.schritt) return `Nächster Schritt: ${m.schritt.text}`
  if (m.quelle === "workflow")
    return m.fertig
      ? "Alle Schritte erledigt"
      : `${m.erledigt}/${m.gesamt} Schritten erledigt`
  if (m.quelle === "todos")
    return `${m.erledigt}/${m.gesamt} ${m.gesamt === 1 ? "Aufgabe" : "Aufgaben"} erledigt`
  return "Noch kein Ablauf hinterlegt"
}

function ProjektZeile({ metrik, stil, variant, onOeffnen }) {
  const { projekt, prozent } = metrik
  return (
    <li>
      <button
        onClick={() => onOeffnen(projekt.id)}
        className={`block w-full text-left transition-colors ${stil.zeile}`}
      >
        <div className="flex items-baseline gap-3">
          <span className={`min-w-0 flex-1 truncate ${stil.name}`}>
            {projekt.name}
          </span>
          {projekt.deadline && (
            <span
              className={`shrink-0 text-xs font-medium ${
                metrik.ueberfaellig
                  ? "text-rose-500"
                  : metrik.tageUebrig <= 7
                    ? "text-amber-600"
                    : stil.unter
              }`}
            >
              {tageBis(projekt.deadline)}
            </span>
          )}
          <span className={`shrink-0 ${stil.prozent}`}>{prozent} %</span>
        </div>

        <div
          className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${stil.spur}`}
          role="progressbar"
          aria-valuenow={prozent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fortschritt ${projekt.name}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${balkenFarbe(metrik, stil, variant)}`}
            style={{ width: `${prozent}%` }}
          />
        </div>

        <p className={`mt-1 truncate ${stil.unter}`}>{unterzeileVon(metrik)}</p>
      </button>
    </li>
  )
}

export default function ProjektFortschritt({
  onNavigate,
  variant = "hell",
  max = 4,
}) {
  const [projekte] = useStored("projekte", [])
  const [todos] = useStored("todos", [])

  const metriken = projektMetriken(projekte, todos)
  if (metriken.length === 0) return null

  const kennzahlen = portfolioKennzahlen(metriken)
  const stil = STILE[variant] ?? STILE.hell
  const sichtbar = metriken.slice(0, max)
  const weitere = metriken.length - sichtbar.length
  const oeffne = (id) => onNavigate("projekte", { projektId: id })

  const titel =
    variant === "dunkel" ? "projects" : variant === "clean" ? "projekte ✿" : "Projekte"

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate("projekte")}
          style={variant === "clean" ? { fontFamily: FONT_SERIF_ELEGANT } : undefined}
          className={`group flex items-center gap-1.5 transition-colors ${stil.kopf}`}
        >
          {variant === "dunkel" && <span className="text-zinc-700">// </span>}
          {variant === "hell" && <span className="text-base">📊</span>}
          {titel}
          {variant !== "dunkel" && (
            <span className={`transition-colors ${stil.kopfPfeil}`}>→</span>
          )}
        </button>
        <span className={stil.meta}>
          Ø {kennzahlen.durchschnitt} %
          {kennzahlen.ueberfaellig > 0 && (
            <span className="ml-1.5 text-rose-500">
              · {kennzahlen.ueberfaellig} überfällig
            </span>
          )}
        </span>
      </div>

      <div className={stil.rahmen}>
        <ul className={variant === "notion" ? "space-y-1" : "space-y-2.5"}>
          {sichtbar.map((m) => (
            <ProjektZeile
              key={m.projekt.id}
              metrik={m}
              stil={stil}
              variant={variant}
              onOeffnen={oeffne}
            />
          ))}
        </ul>
        {weitere > 0 && (
          <button
            onClick={() => onNavigate("projekte")}
            className={`mt-2.5 transition-colors ${stil.mehr}`}
          >
            +{weitere} {weitere === 1 ? "weiteres Projekt" : "weitere Projekte"} →
          </button>
        )}
      </div>
    </section>
  )
}
