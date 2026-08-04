import { useMemo, useRef, useState } from "react"
import useStored from "../lib/useStored"
import Seitenkopf from "./Seitenkopf"
import { FARBEN } from "../lib/farben"
import { heute } from "../lib/datum"
import {
  geld,
  geldMitZeichen,
  parseBetrag,
  AUSGABE_KATEGORIEN,
  EINNAHME_KATEGORIEN,
  kategorieVon,
  KONTO_TYPEN,
  kontoTypVon,
  kontoSaldo,
  monatsSchluessel,
  aktuellerMonat,
  monatLabel,
  monatVerschieben,
  summeMonat,
  summeZeitraum,
  ausgabenNachKategorie,
  jahresMonate,
  jahreMitDaten,
  aktuellesJahr,
  MONATSKURZ,
  WAEHRUNGEN,
} from "../lib/finanzen"
import { alsCsv, parseCsv } from "../lib/finanzenCsv"

// Lebensbereich „Finanzen": Konten, Buchungen, Budgets und Sparziele an
// einem Ort. Alle Daten liegen in useStored (localStorage + Cloud-Sync).

const TABS = [
  { key: "uebersicht", label: "Übersicht", emoji: "📊" },
  { key: "transaktionen", label: "Buchungen", emoji: "💸" },
  { key: "jahr", label: "Jahr", emoji: "📈" },
  { key: "konten", label: "Konten", emoji: "🏦" },
  { key: "budgets", label: "Budgets", emoji: "🎯" },
  { key: "sparziele", label: "Sparziele", emoji: "🐖" },
]

