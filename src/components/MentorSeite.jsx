import { useMemo } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"
import { berechneBefunde, sensorStatus } from "../lib/insights"

// Der Mentor: liest quer über alle Sensoren und zeigt Befunde. Rein lesend –
// die Daten entstehen in den jeweiligen Modulen. Kein LLM, nur Statistik über
// die eigenen Daten („dein Leben als Gleichung").

const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

// Optik je Befund-Art.
const ART_STIL = {
  muster: { rand: "border-violet-200", akzent: "bg-violet-50 text-violet-700", tag: "Muster" },
  trend: { rand: "border-cyan-200", akzent: "bg-cyan-50 text-cyan-700", tag: "Trend" },
  hinweis: { rand: "border-amber-200", akzent: "bg-amber-50 text-amber-700", tag: "Hinweis" },
  positiv: { rand: "border-emerald-200", akzent: "bg-emerald-50 text-emerald-700", tag: "Stark" },
  info: { rand: "border-gray-200", akzent: "bg-gray-100 text-gray-500", tag: "Info" },
}

function BefundKarte({ befund }) {
  const stil = ART_STIL[befund.art] ?? ART_STIL.info
  return (
    <li
      className={`flex gap-3.5 rounded-2xl border bg-white p-4 shadow-sm shadow-gray-100 ${stil.rand}`}
    >
      <span className="mt-0.5 text-2xl leading-none">{befund.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{befund.titel}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stil.akzent}`}
          >
            {stil.tag}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{befund.text}</p>
      </div>
    </li>
  )
}

export default function MentorSeite({ onNavigate }) {
  const [todos] = useStored("todos", [])
  const [habits] = useStored("habits", [])
  const [deepwork] = useStored("deepwork", [])
  const [transaktionen] = useStored("finanzen_transaktionen", [])
  const [vitalitaet] = useStored("vitalitaet", [])
  const [karten] = useStored("karten", [])
  const [finEinstellung] = useStored("finanzen_einstellung", { waehrung: "EUR" })

  const daten = useMemo(
    () => ({
      todos,
      habits,
      deepwork,
      transaktionen,
      vitalitaet,
      karten,
      waehrung: finEinstellung?.waehrung ?? "EUR",
    }),
    [todos, habits, deepwork, transaktionen, vitalitaet, karten, finEinstellung]
  )

  const befunde = useMemo(() => berechneBefunde(daten), [daten])
  const sensoren = useMemo(() => sensorStatus(daten), [daten])
  const aktiveSensoren = sensoren.filter((s) => s.aktiv).length

  // „Echte" Befunde (Muster/Trend/Hinweis/Positiv) von reinen Infos trennen.
  const kernbefunde = befunde.filter((b) => b.art !== "info")
  const infos = befunde.filter((b) => b.art === "info")

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
      <Seitenkopf
        eyebrow="Mentor"
        titel="Was ich sehe"
        unterzeile="Muster über deine Bereiche – dein Leben als Gleichung."
      />

      {/* Verbundene Sensoren */}
      <section className="rounded-3xl border border-gray-200 bg-gray-900 p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-300">
          Verbundene Sensoren · {aktiveSensoren}/{sensoren.length}
        </p>
        <p
          style={{ fontFamily: FONT_SERIF_ELEGANT }}
          className="mt-1 text-2xl italic text-white/90"
        >
          y = gewichtete Summe deiner Tage
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sensoren.map((s) => (
            <button
              key={s.key}
              onClick={() =>
                onNavigate?.(
                  s.key === "fokus"
                    ? "deepwork"
                    : s.key === "finanzen"
                      ? "finanzen"
                      : s.key === "lernen"
                        ? "sammeln"
                        : s.key === "aufgaben"
                          ? "todos"
                          : s.key
                )
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                s.aktiv
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-white/5 text-white/30"
              }`}
              title={s.aktiv ? `${s.anzahl} Einträge` : "Noch keine Daten"}
            >
              <span>{s.emoji}</span>
              {s.label}
              {s.aktiv && (
                <span className="text-white/40">{s.anzahl}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Kernbefunde */}
      {kernbefunde.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Befunde
          </h2>
          <ul className="space-y-2.5">
            {kernbefunde.map((b) => (
              <BefundKarte key={b.id} befund={b} />
            ))}
          </ul>
        </section>
      )}

      {/* Infos / Nudges */}
      {infos.length > 0 && (
        <section className="mt-6">
          {kernbefunde.length === 0 && (
            <p className="mb-3 text-sm text-gray-400">
              Noch keine Muster – der Mentor braucht etwas Futter:
            </p>
          )}
          <ul className="space-y-2.5">
            {infos.map((b) => (
              <BefundKarte key={b.id} befund={b} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
