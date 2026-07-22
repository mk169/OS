// Moderner, redaktioneller Seitenkopf:
// Eyebrow-Label, großer Serif-Titel, dezente Unterzeile, Aktions-Slot.
export default function Seitenkopf({ eyebrow, titel, unterzeile, aktion }) {
  return (
    <div className="mb-8 pb-6 border-b border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[2rem] font-medium leading-tight text-gray-900">
            {titel}
          </h1>
          {unterzeile && (
            <p className="mt-1.5 font-serif text-[15px] italic text-gray-400">
              {unterzeile}
            </p>
          )}
        </div>
        {aktion && <div className="shrink-0 mt-1">{aktion}</div>}
      </div>
    </div>
  )
}
