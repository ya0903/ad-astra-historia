import { useEffect, useRef } from 'react'
import { useMap } from './MapContext'

export default function RiversLayer() {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/rivers')
      .then(r => r.json())
      .then(geojson => {
        if (map.getSource('rivers')) return
        map.addSource('rivers', { type: 'geojson', data: geojson })
        // Render rivers above country fills but below labels
        const beforeLayer = map.getLayer('country-hover') ? 'country-hover' : undefined
        map.addLayer({
          id: 'rivers-line',
          type: 'line',
          source: 'rivers',
          paint: {
            'line-color': '#2563eb',
            'line-width': ['interpolate', ['linear'], ['zoom'],
              3, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 0.8,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 0.4,
                0.2,
              ],
              6, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 2.5,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 1.5,
                0.8,
              ],
              9, ['case',
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 2], 4,
                ['<=', ['coalesce', ['get', 'scalerank'], 5], 4], 2.5,
                1.2,
              ],
            ] as never,
            'line-opacity': ['interpolate', ['linear'], ['zoom'],
              2, 0,
              3, 0.45,
              5, 0.65,
              8, 0.75,
            ] as never,
          },
        }, beforeLayer)
      })
      .catch(() => { /* rivers.geojson not downloaded yet */ })

    return () => {
      if (map.getLayer('rivers-line')) map.removeLayer('rivers-line')
      if (map.getSource('rivers')) map.removeSource('rivers')
      loadedRef.current = false
    }
  }, [map])

  return null
}