export default function FinanzenSeite() {
  const [tab, setTab] = useState("uebersicht")
  const [konten, setKonten] = useStored("finanzen_konten", [])
  const [transaktionen, setTransaktionen] = useStored("finanzen_transaktionen", [])
  const [budgets, setBudgets] = useStored("finanzen_budgets", [])
  const [sparziele, setSparziele] = useStored("finanzen_sparziele", [])
  const [fin, setFin] = useStored("finanzen_einstellung", { waehrung: "EUR" })

  const w = fin?.waehrung ?? "EUR"
  const props = {
    konten, setKonten,
    transaktionen, setTransaktionen,
    budgets, setBudgets,
    sparziele, setSparziele,
    w,
    onTab: setTab,
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <Seitenkopf
        titel="Finanzen"
        unterzeile="Konten, Ausgaben, Budgets und Sparziele an einem Ort."
        aktion={
          <select
            value={w}
            onChange={(e) => setFin({ ...fin, waehrung: e.target.value })}
            title="Anzeigewährung"
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-gray-900"
          >
            {WAEHRUNGEN.map((v) => (
              <option key={v.code} value={v.code}>
                {v.symbol} {v.code}
              </option>
            ))}
          </select>
        }
      />

      {/* Tab-Leiste */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
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

      {tab === "uebersicht" && <Uebersicht {...props} />}
      {tab === "transaktionen" && <Transaktionen {...props} />}
      {tab === "jahr" && <Jahr {...props} />}
      {tab === "konten" && <Konten {...props} />}
      {tab === "budgets" && <Budgets {...props} />}
      {tab === "sparziele" && <Sparziele {...props} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Gemeinsame kleine Bausteine
 * ════════════════════════════════════════════════════════════════════════ */

function StatKarte({ label, wert, ton = "neutral" }) {
  const farbe =
    ton === "gut" ? "text-emerald-600"
      : ton === "schlecht" ? "text-rose-600"
      : "text-gray-900"
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm shadow-gray-100">
      <p className={`text-xl font-bold tracking-tight sm:text-2xl ${farbe}`}>{wert}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  )
}

function Balken({ anteil, farbe = "emerald" }) {
  const pal = FARBEN[farbe] ?? FARBEN.emerald
  const breite = Math.max(0, Math.min(100, anteil))
  const ueber = anteil > 100
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          ueber ? "bg-rose-500" : pal.punkt
        }`}
        style={{ width: `${ueber ? 100 : breite}%` }}
      />
    </div>
  )
}

function LeerHinweis({ emoji, titel, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
      <div className="mb-2 text-3xl">{emoji}</div>
      <p className="text-sm font-semibold text-gray-700">{titel}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">{text}</p>
    </div>
  )
}

function MonatsWechsler({ monat, setMonat }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setMonat(monatVerschieben(monat, -1))}
        title="Voriger Monat"
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900"
      >
        ‹
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold text-gray-800">
        {monatLabel(monat)}
      </span>
      <button
        onClick={() => setMonat(monatVerschieben(monat, 1))}
        title="Nächster Monat"
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900"
      >
        ›
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Übersicht – Vermögen, Monatsbilanz, Ausgaben nach Kategorie, Sparziele
 * ════════════════════════════════════════════════════════════════════════ */

function Uebersicht({ konten, transaktionen, budgets, sparziele, w, onTab }) {
  const [monat, setMonat] = useState(aktuellerMonat())

  const vermoegen = useMemo(
    () =>
      konten.reduce(
        (s, k) => s + kontoSaldo(k.id, k.startsaldo, transaktionen),
        0
      ),
    [konten, transaktionen]
  )

  const einnahmen = summeMonat(transaktionen, monat, "einnahme")
  const ausgaben = summeMonat(transaktionen, monat, "ausgabe")
  const bilanz = einnahmen - ausgaben
  const sparquote = einnahmen > 0 ? Math.round((bilanz / einnahmen) * 100) : 0

  const kategorien = ausgabenNachKategorie(transaktionen, monat)
  const maxKat = kategorien[0]?.betrag ?? 0

  const budgetGesamt = budgets.reduce((s, b) => s + Number(b.betrag), 0)

  const letzte = useMemo(
    () =>
      [...transaktionen]
        .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? "") || b.id - a.id)
        .slice(0, 5),
    [transaktionen]
  )

  const nichtsErfasst =
    konten.length === 0 && transaktionen.length === 0 && sparziele.length === 0

  if (nichtsErfasst) {
    return (
      <div className="space-y-4">
        <LeerHinweis
          emoji="💰"
          titel="Noch keine Finanzdaten"
          text="Lege zuerst ein Konto an und erfasse deine erste Buchung. Übersicht, Budgets und Sparziele bauen darauf auf."
        />
        <div className="flex justify-center gap-2">
          <button
            onClick={() => onTab("konten")}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Konto anlegen
          </button>
          <button
            onClick={() => onTab("transaktionen")}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            Buchung erfassen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Vermögensübersicht */}
      <div className="overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-lg shadow-gray-900/10 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-300">
          Gesamtvermögen
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {geld(vermoegen, w)}
        </p>
        <p className="mt-1 text-sm text-white/50">
          über {konten.length} {konten.length === 1 ? "Konto" : "Konten"}
        </p>
      </div>

      {/* Monatsbilanz */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Monatsbilanz</h2>
          <MonatsWechsler monat={monat} setMonat={setMonat} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <StatKarte label="Einnahmen" wert={geld(einnahmen, w)} ton="gut" />
          <StatKarte label="Ausgaben" wert={geld(ausgaben, w)} ton="schlecht" />
          <StatKarte
            label={`Saldo${einnahmen > 0 ? ` · Sparquote ${sparquote}%` : ""}`}
            wert={geldMitZeichen(bilanz, w)}
            ton={bilanz >= 0 ? "gut" : "schlecht"}
          />
        </div>
      </section>

      {/* Ausgaben nach Kategorie */}
      {kategorien.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Ausgaben nach Kategorie
          </h2>
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            {kategorien.map(({ kategorie, betrag }) => {
              const kat = kategorieVon("ausgabe", kategorie)
              const anteilGesamt = ausgaben > 0 ? Math.round((betrag / ausgaben) * 100) : 0
              return (
                <div key={kategorie}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-gray-700">
                      {kat.emoji} {kat.label}
                    </span>
                    <span className="font-medium text-gray-900">
                      {geld(betrag, w)}
                      <span className="ml-1.5 text-xs text-gray-400">{anteilGesamt}%</span>
                    </span>
                  </div>
                  <Balken anteil={maxKat > 0 ? (betrag / maxKat) * 100 : 0} farbe={kat.farbe} />
                </div>
              )
            })}
            {budgetGesamt > 0 && (
              <p className="pt-1 text-xs text-gray-400">
                Monatsbudget gesamt: {geld(budgetGesamt, w)} · davon genutzt{" "}
                {budgetGesamt > 0 ? Math.round((ausgaben / budgetGesamt) * 100) : 0}%
              </p>
            )}
          </div>
        </section>
      )}

      {/* Sparziele kompakt */}
      {sparziele.length > 0 && (
        <section>
          <button
            onClick={() => onTab("sparziele")}
            className="group mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
          >
            🐖 Sparziele
            <span className="text-gray-300 transition-colors group-hover:text-accent-600">→</span>
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {sparziele.slice(0, 4).map((z) => {
              const anteil = z.ziel > 0 ? (Number(z.aktuell) / Number(z.ziel)) * 100 : 0
              return (
                <div key={z.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-800">{z.name}</span>
                    <span className="text-xs text-gray-400">{Math.round(anteil)}%</span>
                  </div>
                  <Balken anteil={anteil} farbe={z.farbe ?? "emerald"} />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {geld(z.aktuell, w)} von {geld(z.ziel, w)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Letzte Buchungen */}
      {letzte.length > 0 && (
        <section>
          <button
            onClick={() => onTab("transaktionen")}
            className="group mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
          >
            💸 Letzte Buchungen
            <span className="text-gray-300 transition-colors group-hover:text-accent-600">→</span>
          </button>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {letzte.map((t) => (
              <BuchungsZeile key={t.id} t={t} konten={konten} w={w} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Buchungen – erfassen, filtern (Monat/Art), nach Datum gruppiert
 * ════════════════════════════════════════════════════════════════════════ */

function BuchungsZeile({ t, konten, w, onLoeschen }) {
  const kat = kategorieVon(t.art, t.kategorie)
  const konto = konten.find((k) => k.id === t.kontoId)
  const einnahme = t.art === "einnahme"
  return (
    <li className="group flex items-center gap-3 px-3.5 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg">
        {kat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {t.notiz?.trim() || kat.label}
        </p>
        <p className="truncate text-xs text-gray-400">
          {kat.label}
          {konto ? ` · ${konto.name}` : ""} · {t.datum}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          einnahme ? "text-emerald-600" : "text-gray-900"
        }`}
      >
        {einnahme ? "+" : "−"}
        {geld(t.betrag, w)}
      </span>
      {onLoeschen && (
        <button
          onClick={() => onLoeschen(t.id)}
          title="Löschen"
          className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 max-md:opacity-100"
        >
          ×
        </button>
      )}
    </li>
  )
}

