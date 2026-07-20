import { createClient } from "@supabase/supabase-js"

// Zugangsdaten kommen aus .env.local (VITE_SUPABASE_URL,
// VITE_SUPABASE_ANON_KEY). Sind sie leer, läuft die App im lokalen
// Modus weiter – ganz ohne Login und Cloud.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudAktiv = Boolean(url && anonKey)
export const supabase = cloudAktiv ? createClient(url, anonKey) : null
