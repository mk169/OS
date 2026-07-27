import useStored from "./useStored"
import { heute } from "./datum"
import { useHabitDaten } from "../components/HabitsSeite"

export function useTodayData() {
  const [todos] = useStored("todos", [])
  const [termine] = useStored("termine", [])
  const [deepwork] = useStored("deepwork", [])
  const [inbox] = useStored("inbox", [])
  const { habits } = useHabitDaten()

  const hoy = heute() // YYYY-MM-DD

  const todosDueToday = todos.filter(
    (t) => !t.erledigt && t.datum && t.datum <= hoy
  )

  const appointmentsToday = termine.filter((t) => t.datum === hoy)

  const deepworkToday = deepwork.filter((d) => d.datum === hoy)

  const inboxCount = inbox.length

  return {
    todosDueToday,
    appointmentsToday,
    deepworkToday,
    habitsToday: habits,
    inboxCount,
  }
}
