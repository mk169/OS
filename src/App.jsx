import { lazy, Suspense, useEffect, useState } from "react"
import { beiSpeicherFehler, schreibeStore, setzeCloudSession } from "./lib/useStored"
import useStored from "./lib/useStored"
import { supabase, cloudAktiv } from "./lib/supabase"
import { wendeAkzentAn } from "./lib/akzent"
import { normalisiereStil } from "./lib/stil"
import { navConfig, navSektionen, sektionOffen } from "./lib/navigation"
import { EINSTELLUNGEN_STANDARD } from "./lib/einstellungen"
import { lockedInAktiv, wendeModusAn } from "./lib/lockedin"
import Login from "./components/Login"
import Dashboard from "./components/Dashboard"
import Onboarding from "./components/Onboarding"
import KalenderSeite from "./components/KalenderSeite"
import TodosSeite from "./components/TodosSeite"
import OrdnerSeite from "./components/OrdnerSeite"
import { STANDARD_MODULE } from "./lib/projekte"

// Seiten werden erst geladen, wenn sie geöffnet werden. Das hält den ersten
// Start klein – gerade auf dem Handy, wo die App als PWA läuft. Fest im
// Hauptbündel bleiben der Einstieg (Login, Einrichtung, Startseite) und die
// drei Seiten, die andere Seiten ohnehin einbinden (Kalender, Todos,
// Projekte) – dort brächte ein Nachladen nichts.
const HabitsSeite = lazy(() => import("./components/HabitsSeite"))
const LockedInSeite = lazy(() => import("./components/LockedInSeite"))
const DeepWorkSeite = lazy(() => import("./components/DeepWorkSeite"))
const PeriodeSeite = lazy(() => import("./components/PeriodeSeite"))
const FinanzenSeite = lazy(() => import("./components/FinanzenSeite"))
const BerufSeite = lazy(() => import("./components/BerufSeite"))
const LeisureSeite = lazy(() => import("./components/LeisureSeite"))
const DailyOpsSeite = lazy(() => import("./components/DailyOpsSeite"))
const SammelnSeite = lazy(() => import("./components/SammelnSeite"))
const ReviewSeite = lazy(() => import("./components/ReviewSeite"))
const Einstellungen = lazy(() => import("./components/Einstellungen"))
const Suche = lazy(() => import("./components/Suche"))

// Liest einen Store roh aus dem localStorage – für die Migrationen, die
// laufen, bevor irgendeine Komponente den Schlüssel abonniert hat. Kaputtes
// JSON, ein gespeichertes "null" oder ein falscher Typ ergeben den Fallback.
function lies(key, fallback) {
  try {
    const wert = JSON.parse(localStorage.getItem(key) ?? "null")
    if (wert == null) return fallback
    if (Array.isArray(fallback) && !Array.isArray(wert)) return fallback
    return wert
  } catch {
    return fallback
  }
}

