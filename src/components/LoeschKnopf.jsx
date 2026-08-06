import { useState } from "react"

// Zweistufiges Löschen: der erste Klick fragt nach, erst der zweite löscht.
// Bewusst kein Systemdialog – die Rückfrage erscheint als schmaler Chip an
// Ort und Stelle, damit nichts wegspringt und das Blatt ruhig bleibt.
//
// `klasse` ergänzt die Gestaltung des ×-Knopfs (z.B. Einblenden bei Hover),
// `label` ersetzt das × durch Text (z.B. „Löschen" in einem Formular).
export default function LoeschKnopf({
  onLoeschen,
  titel = "Löschen",
  frageText = "Löschen?",
  klasse = "",
  label = null,
}) {
  const [frage, setFrage] = useState(false)

  // Löschknöpfe sitzen oft in anklickbaren Karten/Zeilen – der Klick darf
  // nicht nach oben durchschlagen und die Karte öffnen.
  function halt(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  if (frage) {
    return (
      <span
        onClick={halt}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600"
      >
        {frageText}
        <button
          onClick={(e) => {
            halt(e)
            setFrage(false)
            onLoeschen()
          }}
          className="rounded-sm px-1 font-medium hover:bg-red-100"
        >
          Ja
        </button>
        <button
          onClick={(e) => {
            halt(e)
            setFrage(false)
          }}
          className="rounded-sm px-1 text-gray-400 hover:text-gray-900"
        >
          Nein
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={(e) => {
        halt(e)
        setFrage(true)
      }}
      title={titel}
      className={`shrink-0 transition-colors hover:text-red-500 ${klasse}`}
    >
      {label ?? "×"}
    </button>
  )
}
