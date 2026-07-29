import Seitenkopf from "./Seitenkopf"

// Lebensbereich „Finanzen" – vorerst als schlankes Grundgerüst angelegt.
// Wird später mit Konten, Budgets und Einnahmen/Ausgaben gefüllt.
export default function FinanzenSeite() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seitenkopf
        titel="Finanzen"
        unterzeile="Einnahmen, Ausgaben und Budgets an einem Ort."
      />
      <p className="mt-6 text-sm text-gray-400">
        Dieser Bereich ist angelegt und wird als Nächstes mit Konten, Budgets
        und Ausgaben gefüllt.
      </p>
    </div>
  )
}
