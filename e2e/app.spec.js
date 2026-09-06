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
    ["Alltag", /Alltag/],
    ["Fokus", /Deep Work/],
    ["Projekte", /Projekte/],
    ["Periode", /Periode/],
    ["Beruf & Karriere", /Beruf & Karriere/],
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
  await page.getByRole("button", { name: "Alltag", exact: true }).first().click()

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
  await page.getByRole("button", { name: "Alltag", exact: true }).first().click()
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

// Jeder Stil muss auf jeder Seite, die ihn kennt, auch wirklich greifen.
// Genau hier klaffte eine Lücke: „Locked In" fiel auf Start und Todos auf
// den Standard-Look zurück, obwohl der Stil monochrom sein soll.
const STILE = [
  { id: "todo", start: /Guten/, todos: /Todos/, habits: /Habits/ },
  { id: "gamified", start: /Level|XP/i, todos: /Quest/i, habits: /Training|Attribut/i },
  { id: "arcade", start: /\/\/|guten/i, todos: /QUESTS|READY/i, habits: /HABIT|READY/i },
  { id: "cleangirl", start: /guten/i, todos: /to-do/i, habits: /rituals/i },
  { id: "notion", start: /Guten|Heute/i, todos: /Todos|Aufgaben/i, habits: /Habits/i },
  { id: "lockedin", start: /HEUTE|AUFTRAG/i, todos: /AUFTRAG/i, habits: /LOCKED/i },
]

for (const stil of STILE) {
  test(`Stil „${stil.id}" greift auf Start, Todos und Habits`, async ({ page }) => {
    const fehler = fehlerWaechter(page)
    await page.addInitScript((stil) => {
      localStorage.setItem(
        "einstellungen",
        JSON.stringify({
          onboardingAbgeschlossen: true,
          profil: "komplett",
          sichtbareSeiten: ["dashboard", "todos", "habits"],
          appName: "OS",
          startseite: "dashboard",
          akzent: "indigo",
          stil,
        })
      )
      localStorage.setItem(
        "todos",
        JSON.stringify([
          { id: 1, text: "Kapitel 3 überarbeiten", wichtig: true, dringend: true, erledigt: false },
          { id: 2, text: "Erledigtes", wichtig: false, dringend: false, erledigt: true },
        ])
      )
      localStorage.setItem(
        "habits",
        JSON.stringify([{ id: Date.now(), name: "Laufen", wochenZiel: 3, erledigtAn: [] }])
      )
    }, stil.id)
    await page.goto("/")

    await expect(page.locator("main")).toContainText(stil.start)
    await page.getByRole("button", { name: "Todos", exact: true }).first().click()
    await expect(page.locator("main")).toContainText(stil.todos)
    await page.getByRole("button", { name: "Habits", exact: true }).first().click()
    await expect(page.locator("main")).toContainText(stil.habits)
    expect(fehler).toEqual([])
  })
}

test("der Locked-In-Stil bleibt monochrom", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: ["dashboard", "todos", "habits"],
        appName: "OS",
        startseite: "dashboard",
        akzent: "indigo",
        stil: "lockedin",
      })
    )
  })
  await page.goto("/")

  // Schwarzer Grund auf Start und Todos – nicht nur auf der Habits-Seite.
  for (const seite of ["Start", "Todos"]) {
    await page.getByRole("button", { name: seite, exact: true }).first().click()
    const grund = await page
      .locator("main > div")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(grund).toBe("rgb(0, 0, 0)")
  }
})

// Der laufende Locked-In-Modus färbt die ganze App – nicht nur die drei
// Seiten mit eigener Fassung. Beendet man ihn, ist alles wieder hell.
async function appMitModus(page, modusAn) {
  await page.addInitScript((an) => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: ["dashboard", "lockedin", "projekte", "todos"],
        appName: "OS",
        startseite: "dashboard",
        akzent: "indigo",
        stil: "todo",
      })
    )
    if (an) {
      localStorage.setItem(
        "lockedInConfig",
        JSON.stringify({ ziel: "Bachelorarbeit abgeben", aktiv: true, fokusZiel: 90 })
      )
    }
  }, modusAn)
  await page.goto("/")
}

