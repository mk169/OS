// Einheitlicher, redaktioneller Seitenkopf: optionale Oberzeile (Eyebrow),
// großer Serif-Titel, dezente kursive Serif-Unterzeile und eine feine
// Haarlinie als Abschluss. Rechts optional ein Aktions-Slot (z. B. „+"-Button).
export default function Seitenkopf({ eyebrow, titel, unterzeile, aktion }) {
  return (
    <div className="mb-8 border-b border-gray-200 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-medium text-gray-900">{titel}</h1>
          {unterzeile && (
            <p className="mt-1.5 font-serif text-[15px] italic text-gray-500">
              {unterzeile}
            </p>
          )}
        </div>
        {aktion && <div className="shrink-0">{aktion}</div>}
      </div>
    </div>
  )
}
