import { Component } from "react"
import { lokaleDaten } from "../lib/useStored"

// Auffangnetz für Render-Fehler. React hängt bei einem Fehler den gesamten
// Baum ab – ohne Grenze bleibt eine weiße Seite zurück, und weil sämtliche
// Daten dieser App im localStorage liegen, käme man auch über die
// Einstellungen nicht mehr an sie heran. Genau dafür ist diese Seite da:
// Sie erklärt, was passiert ist, lässt ein Backup herunterladen und bietet
// als letzten Ausweg das Zurücksetzen an.
//
// Bewusst eine Klasse: Fehlergrenzen gibt es in React bis heute nur so.
export default class Fehlergrenze extends Component {
  constructor(props) {
    super(props)
    this.state = { fehler: null }
  }

  static getDerivedStateFromError(fehler) {
    return { fehler }
  }

  componentDidCatch(fehler, info) {
    // In der Konsole bleibt der volle Stack – für die Fehlersuche.
    console.error("Unbehandelter Fehler:", fehler, info?.componentStack)
  }

  sichern = () => {
    try {
      const inhalt = JSON.stringify(
        { exportiert: new Date().toISOString(), daten: lokaleDaten() },
        null,
        2
      )
      const url = URL.createObjectURL(
        new Blob([inhalt], { type: "application/json" })
      )
      const a = document.createElement("a")
      a.href = url
      a.download = `os-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (fehler) {
      console.error("Backup fehlgeschlagen:", fehler)
    }
  }

  zuruecksetzen = () => {
    const sicher = window.confirm(
      "Alle lokal gespeicherten Daten löschen? Das lässt sich nicht rückgängig machen – sichere vorher ein Backup."
    )
    if (!sicher) return
    try {
      localStorage.clear()
    } catch {
      // Auch wenn das Löschen scheitert: neu laden ist der nächste Versuch.
    }
    window.location.reload()
  }

  render() {
    if (!this.state.fehler) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-2xl">🛟</p>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">
            Da ist etwas schiefgelaufen
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Die Ansicht konnte nicht aufgebaut werden. Deine Daten liegen
            weiterhin auf diesem Gerät – lade sie zur Sicherheit herunter,
            bevor du etwas anderes probierst.
          </p>
          <p className="mt-4 break-words rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
            {this.state.fehler?.message || String(this.state.fehler)}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Neu laden
            </button>
            <button
              onClick={this.sichern}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
            >
              Backup sichern
            </button>
          </div>

          <button
            onClick={this.zuruecksetzen}
            className="mt-4 text-xs text-gray-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-red-600"
          >
            Hilft alles nichts: Daten zurücksetzen
          </button>
        </div>
      </div>
    )
  }
}
