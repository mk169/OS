# Aufbau

Diese Datei erklärt, wie OS innen zusammenhängt: wo Daten liegen, wie sie
zwischen Komponenten fließen, was beim Start passiert und welche Regeln beim
Erweitern gelten. Die Kurzfassung steht im [README](../README.md).

## Die eine Regel

`components/` zeigt an, `lib/` rechnet.

Alles, was man ohne Browser testen kann – Datumsrechnung, Streaks, Fortschritt,
Parsing, Zustandsübergänge – gehört nach `src/lib`. Dort liegen die
Unit-Tests (`src/lib/__tests__/`), und dort ist die Sprache deutsch wie im
Rest des Projekts. Komponenten holen sich Werte und stellen sie dar.

Was zwei Seiten teilen, gehört nicht in eine der beiden:

- geteilte **Rechnung** → `src/lib/…`
- geteilte **Darstellung** → `src/components/Bausteine.jsx` (Chips,
  Fortschrittsbalken) bzw. `LeerHinweis.jsx` (Leerzustände)
- geteilte **Maße** → `src/lib/layout.js` (zwei Seitenbreiten, mehr nicht)

## Datenfluss

```
Komponente ──useStored(key, fallback)──▶ Speicher (Map im Modul)
                                          │
                          localStorage ◀──┤ synchron bei jeder Änderung
                                          │
                     Supabase app_state ◀─┘ verzögert, nur mit Login
```

`src/lib/useStored.js` ist der einzige Weg zu gespeicherten Daten. Er hält
pro Schlüssel einen Eintrag `{ wert, hoerer, geladen }` in einer Map. Alle
Komponenten mit demselben Schlüssel hängen über `useSyncExternalStore` daran
und sehen Änderungen sofort – ohne Context, ohne Prop-Durchreichung.

Drei Eigenschaften, die dabei wichtig sind:

- **Lesen ist gekapselt.** Kaputtes JSON, ein gespeichertes `null` oder ein
  fehlender Schlüssel ergeben den Fallback.
- **Schreiben kann scheitern.** Jeder Schreibzugriff läuft über
  `schreibeLokal`; ist das Speicher-Kontingent voll, bleibt der Wert im
  Arbeitsspeicher gültig und die Oberfläche zeigt über `beiSpeicherFehler`
  einen Hinweis, statt Änderungen lautlos zu verlieren.
- **Die Cloud ist optional.** Ohne `VITE_SUPABASE_URL` läuft alles lokal;
  `cloudAktiv` ist dann `false` und kein Login erscheint.

Außerhalb von Komponenten (Migrationen) schreibt `schreibeStore(key, fallback,
neu)` in denselben Speicher.

## Speicher-Schlüssel

| Schlüssel | Inhalt |
| --- | --- |
| `einstellungen` | Profil, sichtbare Bereiche, Startseite, Akzent, Stil, Migrations-Merker |
| `todos` | Aufgaben mit Datum, Dauer, Eisenhower-Feldern, Projektbezug |
| `termine` | Kalendereinträge inkl. Wiederholung, Tagesblock, Fokus-Bezug |
| `tagesbloecke` | Benannte Tagesabschnitte mit Farbe |
| `habits`, `habitBereiche`, `habitFreeze` | Gewohnheiten, ihre Bereiche, Pausen |
| `projekte`, `ordner` | Projekte und Areas samt Ordnerbaum |
| `boardKarten`, `projektIdeen` | Board-Spalten, Ideenspeicher |
| `wissen`, `wissenOrdner`, `notizen`, `artikel` | Notizen, Ordner, Projektnotizen |
| `karten`, `kartenLimits`, `lernprotokoll`, `lernTag`, `ablage` | Karteikarten und Lernstand |
| `zyklen` | Fokus-Perioden mit Zielen, Zwischenphasen, „Nicht jetzt"-Liste |
| `lockedInConfig` | Ziel und Zeitfenster des Locked-In-Modus |
| `deepwork` | Abgeschlossene Fokus-Sessions |
| `vitalitaet` | Täglicher Körper-Check-in |
| `finanzen_konten`, `finanzen_transaktionen`, `finanzen_budgets`, `finanzen_sparziele`, `finanzen_einstellung` | Konten, Buchungen, Budgets, Sparziele, Währung |
| `beruf_bewerbungen`, `beruf_ziele`, `beruf_weiterbildung` | Bewerbungs-Pipeline, Karriereziele, Weiterbildung |
| `medien` | Leisure-Bibliothek |
| `wochenberichte` | Abgeschlossene Wochen |
| `gleichung` | Gewichte und Nordstern des Mentors |
| `inbox` | Schnell erfasste Einfälle |

Beim Backup (`Einstellungen → Daten`) werden alle Schlüssel exportiert außer
denen mit dem Präfix `sb-` – das sind Supabase-Login-Token und gehören nicht
in ein Daten-Backup.

## Start und Migrationen

