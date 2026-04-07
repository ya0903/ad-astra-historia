import { useEffect, useRef } from 'react'
import { useMap } from './MapContext'

export default function LakesLayer() {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/lakes')
      .then(r => r.json())
      .then(geojson => {
        if (map.getSource('lakes')) return
        map.addSource('lakes', { type: 'geojson', data: geojson })
        // Render lakes above country fills
        const beforeLayer = map.getLayer('country-hover') ? 'country-hover' : undefined
        map.addLayer({
          id: 'lakes-fill',
          type: 'fill',
          source: 'lakes',
          minzoom: 3,
          paint: {
            'fill-color': '#0c2240',
            'fill-opacity': ['interpolate', ['linear'], ['zoom'],
              3, 0.5,
              6, 0.7,
            ] as never,
          },
        }, beforeLayer)
        map.addLayer({
          id: 'lakes-outline',
          type: 'line',
          source: 'lakes',
          minzoom: 4,
          paint: {
            'line-color': '#1e4a7a',
            'line-width': ['interpolate', ['linear'], ['zoom'],
              4, 0.3,
              7, 0.8,
            ] as never,
            'line-opacity': 0.5,
          },
        })
      })
      .catch(() => { /* lakes.geojson not downloaded yet */ })

    return () => {
      if (map.getLayer('lakes-outline')) map.removeLayer('lakes-outline')
      if (map.getLayer('lakes-fill')) map.removeLayer('lakes-fill')
      if (map.getSource('lakes')) map.removeSource('lakes')
      loadedRef.current = false
    }
  }, [map])

  return null
}
