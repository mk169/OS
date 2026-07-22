import { useEffect, useState } from "react"
import { schreibeStore, setzeCloudSession } from "./lib/useStored"
import { supabase, cloudAktiv } from "./lib/supabase"
import Login from "./components/Login"
import Dashboard from "./components/Dashboard"
import KalenderSeite from "./components/KalenderSeite"
import TodosSeite from "./components/TodosSeite"
import HabitsSeite from "./components/HabitsSeite"
import DeepWorkSeite from "./components/DeepWorkSeite"
import OrdnerSeite from "./components/OrdnerSeite"
import SammelnSeite from "./components/SammelnSeite"
import ReviewSeite from "./components/ReviewSeite"
import Suche from "./components/Suche"

// Einmalige Migration: alte Kurse werden zu Projekten in einem
// „Uni“-Ordner. Die IDs bleiben erhalten, damit Todos, Karten und
// Inhalte weiter zugeordnet sind.
function migriereAlteKurse() {
  const kurse = JSON.parse(localStorage.getItem("kurse") ?? "[]")
  if (kurse.length === 0) return

  const ordner = JSON.parse(localStorage.getItem("ordner") ?? "[]")
  let uni = ordner.find((o) => o.name === "Uni" && !o.parentId)
  if (!uni) {
    uni = { id: Date.now(), name: "Uni", parentId: null }
    schreibeStore("ordner", [], [...ordner, uni])
  }

  schreibeStore("projekte", [], (projekte) => [
    ...projekte,
    ...kurse
      .filter((k) => !projekte.some((p) => p.id === k.id))
      .map((k) => ({
        id: k.id,
        name: k.name,
        beschreibung: k.semester ?? "",
        ordnerId: uni.id,
        deadline: k.pruefung ?? "",
        module: ["ziel", "todos", "inhalte", "notizen", "karten", "kalender"],
        ziel: "",
        workflow: [],
      })),
  ])
  schreibeStore("kurse", [], [])
}

// Schlichtes Linien-Icon (24er-Raster, currentColor).
function NavIcon({ children, className }) {
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

// Hauptnavigation der App – als Sidebar (Desktop) und Tab-Leiste (Mobil).
const NAV = [
  {
    key: "dashboard",
    label: "Start",
    icon: <path d="M3 10.75 12 3l9 7.75M5 9.5V21h14V9.5" />,
  },
  {
    key: "kalender",
    label: "Kalender",
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
    icon: (
      <path d="M12 3c.5 3 3.5 4 3.5 8a3.5 3.5 0 0 1-7 0c0-1 .4-1.8.8-2.4.3 1 .9 1.6 1.7 1.6-.8-2 .5-5 1-7.2Z" />
    ),
  },
  {
    key: "deepwork",
    label: "Fokus",
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
    icon: (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    ),
  },
]

export default function App() {
  const [seite, setSeite] = useState("dashboard")
  const [param, setParam] = useState(null)
  const [sucheOffen, setSucheOffen] = useState(false)
  // Ohne Cloud gibt es keinen Login – dann gilt die App sofort als bereit.
  const [session, setSession] = useState(null)
  const [authBereit, setAuthBereit] = useState(!cloudAktiv)

  useEffect(() => {
    migriereAlteKurse()
  }, [])

  // Auth-Status verfolgen (nur wenn Supabase konfiguriert ist).
  useEffect(() => {
    if (!cloudAktiv) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setzeCloudSession(data.session?.user?.id ?? null)
      setAuthBereit(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setzeCloudSession(s?.user?.id ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  function navigiere(ziel, wert = null) {
    setSeite(ziel)
    setParam(wert)
  }

  // Ctrl/Cmd+K öffnet die globale Suche.
  useEffect(() => {
    function taste(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSucheOffen((offen) => !offen)
      }
    }
    window.addEventListener("keydown", taste)
    return () => window.removeEventListener("keydown", taste)
  }, [])

  if (cloudAktiv && !authBereit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        Lädt…
      </div>
    )
  }
  if (cloudAktiv && !session) return <Login />

  const abmelden = () => supabase.auth.signOut()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar – ab Tablet-Breite */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-800 bg-gray-900 px-3 py-5 md:flex">
        {/* Logo */}
        <button
          onClick={() => navigiere("dashboard")}
          className="mb-5 flex items-center gap-2.5 px-2 text-sm font-semibold tracking-tight text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-[13px] font-bold text-white shadow-sm">
            O
          </span>
          <span className="text-white/90">OS</span>
        </button>

        {/* Suche */}
        <button
          onClick={() => setSucheOffen(true)}
          className="mb-2 flex items-center gap-2.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-200"
        >
          <NavIcon className="h-[16px] w-[16px] shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </NavIcon>
          Suchen
          <span className="ml-auto rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-500">
            ⌘K
          </span>
        </button>

        {/* Wochenrückblick */}
        <button
          onClick={() => navigiere("review")}
          className={`mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            seite === "review"
              ? "bg-indigo-500/20 font-medium text-indigo-300"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          }`}
        >
          <NavIcon className="h-[16px] w-[16px] shrink-0">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </NavIcon>
          Wochenrückblick
        </button>

        {/* Hauptnavigation */}
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Navigation
        </p>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => navigiere(item.key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                seite === item.key
                  ? "bg-indigo-500/20 font-medium text-indigo-300"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <NavIcon className="h-[16px] w-[16px] shrink-0">
                {item.icon}
              </NavIcon>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Abmelden */}
        {cloudAktiv && session && (
          <button
            onClick={abmelden}
            className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-300"
          >
            <NavIcon className="h-[16px] w-[16px] shrink-0">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
            </NavIcon>
            Abmelden
          </button>
        )}
      </aside>

      {/* Mobile-Kopfzeile */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => navigiere("dashboard")}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500 text-[11px] font-bold text-white">
            O
          </span>
          OS
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigiere("review")}
            title="Wochenrückblick"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <NavIcon className="h-[18px] w-[18px]">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </NavIcon>
          </button>
          <button
            onClick={() => setSucheOffen(true)}
            title="Suchen"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <NavIcon className="h-[18px] w-[18px]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </NavIcon>
          </button>
          {cloudAktiv && session && (
            <button
              onClick={abmelden}
              className="rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Abmelden
            </button>
          )}
        </div>
      </header>

      {/* Inhalt */}
      <main className="pb-24 md:pb-10 md:pl-60">
        {seite === "dashboard" && <Dashboard onNavigate={navigiere} />}
        {seite === "kalender" && <KalenderSeite />}
        {seite === "todos" && <TodosSeite />}
        {seite === "sammeln" && <SammelnSeite onNavigate={navigiere} />}
        {seite === "habits" && <HabitsSeite />}
        {seite === "deepwork" && <DeepWorkSeite />}
        {seite === "projekte" && <OrdnerSeite startProjektId={param} />}
        {seite === "review" && <ReviewSeite onNavigate={navigiere} />}
      </main>

      {sucheOffen && (
        <Suche onNavigate={navigiere} onClose={() => setSucheOffen(false)} />
      )}

      {/* Tab-Leiste – nur Mobil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => navigiere(item.key)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              seite === item.key
                ? "font-medium text-indigo-600"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <NavIcon className="h-5 w-5">{item.icon}</NavIcon>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
