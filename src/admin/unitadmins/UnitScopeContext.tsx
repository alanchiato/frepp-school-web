import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '../../session/context'
import type { UnitOption } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'

interface UnitScopeValue {
  units: UnitOption[] | null
  selectedUnit: UnitOption | null
  error: string
  selectUnit: (unitId: string) => void
  refresh: () => void
}
const Context = createContext<UnitScopeValue | null>(null)
export function useUnitScope() { return useContext(Context) }

export function UnitScopeProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { state, api, invalidate } = useSession()
  const [units, setUnits] = useState<UnitOption[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const storageKey = state.status === 'authenticated' || state.status === 'logging_out'
    ? `frepp.unit.${state.session.school.id}.${state.session.user.id}` : ''

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setUnits(null);setError('') } })
    queueMicrotask(() => { if (controller.signal.aborted) return; void api.assignedUnits(controller.signal).then(result => {
      if (controller.signal.aborted) return
      const next = result.units
      let remembered = ''
      try { remembered = sessionStorage.getItem(storageKey) ?? '' } catch { /* storage may be unavailable */ }
      setUnits(next)
      setSelectedId(current => next.some(unit => unit.id === current) ? current : next.some(unit => unit.id === remembered) ? remembered : next[0]?.id ?? '')
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      if (reason instanceof ApiError && reason.status === 401) invalidate()
      else {setUnits([]);setSelectedId('');setError(errorMessage(reason))}
    }) })
    return () => controller.abort()
  }, [api, enabled, invalidate, storageKey, attempt])

  useEffect(() => {
    if (!enabled || !storageKey || !selectedId) return
    try { sessionStorage.setItem(storageKey, selectedId) } catch { /* selection still works in memory */ }
  }, [enabled, selectedId, storageKey])

  const selectedUnit = units?.find(unit => unit.id === selectedId) ?? null
  const value = useMemo<UnitScopeValue>(() => ({
    units, selectedUnit, error,
    selectUnit: unitId => { if (units?.some(unit => unit.id === unitId)) setSelectedId(unitId) },
    refresh: () => setAttempt(value => value + 1),
  }), [units, selectedUnit, error])
  return <Context.Provider value={enabled ? value : null}>{children}</Context.Provider>
}