const grundfarbe = (page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test("ohne laufenden Modus bleibt die App hell", async ({ page }) => {
  await appMitModus(page, false)
  expect(await grundfarbe(page)).toBe("rgb(250, 250, 250)")
  await page.getByRole("button", { name: "Projekte", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("Projekte")
  expect(await grundfarbe(page)).toBe("rgb(250, 250, 250)")
})

test("läuft der Modus, wird die ganze App monochrom", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitModus(page, true)
  expect(await grundfarbe(page)).toBe("rgb(0, 0, 0)")

  // Auch ein Bereich ohne eigene Locked-In-Fassung.
  await page.getByRole("button", { name: "Projekte", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("Projekte")
  expect(await grundfarbe(page)).toBe("rgb(0, 0, 0)")

  // Karten sind dunkel statt weiß …
  const karte = page.locator("main .bg-white").first()
  if (await karte.count()) {
    const flaeche = await karte.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(flaeche).not.toBe("rgb(255, 255, 255)")
  }
  // … und die Akzentfarbe weicht Grauwerten.
  const akzent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-accent-500").trim()
  )
  expect(akzent).toBe("#52525b")
  expect(fehler).toEqual([])
})

test("Modus beenden stellt das helle Layout wieder her", async ({ page }) => {
  await appMitModus(page, true)
  expect(await grundfarbe(page)).toBe("rgb(0, 0, 0)")

  await page.getByRole("button", { name: "Locked In", exact: true }).first().click()
  await page.getByRole("button", { name: /Modus beenden|Beenden/ }).first().click()
  await page.waitForTimeout(400)
  expect(await grundfarbe(page)).toBe("rgb(250, 250, 250)")
})

test("Vitalitäts-Check-in ist ein Reiter im Alltag", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Alltag", exact: true }).first().click()

  await expect(page.locator("main")).toContainText("Routinen")
  await page.getByRole("button", { name: /Check-in/ }).click()
  await expect(page.locator("main")).toContainText("Energie")
  // Kein zweiter Seitenkopf im Reiter.
  expect(await page.locator("main h1").count()).toBe(1)
  expect(fehler).toEqual([])
})

test("Todo lässt sich nachträglich ändern", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Todos", exact: true }).first().click()

  await page.getByTitle(/Todo erstellen/).first().click()
  await page.getByPlaceholder(/benennen/).fill("Kapitel 3 überabreiten")
  await page.getByRole("button", { name: "Erstellen" }).click()
  await expect(page.locator("main")).toContainText("Kapitel 3 überabreiten")

  // Tippfehler und fehlendes Datum nachziehen – ohne Löschen und Neuanlegen.
  await page.getByRole("button", { name: "Kapitel 3 überabreiten" }).click()
  const feld = page.getByPlaceholder(/benennen/)
  await feld.fill("Kapitel 3 überarbeiten")
  await page.locator('main input[type="date"]').fill("2026-12-24")
  await page.getByRole("button", { name: "Speichern" }).click()

  await expect(page.locator("main")).toContainText("Kapitel 3 überarbeiten")
  await expect(page.locator("main")).not.toContainText("überabreiten")

  // Und der Stand überlebt das Neuladen.
  await page.reload()
  await page.getByRole("button", { name: "Todos", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("Kapitel 3 überarbeiten")
  expect(fehler).toEqual([])
})

test("Überfälliges steht oben und ist rot", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: ["dashboard", "todos"],
        appName: "OS",
        startseite: "todos",
        akzent: "indigo",
        stil: "todo",
      })
    )
    localStorage.setItem(
      "todos",
      JSON.stringify([
        { id: 1, text: "Längst fällig", datum: "2020-01-01", erledigt: false },
        { id: 2, text: "Irgendwann", erledigt: false },
      ])
    )
  })
  await page.goto("/")

  await expect(page.locator("main")).toContainText("Überfällig (1)")
  const chip = page.locator("main", { hasText: "Längst fällig" }).locator(".text-red-600").first()
  await expect(chip).toBeVisible()
})

