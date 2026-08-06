import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { berechneBefunde, sensorStatus } from "../lib/insights"
import {
  berechneGleichung,
  momentumLabel,
  GLEICHUNG_BEREICHE,
  STANDARD_GLEICHUNG,
} from "../lib/gleichung"

// Der Mentor: liest quer über alle Sensoren und zeigt Befunde. Ganz oben die
// übergeordnete „Gleichung" (Nordstern + gewichtete Bereiche → Momentum).
// Rein lesend/rechnend – kein LLM, nur Statistik über die eigenen Daten.
//
// Keine eigene Seite mehr: Der Mentor ist der obere Teil des
// Wochenrückblicks (ReviewSeite) – dort, wo man ohnehin zurückschaut.

const FONT_SERIF_ELEGANT = '"Playfair Display", ui-serif, Georgia, serif'

const ART_STIL = {
  muster: { rand: "border-violet-200", akzent: "bg-violet-50 text-violet-700", tag: "Muster" },
  trend: { rand: "border-cyan-200", akzent: "bg-cyan-50 text-cyan-700", tag: "Trend" },
  hinweis: { rand: "border-amber-200", akzent: "bg-amber-50 text-amber-700", tag: "Hinweis" },
  positiv: { rand: "border-emerald-200", akzent: "bg-emerald-50 text-emerald-700", tag: "Stark" },
  info: { rand: "border-gray-200", akzent: "bg-gray-100 text-gray-500", tag: "Info" },
}

// Balkenfarbe nach Form-Wert (schnelles Ablesen).
function formFarbe(form) {
  if (form == null) return "bg-white/15"
  if (form >= 80) return "bg-emerald-400"
  if (form >= 60) return "bg-cyan-400"
  if (form >= 40) return "bg-amber-400"
  return "bg-rose-400"
}

// Momentum-Ring (SVG), 0–100.
function MomentumRing({ wert }) {
  const r = 34
  const umfang = 2 * Math.PI * r
  const anteil = wert == null ? 0 : wert / 100
  return (
    <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={umfang * (1 - anteil)}
          className="text-accent-400 transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold leading-none text-white">
          {wert == null ? "–" : wert}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-white/50">
          {wert == null ? "" : "%"}
        </span>
      </div>
    </div>
  )
}

