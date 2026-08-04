import Seitenkopf from "./Seitenkopf"

// Lebensbereich „Daily Operations" – vorerst als schlankes Grundgerüst.
// Wird später mit wiederkehrenden Abläufen und Routinen gefüllt.
export default function DailyOpsSeite() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <Seitenkopf
        titel="Daily Operations"
        unterzeile="Der tägliche Betrieb – Routinen und wiederkehrende Abläufe."
      />
      <p className="mt-6 text-sm text-gray-400">
        Dieser Bereich ist angelegt und wird als Nächstes mit täglichen
        Abläufen, Checklisten und Routinen gefüllt.
      </p>
    </div>
  )
}
