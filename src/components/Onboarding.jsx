import { useState } from "react"
import { schreibeStore } from "../lib/useStored"
import { FARBEN } from "../lib/farben"

// App-Profile: vordefinierte Konfigurationen für verschiedene Nutzungsszenarien
export const PROFILE = [
  {
    id: "produktivitaet",
    name: "Produktivitäts-Planer",
    beschreibung: "Kalender, Todos, Fokus-Timer und Projekte – alles für strukturiertes Arbeiten.",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    farbe: "indigo",
    seiten: ["dashboard", "kalender", "todos", "deepwork", "projekte"],
  },
  {
    id: "habits",
    name: "Habit-Tracker",
    beschreibung: "Gewohnheiten aufbauen, Streaks verfolgen und Wochen-Reviews machen.",
    icon: (
      <path d="M12 3c.5 3 3.5 4 3.5 8a3.5 3.5 0 0 1-7 0c0-1 .4-1.8.8-2.4.3 1 .9 1.6 1.7 1.6-.8-2 .5-5 1-7.2Z" />
    ),
    farbe: "emerald",
    seiten: ["dashboard", "habits", "todos", "kalender", "review"],
  },
  {
    id: "second-brain",
    name: "Second Brain",
    beschreibung: "Gedanken sammeln, Wissen vernetzen, Projekte als intellektuelle Ökosysteme führen.",
    icon: (
      <>
        <ellipse cx="12" cy="12" rx="9" ry="7" />
        <path d="M9 9c.5-1.5 2-2 3-1.5M12 15v2M8.5 14.5c.5 1 2 2 3.5 2s3-.9 3.5-2" />
      </>
    ),
    farbe: "violet",
    seiten: ["dashboard", "sammeln", "projekte", "todos", "review"],
  },
  {
    id: "komplett",
    name: "Komplett",
    beschreibung: "Alle Funktionen aktiv – das vollständige holistische OS für Geist und Leben.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
      </>
    ),
    farbe: "gray",
    seiten: ["dashboard", "kalender", "todos", "sammeln", "habits", "deepwork", "projekte"],
  },
]

const STANDARD_BEREICHE = [
  { id: "koerper", name: "Körper", farbe: "emerald" },
  { id: "bildung", name: "Bildung", farbe: "blue" },
  { id: "arbeit", name: "Arbeit", farbe: "violet" },
  { id: "achtsamkeit", name: "Achtsamkeit", farbe: "amber" },
]

const FARBEN_OPTIONEN = Object.keys(FARBEN).filter((f) => f !== "gray")

function NavIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Schritt-Indikatoren oben
function Schritte({ aktuell, gesamt }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: gesamt }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < aktuell
              ? "bg-indigo-500 w-8"
              : i === aktuell
              ? "bg-indigo-400 w-8"
              : "bg-gray-200 w-4"
          }`}
        />
      ))}
    </div>
  )
}

export default function Onboarding({ onFertig }) {
  const [schritt, setSchritt] = useState(0)
  const [appName, setAppName] = useState("")
  const [gewaehltesProfil, setGewaehltesProfil] = useState(null)
  const [bereiche, setBereiche] = useState(STANDARD_BEREICHE)
  const [neuerName, setNeuerName] = useState("")
  const [neueFarbe, setNeueFarbe] = useState("emerald")

  function weiter() {
    setSchritt((s) => s + 1)
  }

  function bereichHinzufuegen() {
    if (!neuerName.trim()) return
    setBereiche((b) => [
      ...b,
      { id: Date.now().toString(), name: neuerName.trim(), farbe: neueFarbe },
    ])
    setNeuerName("")
    setNeueFarbe("emerald")
  }

  function bereichEntfernen(id) {
    setBereiche((b) => b.filter((x) => x.id !== id))
  }

  function bereichFarbeWechseln(id, farbe) {
    setBereiche((b) => b.map((x) => (x.id === id ? { ...x, farbe } : x)))
  }

  function abschliessen() {
    const profil = gewaehltesProfil ?? PROFILE[3]
    // Einstellungen speichern
    schreibeStore("einstellungen", {}, {
      onboardingAbgeschlossen: true,
      profil: profil.id,
      sichtbareSeiten: profil.seiten,
      appName: appName.trim() || "OS",
    })
    // Habit-Bereiche speichern
    schreibeStore("habitBereiche", STANDARD_BEREICHE, bereiche)
    onFertig()
  }

  // ── Schritt 0: Willkommen ──────────────────────────────────────────────
  if (schritt === 0) {
    return (
      <OnboardingHuelle schritt={0} gesamt={3}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500 shadow-lg shadow-indigo-200">
            <span className="text-4xl font-bold text-white">O</span>
          </div>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">
            Willkommen
          </h1>
          <p className="mb-8 max-w-sm text-base text-gray-500">
            Dein persönliches OS – ein holistisches Ökosystem für Produktivität,
            Gewohnheiten und dein zweites Gehirn.
          </p>

          <label className="mb-6 w-full max-w-xs text-left">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-gray-400">
              Wie soll die App heissen?
            </span>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="z.B. Mein OS, Lukas' Brain…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
            />
          </label>

          <button
            onClick={weiter}
            className="w-full max-w-xs rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-400"
          >
            Loslegen →
          </button>
        </div>
      </OnboardingHuelle>
    )
  }

  // ── Schritt 1: Profil wählen ───────────────────────────────────────────
  if (schritt === 1) {
    return (
      <OnboardingHuelle schritt={1} gesamt={3}>
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Wie willst du die App nutzen?
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Du kannst das jederzeit in den Einstellungen ändern.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROFILE.map((p) => (
            <button
              key={p.id}
              onClick={() => setGewaehltesProfil(p)}
              className={`group flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-all ${
                gewaehltesProfil?.id === p.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  gewaehltesProfil?.id === p.id
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                }`}
              >
                <NavIcon>{p.icon}</NavIcon>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  {p.beschreibung}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setSchritt(0)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            ← Zurück
          </button>
          <button
            onClick={weiter}
            disabled={!gewaehltesProfil}
            className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
          >
            Weiter →
          </button>
        </div>
      </OnboardingHuelle>
    )
  }

  // ── Schritt 2: Bereiche anpassen ───────────────────────────────────────
  if (schritt === 2) {
    return (
      <OnboardingHuelle schritt={2} gesamt={3}>
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Deine Lebensbereiche
        </h2>
        <p className="mb-5 text-sm text-gray-500">
          Bereiche helfen dir, Habits und Projekte zu strukturieren.
        </p>

        <div className="mb-4 space-y-2">
          {bereiche.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5"
            >
              <div className="flex gap-1.5">
                {FARBEN_OPTIONEN.map((f) => (
                  <button
                    key={f}
                    onClick={() => bereichFarbeWechseln(b.id, f)}
                    className={`h-4 w-4 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-110 ${
                      b.farbe === f ? "ring-2 ring-offset-1 ring-gray-400" : ""
                    }`}
                  />
                ))}
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800">
                {b.name}
              </span>
              <button
                onClick={() => bereichEntfernen(b.id)}
                className="text-gray-300 transition-colors hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && bereichHinzufuegen()}
            placeholder="Neuer Bereich…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:bg-white"
          />
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2">
            {FARBEN_OPTIONEN.map((f) => (
              <button
                key={f}
                onClick={() => setNeueFarbe(f)}
                className={`h-4 w-4 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-110 ${
                  neueFarbe === f ? "ring-2 ring-offset-1 ring-gray-400" : ""
                }`}
              />
            ))}
          </div>
          <button
            onClick={bereichHinzufuegen}
            className="rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            +
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setSchritt(1)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            ← Zurück
          </button>
          <button
            onClick={abschliessen}
            className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            Fertig ✓
          </button>
        </div>
      </OnboardingHuelle>
    )
  }

  return null
}

function OnboardingHuelle({ schritt, gesamt, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Schritte aktuell={schritt} gesamt={gesamt} />
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
