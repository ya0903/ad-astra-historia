import { useEffect } from 'react'
import { useGameStore, useMapStore } from '../stores'

/**
 * Floating bottom-centre prompt shown when the AI queued a build in a city
 * we don't recognise. Asks the player to click on the map to place it.
 * Handles one placement at a time (the first in the queue).
 */
export default function PendingPlacementPrompt() {
  const pending = useGameStore(s => s.state?.pendingPlacements ?? [])
  const countries = useGameStore(s => s.state?.countries ?? {})
  const resolvePendingPlacement = useGameStore(s => s.resolvePendingPlacement)
  const cancelPendingPlacement = useGameStore(s => s.cancelPendingPlacement)
  const map = useMapStore(s => s.map)

  const current = pending[0]

  useEffect(() => {
    if (!current || !map) return
    const handler = (e: any) => {
      const { lng, lat } = e.lngLat
      resolvePendingPlacement(current.id, lng, lat)
    }
    map.on('click', handler)
    // Change the cursor to signal placement mode
    const canvas = map.getCanvas?.()
    const prevCursor = canvas?.style.cursor
    if (canvas) canvas.style.cursor = 'crosshair'
    return () => {
      map.off('click', handler)
      if (canvas) canvas.style.cursor = prevCursor ?? ''
    }
  }, [current?.id, map, resolvePendingPlacement])

  if (!current) return null

  const countryName = countries[current.countryId]?.name ?? current.countryId
  const cityLabel = current.city ?? current.name

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
      <div className="flex items-center gap-4 px-5 py-3 rounded-xl border border-amber-500/50 bg-slate-900/95 shadow-2xl backdrop-blur text-sm text-slate-100">
        <span className="text-2xl">{current.isSmartCity ? '🏙' : '📍'}</span>
        <div className="max-w-md">
          <div className={`font-semibold ${current.isSmartCity ? 'text-cyan-300' : 'text-amber-300'}`}>
            {current.isSmartCity
              ? <>Place your smart city: {current.name}</>
              : <>Place your {current.type.replace(/_/g, ' ')}: {current.name}</>}
          </div>
          <div className="text-slate-300 text-xs mt-0.5">
            {current.isSmartCity
              ? <>Click on the map to place &quot;{current.name}&quot; in {countryName}.</>
              : <>Click on the map to choose where &quot;{cityLabel}&quot; should be built in {countryName}.</>}
          </div>
        </div>
        <button
          onClick={() => cancelPendingPlacement(current.id)}
          className="ml-2 px-3 py-1.5 rounded-md border border-slate-600 hover:border-red-500/60 hover:bg-red-900/30 text-xs text-slate-300 hover:text-red-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
