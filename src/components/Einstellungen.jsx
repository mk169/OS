import { useRef, useState } from "react"
import useStored, { schreibeStore } from "../lib/useStored"
import { FARBEN } from "../lib/farben"
import { AKZENTE } from "../lib/akzent"
import { STILE, STIL_STANDARD } from "../lib/stil"
import { heute } from "../lib/datum"
import Seitenkopf from "./Seitenkopf"
import { PROFILE } from "./Onboarding"

const FARBEN_OPTIONEN = Object.keys(FARBEN).filter((f) => f !== "gray")

// Modul-Metadaten für die Sparten-Verwaltung (Dashboard ist immer sichtbar
// und daher hier bewusst nicht enthalten).
const ALLE_SEITEN = [
  {
    key: "kalender",
    label: "Kalender",
    beschreibung: "Termine & Wiederholungen",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9.5h18M8 3v3M16 3v3" />
      </>
    ),
  },
  {
    key: "todos",
    label: "Todos",
    beschreibung: "Eisenhower-Matrix",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  },
  {
    key: "sammeln",
    label: "Sammeln",
    beschreibung: "GTD-Inbox & Wissen",
    icon: (
      <>
        <path d="M4 4h16v6H4z" />
        <path d="M4 10l2 10h12l2-10" />
      </>
    ),
  },
  {
    key: "habits",
    label: "Habits",
    beschreibung: "Gewohnheiten & Streaks",
    icon: (
      <path d="M12 3c.5 3 3.5 4 3.5 8a3.5 3.5 0 0 1-7 0c0-1 .4-1.8.8-2.4.3 1 .9 1.6 1.7 1.6-.8-2 .5-5 1-7.2Z" />
    ),
  },
  {
    key: "deepwork",
    label: "Fokus",
    beschreibung: "Pomodoro-Timer",
    icon: (
      <>
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 13.5V9.5M9.5 2h5" />
      </>
    ),
  },
  {
    key: "projekte",
    label: "Projekte",
    beschreibung: "Ordner & Board",
    icon: (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    ),
  },
]

const DASHBOARD_ICON = <path d="M3 10.75 12 3l9 7.75M5 9.5V21h14V9.5" />

// ── Kleine, wiederverwendbare Bausteine ─────────────────────────────────────