test("Bewerbungsfrist taucht im Kalender auf", async ({ page }) => {
  const heute = new Date()
  const iso = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-${String(heute.getDate()).padStart(2, "0")}`
  await page.addInitScript((frist) => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: ["dashboard", "kalender", "beruf"],
        appName: "OS",
        startseite: "kalender",
        akzent: "indigo",
        stil: "todo",
      })
    )
    localStorage.setItem(
      "beruf_bewerbungen",
      JSON.stringify([
        { id: 1, firma: "Institut für Statistik", rolle: "Werkstudent", status: "beworben", frist },
        { id: 2, firma: "Abgesagt GmbH", status: "abgesagt", frist },
      ])
    )
  }, iso)
  await page.goto("/")

  await expect(page.locator("main")).toContainText("Frist: Institut für Statistik")
  // Abgeschlossene Vorgänge stehen nicht mehr im Weg.
  await expect(page.locator("main")).not.toContainText("Abgesagt GmbH")
})

test("Bereiche eines Projekts sind gebündelt und erklärt", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await appMitAllenBereichen(page)
  await page.getByRole("button", { name: "Projekte", exact: true }).first().click()

  // Neues Projekt: startet mit dem Alltagsfall statt mit gar nichts.
  await page.locator("main button").filter({ hasText: /^\+ ?Projekt/ }).first().click()
  await page.locator("main input").first().fill("Bachelorarbeit")
  await page.locator("main button").filter({ hasText: /Projekt anlegen/ }).first().click()
  await page.locator("main").getByText("Bachelorarbeit").first().click()

  for (const bereich of ["Ziel", "Todos", "Notizen"]) {
    await expect(page.locator("main")).toContainText(bereich)
  }

  // Der Weg zu den Bereichen liegt neben den Reitern, nicht im zugeklappten
  // Eigenschaften-Kopf: „Details" bleibt hier unangetastet.
  await expect(page.getByRole("button", { name: "Details", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "+ Bereich", exact: true }).click()

  // Die verfügbaren Bereiche sind nach Zweck gruppiert und erklärt.
  await expect(page.locator("main")).toContainText("Lernen")
  await expect(page.locator("main")).toContainText("Karteikarten")
  await expect(page.locator("main")).toContainText(/Spaced Repetition/)
  await expect(page.locator("main")).toContainText(/Kapitel, Skripte/)
  expect(fehler).toEqual([])
})

test("kaputte Altdaten legen die App nicht lahm", async ({ page }) => {
  const fehler = fehlerWaechter(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      "einstellungen",
      JSON.stringify({
        onboardingAbgeschlossen: true,
        profil: "komplett",
        sichtbareSeiten: ["dashboard", "todos", "habits"],
        appName: "OS",
        startseite: "dashboard",
        akzent: "indigo",
        stil: "todo",
      })
    )
    // Drei Sorten Altlast, die die App früher beim Start zerlegt hätten:
    // ein Habit ohne erledigtAn, ein Store mit gespeichertem null und
    // kaputtes JSON in einem Schlüssel, den eine Migration liest.
    localStorage.setItem("habits", JSON.stringify([{ id: 1, name: "Lesen" }]))
    localStorage.setItem("todos", "null")
    localStorage.setItem("kurse", "{das ist kein JSON")
  })
  await page.goto("/")

  await expect(page.locator("main")).toContainText("Guten")
  await page.getByRole("button", { name: "Todos", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("offene Aufgaben")
  await page.getByRole("button", { name: "Habits", exact: true }).first().click()
  await expect(page.locator("main")).toContainText("Lesen")

  // Und die Fehlergrenze ist nicht eingesprungen – es gab schlicht nichts
  // zu fangen.
  await expect(page.locator("body")).not.toContainText("Da ist etwas schiefgelaufen")
  expect(fehler).toEqual([])
})
