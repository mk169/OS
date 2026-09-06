// Leerzustände. Eine leere Fläche sagt nicht, ob ein Bereich kaputt ist oder
// bloß noch nichts enthält – und schon gar nicht, wie man anfängt. Deshalb
// bekommt jede Liste, die leer sein kann, einen dieser beiden Bausteine:
//
//   <LeerHinweis>  – die große Karte für einen ganzen Bereich oder Reiter.
//                    Sagt, was hier hingehört, und bietet den ersten Schritt an.
//   <LeerZeile>    – der leise Einzeiler unter einer Überschrift, wenn die
//                    Karte zu laut wäre (Wochenrückblick, kleine Abschnitte).
//
// Vorher standen drei leicht auseinandergedriftete Kopien in BerufSeite,
// DailyOpsSeite und FinanzenSeite.

export default function LeerHinweis({
  emoji,
  titel,
  text,
  aktion,
  onAktion,
  klasse = "",
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center ${klasse}`}
    >
      {emoji && <p className="text-2xl">{emoji}</p>}
      <p className={`text-sm font-medium text-gray-900 ${emoji ? "mt-2" : ""}`}>
        {titel}
      </p>
      {text && (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">
          {text}
        </p>
      )}
      {aktion && onAktion && (
        <button
          onClick={onAktion}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          {aktion}
        </button>
      )}
    </div>
  )
}

// Leiser Einzeiler für kleine Abschnitte – dort, wo eine ganze Karte den
// Rhythmus der Seite stören würde.
export function LeerZeile({ text, klasse = "" }) {
  return <p className={`text-sm text-gray-400 ${klasse}`}>{text}</p>
}
