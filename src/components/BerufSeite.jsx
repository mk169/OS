import { useMemo, useState } from "react"
import useStored from "../lib/useStored"
import { heute, tageBis } from "../lib/datum"
import {
  BEWERBUNG_STATUS,
  BEWERBUNG_STANDARD_STATUS,
  WEITERBILDUNG_STATUS,
  ZIEL_HORIZONTE,
  bewerbungStatusVon,
  bewerbungsKennzahlen,
  istOffen,
  offeneFristen,
  setzeStatus,
  weiterbildungStatusVon,
  weiterbildungStunden,
  zielErreicht,
  zielFortschritt,
} from "../lib/beruf"
import Seitenkopf from "./Seitenkopf"
import LoeschKnopf from "./LoeschKnopf"
import LeerHinweis from "./LeerHinweis"
import { SEITE_LESEN } from "../lib/layout"

// Lebensbereich „Beruf & Karriere": drei Reiter für die drei Fragen, die
// hier zusammengehören – Wo stehen meine Bewerbungen? Worauf arbeite ich
// hin? Was lerne ich dafür? Die Rechnung dazu liegt in lib/beruf.js.

const TABS = [
  { key: "bewerbungen", label: "Bewerbungen", emoji: "📮" },
  { key: "ziele", label: "Ziele", emoji: "🎯" },
  { key: "weiterbildung", label: "Weiterbildung", emoji: "📜" },
]

