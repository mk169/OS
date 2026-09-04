import { expect, test } from "@playwright/test"

// Oberflächen-Tests: Sie decken die Wege ab, die man beim Benutzen wirklich
// geht – Einrichtung, etwas anlegen, etwas abhaken, wiederfinden. Die
// Rechnung dahinter prüfen die Unit-Tests in src/lib; hier geht es darum,
// dass die Seiten zusammenspielen und nichts beim Laden zerbricht.

// Frisch eingerichtete App mit allen Bereichen – überspringt das Onboarding.
async function appMitAllenBereichen(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: [
          "dashboard", "lockedin", "kalender", "todos", "sammeln", "habits",
          "vitalitaet", "deepwork", "projekte", "periode", "finanzen",
          "beruf", "leisure", "dailyops",
        ],
        appName: "OS",
        startseite: "dashboard",
        akzent: "indigo",
        stil: "todo",
      })
    )
  })
  await page.goto("/")
}

// Fehler in der Konsole und ungefangene Ausnahmen sammeln.
function fehlerWaechter(page) {
  const fehler = []
  page.on("pageerror", (e) => fehler.push(`pageerror: ${e.message}`))
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("net::")) fehler.push(m.text())
  })
  return fehler
}

test("Einrichtungsassistent führt in die App", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await page.goto("/")
  await expect(page.getByText("Willkommen")).toBeVisible()
  await page.getByRole("button", { name: /Loslegen/ }).click()
  await page.getByText("Komplett", { exact: true }).click()
  await page.getByRole("button", { name: /Weiter/ }).click()
  await page.getByRole("button", { name: /Fertig/ }).click()
  await expect(page.getByRole("button", { name: "Start", exact: true }).first()).toBeVisible()
  expect(fehler).toEqual([])
})

test("jeder Bereich lässt sich öffnen", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)

  // Die Gruppe „Leben" ist standardmäßig eingeklappt.
  await page.locator("aside button").filter({ hasText: "LEBEN" }).first().click()

  const bereiche = [
    ["Locked In", /Locked In/],
    ["Kalender", /Kalender/],
    ["Todos", /offene Aufgaben/],
    ["Sammeln", /Ordner/],
    ["Habits", /Habits/],
    ["Daily Operations", /Daily Operations/],
    ["Fokus", /Deep Work/],
    ["Projekte", /Projekte/],
    ["Periode", /Periode/],
    ["Beruf & Karriere", /Beruf & Karriere/],
    ["Vitalität", /Vitalität/],
    ["Finanzen", /Finanzen/],
    ["Leisure & Kultur", /Leisure & Kultur/],
    ["Wochenrückblick", /Wochenrückblick/],
  ]
  for (const [name, erwartet] of bereiche) {
    await page.getByRole("button", { name, exact: true }).first().click()
    await expect(page.locator("main")).toContainText(erwartet)
  }
  expect(fehler).toEqual([])
})

test("Todo anlegen, erkennen lassen und wiederfinden", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Todos", exact: true }).first().click()

  await page.getByTitle(/Todo erstellen/).first().click()
  await page.getByPlaceholder(/benennen/).fill("Abgabe vorbereiten morgen")

  // Der Vorschlag aus der Datums-Erkennung lässt sich übernehmen.
  const vorschlag = page.getByRole("button", { name: /Erkannt/ })
  await expect(vorschlag).toBeVisible()
  await vorschlag.click()
  await page.getByRole("button", { name: "Erstellen" }).click()

  await expect(page.locator("main")).toContainText("Abgabe vorbereiten morgen")
  await expect(page.locator("main")).toContainText("morgen")

  // Und die globale Suche findet es wieder.
  await page.keyboard.press("Control+k")
  await page.locator('input[placeholder^="Suchen"]').fill("Abgabe")
  await expect(page.locator("div.fixed.inset-0.z-50")).toContainText("Abgabe vorbereiten")
  expect(fehler).toEqual([])
})

test("Routine anlegen, abhaken und auf der Startseite wiedersehen", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Daily Operations", exact: true }).first().click()

  await page.getByRole("button", { name: "Routinen verwalten" }).click()
  await page.getByPlaceholder(/Routine, z.B./).fill("Morgenroutine")
  await page.getByRole("button", { name: "Anlegen" }).click()
  await page.getByPlaceholder("+ Schritt").first().fill("Wasser trinken")
  await page.keyboard.press("Enter")
  await page.getByRole("button", { name: "Fertig" }).click()

  await expect(page.locator("main")).toContainText("Morgenroutine")
  await expect(page.locator("main")).toContainText("0/1")

  await page.locator('main input[type="checkbox"]').first().check()
  await expect(page.locator("main")).toContainText("1/1")

  // Der Stand überlebt das Neuladen …
  await page.reload()
  await page.getByRole("button", { name: "Daily Operations", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("1/1")

  // … und die Startseite zeigt dieselbe Routine.
  await page.getByRole("button", { name: "Start", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("Morgenroutine")
  expect(fehler).toEqual([])
})

test("Bewerbung durchläuft die Pipeline", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Beruf & Karriere", exact: true }).first().click()

  await page.getByRole("button", { name: "+ Bewerbung" }).click()
  await page.getByPlaceholder("Firma").fill("Institut für Statistik")
  await page.getByPlaceholder(/Rolle/).fill("Werkstudent")
  await page.getByRole("button", { name: "Anlegen" }).click()

  await expect(page.locator("main")).toContainText("Institut für Statistik")
  await page.locator("main select").first().selectOption("gespraech")
  await expect(page.locator("main")).toContainText("Im Gespräch · 1")
  expect(fehler).toEqual([])
})

test("Daten-Export erzeugt ein vollständiges Backup", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByTitle("Einstellungen").last().click()
  await expect(page.locator("main")).toContainText("Einstellungen")
  await expect(page.locator("main")).toContainText(/Version/)
  expect(fehler).toEqual([])
})

test("läuft nach dem ersten Besuch auch ohne Netz", async ({ page, context }) => {
  await appMitAllenBereichen(page)
  await expect(page.locator("main")).toContainText("Guten")

  // Warten, bis der Service Worker die Seite kontrolliert und der Build
  // im Cache liegt.
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
    timeout: 15_000,
  })
  await page.waitForFunction(async () => {
    const namen = await caches.keys()
    if (namen.length === 0) return false
    const schluessel = await (await caches.open(namen[0])).keys()
    return schluessel.length > 0
  }, null, { timeout: 15_000 })

  // Netz weg – die App muss trotzdem starten und bedienbar sein.
  // `domcontentloaded` statt `load`: Die dekorativen Google-Fonts liegen
  // bewusst nicht im Cache und fehlen offline – die App fällt dann auf die
  // System-Schriften zurück, das darf den Test nicht scheitern lassen.
  await context.setOffline(true)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("main")).toContainText("Guten")
  await page.getByRole("button", { name: "Todos", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("offene Aufgaben")

  await context.setOffline(false)
})
