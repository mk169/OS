// Ein pflanzbarer Baum als reines Inline-SVG (keine Bibliothek). Wächst
// über vier Stufen (Samen → Keimling → Setzling → Baum) und nimmt die
// Farbe des verknüpften Habit-Bereichs an. Verdorrte Bäume (abgebrochene
// Sessions) werden grau und kahl dargestellt.

// Auswählbare Baum-Arten. Bewusst klein gehalten; die Kronenform
// unterscheidet sich je Art, die Farbe kommt vom Bereich.
export const BAUM_ARTEN = [
  { id: "eiche", name: "Eiche", emoji: "🌳" },
  { id: "kiefer", name: "Kiefer", emoji: "🌲" },
  { id: "kirsche", name: "Kirschbaum", emoji: "🌸" },
  { id: "bambus", name: "Bambus", emoji: "🎋" },
]

// Farbname (aus FARBEN) → Tailwind-Textklasse für die Krone (currentColor).
// Als statische Strings gehalten, damit Tailwind sie beim Build erkennt.
const KRONEN_KLASSE = {
  emerald: "text-emerald-500",
  blue: "text-blue-500",
  violet: "text-violet-500",
  amber: "text-amber-500",
  rose: "text-rose-500",
  cyan: "text-cyan-500",
  gray: "text-gray-400",
}

// Fortschritt (0–1) → Wachstumsstufe (0–3).
export function stufeVon(fortschritt) {
  return Math.max(0, Math.min(3, Math.floor(fortschritt * 4)))
}

// Kronenform je Art, zentriert um (cx, cy) mit Radius r. Nutzt
// fill="currentColor", damit die Bereichsfarbe greift.
function Krone({ art, cx, cy, r, verdorrt }) {
  if (verdorrt) {
    // Kahles, hängendes Geäst statt Krone.
    return (
      <g stroke="#b0a99f" strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d={`M${cx} ${cy + r} L${cx - r * 0.8} ${cy - r * 0.3}`} />
        <path d={`M${cx} ${cy + r} L${cx + r * 0.8} ${cy - r * 0.2}`} />
        <path d={`M${cx} ${cy + r * 0.4} L${cx - r * 0.5} ${cy - r}`} />
        <path d={`M${cx} ${cy + r * 0.4} L${cx + r * 0.5} ${cy - r}`} />
      </g>
    )
  }

  if (art === "kiefer") {
    const t = (yTop, half, yBase) =>
      `M${cx} ${yTop} L${cx - half} ${yBase} L${cx + half} ${yBase} Z`
    return (
      <g fill="currentColor">
        <path d={t(cy - r * 1.3, r * 0.75, cy - r * 0.35)} />
        <path d={t(cy - r * 0.75, r, cy + r * 0.35)} />
        <path d={t(cy - r * 0.15, r * 1.2, cy + r)} />
      </g>
    )
  }

  // Rundkrone (Eiche / Kirsche) als überlappende Kreise.
  return (
    <g fill="currentColor">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx - r * 0.7} cy={cy + r * 0.35} r={r * 0.72} />
      <circle cx={cx + r * 0.7} cy={cy + r * 0.35} r={r * 0.72} />
      <circle cx={cx} cy={cy - r * 0.55} r={r * 0.72} />
      {art === "kirsche" && (
        <g fill="#fff" opacity="0.85">
          <circle cx={cx - r * 0.5} cy={cy - r * 0.2} r={r * 0.14} />
          <circle cx={cx + r * 0.4} cy={cy + r * 0.1} r={r * 0.14} />
          <circle cx={cx} cy={cy + r * 0.5} r={r * 0.14} />
          <circle cx={cx + r * 0.1} cy={cy - r * 0.5} r={r * 0.14} />
        </g>
      )}
    </g>
  )
}

// Bambus: mehrere segmentierte Halme mit ein paar Blättern.
function Bambus({ hoehe, verdorrt }) {
  const stiel = verdorrt ? "#b0a99f" : "#6b8f3f"
  const halme = [
    { x: 24, top: 60 - hoehe },
    { x: 19, top: 60 - hoehe * 0.8 },
    { x: 29, top: 60 - hoehe * 0.85 },
  ]
  return (
    <g>
      {halme.map((h, i) => {
        const segmente = []
        for (let y = 60; y > h.top; y -= 8) {
          segmente.push(
            <line
              key={y}
              x1={h.x - 2}
              y1={y - 7}
              x2={h.x + 2}
              y2={y - 7}
              stroke={stiel}
              strokeWidth="1"
            />
          )
        }
        return (
          <g key={i}>
            <line
              x1={h.x}
              y1="60"
              x2={h.x}
              y2={h.top}
              stroke={stiel}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {segmente}
            {!verdorrt && (
              <>
                <path
                  d={`M${h.x} ${h.top + 4} q7 -4 10 -10 q-7 1 -10 6z`}
                  fill="currentColor"
                />
                <path
                  d={`M${h.x} ${h.top + 10} q-7 -4 -10 -10 q7 1 10 6z`}
                  fill="currentColor"
                />
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

export default function Baum({
  art = "eiche",
  farbe = "emerald",
  stufe = 3,
  verdorrt = false,
  className = "h-16 w-12",
}) {
  const kroneKlasse = verdorrt
    ? "text-gray-400"
    : (KRONEN_KLASSE[farbe] ?? KRONEN_KLASSE.emerald)
  const stamm = verdorrt ? "#b0a99f" : "#9a6a43"

  // Trunk-Höhe und Kronen-Radius wachsen mit der Stufe.
  const trunkTop = { 2: 44, 3: 34 }[stufe] ?? 44
  const kroneR = stufe >= 3 ? 12 : 8
  const kroneY = trunkTop - 2

  return (
    <svg viewBox="0 0 48 64" className={`${kroneKlasse} ${className}`} fill="none">
      {/* Boden-Schatten */}
      <ellipse cx="24" cy="61" rx="13" ry="2.5" fill="#0000000f" />

      {stufe === 0 && (
        // Samen im Erdhügel.
        <g>
          <path d="M15 60c0-3 18-3 18 0z" fill={stamm} opacity="0.35" />
          <ellipse cx="24" cy="57.5" rx="2.4" ry="1.8" fill={stamm} />
        </g>
      )}

      {stufe === 1 && (
        // Keimling: kurzer Trieb mit zwei Blättern.
        <g>
          <path d="M15 60c0-3 18-3 18 0z" fill={stamm} opacity="0.35" />
          <path
            d="M24 60 V50"
            stroke={verdorrt ? "#b0a99f" : "#6b8f3f"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {!verdorrt && (
            <g fill="currentColor">
              <path d="M24 53c-4-1-7-4-7-4 3-0.5 7 0.5 7 4z" />
              <path d="M24 55c4-1 7-4 7-4-3-0.5-7 0.5-7 4z" />
            </g>
          )}
        </g>
      )}

      {stufe >= 2 && art === "bambus" && (
        <Bambus hoehe={stufe >= 3 ? 34 : 22} verdorrt={verdorrt} />
      )}

      {stufe >= 2 && art !== "bambus" && (
        <g>
          <rect
            x="22.5"
            y={trunkTop}
            width="3"
            height={60 - trunkTop}
            rx="1.5"
            fill={stamm}
          />
          <Krone art={art} cx={24} cy={kroneY} r={kroneR} verdorrt={verdorrt} />
        </g>
      )}
    </svg>
  )
}