function NavIcon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Toggle({ an, onChange, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      title={title}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        an ? "bg-accent-500" : "bg-gray-200 hover:bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          an ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

// Modul-Icon-Kachel (aktiv = Akzent, sonst dezent grau).
function ModulIcon({ children, aktiv }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
        aktiv ? "bg-accent-500 text-white" : "bg-gray-100 text-gray-400"
      }`}
    >
      <NavIcon>{children}</NavIcon>
    </div>
  )
}

// Abschnitts-Karte: Kopf (Icon + Titel + Beschreibung) über einem Panel.
function Abschnitt({ icon, titel, beschreibung, children, panel = true }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-start gap-2.5 px-0.5">
        {icon && (
          <div className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
            <NavIcon className="h-4 w-4">{icon}</NavIcon>
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{titel}</h2>
          {beschreibung && (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{beschreibung}</p>
          )}
        </div>
      </div>
      {panel ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 shadow-sm shadow-gray-100">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  )
}

// Einstellungs-Zeile: Label/Beschreibung links, Control rechts.
function Zeile({ titel, beschreibung, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{titel}</p>
        {beschreibung && <p className="mt-0.5 text-xs text-gray-400">{beschreibung}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Hauptkomponente ─────────────────────────────────────────────────────────

export default function Einstellungen() {
  const [einstellungen, setEinstellungen] = useStored("einstellungen", {
    onboardingAbgeschlossen: true,
    profil: "komplett",
    sichtbareSeiten: ["dashboard", "kalender", "todos", "sammeln", "habits", "deepwork", "projekte"],
    appName: "OS",
    startseite: "dashboard",
    akzent: "indigo",
    stil: STIL_STANDARD,
  })
  const [bereiche, setBereiche] = useStored("habitBereiche", [
    { id: "koerper", name: "Körper", farbe: "emerald" },
    { id: "bildung", name: "Bildung", farbe: "blue" },
    { id: "arbeit", name: "Arbeit", farbe: "violet" },
    { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
  ])

  const [neuerName, setNeuerName] = useState("")
  const [neueFarbe, setNeueFarbe] = useState("emerald")
  const [gespeichert, setGespeichert] = useState(false)
  const [appNameEntwurf, setAppNameEntwurf] = useState(einstellungen.appName ?? "OS")
  const dateiRef = useRef(null)

  const sichtbar = einstellungen.sichtbareSeiten ?? []
  const akzent = einstellungen.akzent ?? "indigo"
  const stil = einstellungen.stil ?? STIL_STANDARD

  // Aktive Module in der gewählten Reihenfolge + ausgeblendete Module.
  const sichtbareModule = sichtbar
    .filter((k) => k !== "dashboard")
    .map((k) => ALLE_SEITEN.find((s) => s.key === k))
    .filter(Boolean)
  const ausgeblendeteModule = ALLE_SEITEN.filter((s) => !sichtbar.includes(s.key))
  const sichtbareModulKeys = sichtbareModule.map((s) => s.key)

  const startseitenOptionen = [
    { key: "dashboard", label: "Start" },
    ...sichtbareModule.map((s) => ({ key: s.key, label: s.label })),
  ]
  const aktuelleStartseite = startseitenOptionen.some((o) => o.key === einstellungen.startseite)
    ? einstellungen.startseite
    : "dashboard"

  function zeigeSpeichert() {
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
  }

  // ── Sparten ───────────────────────────────────────────────────────────────
  function spartenUmschalten(key) {
    if (key === "dashboard") return
    setEinstellungen((e) => {
      const liste = e.sichtbareSeiten ?? []
      return {
        ...e,
        sichtbareSeiten: liste.includes(key)
          ? liste.filter((s) => s !== key)
          : [...liste, key],
      }
    })
    zeigeSpeichert()
  }

  // Setzt die Reihenfolge der aktiven Module neu; Dashboard bleibt gepinnt,
  // unbekannte Zusatz-Keys (z. B. „review" aus Profilen) bleiben erhalten.
  function setzeReihenfolge(neueModulKeys) {
    setEinstellungen((e) => {
      const alle = e.sichtbareSeiten ?? []
      const sonstige = alle.filter(
        (k) => k !== "dashboard" && !ALLE_SEITEN.some((s) => s.key === k)
      )
      return { ...e, sichtbareSeiten: ["dashboard", ...neueModulKeys, ...sonstige] }
    })
  }

  function verschiebeSparte(key, richtung) {
    const i = sichtbareModulKeys.indexOf(key)
    const j = i + richtung
    if (i < 0 || j < 0 || j >= sichtbareModulKeys.length) return
    const neu = [...sichtbareModulKeys]
    ;[neu[i], neu[j]] = [neu[j], neu[i]]
    setzeReihenfolge(neu)
    zeigeSpeichert()
  }

  // ── Profil & Darstellung ───────────────────────────────────────────────────
  function profilWaehlen(profil) {
    setEinstellungen((e) => ({ ...e, profil: profil.id, sichtbareSeiten: profil.seiten }))
    zeigeSpeichert()
  }

  function akzentWaehlen(key) {
    setEinstellungen((e) => ({ ...e, akzent: key }))
    zeigeSpeichert()
  }

  function stilWaehlen(id) {
    setEinstellungen((e) => ({ ...e, stil: id }))
    zeigeSpeichert()
  }

  function startseiteWaehlen(key) {
    setEinstellungen((e) => ({ ...e, startseite: key }))
    zeigeSpeichert()
  }

  function appNameSpeichern() {
    setEinstellungen((e) => ({ ...e, appName: appNameEntwurf.trim() || "OS" }))
    zeigeSpeichert()
  }

  // ── Lebensbereiche ──────────────────────────────────────────────────────────
  function bereichHinzufuegen() {
    if (!neuerName.trim()) return
    setBereiche((b) => [
      ...b,
      { id: Date.now().toString(), name: neuerName.trim(), farbe: neueFarbe },
    ])
    setNeuerName("")
    setNeueFarbe("emerald")
    zeigeSpeichert()
  }

  function bereichEntfernen(id) {
    setBereiche((b) => b.filter((x) => x.id !== id))
    zeigeSpeichert()
  }

  function bereichUmbenennen(id, name) {
    setBereiche((b) => b.map((x) => (x.id === id ? { ...x, name } : x)))
  }

  function bereichFarbe(id, farbe) {
    setBereiche((b) => b.map((x) => (x.id === id ? { ...x, farbe } : x)))
    zeigeSpeichert()
  }

  // ── Datensicherung ───────────────────────────────────────────────────────────
  function datenExportieren() {
    const daten = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      const roh = localStorage.getItem(k)
      try {
        daten[k] = JSON.parse(roh)
      } catch {
        daten[k] = roh
      }
    }
    const inhalt = JSON.stringify(
      { __app: "OS", __version: 1, exportiert: new Date().toISOString(), daten },
      null,
      2
    )
    const blob = new Blob([inhalt], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `OS-Backup-${heute()}.json`
    a.click()
    URL.revokeObjectURL(url)
    zeigeSpeichert()
  }

  function importDateiGewaehlt(e) {
    const datei = e.target.files?.[0]
    if (!datei) return
    const leser = new FileReader()
    leser.onload = () => {
      let daten
      try {
        const geparst = JSON.parse(leser.result)
        daten = geparst?.daten ?? geparst
      } catch {
        daten = null
      }
      if (dateiRef.current) dateiRef.current.value = ""
      if (!daten || typeof daten !== "object" || Array.isArray(daten)) {
        window.alert("Die Datei konnte nicht gelesen werden. Ist es ein gültiges OS-Backup?")
        return
      }
      const anzahl = Object.keys(daten).length
      if (!window.confirm(`Backup einspielen? ${anzahl} Einträge ersetzen deine aktuellen Daten. Das kann nicht rückgängig gemacht werden.`))
        return
      for (const [k, v] of Object.entries(daten)) schreibeStore(k, null, v)
      window.location.reload()
    }
    leser.readAsText(datei)
  }

  // ── Zurücksetzen ────────────────────────────────────────────────────────────
  function onboardingZuruecksetzen() {
    if (!window.confirm("Onboarding wirklich zurücksetzen? Die App startet dann neu mit dem Einrichtungsassistenten.")) return
    setEinstellungen((e) => ({ ...e, onboardingAbgeschlossen: false }))
    window.location.reload()
  }

  function alleDatenLoeschen() {
    if (!window.confirm("Alle Daten löschen? Das kann nicht rückgängig gemacht werden.")) return
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Seitenkopf titel="Einstellungen" unterzeile="Passe dein OS an deinen Workflow an." />

      {/* Gespeichert-Toast */}
      <div
        className={`pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 md:bottom-8 ${
          gespeichert ? "opacity-100" : "opacity-0"
        } transition-opacity duration-300`}
      >
        <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <NavIcon className="h-4 w-4 text-emerald-400">
            <path d="m5 12 5 5L20 7" />
          </NavIcon>
          Gespeichert
        </div>
      </div>

      {/* ── Darstellung ─────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="Darstellung"
        beschreibung="Design-Stil, Name und Akzentfarbe deiner App."
        icon={
          <>
            <circle cx="13.5" cy="6.5" r="2.5" />
            <circle cx="6.5" cy="12" r="2.5" />
            <path d="M12 21a9 9 0 1 1 9-9c0 2-1.8 3-3.5 3H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21Z" />
          </>
        }
      >
        <div className="border-b border-gray-100 py-3.5">
          <p className="text-sm font-medium text-gray-800">Design-Stil</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Bestimmt das Aussehen deiner Startseite.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STILE.map((s) => {
              const aktiv = stil === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => stilWaehlen(s.id)}
                  aria-pressed={aktiv}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                    aktiv
                      ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                  <span className="text-[11px] leading-snug text-gray-400">
                    {s.beschreibung}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Zeile titel="App-Name" beschreibung="Wie heisst dein persönliches OS?">
          <div className="flex gap-2">
            <input
              type="text"
              value={appNameEntwurf}
              onChange={(e) => setAppNameEntwurf(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && appNameSpeichern()}
              className="w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 outline-none transition-colors focus:border-accent-400 focus:bg-white sm:w-52"
              placeholder="z.B. Mein OS"
            />
            <button
              onClick={appNameSpeichern}
              className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Speichern
            </button>
          </div>
        </Zeile>

        <Zeile titel="Akzentfarbe" beschreibung="Färbt Navigation, Buttons & Fokus.">
          <div className="flex items-center gap-1.5">
            {Object.entries(AKZENTE).map(([key, pal]) => {
              const aktiv = akzent === key
              return (
                <button
                  key={key}
                  onClick={() => akzentWaehlen(key)}
                  title={pal.name}
                  aria-label={pal.name}
                  aria-pressed={aktiv}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    aktiv ? "ring-2 ring-gray-900 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: pal[500] }}
                />
              )
            })}
          </div>
        </Zeile>

        <Zeile titel="Standard-Startseite" beschreibung="Womit die App beim Öffnen startet.">
          <div className="relative">
            <select
              value={aktuelleStartseite}
              onChange={(e) => startseiteWaehlen(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-8 text-sm font-medium text-gray-800 outline-none transition-colors hover:bg-gray-100 focus:border-accent-400"
            >
              {startseitenOptionen.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <NavIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
              <path d="m6 9 6 6 6-6" />
            </NavIcon>
          </div>
        </Zeile>
      </Abschnitt>

      {/* ── App-Profil ──────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="App-Profil"
        beschreibung="Eine Voreinstellung aktiviert die passenden Module."
        panel={false}
        icon={
          <>
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILE.map((p) => {
            const aktiv = einstellungen.profil === p.id
            return (
              <button
                key={p.id}
                onClick={() => profilWaehlen(p)}
                className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  aktiv
                    ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    aktiv ? "bg-accent-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <NavIcon>{p.icon}</NavIcon>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{p.beschreibung}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Abschnitt>

      {/* ── Navigation / Sparten ────────────────────────────────────────────── */}
      <Abschnitt
        titel="Navigation"
        beschreibung="Bestimme, welche Module erscheinen – und in welcher Reihenfolge."
        icon={
          <>
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
            <path d="M9 3.5v17" />
          </>
        }
      >
        <div className="py-2">
          <p className="px-1 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Sichtbar
          </p>

          {/* Dashboard – immer sichtbar */}
          <div className="flex items-center gap-3 rounded-xl px-1 py-2 opacity-90">
            <div className="flex w-8 justify-center text-gray-300">
              <NavIcon className="h-4 w-4">
                <rect x="4" y="5" width="16" height="4" rx="1" />
                <rect x="4" y="11" width="16" height="4" rx="1" />
              </NavIcon>
            </div>
            <ModulIcon aktiv>{DASHBOARD_ICON}</ModulIcon>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Start</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Dashboard & Übersicht</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
              Immer sichtbar
            </span>
          </div>

          {sichtbareModule.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-gray-50">
              {/* Reihenfolge */}
              <div className="flex w-8 flex-col items-center">
                <button
                  onClick={() => verschiebeSparte(s.key, -1)}
                  disabled={i === 0}
                  title="Nach oben"
                  className="text-gray-300 transition-colors hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
                >
                  <NavIcon className="h-3.5 w-3.5"><path d="m6 15 6-6 6 6" /></NavIcon>
                </button>
                <button
                  onClick={() => verschiebeSparte(s.key, 1)}
                  disabled={i === sichtbareModule.length - 1}
                  title="Nach unten"
                  className="text-gray-300 transition-colors hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
                >
                  <NavIcon className="h-3.5 w-3.5"><path d="m6 9 6 6 6-6" /></NavIcon>
                </button>
              </div>
              <ModulIcon aktiv>{s.icon}</ModulIcon>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{s.beschreibung}</p>
              </div>
              <Toggle an onChange={() => spartenUmschalten(s.key)} title="Ausblenden" />
            </div>
          ))}

          {ausgeblendeteModule.length > 0 && (
            <>
              <p className="px-1 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Ausgeblendet
              </p>
              {ausgeblendeteModule.map((s) => (
                <div key={s.key} className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-gray-50">
                  <div className="w-8" />
                  <ModulIcon aktiv={false}>{s.icon}</ModulIcon>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">{s.label}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{s.beschreibung}</p>
                  </div>
                  <Toggle an={false} onChange={() => spartenUmschalten(s.key)} title="Einblenden" />
                </div>
              ))}
            </>
          )}
        </div>
      </Abschnitt>

      {/* ── Lebensbereiche ──────────────────────────────────────────────────── */}
      <Abschnitt
        titel="Lebensbereiche"
        beschreibung="Bereiche strukturieren deine Habits und Projekte."
        panel={false}
        icon={
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18" />
          </>
        }
      >
        <div className="space-y-2">
          {bereiche.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5"
            >
              <div className="flex gap-1">
                {FARBEN_OPTIONEN.map((f) => (
                  <button
                    key={f}
                    onClick={() => bereichFarbe(b.id, f)}
                    title={f}
                    className={`h-3.5 w-3.5 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-125 ${
                      b.farbe === f ? "ring-2 ring-gray-400 ring-offset-1" : ""
                    }`}
                  />
                ))}
              </div>
              <input
                type="text"
                value={b.name}
                onChange={(e) => bereichUmbenennen(b.id, e.target.value)}
                onBlur={zeigeSpeichert}
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
              />
              <button
                onClick={() => bereichEntfernen(b.id)}
                title="Bereich entfernen"
                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <NavIcon className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></NavIcon>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && bereichHinzufuegen()}
            placeholder="Neuer Bereich…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-accent-400 focus:bg-white"
          />
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5">
            {FARBEN_OPTIONEN.map((f) => (
              <button
                key={f}
                onClick={() => setNeueFarbe(f)}
                title={f}
                className={`h-3.5 w-3.5 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-125 ${
                  neueFarbe === f ? "ring-2 ring-gray-400 ring-offset-1" : ""
                }`}
              />
            ))}
          </div>
          <button
            onClick={bereichHinzufuegen}
            title="Bereich hinzufügen"
            className="flex items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            <NavIcon className="h-4 w-4"><path d="M12 5v14M5 12h14" /></NavIcon>
          </button>
        </div>
      </Abschnitt>

      {/* ── Daten & Sicherung ───────────────────────────────────────────────── */}
      <Abschnitt
        titel="Daten & Sicherung"
        beschreibung="Sichere deine Daten oder setze die App zurück."
        panel={false}
        icon={
          <>
            <ellipse cx="12" cy="6" rx="8" ry="3" />
            <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={datenExportieren}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-500">
              <NavIcon><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></NavIcon>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">Backup exportieren</span>
              <span className="block text-xs text-gray-400">Als JSON-Datei speichern</span>
            </span>
          </button>

          <button
            onClick={() => dateiRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-500">
              <NavIcon><path d="M12 15V3m0 0-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></NavIcon>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">Backup importieren</span>
              <span className="block text-xs text-gray-400">Aus JSON-Datei wiederherstellen</span>
            </span>
          </button>
        </div>
        <input
          ref={dateiRef}
          type="file"
          accept="application/json,.json"
          onChange={importDateiGewaehlt}
          className="hidden"
        />

        <div className="mt-2 space-y-2">
          <button
            onClick={onboardingZuruecksetzen}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            <span className="font-medium">Einrichtungsassistenten neu starten</span>
            <span className="ml-2 text-gray-400">— Profil und Bereiche neu wählen</span>
          </button>
          <button
            onClick={alleDatenLoeschen}
            className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Alle Daten löschen
            <span className="ml-2 font-normal text-red-400">— Kann nicht rückgängig gemacht werden</span>
          </button>
        </div>
      </Abschnitt>
    </div>
  )
}
