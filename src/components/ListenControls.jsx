// Geteilte, kompakte Steuer-Elemente für Listen (Sammeln, Projekte):
// Suche, Sortier-Dropdown und ein Karten⇄Listen-Umschalter. Bewusst
// schlicht im bestehenden App-Stil gehalten (vgl. Einstellungen.jsx).

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Suchfeld mit Lupen-Icon. Kompakt, füllt den verfügbaren Platz.
export function Suchfeld({ wert, onChange, placeholder = "Suchen…" }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </Icon>
      <input
        type="text"
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-accent-400"
      />
      {wert && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Zurücksetzen"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-gray-600"
        >
          <Icon><path d="M18 6 6 18M6 6l12 12" /></Icon>
        </button>
      )}
    </div>
  )
}

// Kompaktes Sortier-Dropdown. optionen = [{ value, label }].
export function SortMenu({ wert, onChange, optionen, titel = "Sortieren" }) {
  return (
    <div className="relative shrink-0">
      <select
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        title={titel}
        aria-label={titel}
        className="cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:border-accent-400"
      >
        {optionen.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
        <path d="M7 10l5 5 5-5" />
      </Icon>
    </div>
  )
}

// Icon-Toggle: Karten-Raster ⇄ Liste. layout ∈ {"raster","liste"}.
export function LayoutUmschalter({ layout, setLayout }) {
  const knopf = (key, titel, kinder) => (
    <button
      type="button"
      onClick={() => setLayout(key)}
      title={titel}
      aria-label={titel}
      aria-pressed={layout === key}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        layout === key
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-400 hover:text-gray-700"
      }`}
    >
      {kinder}
    </button>
  )
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-gray-200 bg-gray-100 p-0.5">
      {knopf(
        "raster",
        "Karten",
        <Icon>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </Icon>
      )}
      {knopf(
        "liste",
        "Liste",
        <Icon>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </Icon>
      )}
    </div>
  )
}
