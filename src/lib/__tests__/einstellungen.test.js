import { describe, expect, it } from "vitest"
import { EINSTELLUNGEN_STANDARD, STANDARD_SEITEN } from "../einstellungen"
import { PROFILE } from "../profile"
import { STILE, normalisiereStil } from "../stil"
import { AKZENTE } from "../akzent"

describe("Einstellungs-Standard", () => {
  it("startet auf dem Dashboard und mit gültigen Werten", () => {
    expect(EINSTELLUNGEN_STANDARD.startseite).toBe("dashboard")
    expect(AKZENTE[EINSTELLUNGEN_STANDARD.akzent]).toBeDefined()
    expect(STILE.some((s) => s.id === EINSTELLUNGEN_STANDARD.stil)).toBe(true)
  })

  it("hat das Dashboard an erster Stelle und keine Dubletten", () => {
    expect(STANDARD_SEITEN[0]).toBe("dashboard")
    expect(new Set(STANDARD_SEITEN).size).toBe(STANDARD_SEITEN.length)
  })
})

describe("Profile", () => {
  it("haben eindeutige IDs", () => {
    const ids = PROFILE.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("zeigen im Profil 'Komplett' wirklich alle Bereiche", () => {
    const komplett = PROFILE.find((p) => p.id === "komplett")
    expect(komplett.seiten).toEqual(STANDARD_SEITEN)
  })

  it("listen nur bekannte Bereiche", () => {
    for (const profil of PROFILE) {
      for (const key of profil.seiten) {
        expect(STANDARD_SEITEN).toContain(key)
      }
    }
  })

  it("wählen als Startseite einen Bereich, den sie auch zeigen", () => {
    for (const profil of PROFILE) {
      if (!profil.startseite) continue
      expect(profil.seiten).toContain(profil.startseite)
    }
  })

  it("benennen, wenn gesetzt, einen vorhandenen Stil", () => {
    for (const profil of PROFILE) {
      if (!profil.stil) continue
      expect(normalisiereStil(profil.stil)).toBe(profil.stil)
    }
  })
})