export default function BerufSeite() {
  const [tab, setTab] = useState("bewerbungen")
  const [bewerbungen, setBewerbungen] = useStored("beruf_bewerbungen", [])
  const [ziele, setZiele] = useStored("beruf_ziele", [])
  const [weiterbildung, setWeiterbildung] = useStored("beruf_weiterbildung", [])

  return (
    <div className={SEITE_LESEN}>
      <Seitenkopf
        eyebrow="Beruf"
        titel="Beruf & Karriere"
        unterzeile="Bewerbungen, Ziele und Weiterbildung an einem Ort."
      />

      <div className="mb-6 flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-500 hover:text-gray-900"
            }`}
          >
            <span className="mr-1">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bewerbungen" && (
        <Bewerbungen bewerbungen={bewerbungen} setBewerbungen={setBewerbungen} />
      )}
      {tab === "ziele" && <Ziele ziele={ziele} setZiele={setZiele} />}
      {tab === "weiterbildung" && (
        <Weiterbildung eintraege={weiterbildung} setEintraege={setWeiterbildung} />
      )}
    </div>
  )
}

/* ── Gemeinsame Bausteine ───────────────────────────────────────────────── */

function StatKarte({ label, wert }) {
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm shadow-gray-100">
      <p className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{wert}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

const feldKlasse =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"

/* ── Bewerbungen ────────────────────────────────────────────────────────── */

function Bewerbungen({ bewerbungen, setBewerbungen }) {
  const [offenesFormular, setOffenesFormular] = useState(false)
  const [firma, setFirma] = useState("")
  const [rolle, setRolle] = useState("")
  const [frist, setFrist] = useState("")
  const [link, setLink] = useState("")
  const [notiz, setNotiz] = useState("")
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  const kennzahlen = useMemo(() => bewerbungsKennzahlen(bewerbungen), [bewerbungen])
  const fristen = useMemo(() => offeneFristen(bewerbungen), [bewerbungen])

  // Nach Station gruppieren; abgeschlossene Vorgänge erst auf Wunsch.
  const gruppen = BEWERBUNG_STATUS.filter((s) => zeigeErledigte || s.offen).map((s) => ({
    status: s,
    items: bewerbungen
      .filter((b) => (b.status ?? BEWERBUNG_STANDARD_STATUS) === s.key)
      .sort((a, b) => (a.frist || "9999").localeCompare(b.frist || "9999")),
  }))

  function anlegen(e) {
    e.preventDefault()
    if (!firma.trim()) return
    setBewerbungen([
      ...bewerbungen,
      {
        id: Date.now(),
        firma: firma.trim(),
        rolle: rolle.trim(),
        status: BEWERBUNG_STANDARD_STATUS,
        frist,
        link: link.trim(),
        notiz: notiz.trim(),
        erstelltAm: heute(),
        verlauf: [],
      },
    ])
    setFirma("")
    setRolle("")
    setFrist("")
    setLink("")
    setNotiz("")
    setOffenesFormular(false)
  }

  function statusSetzen(id, status) {
    setBewerbungen(
      bewerbungen.map((b) => (b.id === id ? setzeStatus(b, status) : b))
    )
  }

  function entfernen(id) {
    setBewerbungen(bewerbungen.filter((b) => b.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <StatKarte label="offen" wert={kennzahlen.offen} />
        <StatKarte label="im Gespräch" wert={kennzahlen.gespraeche} />
        <StatKarte
          label="Erfolgsquote"
          wert={kennzahlen.quote == null ? "–" : `${kennzahlen.quote}%`}
        />
      </div>

      {fristen.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">
            Fristen
          </p>
          <ul className="mt-1.5 space-y-1">
            {fristen.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-sm text-amber-900">
                <span className="min-w-0 flex-1 truncate">
                  {b.firma}
                  {b.rolle && <span className="text-amber-700"> · {b.rolle}</span>}
                </span>
                <span className="shrink-0 text-xs font-medium">{tageBis(b.frist)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {offenesFormular ? (
        <form
          onSubmit={anlegen}
          className="space-y-2 rounded-xl border border-gray-300 bg-white p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              placeholder="Firma"
              autoFocus
              className={feldKlasse}
            />
            <input
              value={rolle}
              onChange={(e) => setRolle(e.target.value)}
              placeholder="Rolle, z.B. Werkstudent Data"
              className={feldKlasse}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 flex-col text-xs text-gray-500">
              Frist
              <input
                type="date"
                value={frist}
                onChange={(e) => setFrist(e.target.value)}
                className={`mt-1 ${feldKlasse}`}
              />
            </label>
            <label className="flex flex-1 flex-col text-xs text-gray-500">
              Link
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className={`mt-1 ${feldKlasse}`}
              />
            </label>
          </div>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Notiz – Ansprechpartner, Gehalt, Eindruck …"
            rows={2}
            className={feldKlasse}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOffenesFormular(false)}
              className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Anlegen
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOffenesFormular(true)}
          className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          + Bewerbung
        </button>
      )}

      {bewerbungen.length === 0 ? (
        <LeerHinweis
          emoji="📮"
          titel="Noch keine Bewerbung"
          text="Trag ein, worauf du dich beworben hast – der Rest ergibt sich daraus."
        />
      ) : (
        <div className="space-y-5">
          {gruppen.map(({ status, items }) => (
            <div key={status.key}>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                <span className={`h-1.5 w-1.5 rounded-full ${status.punkt}`} />
                {status.label} · {items.length}
              </p>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-300">
                  Nichts in dieser Station.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((b) => (
                    <BewerbungsZeile
                      key={b.id}
                      b={b}
                      onStatus={statusSetzen}
                      onLoeschen={entfernen}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
          <button
            onClick={() => setZeigeErledigte((z) => !z)}
            className="text-xs text-gray-400 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            {zeigeErledigte
              ? "Abgeschlossene ausblenden"
              : `Abgeschlossene zeigen (${kennzahlen.abgeschlossen})`}
          </button>
        </div>
      )}
    </div>
  )
}

function BewerbungsZeile({ b, onStatus, onLoeschen }) {
  const [offen, setOffen] = useState(false)
  const status = bewerbungStatusVon(b.status)

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={() => setOffen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <p className={`truncate text-sm ${istOffen(b) ? "text-gray-900" : "text-gray-400"}`}>
            {b.firma}
            {b.rolle && <span className="text-gray-400"> · {b.rolle}</span>}
          </p>
          {b.frist && (
            <p className="mt-0.5 text-[11px] text-gray-400">Frist {tageBis(b.frist)}</p>
          )}
        </button>
        <select
          value={b.status ?? BEWERBUNG_STANDARD_STATUS}
          onChange={(e) => onStatus(b.id, e.target.value)}
          className={`shrink-0 cursor-pointer rounded-full border-none px-2 py-1 text-[11px] font-medium outline-none ${status.stil}`}
        >
          {BEWERBUNG_STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.kurz}
            </option>
          ))}
        </select>
        <LoeschKnopf onLoeschen={() => onLoeschen(b.id)} klasse="text-gray-300" />
      </div>

      {offen && (
        <div className="space-y-1.5 border-t border-gray-100 px-3 py-2.5 text-xs text-gray-500">
          {b.notiz && <p className="whitespace-pre-wrap text-gray-600">{b.notiz}</p>}
          {b.link && (
            <a
              href={b.link}
              target="_blank"
              rel="noreferrer"
              className="inline-block truncate text-accent-600 hover:underline"
            >
              {b.link}
            </a>
          )}
          {(b.verlauf ?? []).length > 0 && (
            <p>
              Verlauf:{" "}
              {b.verlauf
                .map((v) => `${bewerbungStatusVon(v.status).kurz} (${v.am})`)
                .join(" → ")}
            </p>
          )}
          {!b.notiz && !b.link && (b.verlauf ?? []).length === 0 && (
            <p className="text-gray-300">Keine weiteren Angaben.</p>
          )}
        </div>
      )}
    </li>
  )
}

/* ── Karriereziele ──────────────────────────────────────────────────────── */

function Ziele({ ziele, setZiele }) {
  const [titel, setTitel] = useState("")
  const [horizont, setHorizont] = useState("jetzt")

  function anlegen(e) {
    e.preventDefault()
    if (!titel.trim()) return
    setZiele([
      ...ziele,
      {
        id: Date.now(),
        titel: titel.trim(),
        horizont,
        schritte: [],
        notiz: "",
        erstelltAm: heute(),
      },
    ])
    setTitel("")
  }

  const aendere = (id, aenderung) =>
    setZiele(ziele.map((z) => (z.id === id ? { ...z, ...aenderung } : z)))

  return (
    <div className="space-y-5">
      <form onSubmit={anlegen} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Ziel, z.B. Werkstudentenstelle in der Forschung"
          className={feldKlasse}
        />
        <select
          value={horizont}
          onChange={(e) => setHorizont(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        >
          {ZIEL_HORIZONTE.map((h) => (
            <option key={h.key} value={h.key}>
              {h.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      {ziele.length === 0 ? (
        <LeerHinweis
          emoji="🎯"
          titel="Noch kein Ziel"
          text="Ein Ziel plus die Schritte dorthin – mehr braucht es nicht."
        />
      ) : (
        ZIEL_HORIZONTE.map((h) => {
          const gruppe = ziele.filter((z) => (z.horizont ?? "jetzt") === h.key)
          if (gruppe.length === 0) return null
          return (
            <div key={h.key}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {h.label} · {gruppe.length}
              </p>
              <ul className="space-y-2">
                {gruppe.map((z) => (
                  <ZielKarte
                    key={z.id}
                    ziel={z}
                    onAendere={(a) => aendere(z.id, a)}
                    onLoeschen={() => setZiele(ziele.filter((x) => x.id !== z.id))}
                  />
                ))}
              </ul>
            </div>
          )
        })
      )}
    </div>
  )
}

function ZielKarte({ ziel, onAendere, onLoeschen }) {
  const [neuerSchritt, setNeuerSchritt] = useState("")
  const fortschritt = zielFortschritt(ziel)
  const schritte = ziel.schritte ?? []

  function schrittHinzu(e) {
    e.preventDefault()
    if (!neuerSchritt.trim()) return
    onAendere({
      schritte: [...schritte, { id: Date.now(), text: neuerSchritt.trim(), erledigt: false }],
    })
    setNeuerSchritt("")
  }

  const umschalten = (id) =>
    onAendere({
      schritte: schritte.map((s) => (s.id === id ? { ...s, erledigt: !s.erledigt } : s)),
    })

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              zielErreicht(ziel) ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            {ziel.titel}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {fortschritt.gesamt === 0
              ? "Noch keine Schritte"
              : `${fortschritt.erledigt}/${fortschritt.gesamt} Schritte · ${fortschritt.prozent}%`}
          </p>
        </div>
        <LoeschKnopf onLoeschen={onLoeschen} klasse="text-gray-300" />
      </div>

      {fortschritt.gesamt > 0 && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-500"
            style={{ width: `${fortschritt.prozent}%` }}
          />
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {schritte.map((s) => (
          <li key={s.id} className="group flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.erledigt}
              onChange={() => umschalten(s.id)}
              className="h-4 w-4 shrink-0 accent-gray-900"
            />
            <span className={`min-w-0 flex-1 ${s.erledigt ? "text-gray-400 line-through" : "text-gray-700"}`}>
              {s.text}
            </span>
            <LoeschKnopf
              onLoeschen={() =>
                onAendere({ schritte: schritte.filter((x) => x.id !== s.id) })
              }
              klasse="text-gray-300 opacity-0 group-hover:opacity-100 max-md:opacity-100"
            />
          </li>
        ))}
      </ul>

      <form onSubmit={schrittHinzu} className="mt-2 flex gap-2">
        <input
          value={neuerSchritt}
          onChange={(e) => setNeuerSchritt(e.target.value)}
          placeholder="+ Schritt"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-gray-900"
        />
      </form>
    </li>
  )
}

/* ── Weiterbildung ──────────────────────────────────────────────────────── */

function Weiterbildung({ eintraege, setEintraege }) {
  const [titel, setTitel] = useState("")
  const [anbieter, setAnbieter] = useState("")
  const [stunden, setStunden] = useState("")

  const gesamt = weiterbildungStunden(eintraege)
  const fertig = weiterbildungStunden(eintraege, true)

  function anlegen(e) {
    e.preventDefault()
    if (!titel.trim()) return
    setEintraege([
      ...eintraege,
      {
        id: Date.now(),
        titel: titel.trim(),
        anbieter: anbieter.trim(),
        status: "geplant",
        stunden: stunden ? Number(stunden) : null,
        datum: heute(),
      },
    ])
    setTitel("")
    setAnbieter("")
    setStunden("")
  }

  const aendere = (id, aenderung) =>
    setEintraege(eintraege.map((e) => (e.id === id ? { ...e, ...aenderung } : e)))

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <StatKarte label="Einträge" wert={eintraege.length} />
        <StatKarte label="Stunden gesamt" wert={gesamt} />
        <StatKarte label="davon abgeschlossen" wert={fertig} />
      </div>

      <form onSubmit={anlegen} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Kurs, Zertifikat, Vortrag …"
          className={feldKlasse}
        />
        <input
          value={anbieter}
          onChange={(e) => setAnbieter(e.target.value)}
          placeholder="Anbieter"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 sm:w-40"
        />
        <input
          type="number"
          min="0"
          step="1"
          value={stunden}
          onChange={(e) => setStunden(e.target.value)}
          placeholder="Std."
          className="w-20 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Hinzufügen
        </button>
      </form>

      {eintraege.length === 0 ? (
        <LeerHinweis
          emoji="📜"
          titel="Noch nichts eingetragen"
          text="Kurse, Zertifikate und Vorträge – was du dafür tust, sichtbar gemacht."
        />
      ) : (
        <ul className="space-y-1.5">
          {eintraege.map((e) => {
            const status = weiterbildungStatusVon(e.status)
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">{e.titel}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {[e.anbieter, e.stunden ? `${e.stunden} Std.` : null]
                      .filter(Boolean)
                      .join(" · ") || "Ohne weitere Angabe"}
                  </p>
                </div>
                <select
                  value={e.status ?? "geplant"}
                  onChange={(ev) => aendere(e.id, { status: ev.target.value })}
                  className={`shrink-0 cursor-pointer rounded-full border-none px-2 py-1 text-[11px] font-medium outline-none ${status.stil}`}
                >
                  {WEITERBILDUNG_STATUS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <LoeschKnopf
                  onLoeschen={() => setEintraege(eintraege.filter((x) => x.id !== e.id))}
                  klasse="text-gray-300"
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
