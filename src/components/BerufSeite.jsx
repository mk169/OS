import Seitenkopf from "./Seitenkopf"

// Lebensbereich „Beruf & Karriere" – vorerst als schlankes Grundgerüst.
// Wird später mit Zielen, Bewerbungen und Weiterbildung gefüllt.
export default function BerufSeite() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        titel="Beruf & Karriere"
        unterzeile="Ziele, Bewerbungen und Weiterbildung an einem Ort."
      />
      <p className="mt-6 text-sm text-gray-400">
        Dieser Bereich ist angelegt und wird als Nächstes mit Karrierezielen,
        Bewerbungen und Weiterbildungen gefüllt.
      </p>
    </div>
  )
}
