import {
  METHODEN,
  SMART_FELDER,
  WOOP_FELDER,
  keyResults,
  krFortschritt,
  methodeVon,
  okrFortschritt,
  smartPruefung,
  smartSatz,
  woopFelder,
  woopPlanSatz,
} from "../lib/zielmethoden"
import LoeschKnopf from "./LoeschKnopf"

// Die Oberfläche zu lib/zielmethoden: pro Ziel eine Methode wählen und die
// zugehörigen Felder ausfüllen. Die Rechnung dahinter steht in der lib und
// ist dort getestet – hier geht es nur um Eingabe und Darstellung.

const feld =
  "w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-900 placeholder:text-gray-300"

/* ── Methodenwahl ───────────────────────────────────────────────────────── */

export function MethodenWahl({ wert, onChange }) {
  const aktiv = methodeVon(wert)
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {METHODEN.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key === "frei" ? undefined : m.key)}
            title={m.beschreibung}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              aktiv.key === m.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
        {aktiv.beschreibung}
      </p>
    </div>
  )
}

/* ── SMART ──────────────────────────────────────────────────────────────── */

// Fünf kurze Felder statt eines langen Satzes. Der Zielsatz entsteht daraus
// und landet im normalen Textfeld, damit ein SMART-Ziel überall auftaucht,
// wo Ziele auftauchen.
export function SmartFelder({ ziel, onChange }) {
  const pruefung = smartPruefung(ziel)
  const felder = ziel.smart ?? {}

  function setzeFeld(key, wert) {
    const neu = { ...felder, [key]: wert }
    const satz = smartSatz(neu)
    // Solange der Nutzer den Titel nicht selbst überschrieben hat, folgt er
    // den Feldern. Ein von Hand geänderter Titel bleibt stehen.
    const folgtFeldern = !ziel.text?.trim() || ziel.text === smartSatz(felder)
    onChange(folgtFeldern && satz ? { smart: neu, text: satz } : { smart: neu })
  }

  return (
    <div className="space-y-2">
      {SMART_FELDER.map((f) => {
        const stand = pruefung.find((p) => p.key === f.key)
        return (
          <label key={f.key} className="block">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                  stand.erfuellt
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {f.buchstabe}
              </span>
              {f.frage}
            </span>
            <input
              value={felder[f.key] ?? ""}
              onChange={(e) => setzeFeld(f.key, e.target.value)}
              placeholder={f.platzhalter}
              className={`mt-1 ${feld}`}
            />
            {!stand.erfuellt && (
              <span className="mt-0.5 block text-[11px] text-amber-600">
                {f.hinweis}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}

// Kompakter Stand: fünf Buchstaben, die erfüllten hervorgehoben. Taucht in
// der Übersicht neben dem Ziel auf.
export function SmartBadge({ ziel }) {
  const pruefung = smartPruefung(ziel)
  const erfuellt = pruefung.filter((p) => p.erfuellt).length
  return (
    <span
      title={`SMART ${erfuellt}/5 – offen: ${
        pruefung
          .filter((p) => !p.erfuellt)
          .map((p) => p.label)
          .join(", ") || "nichts"
      }`}
      className="flex shrink-0 gap-0.5"
    >
      {pruefung.map((p) => (
        <span
          key={p.key}
          className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
            p.erfuellt
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-300"
          }`}
        >
          {p.buchstabe}
        </span>
      ))}
    </span>
  )
}

/* ── OKR ────────────────────────────────────────────────────────────────── */

export function KeyResults({ ziel, onChange, neueId }) {
  const krs = keyResults(ziel)

  function setzen(neu) {
    onChange({ keyResults: neu })
  }
  function patch(id, aenderung) {
    setzen(krs.map((kr) => (kr.id === id ? { ...kr, ...aenderung } : kr)))
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Key Results – je eine Zahl, an der sich der Fortschritt ablesen lässt.
      </p>
      {krs.map((kr) => {
        const anteil = krFortschritt(kr)
        return (
          <div
            key={kr.id}
            className="space-y-1.5 rounded-md border border-gray-200 bg-white p-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={kr.text ?? ""}
                onChange={(e) => patch(kr.id, { text: e.target.value })}
                placeholder="Was wird gemessen? z.B. geschriebene Seiten"
                className="min-w-0 flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-300"
              />
              <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
                {Math.round(anteil * 100)} %
              </span>
              <LoeschKnopf
                onLoeschen={() => setzen(krs.filter((x) => x.id !== kr.id))}
                titel="Key Result entfernen"
                klasse="text-gray-300"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
              <label className="flex items-center gap-1">
                von
                <input
                  type="number"
                  value={kr.start ?? 0}
                  onChange={(e) => patch(kr.id, { start: e.target.value })}
                  className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
                />
              </label>
              <label className="flex items-center gap-1">
                auf
                <input
                  type="number"
                  value={kr.ziel ?? ""}
                  onChange={(e) => patch(kr.id, { ziel: e.target.value })}
                  placeholder="Ziel"
                  className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
                />
              </label>
              <label className="flex items-center gap-1">
                aktuell
                <input
                  type="number"
                  value={kr.ist ?? 0}
                  onChange={(e) => patch(kr.id, { ist: e.target.value })}
                  className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
                />
              </label>
              <input
                value={kr.einheit ?? ""}
                onChange={(e) => patch(kr.id, { einheit: e.target.value })}
                placeholder="Einheit"
                className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-800 outline-none focus:border-gray-900"
              />
            </div>
          </div>
        )
      })}
      {krs.length < 4 && (
        <button
          type="button"
          onClick={() =>
            setzen([
              ...krs,
              { id: neueId(), text: "", start: 0, ziel: "", ist: 0, einheit: "" },
            ])
          }
          className="w-full rounded-md border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          + Key Result
        </button>
      )}
    </div>
  )
}

// Fortschrittsbalken eines OKR-Ziels für die Übersicht.
export function OkrFortschritt({ ziel }) {
  const anteil = okrFortschritt(ziel)
  if (anteil == null) {
    return (
      <p className="text-xs text-gray-300">
        Noch keine Key Results – ohne Zahl kein Fortschritt.
      </p>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all"
          style={{ width: `${Math.round(anteil * 100)}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-gray-400">
        {Math.round(anteil * 100)} %
      </span>
    </div>
  )
}

/* ── WOOP ───────────────────────────────────────────────────────────────── */

export function WoopFelder({ ziel, onChange }) {
  const felder = woopFelder(ziel)
  const satz = woopPlanSatz(felder)

  return (
    <div className="space-y-2">
      {WOOP_FELDER.map((f) => (
        <label key={f.key} className="block">
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{f.label}</span> ·{" "}
            {f.frage}
          </span>
          <input
            value={felder[f.key] ?? ""}
            onChange={(e) =>
              onChange({ woop: { ...felder, [f.key]: e.target.value } })
            }
            placeholder={f.platzhalter}
            className={`mt-1 ${feld}`}
          />
        </label>
      ))}
      {satz && (
        <p className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white">
          {satz}
        </p>
      )}
    </div>
  )
}

// Der Wenn-dann-Satz für die Übersicht. Er ist der eigentliche Ertrag der
// Methode: im Moment des Hindernisses muss nichts mehr entschieden werden.
export function WoopSatz({ ziel }) {
  const satz = woopPlanSatz(woopFelder(ziel))
  if (!satz) return null
  return (
    <p className="mt-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600">
      {satz}
    </p>
  )
}

/* ── Felder zur gewählten Methode ───────────────────────────────────────── */

// Ein Ort für die Fallunterscheidung, damit die aufrufenden Seiten sie nicht
// jedes Mal neu treffen müssen.
export function MethodenFelder({ ziel, onChange, neueId }) {
  if (ziel.methode === "smart") return <SmartFelder ziel={ziel} onChange={onChange} />
  if (ziel.methode === "okr")
    return <KeyResults ziel={ziel} onChange={onChange} neueId={neueId} />
  if (ziel.methode === "woop") return <WoopFelder ziel={ziel} onChange={onChange} />
  return null
}
