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
        map.addLayer({
          id: 'rivers-line',
          type: 'line',
          source: 'rivers',
          minzoom: 4,
          paint: {
            'line-color': '#38bdf8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 5, 1, 8, 2],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 5, 0.55],
          },
        })
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