function Transaktionen({ konten, setKonten, transaktionen, setTransaktionen, w }) {
  const dateiInput = useRef(null)
  const [offen, setOffen] = useState(false)
  const [art, setArt] = useState("ausgabe")
  const [betrag, setBetrag] = useState("")
  const [kategorie, setKategorie] = useState("lebensmittel")
  const [kontoId, setKontoId] = useState(konten[0]?.id ?? "")
  const [datum, setDatum] = useState(heute())
  const [notiz, setNotiz] = useState("")

  const [filterMonat, setFilterMonat] = useState(aktuellerMonat())
  const [filterArt, setFilterArt] = useState("alle") // alle | einnahme | ausgabe

  const kategorien = art === "einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN

  function wechsleArt(neu) {
    setArt(neu)
    // Passende Standard-Kategorie wählen, falls die aktuelle nicht existiert.
    const liste = neu === "einnahme" ? EINNAHME_KATEGORIEN : AUSGABE_KATEGORIEN
    if (!liste.some((k) => k.key === kategorie)) setKategorie(liste[0].key)
  }

  function speichern(e) {
    e.preventDefault()
    const wert = parseBetrag(betrag)
    if (wert <= 0) return
    setTransaktionen([
      ...transaktionen,
      {
        id: Date.now(),
        art,
        betrag: wert,
        kategorie,
        kontoId: kontoId || null,
        datum: datum || heute(),
        notiz: notiz.trim(),
        erstelltAm: Date.now(),
      },
    ])
    setBetrag("")
    setNotiz("")
  }

  function loeschen(id) {
    setTransaktionen(transaktionen.filter((t) => t.id !== id))
  }

  // CSV-Export: alle Buchungen als .csv (Excel/Numbers/Google Tabellen).
  function exportiereCsv() {
    if (transaktionen.length === 0) return
    const blob = new Blob([alsCsv(transaktionen, konten)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `finanzen-${heute()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // CSV-Import: Buchungen anhängen, fehlende Konten automatisch anlegen.
  function importiereCsv(e) {
    const datei = e.target.files?.[0]
    if (!datei) return
    const leser = new FileReader()
    leser.onload = () => {
      const { buchungen, neueKonten, uebersprungen } = parseCsv(
        String(leser.result),
        konten
      )
      if (buchungen.length === 0) {
        window.alert(
          "Keine gültigen Buchungen gefunden. Erwartet werden Spalten wie " +
            "Datum, Art, Betrag, Kategorie, Konto, Notiz."
        )
        return
      }
      if (neueKonten.length > 0) setKonten([...konten, ...neueKonten])
      setTransaktionen([...transaktionen, ...buchungen])
      window.alert(
        `${buchungen.length} Buchung(en) importiert` +
          (neueKonten.length ? `, ${neueKonten.length} Konto/Konten neu angelegt` : "") +
          (uebersprungen ? `, ${uebersprungen} Zeile(n) übersprungen` : "") +
          "."
      )
    }
    leser.readAsText(datei)
    e.target.value = ""
  }

  const gefiltert = useMemo(
    () =>
      transaktionen
        .filter((t) => monatsSchluessel(t.datum) === filterMonat)
        .filter((t) => filterArt === "alle" || t.art === filterArt)
        .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? "") || b.id - a.id),
    [transaktionen, filterMonat, filterArt]
  )

  const einnahmenM = summeMonat(transaktionen, filterMonat, "einnahme")
  const ausgabenM = summeMonat(transaktionen, filterMonat, "ausgabe")

  return (
    <div className="space-y-5">
      {/* Erfassen */}
      {!offen ? (
        <button
          onClick={() => {
            setKontoId(konten[0]?.id ?? "")
            setOffen(true)
          }}
          className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900"
        >
          + Buchung erfassen
        </button>
      ) : (
        <form onSubmit={speichern} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex gap-1.5">
            {[
              { key: "ausgabe", label: "Ausgabe" },
              { key: "einnahme", label: "Einnahme" },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => wechsleArt(o.key)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  art === o.key
                    ? o.key === "einnahme"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-500 hover:text-gray-900"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={betrag}
              onChange={(e) => setBetrag(e.target.value)}
              inputMode="decimal"
              placeholder="Betrag z. B. 24,90"
              autoFocus
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
            >
              {kategorien.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.emoji} {k.label}
                </option>
              ))}
            </select>
            <select
              value={kontoId}
              onChange={(e) => setKontoId(Number(e.target.value) || e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
            >
              <option value="">Ohne Konto</option>
              {konten.map((k) => (
                <option key={k.id} value={k.id}>
                  {kontoTypVon(k.typ).emoji} {k.name}
                </option>
              ))}
            </select>
          </div>

          <input
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Notiz (optional)"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Schließen
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Speichern
            </button>
          </div>
          {konten.length === 0 && (
            <p className="text-xs text-amber-600">
              Tipp: Lege unter „Konten" ein Konto an, damit Buchungen in den Saldo einfließen.
            </p>
          )}
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonatsWechsler monat={filterMonat} setMonat={setFilterMonat} />
        <div className="flex gap-1.5">
          {[
            { key: "alle", label: "Alle" },
            { key: "einnahme", label: "Einnahmen" },
            { key: "ausgabe", label: "Ausgaben" },
          ].map((o) => (
            <button
              key={o.key}
              onClick={() => setFilterArt(o.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterArt === o.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-500 hover:text-gray-900"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monatssumme */}
      <div className="flex gap-3">
        <StatKarte label="Einnahmen" wert={geld(einnahmenM, w)} ton="gut" />
        <StatKarte label="Ausgaben" wert={geld(ausgabenM, w)} ton="schlecht" />
        <StatKarte
          label="Saldo"
          wert={geldMitZeichen(einnahmenM - ausgabenM, w)}
          ton={einnahmenM - ausgabenM >= 0 ? "gut" : "schlecht"}
        />
      </div>

      {/* Liste */}
      {gefiltert.length === 0 ? (
        <LeerHinweis
          emoji="🧾"
          titel="Keine Buchungen"
          text="In diesem Monat wurde noch nichts erfasst."
        />
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {gefiltert.map((t) => (
            <BuchungsZeile key={t.id} t={t} konten={konten} w={w} onLoeschen={loeschen} />
          ))}
        </ul>
      )}

      {/* CSV-Export / -Import */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-sm">
        <span className="text-xs text-gray-400">
          Daten für Excel &amp; Co. – oder Kontoauszüge einlesen
        </span>
        <div className="flex gap-2">
          <button
            onClick={exportiereCsv}
            disabled={transaktionen.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
          >
            ↓ CSV-Export
          </button>
          <button
            onClick={() => dateiInput.current?.click()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
          >
            ↑ CSV-Import
          </button>
          <input
            ref={dateiInput}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={importiereCsv}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Jahr – Trend Einnahmen/Ausgaben über die Monate + Jahres-Kennzahlen
 * ════════════════════════════════════════════════════════════════════════ */

function Jahr({ transaktionen, w, onTab }) {
  const jahre = useMemo(() => jahreMitDaten(transaktionen), [transaktionen])
  const [jahr, setJahr] = useState(aktuellesJahr())

  const monate = useMemo(() => jahresMonate(transaktionen, jahr), [transaktionen, jahr])
  const einnahmen = summeZeitraum(transaktionen, jahr, "einnahme")
  const ausgaben = summeZeitraum(transaktionen, jahr, "ausgabe")
  const bilanz = einnahmen - ausgaben
  const sparquote = einnahmen > 0 ? Math.round((bilanz / einnahmen) * 100) : 0

  // Monate mit tatsächlicher Aktivität – für saubere Durchschnitte.
  const aktiveMonate = monate.filter((m) => m.einnahme > 0 || m.ausgabe > 0).length
  const oeAusgabe = aktiveMonate > 0 ? ausgaben / aktiveMonate : 0

  const maxWert = Math.max(1, ...monate.map((m) => Math.max(m.einnahme, m.ausgabe)))
  const kategorien = ausgabenNachKategorie(transaktionen, jahr).slice(0, 6)
  const maxKat = kategorien[0]?.betrag ?? 0

  const idx = jahre.indexOf(jahr)
  const kannZurueck = idx < jahre.length - 1
  const kannVor = idx > 0

  const leer = einnahmen === 0 && ausgaben === 0

  return (
    <div className="space-y-8">
      {/* Jahreswahl + Kennzahlen */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Jahresüberblick</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => kannZurueck && setJahr(jahre[idx + 1])}
              disabled={!kannZurueck}
              title="Voriges Jahr"
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-semibold text-gray-800">
              {jahr}
            </span>
            <button
              onClick={() => kannVor && setJahr(jahre[idx - 1])}
              disabled={!kannVor}
              title="Nächstes Jahr"
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <StatKarte label="Einnahmen (Jahr)" wert={geld(einnahmen, w)} ton="gut" />
          <StatKarte label="Ausgaben (Jahr)" wert={geld(ausgaben, w)} ton="schlecht" />
          <StatKarte
            label={`Saldo${einnahmen > 0 ? ` · Sparquote ${sparquote}%` : ""}`}
            wert={geldMitZeichen(bilanz, w)}
            ton={bilanz >= 0 ? "gut" : "schlecht"}
          />
        </div>
      </section>

      {leer ? (
        <LeerHinweis
          emoji="📈"
          titel={`Keine Buchungen ${jahr}`}
          text="Sobald Buchungen erfasst sind, zeigt der Trend Einnahmen und Ausgaben je Monat."
        />
      ) : (
        <>
          {/* Monatstrend */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Monatstrend</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Einnahmen
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400" /> Ausgaben
                </span>
              </div>
            </div>
            <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-white p-4">
              {monate.map((m) => {
                const saldo = m.einnahme - m.ausgabe
                return (
                  <div key={m.monat} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-xs font-medium text-gray-400">
                      {MONATSKURZ[m.monat - 1]}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-50">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(m.einnahme / maxWert) * 100}%` }}
                        />
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-50">
                        <div
                          className="h-full rounded-full bg-gray-400 transition-all duration-500"
                          style={{ width: `${(m.ausgabe / maxWert) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`w-24 shrink-0 text-right text-xs font-medium tabular-nums ${
                        saldo > 0 ? "text-emerald-600" : saldo < 0 ? "text-rose-600" : "text-gray-300"
                      }`}
                    >
                      {saldo !== 0 ? geldMitZeichen(saldo, w) : "–"}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Ø Ausgaben pro aktivem Monat: {geld(oeAusgabe, w)}
            </p>
          </section>

          {/* Ausgaben nach Kategorie (Jahr) */}
          {kategorien.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                Größte Ausgaben {jahr}
              </h2>
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                {kategorien.map(({ kategorie, betrag }) => {
                  const kat = kategorieVon("ausgabe", kategorie)
                  const anteil = ausgaben > 0 ? Math.round((betrag / ausgaben) * 100) : 0
                  return (
                    <div key={kategorie}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="text-gray-700">
                          {kat.emoji} {kat.label}
                        </span>
                        <span className="font-medium text-gray-900">
                          {geld(betrag, w)}
                          <span className="ml-1.5 text-xs text-gray-400">{anteil}%</span>
                        </span>
                      </div>
                      <Balken anteil={maxKat > 0 ? (betrag / maxKat) * 100 : 0} farbe={kat.farbe} />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <button
        onClick={() => onTab("transaktionen")}
        className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        → Zu den Buchungen
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Konten – anlegen, Saldo je Konto, löschen
 * ════════════════════════════════════════════════════════════════════════ */

function Konten({ konten, setKonten, transaktionen, w }) {
  const [offen, setOffen] = useState(false)
  const [name, setName] = useState("")
  const [typ, setTyp] = useState("giro")
  const [startsaldo, setStartsaldo] = useState("")

  function speichern(e) {
    e.preventDefault()
    if (!name.trim()) return
    setKonten([
      ...konten,
      {
        id: Date.now(),
        name: name.trim(),
        typ,
        startsaldo: parseBetrag(startsaldo),
        erstelltAm: Date.now(),
      },
    ])
    setName("")
    setStartsaldo("")
    setTyp("giro")
    setOffen(false)
  }

  function loeschen(id) {
    const anzahl = transaktionen.filter((t) => t.kontoId === id).length
    const frage =
      anzahl > 0
        ? `Konto löschen? ${anzahl} zugeordnete Buchung(en) bleiben erhalten, verlieren aber die Kontozuordnung.`
        : "Konto wirklich löschen?"
    if (!window.confirm(frage)) return
    setKonten(konten.filter((k) => k.id !== id))
  }

  const gesamt = konten.reduce(
    (s, k) => s + kontoSaldo(k.id, k.startsaldo, transaktionen),
    0
  )

  return (
    <div className="space-y-5">
      {!offen ? (
        <button
          onClick={() => setOffen(true)}
          className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900"
        >
          + Konto anlegen
        </button>
      ) : (
        <form onSubmit={speichern} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kontoname z. B. Girokonto DKB"
            autoFocus
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={typ}
              onChange={(e) => setTyp(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
            >
              {KONTO_TYPEN.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            <input
              value={startsaldo}
              onChange={(e) => setStartsaldo(e.target.value)}
              inputMode="decimal"
              placeholder="Startsaldo z. B. 1500"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Anlegen
            </button>
          </div>
        </form>
      )}

      {konten.length === 0 ? (
        <LeerHinweis
          emoji="🏦"
          titel="Noch keine Konten"
          text="Lege Giro-, Spar-, Bargeld- oder Depotkonten an. Der Saldo aktualisiert sich automatisch mit jeder Buchung."
        />
      ) : (
        <>
          <div className="rounded-2xl bg-gray-900 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-300">
              Summe aller Konten
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight">{geld(gesamt, w)}</p>
          </div>
          <ul className="space-y-2.5">
            {konten.map((k) => {
              const typInfo = kontoTypVon(k.typ)
              const saldo = kontoSaldo(k.id, k.startsaldo, transaktionen)
              return (
                <li
                  key={k.id}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                    {typInfo.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">{k.name}</p>
                    <p className="text-xs text-gray-400">{typInfo.label}</p>
                  </div>
                  <span
                    className={`shrink-0 text-base font-bold tabular-nums ${
                      saldo < 0 ? "text-rose-600" : "text-gray-900"
                    }`}
                  >
                    {geld(saldo, w)}
                  </span>
                  <button
                    onClick={() => loeschen(k.id)}
                    title="Konto löschen"
                    className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 max-md:opacity-100"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Budgets – Monatsbudget je Kategorie mit Ist/Soll-Fortschritt
 * ════════════════════════════════════════════════════════════════════════ */

function Budgets({ budgets, setBudgets, transaktionen, w }) {
  const [monat, setMonat] = useState(aktuellerMonat())
  const [offen, setOffen] = useState(false)
  const [kategorie, setKategorie] = useState("wohnen")
  const [betrag, setBetrag] = useState("")

  // Kategorien, für die noch kein Budget besteht.
  const freieKategorien = AUSGABE_KATEGORIEN.filter(
    (k) => !budgets.some((b) => b.kategorie === k.key)
  )

  function speichern(e) {
    e.preventDefault()
    const wert = parseBetrag(betrag)
    if (wert <= 0) return
    setBudgets([
      ...budgets.filter((b) => b.kategorie !== kategorie),
      { id: Date.now(), kategorie, betrag: wert },
    ])
    setBetrag("")
    setOffen(false)
  }

  function loeschen(kat) {
    setBudgets(budgets.filter((b) => b.kategorie !== kat))
  }

  const istWerte = useMemo(() => {
    const map = new Map()
    for (const t of transaktionen) {
      if (t.art !== "ausgabe" || monatsSchluessel(t.datum) !== monat) continue
      map.set(t.kategorie, (map.get(t.kategorie) ?? 0) + Number(t.betrag))
    }
    return map
  }, [transaktionen, monat])

  const sortiert = [...budgets].sort((a, b) => {
    const ia = AUSGABE_KATEGORIEN.findIndex((k) => k.key === a.kategorie)
    const ib = AUSGABE_KATEGORIEN.findIndex((k) => k.key === b.kategorie)
    return ia - ib
  })

  const soll = budgets.reduce((s, b) => s + Number(b.betrag), 0)
  const ist = sortiert.reduce((s, b) => s + (istWerte.get(b.kategorie) ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Monatsbudgets</h2>
        <MonatsWechsler monat={monat} setMonat={setMonat} />
      </div>

      {budgets.length > 0 && (
        <div className="flex gap-3">
          <StatKarte label="Budget gesamt" wert={geld(soll, w)} />
          <StatKarte label="Ausgegeben" wert={geld(ist, w)} ton={ist > soll ? "schlecht" : "neutral"} />
          <StatKarte
            label="Verfügbar"
            wert={geldMitZeichen(soll - ist, w)}
            ton={soll - ist >= 0 ? "gut" : "schlecht"}
          />
        </div>
      )}

      {!offen ? (
        freieKategorien.length > 0 && (
          <button
            onClick={() => {
              setKategorie(freieKategorien[0].key)
              setOffen(true)
            }}
            className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900"
          >
            + Budget festlegen
          </button>
        )
      ) : (
        <form onSubmit={speichern} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row">
          <select
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
          >
            {freieKategorien.map((k) => (
              <option key={k.key} value={k.key}>
                {k.emoji} {k.label}
              </option>
            ))}
          </select>
          <input
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            inputMode="decimal"
            placeholder="Monatsbudget z. B. 400"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <LeerHinweis
          emoji="🎯"
          titel="Noch keine Budgets"
          text="Lege pro Kategorie ein Monatsbudget fest und sieh auf einen Blick, wie viel schon ausgegeben wurde."
        />
      ) : (
        <ul className="space-y-3">
          {sortiert.map((b) => {
            const kat = kategorieVon("ausgabe", b.kategorie)
            const ausgegeben = istWerte.get(b.kategorie) ?? 0
            const anteil = b.betrag > 0 ? (ausgegeben / b.betrag) * 100 : 0
            const rest = b.betrag - ausgegeben
            return (
              <li key={b.kategorie} className="group rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {kat.emoji} {kat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {geld(ausgegeben, w)} / {geld(b.betrag, w)}
                    </span>
                    <button
                      onClick={() => loeschen(b.kategorie)}
                      title="Budget entfernen"
                      className="text-gray-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 max-md:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <Balken anteil={anteil} farbe={kat.farbe} />
                <p
                  className={`mt-1.5 text-xs ${
                    rest < 0 ? "font-medium text-rose-600" : "text-gray-400"
                  }`}
                >
                  {rest >= 0
                    ? `noch ${geld(rest, w)} verfügbar`
                    : `${geld(-rest, w)} über Budget`}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * Sparziele – Ziel mit Zielbetrag, aktuellem Stand & schnellem Einzahlen
 * ════════════════════════════════════════════════════════════════════════ */

const ZIEL_FARBEN = ["emerald", "blue", "violet", "amber", "rose", "cyan"]

function Sparziele({ sparziele, setSparziele, w }) {
  const [offen, setOffen] = useState(false)
  const [name, setName] = useState("")
  const [ziel, setZiel] = useState("")
  const [aktuell, setAktuell] = useState("")
  const [faelligkeit, setFaelligkeit] = useState("")

  function speichern(e) {
    e.preventDefault()
    const zielWert = parseBetrag(ziel)
    if (!name.trim() || zielWert <= 0) return
    setSparziele([
      ...sparziele,
      {
        id: Date.now(),
        name: name.trim(),
        ziel: zielWert,
        aktuell: parseBetrag(aktuell),
        faelligkeit: faelligkeit || "",
        farbe: ZIEL_FARBEN[sparziele.length % ZIEL_FARBEN.length],
      },
    ])
    setName("")
    setZiel("")
    setAktuell("")
    setFaelligkeit("")
    setOffen(false)
  }

  function einzahlen(id, plus) {
    const betrag = parseBetrag(
      window.prompt(plus ? "Betrag einzahlen:" : "Betrag entnehmen:", "")
    )
    if (betrag <= 0) return
    setSparziele(
      sparziele.map((z) =>
        z.id === id
          ? { ...z, aktuell: Math.max(0, Number(z.aktuell) + (plus ? betrag : -betrag)) }
          : z
      )
    )
  }

  function loeschen(id) {
    if (!window.confirm("Sparziel wirklich löschen?")) return
    setSparziele(sparziele.filter((z) => z.id !== id))
  }

  return (
    <div className="space-y-5">
      {!offen ? (
        <button
          onClick={() => setOffen(true)}
          className="w-full rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900"
        >
          + Sparziel anlegen
        </button>
      ) : (
        <form onSubmit={speichern} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ziel z. B. Notgroschen, Urlaub, neues Laptop"
            autoFocus
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={ziel}
              onChange={(e) => setZiel(e.target.value)}
              inputMode="decimal"
              placeholder="Zielbetrag z. B. 5000"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
            <input
              value={aktuell}
              onChange={(e) => setAktuell(e.target.value)}
              inputMode="decimal"
              placeholder="Bereits gespart (optional)"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Zieldatum (optional)</label>
            <input
              type="date"
              value={faelligkeit}
              onChange={(e) => setFaelligkeit(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Anlegen
            </button>
          </div>
        </form>
      )}

      {sparziele.length === 0 ? (
        <LeerHinweis
          emoji="🐖"
          titel="Noch keine Sparziele"
          text="Definiere, worauf du sparst – vom Notgroschen bis zur nächsten Reise – und verfolge deinen Fortschritt."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sparziele.map((z) => {
            const anteil = z.ziel > 0 ? (Number(z.aktuell) / Number(z.ziel)) * 100 : 0
            const erreicht = anteil >= 100
            const rest = Number(z.ziel) - Number(z.aktuell)
            return (
              <li
                key={z.id}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {erreicht ? "✅ " : ""}
                      {z.name}
                    </p>
                    {z.faelligkeit && (
                      <p className="text-xs text-gray-400">bis {z.faelligkeit}</p>
                    )}
                  </div>
                  <button
                    onClick={() => loeschen(z.id)}
                    title="Sparziel löschen"
                    className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100 max-md:opacity-100"
                  >
                    ×
                  </button>
                </div>

                <Balken anteil={anteil} farbe={z.farbe ?? "emerald"} />

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {geld(z.aktuell, w)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Ziel {geld(z.ziel, w)} · {Math.round(anteil)}%
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {erreicht ? "Ziel erreicht 🎉" : `noch ${geld(rest, w)}`}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => einzahlen(z.id, true)}
                    className="flex-1 rounded-lg bg-emerald-50 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    + Einzahlen
                  </button>
                  <button
                    onClick={() => einzahlen(z.id, false)}
                    className="flex-1 rounded-lg bg-gray-50 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    − Entnehmen
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