`src/main.jsx` setzt Akzentfarbe und Locked-In-Modus **vor** dem ersten
Rendern (sonst blitzt bei laufendem Modus kurz das helle Layout auf) und
umschließt die App mit `components/Fehlergrenze.jsx`. Die Fehlergrenze ist
kein Schmuck: Alle Daten liegen im Browser, und ohne sie hätte ein einziger
Render-Fehler eine weiße Seite ergeben, hinter der auch die Einstellungen
verschwinden. Sie bietet stattdessen Neuladen, Backup und – als letzten
Ausweg – Zurücksetzen an.

`src/App.jsx` führt beim ersten Rendern die einmaligen Migrationen aus:

| Migration | Zweck | Wie sie sich merkt |
| --- | --- | --- |
| `migriereAlteKurse` | frühere „Kurse" werden Projekte im Ordner „Uni" | leert `kurse` am Ende |
| `migriereBereiche` | neu eingeführte Bereiche einmalig zur Navigation | `einstellungen.bereicheErgaenzt` |
| `migriereMentor` | Mentor ist keine eigene Seite mehr | prüft sich selbst |
| `migriereLernbereich` | Lernbereich nur bei vorhandenem Lernbezug | `einstellungen.lernbereichErgaenzt` |
| `migriereVitalitaet` | Vitalität wanderte in „Alltag" | prüft sich selbst |

Alle sind mehrfach lauffähig und lesen über den Helfer `lies(key, fallback)`,
der kaputtes JSON, `null` und falsche Typen abfängt. Sie laufen der Reihe
nach, und weil `schreibeStore` synchron schreibt, sieht jede Migration die
Änderungen ihrer Vorgänger.

Eine sechste Migration steht in `components/ProjektDetail.jsx`: Sie überführt
die frühere Projekt-Übersicht in eine eigene Seite (`uebersichtMigriert`).

## Bereiche und Navigation

`lib/einstellungen.js` kennt die Standard-Bereiche, `lib/navigation.js`
gruppiert sie (Täglich / Arbeiten / Leben / Weiteres) und entscheidet, was
auf dem Handy in die feste Tab-Leiste passt und was hinter „Mehr" rutscht.
`App.jsx` hält die Zuordnung `key → { label, icon, Komponente }`; die meisten
Seiten werden per `lazy()` nachgeladen.

Ein neuer Bereich braucht also: einen Eintrag in `STANDARD_SEITEN`, eine
Gruppe in `navigation.js`, den Eintrag in `App.jsx` – und, damit bestehende
Nutzer ihn sehen, einen Eintrag in `AUTO_BEREICHE`.

## Stile

Sechs Stile (`lib/stil.js`) verändern Start, Todos und Habits: `todo`,
`gamified`, `arcade`, `cleangirl`, `notion`, `lockedin`. Jede der drei Seiten
enthält pro Stil eine eigene Komponente und reicht dieselben Daten hinein –
die Fallunterscheidung steht jeweils am Ende der Datei.

Davon zu unterscheiden ist der **Locked-In-Modus**: Solange er läuft, setzt
`lib/lockedin.js` `data-modus="lockedin"` auf das Wurzelelement, und
`index.css` überschreibt darunter die Utility-Klassen – die ganze App wird
monochrom, nicht nur die drei Stil-Seiten.

## Offline

`vite-plugin-pwa` erzeugt einen Service Worker (`generateSW`,
`registerType: "autoUpdate"`), der den gebauten Stand in den Cache legt und
`index.html` als Navigations-Fallback ausliefert. Das Manifest liegt von Hand
in `public/manifest.webmanifest` – eine Quelle, kein Duplikat.

Nicht im Cache: die dekorativen Google-Fonts der Stile Arcade und Clean Girl.
Ohne Netz greifen dort die System-Schriften.

## Tests

- **Unit** (`src/lib/__tests__/`, Vitest, Node-Umgebung): alles, was rechnet.
  Kein DOM – deshalb braucht `useStored` für einen Test eine eigene
  Umgebungs-Angabe.
- **Oberfläche** (`e2e/app.spec.js`, Playwright): fährt den Produktions-Build
  hoch und geht die Wege durch, die man beim Benutzen wirklich geht. Jeder
  Test hat einen `fehlerWaechter`, der Konsolenfehler und ungefangene
  Ausnahmen sammelt und am Ende auf leer prüft.

`playwright.config.js` startet den Server mit `reuseExistingServer: !CI` –
lokal kann also ein alter `vite preview` einen veralteten Stand ausliefern.
Bei einem unerklärlichen Fehlschlag zuerst `npm run build` und den laufenden
Preview beenden.

## Altlast: `kursId`

Vor den Projekten gab es „Kurse". `migriereAlteKurse` überführt sie, lässt
aber die Fremdschlüssel auf Todos, Karten und Ablage-Einträgen unangetastet –
deshalb steht an vielen Stellen `t.projektId === id || t.kursId === id`. Die
IDs bleiben dabei erhalten, alte Zuordnungen gehen also nicht verloren. Eine
Migration, die die Fremdschlüssel einmalig umschreibt, würde diese
Doppelbedingung überflüssig machen; bis dahin ist sie Absicht, kein Versehen.
