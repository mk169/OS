// Einmalige Umbauten am Projekt-Bestand.
//
// Der Projekte-Bereich hatte zwei konkurrierende Ordnungssysteme: Ordner
// (sortieren) und Areas (dauerhafte Lebensbereiche). Beide sortierten
// Projekte, keiner sagte, wann man welchen nimmt. Geblieben sind die
// Ordner – Areas werden hier zu Ordnern. Dasselbe für den „Backlog": ein
// eigener Speicher (`projektIdeen`) neben Todos, Notizen und Projekten war
// ein vierter Ort für „das will ich mal tun". Ideen werden Todos.
//
// Beide Funktionen sind rein: sie bekommen die Daten und geben die neuen
// zurück. Das Lesen und Schreiben der Stores macht App.jsx.

// Hat eine Area eigene Inhalte – oder war sie nur eine Schublade?
// `mitInhalt` ist die Menge der Projekt-IDs, unter denen irgendwo Inhalte
// liegen (Todos, Notizen, Artikel, Karten …); dazu kommt, was direkt am
// Projekt selbst hängt.
function areaHatInhalte(area, mitInhalt) {
  if (mitInhalt.has(area.id)) return true
  if ((area.workflow ?? []).length > 0) return true
  if ((area.seiten ?? []).length > 0) return true
  if ((area.bloecke ?? []).length > 0) return true
  return Boolean((area.ziel ?? "").trim())
}

// Areas werden zu Ordnern: Jede Area bekommt einen gleichnamigen Ordner an
// ihrer bisherigen Stelle, ihre Projekte ziehen hinein. Eine Area mit
// eigenen Inhalten bleibt zusätzlich als ganz normales Projekt in diesem
// Ordner erhalten – so geht nichts verloren; eine leere Area verschwindet.
export function areasZuOrdnern({ projekte = [], ordner = [], mitInhalt = new Set() }) {
  const areas = projekte.filter((p) => (p.typ ?? "projekt") === "area")
  if (areas.length === 0) return { projekte, ordner, geaendert: false }

  // IDs fortlaufend hinter der größten vergebenen Ordner-ID – kollidiert
  // damit weder mit bestehenden Ordnern noch untereinander.
  let naechsteId =
    ordner.reduce((max, o) => Math.max(max, Number(o.id) || 0), 0) + 1

  const neueOrdner = []
  const ordnerFuerArea = new Map()
  for (const area of areas) {
    const id = naechsteId++
    ordnerFuerArea.set(area.id, id)
    neueOrdner.push({
      id,
      name: (area.name ?? "").trim() || "Bereich",
      parentId: area.ordnerId ?? null,
    })
  }

  const neueProjekte = []
  for (const p of projekte) {
    const istArea = (p.typ ?? "projekt") === "area"
    if (istArea) {
      // Leere Area: fällt weg, der Ordner tritt an ihre Stelle.
      if (!areaHatInhalte(p, mitInhalt)) continue
      const { typ: _typ, areaId: _areaId, ...rest } = p
      neueProjekte.push({ ...rest, ordnerId: ordnerFuerArea.get(p.id) })
      continue
    }
    const ziel = p.areaId != null ? ordnerFuerArea.get(p.areaId) : undefined
    const { typ: _typ, areaId: _areaId, ...rest } = p
    neueProjekte.push(ziel === undefined ? rest : { ...rest, ordnerId: ziel })
  }

  return {
    projekte: neueProjekte,
    ordner: [...ordner, ...neueOrdner],
    geaendert: true,
  }
}

// Backlog-Ideen werden Todos ohne Datum. Todos kennen kein Notizfeld –
// die Notiz der Idee hängt sich deshalb an den Text, statt verloren zu
// gehen.
export function ideenZuTodos({ ideen = [], todos = [], startId = Date.now() }) {
  const brauchbar = ideen.filter((i) => (i?.text ?? "").trim())
  if (brauchbar.length === 0) return { todos, geaendert: false }

  const neue = brauchbar.map((i, index) => {
    const notiz = (i.notiz ?? "").trim()
    return {
      id: startId + index,
      text: notiz ? `${i.text.trim()} – ${notiz}` : i.text.trim(),
      projektId: null,
      dauer: null,
      datum: "",
      wichtig: false,
      dringend: false,
      erledigt: false,
    }
  })
  return { todos: [...todos, ...neue], geaendert: true }
}
