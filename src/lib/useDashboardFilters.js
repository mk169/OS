import useStored from "./useStored"

export function useDashboardFilters() {
  const [filters, setFilters] = useStored("dashboardFilters", {
    todos: true,
    termine: true,
    habits: true,
    deepwork: true,
    inbox: false,
  })

  const toggleFilter = (key) => {
    setFilters({ ...filters, [key]: !filters[key] })
  }

  return { filters, setFilters, toggleFilter }
}
