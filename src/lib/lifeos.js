// Gestaltungs-Bausteine des Stils „Life OS".
//
// Der Stil zeichnet ein dunkles Kommandopult: fast schwarze Flächen, eine
// gedeckte Goldkante als einzige Farbe, Mono-Schrift für alles Sachliche und
// eine Serife für die Überschriften. Anders als bei den übrigen Stilen
// tauchen dieselben Elemente (Panel, Rubrik, Kennzahl, Chip) auf drei Seiten
// auf – Start, Todos und Habits. Damit sie überall gleich aussehen, liegen
// die Klassen hier und nicht dreimal in den Komponenten.
//
// Die Farbwerte stehen bewusst als Hexwerte in Tailwind-Klammern: Es ist eine
// eigene, stilgebundene Palette und keine App-weite Farbe – der Akzent aus
// den Einstellungen bleibt davon unberührt.

// Schriften – per <link> in index.html geladen, mit System-Fallback.
export const LIFEOS_SERIF = '"Fraunces", ui-serif, Georgia, "Times New Roman", serif'
export const LIFEOS_MONO =
  '"Azeret Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'

// Palette (angelehnt an das Vorbild): Grund, Flächen, Kanten, Text, Gold.
export const LIFEOS_FARBEN = {
  grund: "#080909",
  flaeche: "#0f1011",
  flaeche2: "#161719",
  kante: "#242628",
  kante2: "#2e3133",
  text: "#e2e4e8",
  text2: "#9ea3ab",
  text3: "#5a5f68",
  gold: "#d4a84b",
  goldHell: "#f0c870",
  goldDunkel: "#b88830",
  gruen: "#5aaa72",
}

// Seitenrahmen: voller dunkler Grund, Mono als Grundschrift.
export const LIFEOS_SEITE =
  "min-h-screen bg-[#080909] px-4 py-6 text-[#e2e4e8] sm:px-6"
export const LIFEOS_INHALT = "mx-auto max-w-5xl"

// Panel – die Grundfläche, auf der alles liegt.
export const LIFEOS_PANEL = "rounded border border-[#242628] bg-[#0f1011] p-4"

// Rubrik über einem Panel: klein, gesperrt, in Versalien.
export const LIFEOS_RUBRIK =
  "flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#5a5f68]"

// Knöpfe: „ghost" für Nebensachen, „gold" für die eine Hauptaktion.
export const LIFEOS_KNOPF_GHOST =
  "inline-flex items-center gap-1.5 rounded border border-[#2e3133] px-3 py-1.5 text-[11px] text-[#9ea3ab] transition-colors hover:border-[#3a3d40] hover:text-[#e2e4e8]"
export const LIFEOS_KNOPF_GOLD =
  "inline-flex items-center gap-1.5 rounded bg-[#b88830] px-3 py-1.5 text-[11px] font-medium text-[#080909] transition-colors hover:bg-[#f0c870]"

// Punktfarben der Rubriken – dieselben Rollen wie im Vorbild.
export const LIFEOS_PUNKT = {
  gold: "bg-[#d4a84b]",
  gruen: "bg-[#5aaa72]",
  blau: "bg-[#6aa0d8]",
  lila: "bg-[#9878c8]",
  cyan: "bg-[#3ab8b8]",
  amber: "bg-[#e08838]",
  rot: "bg-[#c05050]",
  grau: "bg-[#5a5f68]",
}