// Einmalige Migration: alte Kurse werden zu Projekten in einem
// „Uni“-Ordner. Die IDs bleiben erhalten, damit Todos, Karten und
// Inhalte weiter zugeordnet sind.
function migriereAlteKurse() {
  // Wie die übrigen Migrationen gegen kaputte Altdaten gekapselt: Ein
  // defekter Eintrag darf den Start nicht verhindern, sonst steht der
  // Nutzer vor einer weißen Seite, ohne an seine Daten zu kommen.
  const kurse = lies("kurse", [])
  if (kurse.length === 0) return

  const ordner = lies("ordner", [])
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

// Neu eingeführte Bereiche, die bestehenden Nutzern einmalig zur Navigation
// hinzugefügt werden. Pro Schlüssel nur einmal (Merker `bereicheErgaenzt`),
// damit ein späteres bewusstes Ausblenden erhalten bleibt.
const AUTO_BEREICHE = ["finanzen", "beruf", "leisure", "dailyops", "lockedin"]

// Der Mentor ist keine eigene Seite mehr – er steckt jetzt im
// Wochenrückblick. Bei bestehenden Nutzern den alten Eintrag aus der
// Navigation nehmen (und eine darauf zeigende Startseite umbiegen).
function migriereMentor() {
  const roh = localStorage.getItem("einstellungen")
  if (!roh) return
  try {
    const e = JSON.parse(roh)
    const seiten = e.sichtbareSeiten ?? []
    if (!seiten.includes("mentor") && e.startseite !== "mentor") return
    schreibeStore("einstellungen", {}, {
      ...e,
      sichtbareSeiten: seiten.filter((k) => k !== "mentor"),
      startseite: e.startseite === "mentor" ? "dashboard" : e.startseite,
    })
  } catch {
    /* defektes JSON – ignorieren */
  }
}

// Der Bereich „Lernen" bündelt Lernplan und Karteikarten eines Projekts.
// Bestehende Projekte mit Lernbezug – Inhalte, Karteikarten oder schon
// erzeugte Lernschritte – bekommen ihn einmalig eingefügt (Merker
// `lernbereichErgaenzt`), damit er nicht bei jedem Start zurückkommt, wenn
// jemand ihn bewusst entfernt.
function migriereLernbereich() {
  const roh = localStorage.getItem("einstellungen")
  if (!roh) return // Neue Nutzer erhalten den Bereich bereits im Standard.
  try {
    const e = JSON.parse(roh)
    if (e.lernbereichErgaenzt) return

    const lernDaten = [...lies("ablage", []), ...lies("karten", [])]
    const lernTodos = lies("todos", []).filter((t) => t.lernplan)
    const hatLernbezug = (id) =>
      [...lernDaten, ...lernTodos].some(
        (x) => x.projektId === id || x.kursId === id
      )

    schreibeStore("projekte", [], (projekte) =>
      (projekte ?? []).map((p) => {
        if ((p.typ ?? "projekt") === "area") return p
        const module = p.module ?? STANDARD_MODULE
        if (module.includes("lernen")) return p
        const relevant =
          module.includes("inhalte") ||
          module.includes("karten") ||
          hatLernbezug(p.id)
        if (!relevant) return p
        // Direkt hinter Inhalte bzw. Karteikarten einreihen – dort gehört
        // der Lernbereich thematisch hin.
        const nach = module.indexOf("inhalte")
        const ersatz = module.indexOf("karten")
        const pos = nach >= 0 ? nach + 1 : ersatz >= 0 ? ersatz + 1 : module.length
        return {
          ...p,
          module: [...module.slice(0, pos), "lernen", ...module.slice(pos)],
        }
      })
    )
    schreibeStore("einstellungen", {}, { ...e, lernbereichErgaenzt: true })
  } catch {
    /* defektes JSON – ignorieren */
  }
}

// „Vitalität" ist keine eigene Seite mehr – der Check-in sitzt jetzt als
// Reiter im Bereich „Alltag" (vormals Daily Operations). Bei bestehenden
// Nutzern den alten Eintrag aus der Navigation nehmen und eine darauf
// zeigende Startseite umbiegen. Die Daten (Store `vitalitaet`) bleiben.
function migriereVitalitaet() {
  const roh = localStorage.getItem("einstellungen")
  if (!roh) return
  try {
    const e = JSON.parse(roh)
    const seiten = e.sichtbareSeiten ?? []
    if (!seiten.includes("vitalitaet") && e.startseite !== "vitalitaet") return
    const ohne = seiten.filter((k) => k !== "vitalitaet")
    schreibeStore("einstellungen", {}, {
      ...e,
      // „Alltag" sichtbar lassen, damit der Check-in erreichbar bleibt.
      sichtbareSeiten: ohne.includes("dailyops") ? ohne : [...ohne, "dailyops"],
      startseite: e.startseite === "vitalitaet" ? "dailyops" : e.startseite,
    })
  } catch {
    /* defektes JSON – ignorieren */
  }
}

function migriereBereiche() {
  const roh = localStorage.getItem("einstellungen")
  if (!roh) return // Neue Nutzer erhalten bereits den vollständigen Standard.
  try {
    const e = JSON.parse(roh)
    // Alten Einzel-Merker `finanzenErgaenzt` übernehmen.
    const ergaenzt = new Set(
      e.bereicheErgaenzt ?? (e.finanzenErgaenzt ? ["finanzen"] : [])
    )
    let seiten = e.sichtbareSeiten ?? []
    let geaendert = false
    for (const key of AUTO_BEREICHE) {
      if (ergaenzt.has(key)) continue
      ergaenzt.add(key)
      if (!seiten.includes(key)) seiten = [...seiten, key]
      geaendert = true
    }
    if (geaendert) {
      schreibeStore("einstellungen", {}, {
        ...e,
        sichtbareSeiten: seiten,
        bereicheErgaenzt: [...ergaenzt],
      })
    }
  } catch {
    /* defektes JSON – ignorieren */
  }
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

// Zahnrad – führt zu den Einstellungen. Sie sind bewusst nur von der
// Startseite aus erreichbar (oben rechts) und belegen keinen Nav-Platz.
const ZAHNRAD = (
  <>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </>
)

// Hauptnavigation der App – als Sidebar (Desktop) und Tab-Leiste (Mobil).
const NAV = [
  {
    key: "dashboard",
    label: "Start",
    icon: <path d="M3 10.75 12 3l9 7.75M5 9.5V21h14V9.5" />,
  },
  {
    key: "lockedin",
    label: "Locked In",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
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
  {
    key: "periode",
    label: "Periode",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 6.5V12l3.5 2" />
      </>
    ),
  },
  {
    key: "finanzen",
    label: "Finanzen",
    icon: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 9v6M18 9v6" />
      </>
    ),
  },
  {
    key: "beruf",
    label: "Beruf & Karriere",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12.5h18" />
      </>
    ),
  },
  {
    key: "leisure",
    label: "Leisure & Kultur",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2" />
        <path d="M10 9v6l5-3-5-3Z" />
      </>
    ),
  },
  {
    key: "dailyops",
    label: "Alltag",
    icon: (
      <>
        <path d="M4 12a8 8 0 0 1 13.7-5.7M20 12a8 8 0 0 1-13.7 5.7" />
        <path d="M17 3.5V7h-3.5M7 20.5V17h3.5" />
      </>
    ),
  },
]

