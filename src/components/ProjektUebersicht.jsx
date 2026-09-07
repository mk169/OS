import { FARBEN } from "../lib/farben"
import {
  nachZugehoerigkeit,
  projektFortschrittWerte,
} from "../lib/projekte"
import { DeadlineChip, Fortschrittsbalken } from "./Bausteine"
import LeerHinweis from "./LeerHinweis"

// Die Einstiegsansicht der Projekte: alles Laufende auf einen Blick,
// gebündelt nach Zugehörigkeit.
//
// Die Ordner-Ansicht daneben ist eine Ablage – man muss wissen, wo etwas
// liegt, um es zu finden. Diese Ansicht dreht das um: Sie zeigt zuerst, was
// es überhaupt gibt, wozu es gehört und wie weit es ist; der Weg ins Projekt
// ist ein Klick. Gruppiert wird nach Area, sonst nach Ordnerpfad
// (lib/projekte.js → zugehoerigkeitVon).
//
// Die Gruppenfarbe ist kein gespeichertes Attribut, sondern wird aus dem
// Gruppen-Schlüssel abgeleitet: gleiche Gruppe, gleiche Farbe – über
// Neuladen hinweg, ohne ein Feld dafür zu erfinden.
const FARB_REIHE = ["violet", "blue", "emerald", "amber", "rose", "cyan"]

function farbeFuer(key) {
  if (key === "ohne") return FARBEN.gray
  let summe = 0
  for (const zeichen of key) summe = (summe + zeichen.charCodeAt(0)) % 997
  return FARBEN[FARB_REIHE[summe % FARB_REIHE.length]]
}

function UebersichtsKarte({ projekt, todos, zugehoerigkeit, farbe, onOeffnen }) {
  const werte = projektFortschrittWerte(projekt, todos)
  return (
    <button
      onClick={() => onOeffnen(projekt.id)}
      className="flex h-full flex-col items-stretch rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-400"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`min-w-0 truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${farbe.zart}`}
        >
          {zugehoerigkeit.label}
        </span>
        {projekt.deadline && <DeadlineChip datum={projekt.deadline} />}
      </div>
      <h3 className="mt-2 truncate text-sm font-medium text-gray-900">
        {projekt.name}
      </h3>
      {projekt.beschreibung && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
          {projekt.beschreibung}
        </p>
      )}
      <span className="flex-1" />
      {/* Der Balken sitzt am unteren Rand – so liegen die Fortschritte einer
          Reihe auf einer Linie, auch wenn eine Karte keine Beschreibung hat. */}
      <div className="mt-4 pt-1">
        <Fortschrittsbalken {...werte} beschriftung="prozent" />
      </div>
    </button>
  )
}

export default function ProjektUebersicht({
  projekte,
  alleProjekte,
  ordner,
  todos,
  onOeffnen,
  onNeuesProjekt,
}) {
  const gruppen = nachZugehoerigkeit(projekte, { alle: alleProjekte, ordner })

  if (gruppen.length === 0) {
    return (
      <LeerHinweis
        emoji="📁"
        titel="Noch keine Projekte"
        text="Ein Projekt ist alles, was mehr als einen Schritt braucht – eine Hausarbeit, ein Umzug, ein Vorhaben. Leg das erste an; die Übersicht sortiert es dann nach Area oder Ordner ein."
        aktion="Projekt anlegen"
        onAktion={onNeuesProjekt}
      />
    )
  }

  return (
    <div className="space-y-8">
      {gruppen.map((gruppe) => {
        const farbe = farbeFuer(gruppe.key)
        return (
          <section key={gruppe.key}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${farbe.punkt}`} />
              <span className="min-w-0 truncate">{gruppe.label}</span>
              <span className="shrink-0 font-normal tabular-nums text-gray-300">
                {gruppe.projekte.length}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gruppe.projekte.map((p) => (
                <UebersichtsKarte
                  key={p.id}
                  projekt={p}
                  todos={todos}
                  zugehoerigkeit={gruppe}
                  farbe={farbe}
                  onOeffnen={onOeffnen}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