function BefundKarte({ befund }) {
  const stil = ART_STIL[befund.art] ?? ART_STIL.info
  return (
    <li className={`flex gap-3.5 rounded-2xl border bg-white p-4 shadow-sm shadow-gray-100 ${stil.rand}`}>
      <span className="mt-0.5 text-2xl leading-none">{befund.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{befund.titel}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stil.akzent}`}>
            {stil.tag}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{befund.text}</p>
      </div>
    </li>
  )
}

// Editor für Nordstern & Gewichte.
function GleichungEditor({ gleichung, setGleichung, onFertig }) {
  const gewichte = gleichung?.gewichte ?? STANDARD_GLEICHUNG.gewichte
  function setzeGewicht(key, wert) {
    const zahl = Math.max(0, Math.min(100, Number(wert) || 0))
    setGleichung((g) => ({
      ...(g ?? STANDARD_GLEICHUNG),
      gewichte: { ...(g?.gewichte ?? STANDARD_GLEICHUNG.gewichte), [key]: zahl },
    }))
  }
  const summe = GLEICHUNG_BEREICHE.reduce(
    (a, b) => a + (Number(gewichte[b.key]) || 0),
    0
  )
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Nordstern
        </span>
        <input
          type="text"
          value={gleichung?.nordstern ?? ""}
          onChange={(e) =>
            setGleichung((g) => ({ ...(g ?? STANDARD_GLEICHUNG), nordstern: e.target.value }))
          }
          placeholder="z. B. Fit & fokussiert bis zum Sommer"
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-accent-400"
        />
      </label>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-white/50">
        Gewichte {summe > 0 ? `· Summe ${summe}` : ""}
      </p>
      <div className="mt-2 space-y-2">
        {GLEICHUNG_BEREICHE.map((b) => (
          <div key={b.key} className="flex items-center gap-3">
            <span className="flex w-28 items-center gap-1.5 text-sm text-white/80">
              <span>{b.emoji}</span> {b.label}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={gewichte[b.key] ?? 0}
              onChange={(e) => setzeGewicht(b.key, e.target.value)}
              className="h-1.5 flex-1 cursor-pointer accent-accent-400"
            />
            <span className="w-9 text-right text-xs tabular-nums text-white/60">
              {gewichte[b.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onFertig}
        className="mt-4 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-400"
      >
        Fertig
      </button>
    </div>
  )
}

// Übergeordneter Gleichungs-Hero.
function GleichungHero({ gleichung, setGleichung, ergebnis }) {
  const [editor, setEditor] = useState(!ergebnis.aktiv)
  const { gesamt, nordstern, beitraege } = ergebnis
  const aktiveBeitraege = beitraege.filter((b) => b.gewicht > 0)

  return (
    <section className="rounded-3xl border border-gray-200 bg-gray-900 p-5 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-300">
          Deine Gleichung
        </p>
        <button
          onClick={() => setEditor((o) => !o)}
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          title="Nordstern & Gewichte anpassen"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <MomentumRing wert={gesamt} />
        <div className="min-w-0 flex-1">
          <p style={{ fontFamily: FONT_SERIF_ELEGANT }} className="text-xl italic leading-snug text-white/90">
            {nordstern?.trim() ? nordstern : "Setz deinen Nordstern"}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {gesamt == null
              ? "Noch keine gewichteten Daten"
              : `Momentum: ${momentumLabel(gesamt)} · y = gewichtete Summe deiner Bereiche`}
          </p>
        </div>
      </div>

      {/* Beitrags-Balken */}
      {!editor && aktiveBeitraege.length > 0 && (
        <div className="mt-4 space-y-2">
          {aktiveBeitraege.map((b) => (
            <div key={b.key} className="flex items-center gap-3">
              <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-white/70">
                <span>{b.emoji}</span> {b.label}
                <span className="text-white/30">{b.anteil}%</span>
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${formFarbe(b.form)}`}
                  style={{ width: `${b.form == null ? 0 : b.form}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-white/50">
                {b.form == null ? "—" : `${Math.round(b.form)}`}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-white/30">
            Balken = jüngste Form (letzte 7 Tage). „—" heißt: noch keine Daten in dem Bereich.
          </p>
        </div>
      )}

      {editor && (
        <GleichungEditor
          gleichung={gleichung}
          setGleichung={setGleichung}
          onFertig={() => setEditor(false)}
        />
      )}
    </section>
  )
}

export default function MentorInhalt({ onNavigate }) {
  const [todos] = useStored("todos", [])
  const [habits] = useStored("habits", [])
  const [deepwork] = useStored("deepwork", [])
  const [transaktionen] = useStored("finanzen_transaktionen", [])
  const [vitalitaet] = useStored("vitalitaet", [])
  const [karten] = useStored("karten", [])
  const [finEinstellung] = useStored("finanzen_einstellung", { waehrung: "EUR" })
  const [gleichung, setGleichung] = useStored("gleichung", STANDARD_GLEICHUNG)

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
  const ergebnis = useMemo(() => berechneGleichung(gleichung, daten), [gleichung, daten])
  const aktiveSensoren = sensoren.filter((s) => s.aktiv).length

  const kernbefunde = befunde.filter((b) => b.art !== "info")
  const infos = befunde.filter((b) => b.art === "info")

  return (
    <div className="max-w-2xl">
      {/* Übergeordnet: die Gleichung */}
      <GleichungHero
        gleichung={gleichung}
        setGleichung={setGleichung}
        ergebnis={ergebnis}
      />

      {/* Verbundene Sensoren */}
      <section className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">
          Sensoren {aktiveSensoren}/{sensoren.length}:
        </span>
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
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              s.aktiv
                ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                : "border-dashed border-gray-200 text-gray-300"
            }`}
            title={s.aktiv ? `${s.anzahl} Einträge` : "Noch keine Daten"}
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
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
