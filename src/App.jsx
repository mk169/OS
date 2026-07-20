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

export default function App() {
  const [seite, setSeite] = useState("dashboard")
  const [param, setParam] = useState(null)
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

  const zurueck = () => navigiere("dashboard")

  if (cloudAktiv && !authBereit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        Lädt…
      </div>
    )
  }
  if (cloudAktiv && !session) return <Login />

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <button
            onClick={zurueck}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-900 text-[11px] font-bold text-white">
              O
            </span>
            OS
          </button>
          {cloudAktiv && session && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Abmelden
            </button>
          )}
        </div>
      </header>

      <main>
        {seite === "dashboard" && <Dashboard onNavigate={navigiere} />}
        {seite === "kalender" && <KalenderSeite onBack={zurueck} />}
        {seite === "todos" && <TodosSeite onBack={zurueck} />}
        {seite === "habits" && <HabitsSeite onBack={zurueck} />}
        {seite === "deepwork" && <DeepWorkSeite onBack={zurueck} />}
        {seite === "projekte" && (
          <OrdnerSeite onBack={zurueck} startProjektId={param} />
        )}
      </main>
    </div>
  )
}
