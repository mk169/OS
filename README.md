# OS

## Geräte koppeln (iPhone ↔ Mac ↔ …)

Die App synchronisiert deinen kompletten Zustand live zwischen allen Geräten,
sobald du eingeloggt bist. Dafür wird Supabase einmalig eingerichtet:

1. **Supabase-Projekt anlegen** auf [supabase.com](https://supabase.com) (kostenlos).
2. **Datenbank einrichten:** Im Dashboard → *SQL Editor* den Inhalt von
   [`supabase/schema.sql`](supabase/schema.sql) einfügen und *Run* klicken.
   (Legt die Tabelle `app_state`, die Sicherheitsregeln und Realtime an.)
3. **Zugangsdaten eintragen:** `.env.example` nach `.env.local` kopieren und
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` aus *Project Settings → API*
   einsetzen. Beim Deployment auf Vercel dieselben zwei Werte unter
   *Settings → Environment Variables* hinterlegen.
4. **Auf beiden Geräten mit demselben Account anmelden** (E-Mail + Passwort).
   Beim ersten Mal einmal *Registrieren* und den Bestätigungs-Link in der
   E-Mail anklicken – danach auf jedem weiteren Gerät nur noch *Anmelden*.

Fertig: Was du auf dem Mac änderst, erscheint sofort auf dem iPhone – und
umgekehrt. Ohne Supabase-Werte läuft die App weiter im lokalen Modus (kein
Login, keine Cloud, nur auf diesem einen Gerät).

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
