import { useState } from "react"
import { supabase } from "../lib/supabase"

// Einfacher Login mit E-Mail und Passwort. „Registrieren“ legt einen
// neuen Account an, „Anmelden“ meldet einen bestehenden an.

export default function Login() {
  const [modus, setModus] = useState("anmelden")
  const [email, setEmail] = useState("")
  const [passwort, setPasswort] = useState("")
  const [meldung, setMeldung] = useState("")
  const [laden, setLaden] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    setMeldung("")
    setLaden(true)
    const fn =
      modus === "anmelden"
        ? supabase.auth.signInWithPassword({ email, password: passwort })
        : supabase.auth.signUp({ email, password: passwort })
    const { error } = await fn
    setLaden(false)
    if (error) {
      setMeldung(error.message)
    } else if (modus === "registrieren") {
      setMeldung(
        "Fast geschafft: Bitte bestätige den Link in der E-Mail, dann kannst du dich anmelden."
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-xl font-semibold tracking-tight">OS</h1>
        <p className="mt-1 text-center text-sm text-gray-400">
          {modus === "anmelden"
            ? "Melde dich an, um deine Daten auf allen Geräten zu sehen."
            : "Erstelle deinen Account."}
        </p>

        <form
          onSubmit={absenden}
          className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-5"
        >
          <label className="flex flex-col text-xs text-gray-500">
            E-Mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            Passwort
            <input
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              required
              minLength={6}
              autoComplete={
                modus === "anmelden" ? "current-password" : "new-password"
              }
              className="mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </label>

          {meldung && <p className="text-xs text-gray-600">{meldung}</p>}

          <button
            type="submit"
            disabled={laden}
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {laden
              ? "Moment…"
              : modus === "anmelden"
                ? "Anmelden"
                : "Registrieren"}
          </button>
        </form>

        <button
          onClick={() =>
            setModus(modus === "anmelden" ? "registrieren" : "anmelden")
          }
          className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-900"
        >
          {modus === "anmelden"
            ? "Noch kein Account? Registrieren"
            : "Schon einen Account? Anmelden"}
        </button>
      </div>
    </div>
  )
}