// Modul-Metadaten schnell per Schlüssel nachschlagen (für die Navigation
// in der vom Nutzer gewählten Reihenfolge).
const NAV_NACH_KEY = Object.fromEntries(NAV.map((n) => [n.key, n]))

export default function App() {
  const [einstellungen, setEinstellungen] = useStored("einstellungen", EINSTELLUNGEN_STANDARD)
  const [lockedInConfig] = useStored("lockedInConfig", {})
  // Startseite aus den Einstellungen – aber nur, wenn das Modul sichtbar ist.
  const [seite, setSeite] = useState(() => {
    const ziel = einstellungen?.startseite ?? "dashboard"
    const sichtbar = einstellungen?.sichtbareSeiten ?? []
    return ziel === "dashboard" || sichtbar.includes(ziel) ? ziel : "dashboard"
  })
  const [param, setParam] = useState(null)
  const [sucheOffen, setSucheOffen] = useState(false)
  const [mehrOffen, setMehrOffen] = useState(false)
  // Manuell auf-/zugeklappte Navigations-Gruppen (Schlüssel → offen?).
  // Nur für die laufende Sitzung; der Standard kommt aus den Einstellungen.
  const [offeneSektionen, setOffeneSektionen] = useState({})
  const [session, setSession] = useState(null)
  const [authBereit, setAuthBereit] = useState(!cloudAktiv)

  useEffect(() => {
    migriereAlteKurse()
    migriereBereiche()
    migriereMentor()
    migriereLernbereich()
    migriereVitalitaet()
  }, [])

  // Akzentfarbe live anwenden, wenn sie sich ändert (z. B. in den
  // Einstellungen). Läuft der Locked-In-Modus, weicht sie Grauwerten – die
  // Wahl selbst bleibt gespeichert und kommt danach unverändert zurück.
  useEffect(() => {
    wendeAkzentAn(einstellungen?.akzent, lockedInAktiv(lockedInConfig))
  }, [einstellungen?.akzent, lockedInConfig])

  // Solange der Modus scharf ist, trägt die ganze App den monochromen Look
  // (siehe `wendeModusAn` und den Skin in index.css).
  useEffect(() => {
    wendeModusAn(lockedInAktiv(lockedInConfig))
  }, [lockedInConfig])

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
    setMehrOffen(false)
  }

  useEffect(() => {
    function taste(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSucheOffen((o) => !o)
      }
    }
    window.addEventListener("keydown", taste)
    return () => window.removeEventListener("keydown", taste)
  }, [])

  // Wenn der Browser-Speicher voll ist, scheitert das Sichern lautlos mitten
  // in einer Eingabe. Ein Hinweis mit dem einzigen wirksamen Rat – Backup
  // ziehen, große Anhänge löschen – ist besser als verlorene Arbeit.
  const [speicherVoll, setSpeicherVoll] = useState(false)
  useEffect(() => beiSpeicherFehler(() => setSpeicherVoll(true)), [])

  if (cloudAktiv && !authBereit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        Lädt…
      </div>
    )
  }
  if (cloudAktiv && !session) return <Login />

  // Onboarding beim ersten Start
  if (!einstellungen?.onboardingAbgeschlossen) {
    return (
      <Onboarding
        onFertig={(startseite) => {
          setEinstellungen((e) => ({ ...e, onboardingAbgeschlossen: true }))
          if (startseite) navigiere(startseite)
        }}
      />
    )
  }

  const abmelden = () => supabase.auth.signOut()
  const appName = einstellungen?.appName || "OS"
  const sichtbareSeiten = einstellungen?.sichtbareSeiten ?? EINSTELLUNGEN_STANDARD.sichtbareSeiten
  // Navigation in der vom Nutzer gewählten Reihenfolge aufbauen. Dashboard ist
  // immer zuerst dabei; Review und Einstellungen kommen separat.
  const lockedInLaeuft = lockedInAktiv(lockedInConfig)
  const sichtbareNav = [
    NAV_NACH_KEY.dashboard,
    ...sichtbareSeiten
      .filter((key) => key !== "dashboard" && NAV_NACH_KEY[key])
      .map((key) => NAV_NACH_KEY[key]),
  ]
  // Auf dem Handy passen nur wenige Tabs auf die Leiste: die ersten vier
  // Module als feste Tabs, alles Weitere über den Ansichts-Wechsler.
  const PRIMAER_MAX = 4
  // Locked In belegt einen der wenigen Handy-Tabs nur, solange der Modus
  // wirklich läuft. Ist er aus, bleibt der Bereich über den Wechsler
  // erreichbar – die Leiste zeigt dann die Seiten für den Alltag.
  const tabNav = sichtbareNav.filter(
    (n) => n.key !== "lockedin" || lockedInLaeuft || seite === "lockedin"
  )
  const primaereNav = tabNav.slice(0, PRIMAER_MAX)
  const mobileKolonnen = primaereNav.length + 1
  // Gruppierung/Einklappen der Navigation (Einstellungen → Navigation).
  const navCfg = navConfig(einstellungen)
  // Sidebar und mobiler Wechsler zeigen dieselben Sektionen: Der Wechsler
  // listet *alle* Ansichten, nicht nur die ohne eigenen Tab – so kommt man
  // von jeder Seite aus mit zwei Tipps überall hin.
  const sektionen = navSektionen(sichtbareNav, navCfg)
  // Titel der aktuellen Ansicht für den Wechsler in der Kopfzeile.
  const aktuelleAnsicht =
    NAV_NACH_KEY[seite]?.label ??
    (seite === "review" ? "Wochenrückblick" : seite === "einstellungen" ? "Einstellungen" : appName)
  const istOffen = (sektion) =>
    sektionOffen(sektion, { offeneSektionen, aktiveSeite: seite, config: navCfg })
  const sektionUmschalten = (sektion) =>
    setOffeneSektionen((o) => ({ ...o, [sektion.key]: !istOffen(sektion) }))
  // Locked-In-Look: die App-Hülle (Kopfzeile, Tab-Leiste, Hintergrund) zieht in
  // den monochromen Look mit – auf der Locked-In-Kommandozentrale immer, auf der
  // Habits-Seite nur, wenn dort der Locked-In-Stil aktiv ist. So wird der
  // schwarze Screen nie von hellem Chrome mit farbigem Akzent umrahmt.
  // Wann trägt die Hülle (Kopfzeile, Tab-Leiste, Grund) den monochromen Look?
  //   • auf der Locked-In-Kommandozentrale selbst – immer,
  //   • solange der Modus scharf geschaltet ist – app-weit, passend zum
  //     Palette-Skin in index.css,
  //   • im Locked-In-Stil auf den drei Seiten, die eine eigene schwarze
  //     Fassung haben.
  const LOCKED_IN_SEITEN = ["dashboard", "todos", "habits"]
  const lockedInSeite =
    seite === "lockedin" ||
    lockedInLaeuft ||
    (normalisiereStil(einstellungen?.stil) === "lockedin" &&
      LOCKED_IN_SEITEN.includes(seite))

  return (
    <div
      className={`min-h-screen ${
        lockedInSeite ? "bg-black text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {speicherVoll && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-red-600 px-4 py-2 text-center text-xs font-medium text-white">
          <span>
            Speicher voll – neue Änderungen werden nicht gesichert. Sichere ein
            Backup und lösche große Anhänge.
          </span>
          <button
            onClick={() => setSpeicherVoll(false)}
            className="underline underline-offset-2"
          >
            Ausblenden
          </button>
        </div>
      )}

      {/* ── Desktop-Sidebar ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r px-3 py-5 md:flex ${
          lockedInSeite
            ? "border-white/10 bg-black"
            : "border-gray-800 bg-gray-900"
        }`}
      >
        {/* Logo / App-Name */}
        <button
          onClick={() => navigiere("dashboard")}
          className="mb-5 flex items-center gap-2.5 px-2 text-sm font-semibold tracking-tight text-white"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-[13px] font-bold text-white shadow-sm">
            {appName[0]?.toUpperCase() ?? "O"}
          </span>
          <span className="truncate text-white/90">{appName}</span>
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
          <span className="ml-auto rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-500">⌘K</span>
        </button>

        {/* Wochenrückblick */}
        <button
          onClick={() => navigiere("review")}
          className={`mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            seite === "review"
              ? "bg-accent-500/20 font-medium text-accent-300"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          }`}
        >
          <NavIcon className="h-[16px] w-[16px] shrink-0">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </NavIcon>
          Wochenrückblick
        </button>

        {/* Hauptnavigation – je nach Einstellung flach oder nach Gruppen */}
        <nav className="flex flex-1 flex-col overflow-y-auto">
          {sektionen.map((sektion) => {
            const offen = istOffen(sektion)
            return (
              <div key={sektion.key} className="mb-1.5 last:mb-0">
                {sektion.label ? (
                  <SektionsKopf
                    label={sektion.label}
                    anzahl={sektion.items.length}
                    offen={offen}
                    onClick={() => sektionUmschalten(sektion)}
                  />
                ) : (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                    Navigation
                  </p>
                )}
                {offen && (
                  <div className="flex flex-col gap-0.5">
                    {sektion.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => navigiere(item.key)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                          seite === item.key
                            ? "bg-accent-500/20 font-medium text-accent-300"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        }`}
                      >
                        <NavIcon className="h-[16px] w-[16px] shrink-0">{item.icon}</NavIcon>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Abmelden – die Einstellungen sitzen bewusst nur auf der Startseite
            (Zahnrad oben rechts) und belegen hier keinen Navigations-Platz. */}
        {cloudAktiv && session && (
          <div className="mt-2 border-t border-gray-800 pt-2">
            <button
              onClick={abmelden}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-300"
            >
              <NavIcon className="h-[16px] w-[16px] shrink-0">
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
              </NavIcon>
              Abmelden
            </button>
          </div>
        )}
      </aside>

      {/* ── Mobile-Kopfzeile ────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:hidden ${
          lockedInSeite
            ? "border-white/10 bg-black/90"
            : "border-gray-200 bg-white/90"
        }`}
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {/* Logo → Start */}
        <button
          onClick={() => navigiere("dashboard")}
          title={appName}
          className="shrink-0"
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${
              lockedInSeite ? "bg-white text-black" : "bg-accent-500 text-white"
            }`}
          >
            {appName[0]?.toUpperCase() ?? "O"}
          </span>
        </button>

        {/* Ansichts-Wechsler: zeigt, wo man ist, und führt überallhin */}
        <button
          onClick={() => setMehrOffen(true)}
          aria-haspopup="dialog"
          aria-expanded={mehrOffen}
          className={`mx-2 flex min-w-0 flex-1 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold tracking-tight transition-colors ${
            lockedInSeite ? "hover:bg-white/10" : "hover:bg-gray-100"
          }`}
        >
          <span className="truncate">{aktuelleAnsicht}</span>
          <NavIcon
            className={`h-4 w-4 shrink-0 transition-transform ${
              mehrOffen ? "rotate-180" : ""
            } ${lockedInSeite ? "text-white/40" : "text-gray-400"}`}
          >
            <path d="m6 9 6 6 6-6" />
          </NavIcon>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setSucheOffen(true)}
            title="Suchen"
            className={`rounded-lg p-1.5 transition-colors ${
              lockedInSeite
                ? "text-white/50 hover:bg-white/10 hover:text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <NavIcon className="h-[18px] w-[18px]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </NavIcon>
          </button>
          {/* Einstellungen: bewusst nur auf der Startseite */}
          {seite === "dashboard" && (
            <button
              onClick={() => navigiere("einstellungen")}
              title="Einstellungen"
              className={`rounded-lg p-1.5 transition-colors ${
                lockedInSeite
                  ? "text-white/50 hover:bg-white/10 hover:text-white"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              <NavIcon className="h-[18px] w-[18px]">{ZAHNRAD}</NavIcon>
            </button>
          )}
        </div>
      </header>

      {/* ── Inhalt ──────────────────────────────────────────────── */}
      <main className="relative pb-24 md:pb-10 md:pl-60">
        {/* Einstellungen am Desktop: nur auf der Startseite, oben rechts.
            Schwebt über dem Inhalt, damit jeder Dashboard-Stil sie bekommt. */}
        {seite === "dashboard" && (
          <button
            onClick={() => navigiere("einstellungen")}
            title="Einstellungen"
            className={`absolute right-5 top-6 z-10 hidden rounded-lg p-2 transition-colors md:block ${
              lockedInSeite
                ? "text-white/40 hover:bg-white/10 hover:text-white"
                : "text-gray-400 hover:bg-gray-200/70 hover:text-gray-700"
            }`}
          >
            <NavIcon className="h-[18px] w-[18px]">{ZAHNRAD}</NavIcon>
          </button>
        )}
        <Suspense fallback={<Ladehinweis dunkel={lockedInSeite} />}>
        {seite === "dashboard" && <Dashboard onNavigate={navigiere} />}
        {seite === "lockedin" && <LockedInSeite onNavigate={navigiere} />}
        {seite === "kalender" && <KalenderSeite />}
        {seite === "todos" && <TodosSeite />}
        {seite === "sammeln" && (
          <SammelnSeite
            onNavigate={navigiere}
            startAnsicht={typeof param === "string" ? param : null}
            startWissenId={
              param && typeof param === "object" ? param.wissenId : null
            }
          />
        )}
        {seite === "habits" && <HabitsSeite />}
        {seite === "deepwork" && <DeepWorkSeite />}
        {seite === "projekte" && (
          <OrdnerSeite
            startProjektId={
              param && typeof param === "object" ? param.projektId : param
            }
            startNotizId={
              param && typeof param === "object" ? param.notizId : null
            }
            startModul={param && typeof param === "object" ? param.modul : null}
            onNavigate={navigiere}
          />
        )}
        {seite === "periode" && <PeriodeSeite onNavigate={navigiere} />}
        {seite === "finanzen" && <FinanzenSeite />}
        {seite === "beruf" && <BerufSeite />}
        {seite === "leisure" && <LeisureSeite />}
        {seite === "dailyops" && <DailyOpsSeite />}
        {seite === "review" && <ReviewSeite onNavigate={navigiere} />}
        {seite === "einstellungen" && <Einstellungen />}
        </Suspense>
      </main>

      {sucheOffen && (
        <Suspense fallback={null}>
          <Suche onNavigate={navigiere} onClose={() => setSucheOffen(false)} />
        </Suspense>
      )}

      {/* ── Mobiler Ansichts-Wechsler ───────────────────────────── */}
      {mehrOffen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMehrOffen(false)}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-white p-3 shadow-2xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" />
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Ansicht wechseln
            </p>
            {sektionen.map((sektion) => {
              const offen = istOffen(sektion)
              return (
                <div key={sektion.key} className="mb-1 last:mb-0">
                  {sektion.label && (
                    <SheetSektionsKopf
                      label={sektion.label}
                      anzahl={sektion.items.length}
                      offen={offen}
                      onClick={() => sektionUmschalten(sektion)}
                    />
                  )}
                  {offen && (
                    <div className="grid grid-cols-4 gap-1">
                      {sektion.items.map((item) => (
                        <SheetKnopf
                          key={item.key}
                          aktiv={seite === item.key}
                          onClick={() => navigiere(item.key)}
                          label={item.label}
                          icon={item.icon}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {/* Kein Einstellungen-Eintrag: die sitzen auf der Startseite
                oben rechts. */}
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              App
            </p>
            <div className="grid grid-cols-4 gap-1">
              <SheetKnopf
                aktiv={seite === "review"}
                onClick={() => navigiere("review")}
                label="Rückblick"
                icon={<path d="M4 7h16M4 12h16M4 17h10" />}
              />
              {cloudAktiv && session && (
                <SheetKnopf
                  onClick={() => { setMehrOffen(false); abmelden() }}
                  label="Abmelden"
                  icon={<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Tab-Leiste ───────────────────────────────────── */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid border-t backdrop-blur md:hidden ${
          lockedInSeite ? "border-white/10 bg-black/95" : "border-gray-200 bg-white/95"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          gridTemplateColumns: `repeat(${mobileKolonnen}, minmax(0, 1fr))`,
        }}
      >
        {primaereNav.map((item) => (
          <button
            key={item.key}
            onClick={() => navigiere(item.key)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              seite === item.key
                ? lockedInSeite
                  ? "font-medium text-white"
                  : "font-medium text-accent-600"
                : lockedInSeite
                  ? "text-white/40 hover:text-white/80"
                  : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <NavIcon className="h-5 w-5">{item.icon}</NavIcon>
            {item.label}
          </button>
        ))}
        <button
          onClick={() => setMehrOffen(true)}
          className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
            mehrOffen || !primaereNav.some((n) => n.key === seite)
              ? lockedInSeite
                ? "font-medium text-white"
                : "font-medium text-accent-600"
              : lockedInSeite
                ? "text-white/40 hover:text-white/80"
                : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <NavIcon className="h-5 w-5">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </NavIcon>
          Mehr
        </button>
      </nav>
    </div>
  )
}

// Platzhalter, solange eine Seite nachgeladen wird. Bewusst schlicht und
// ohne Sprung im Layout – meist ist sie so schnell da, dass man ihn nicht
// sieht.
function Ladehinweis({ dunkel }) {
  return (
    <div
      className={`flex min-h-[60vh] items-center justify-center text-sm ${
        dunkel ? "text-white/40" : "text-gray-400"
      }`}
    >
      Lädt…
    </div>
  )
}

// Gruppen-Überschrift in der Desktop-Sidebar. Klappt die Gruppe auf und zu;
// im zugeklappten Zustand zeigt sie, wie viele Einträge darunter liegen.
function SektionsKopf({ label, anzahl, offen, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={offen}
      className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600 transition-colors hover:text-gray-400"
    >
      <NavIcon
        className={`h-3 w-3 shrink-0 transition-transform ${offen ? "" : "-rotate-90"}`}
      >
        <path d="m6 9 6 6 6-6" />
      </NavIcon>
      <span className="truncate">{label}</span>
      {!offen && <span className="ml-auto text-gray-700">{anzahl}</span>}
    </button>
  )
}

// Gruppen-Überschrift im mobilen „Mehr"-Sheet (heller Hintergrund).
function SheetSektionsKopf({ label, anzahl, offen, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={offen}
      className="flex w-full items-center gap-1.5 px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-600"
    >
      <NavIcon
        className={`h-3 w-3 shrink-0 transition-transform ${offen ? "" : "-rotate-90"}`}
      >
        <path d="m6 9 6 6 6-6" />
      </NavIcon>
      <span className="truncate">{label}</span>
      {!offen && <span className="ml-auto text-gray-300">{anzahl}</span>}
    </button>
  )
}

// Kachel-Knopf im mobilen „Mehr"-Sheet.
function SheetKnopf({ aktiv, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-medium transition-colors ${
        aktiv ? "bg-accent-50 text-accent-600" : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      <NavIcon className="h-5 w-5">{icon}</NavIcon>
      <span className="max-w-full truncate">{label}</span>
    </button>
  )
}
