import { useState } from "react"
import useStored, { schreibeStore } from "../lib/useStored"
import { FARBEN } from "../lib/farben"
import Seitenkopf from "./Seitenkopf"
import { PROFILE } from "./Onboarding"

const FARBEN_OPTIONEN = Object.keys(FARBEN).filter((f) => f !== "gray")

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

function Toggle({ an, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        an ? "bg-indigo-500" : "bg-gray-200"
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

function NavIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Abschnitt({ titel, beschreibung, children }) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{titel}</h2>
        {beschreibung && (
          <p className="mt-0.5 text-xs text-gray-400">{beschreibung}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export default function Einstellungen() {
  const [einstellungen, setEinstellungen] = useStored("einstellungen", {
    onboardingAbgeschlossen: true,
    profil: "komplett",
    sichtbareSeiten: ["dashboard", "kalender", "todos", "sammeln", "habits", "deepwork", "projekte"],
    appName: "OS",
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

  const sichtbar = einstellungen.sichtbareSeiten ?? []

  function seiteToogle(key) {
    // Dashboard ist immer sichtbar
    if (key === "dashboard") return
    setEinstellungen((e) => ({
      ...e,
      sichtbareSeiten: sichtbar.includes(key)
        ? sichtbar.filter((s) => s !== key)
        : [...sichtbar, key],
    }))
  }

  function profilWaehlen(profil) {
    setEinstellungen((e) => ({
      ...e,
      profil: profil.id,
      sichtbareSeiten: profil.seiten,
    }))
  }

  function appNameSpeichern() {
    setEinstellungen((e) => ({ ...e, appName: appNameEntwurf.trim() || "OS" }))
    zeigeSpeichert()
  }

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

  function zeigeSpeichert() {
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Seitenkopf
        titel="Einstellungen"
        unterzeile="Passe dein OS an deinen Workflow an."
      />

      {/* Gespeichert-Toast */}
      {gespeichert && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <span>✓</span> Gespeichert
        </div>
      )}

      {/* ── App-Name ─────────────────────────────────────────────── */}
      <Abschnitt
        titel="App-Name"
        beschreibung="Wie heisst dein persönliches OS?"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={appNameEntwurf}
            onChange={(e) => setAppNameEntwurf(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && appNameSpeichern()}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
            placeholder="z.B. Mein OS, Lukas' Brain…"
          />
          <button
            onClick={appNameSpeichern}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            Speichern
          </button>
        </div>
      </Abschnitt>

      {/* ── Profil ───────────────────────────────────────────────── */}
      <Abschnitt
        titel="App-Profil"
        beschreibung="Wähle eine Voreinstellung für deinen Workflow. Das aktiviert die passenden Module."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILE.map((p) => {
            const aktiv = einstellungen.profil === p.id
            return (
              <button
                key={p.id}
                onClick={() => { profilWaehlen(p); zeigeSpeichert() }}
                className={`group flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  aktiv
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    aktiv ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <NavIcon>{p.icon}</NavIcon>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{p.beschreibung}</p>
                </div>
              </button>
            )
          })}
        </div>
      </Abschnitt>

      {/* ── Sichtbare Sparten ────────────────────────────────────── */}
      <Abschnitt
        titel="Sparten"
        beschreibung="Wähle einzeln, welche Module in deiner Navigation erscheinen."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLE_SEITEN.map((s) => {
            const istAktiv = sichtbar.includes(s.key)
            return (
              <button
                key={s.key}
                onClick={() => { seiteToogle(s.key); zeigeSpeichert() }}
                className={`flex flex-col gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  istAktiv
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      istAktiv ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      {s.icon}
                    </svg>
                  </div>
                  <Toggle
                    an={istAktiv}
                    onChange={() => { seiteToogle(s.key); zeigeSpeichert() }}
                  />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${istAktiv ? "text-gray-900" : "text-gray-500"}`}>
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
                    {s.beschreibung}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </Abschnitt>

      {/* ── Lebensbereiche / Habit-Bereiche ─────────────────────── */}
      <Abschnitt
        titel="Lebensbereiche"
        beschreibung="Bereiche strukturieren deine Habits und Projekte. Füge eigene hinzu oder passe bestehende an."
      >
        <div className="mb-3 space-y-2">
          {bereiche.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5"
            >
              {/* Farbwähler */}
              <div className="flex gap-1">
                {FARBEN_OPTIONEN.map((f) => (
                  <button
                    key={f}
                    onClick={() => bereichFarbe(b.id, f)}
                    className={`h-3.5 w-3.5 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-125 ${
                      b.farbe === f ? "ring-2 ring-offset-1 ring-gray-400" : ""
                    }`}
                  />
                ))}
              </div>
              {/* Name editierbar */}
              <input
                type="text"
                value={b.name}
                onChange={(e) => bereichUmbenennen(b.id, e.target.value)}
                onBlur={zeigeSpeichert}
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none"
              />
              <button
                onClick={() => bereichEntfernen(b.id)}
                className="text-gray-300 transition-colors hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Neuen Bereich hinzufügen */}
        <div className="flex gap-2">
          <input
            type="text"
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && bereichHinzufuegen()}
            placeholder="Neuer Bereich…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
          />
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5">
            {FARBEN_OPTIONEN.map((f) => (
              <button
                key={f}
                onClick={() => setNeueFarbe(f)}
                className={`h-3.5 w-3.5 rounded-full ${FARBEN[f].punkt} transition-transform hover:scale-125 ${
                  neueFarbe === f ? "ring-2 ring-offset-1 ring-gray-400" : ""
                }`}
              />
            ))}
          </div>
          <button
            onClick={bereichHinzufuegen}
            className="rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            +
          </button>
        </div>
      </Abschnitt>

      {/* ── Daten & Zurücksetzen ────────────────────────────────── */}
      <Abschnitt
        titel="Daten & Zurücksetzen"
        beschreibung="Einrichtungsassistent neu starten oder alle Daten löschen."
      >
        <div className="space-y-2">
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
