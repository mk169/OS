import { useCallback, useSyncExternalStore } from "react"
import { supabase, cloudAktiv } from "./supabase"

// Geteilter Speicher: Alle Komponenten mit demselben Schlüssel sehen
// Änderungen sofort. Als Basis dient localStorage (funktioniert offline
// und ohne Login). Ist Supabase konfiguriert und ein Nutzer angemeldet,
// werden die Daten zusätzlich in der Cloud gespeichert und zwischen
// Geräten live synchronisiert.

const speicher = new Map() // key -> { wert, hoerer: Set, geladen: bool }
let userId = null
let realtimeKanal = null
const speicherTimer = new Map()

function eintragFuer(key, fallback) {
  if (!speicher.has(key)) {
    let wert
    try {
      const raw = localStorage.getItem(key)
      wert = raw ? JSON.parse(raw) : fallback
    } catch {
      wert = fallback
    }
    speicher.set(key, { wert, hoerer: new Set(), geladen: false })
  }
  return speicher.get(key)
}

function benachrichtige(e) {
  e.hoerer.forEach((melde) => melde())
}

// Holt den Wert eines Schlüssels aus der Cloud. Existiert dort noch
// keiner, wird der lokale Stand hochgeladen (erste Synchronisierung).
async function ladeVonCloud(key) {
  if (!cloudAktiv || !userId) return
  const e = eintragFuer(key)
  const { data, error } = await supabase
    .from("app_state")
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle()
  if (error) {
    console.warn("Cloud-Laden fehlgeschlagen:", key, error.message)
    return
  }
  if (data && data.value != null) {
    e.wert = data.value
    localStorage.setItem(key, JSON.stringify(e.wert))
    benachrichtige(e)
  } else {
    speichereInCloud(key, e.wert)
  }
  e.geladen = true
}

// Speichert einen Wert in der Cloud – leicht verzögert, damit schnelles
// Tippen nicht bei jedem Zeichen eine Anfrage auslöst.
function speichereInCloud(key, wert) {
  if (!cloudAktiv || !userId) return
  clearTimeout(speicherTimer.get(key))
  speicherTimer.set(
    key,
    setTimeout(async () => {
      const { error } = await supabase.from("app_state").upsert(
        {
          user_id: userId,
          key,
          value: wert,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" }
      )
      if (error) console.warn("Cloud-Speichern fehlgeschlagen:", key, error.message)
    }, 500)
  )
}

// Wird nach Login/Logout aufgerufen: lädt alle bekannten Schlüssel aus
// der Cloud und abonniert Änderungen (für Live-Sync zwischen Geräten).
export async function setzeCloudSession(neuerUserId) {
  userId = neuerUserId
  if (!cloudAktiv) return

  if (realtimeKanal) {
    supabase.removeChannel(realtimeKanal)
    realtimeKanal = null
  }
  if (!userId) return

  await Promise.all([...speicher.keys()].map(ladeVonCloud))

  realtimeKanal = supabase
    .channel(`app_state_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_state",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new
        if (!row || !row.key) return
        const e = speicher.get(row.key)
        if (!e) return
        const neu = JSON.stringify(row.value)
        if (JSON.stringify(e.wert) !== neu) {
          e.wert = row.value
          localStorage.setItem(row.key, neu)
          benachrichtige(e)
        }
      }
    )
    .subscribe()
}

// Schreibt einen Store auch außerhalb von Komponenten (z.B. Migrationen).
export function schreibeStore(key, fallback, neu) {
  const e = eintragFuer(key, fallback)
  e.wert = typeof neu === "function" ? neu(e.wert) : neu
  localStorage.setItem(key, JSON.stringify(e.wert))
  benachrichtige(e)
  speichereInCloud(key, e.wert)
}

export default function useStored(key, fallback) {
  const eintrag = eintragFuer(key, fallback)

  const abonniere = useCallback(
    (melde) => {
      const e = eintragFuer(key, fallback)
      e.hoerer.add(melde)
      if (cloudAktiv && userId && !e.geladen) ladeVonCloud(key)
      return () => e.hoerer.delete(melde)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )

  const wert = useSyncExternalStore(abonniere, () => eintrag.wert)

  const setWert = useCallback(
    (neu) => {
      const e = eintragFuer(key, fallback)
      e.wert = typeof neu === "function" ? neu(e.wert) : neu
      localStorage.setItem(key, JSON.stringify(e.wert))
      benachrichtige(e)
      speichereInCloud(key, e.wert)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )

  return [wert, setWert]
}
