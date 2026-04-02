import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'

export default function CitiesLayer() {
  const map = useMap()
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    fetch('/api/game/cities')
      .then(r => r.json())
      .then((geojson: unknown) => {
        if (map.getSource('cities')) return

        map.addSource('cities', { type: 'geojson', data: geojson as Parameters<maplibregl.Map['addSource']>[1] extends { data: infer D } ? D : never })

        // Dot marker for each city
        map.addLayer({
          id: 'city-dots',
          type: 'circle',
          source: 'cities',
          minzoom: 3,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 6, 4, 9, 5],
            'circle-color': '#f1f5f9',
            'circle-opacity': 0.8,
            'circle-stroke-width': 0.5,
            'circle-stroke-color': '#0a1628',
          },
        })

        // City name labels
        map.addLayer({
          id: 'city-labels',
          type: 'symbol',
          source: 'cities',
          minzoom: 4,
          layout: {
            'text-field': ['get', 'NAME'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 7, 12],
            'text-offset': [0, 0.8],
            'text-anchor': 'top',
            'text-max-width': 8,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#cbd5e1',
            'text-halo-color': '#0a1628',
            'text-halo-width': 1.2,
          },
        })

        // Hover popup
        const onMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features?.length) return
          map.getCanvas().style.cursor = 'pointer'
          const props = e.features[0].properties as { NAME: string; ADM0NAME?: string; POP_MAX?: number }
          const pop = props.POP_MAX ? ` · pop. ${(props.POP_MAX / 1e6).toFixed(1)}M` : ''
          if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
          }
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:#fff;background:#1e293b;padding:4px 8px;border-radius:4px;font-size:12px"><b>${props.NAME}</b>${props.ADM0NAME ? `<br/>${props.ADM0NAME}` : ''}${pop}</div>`)
            .addTo(map)
        }

        const onLeave = () => {
          map.getCanvas().style.cursor = ''
          popupRef.current?.remove()
          popupRef.current = null
        }

        map.on('mousemove', 'city-dots', onMove)
        map.on('mouseleave', 'city-dots', onLeave)
      })
      .catch(() => { /* cities endpoint not available yet */ })

    return () => {
      popupRef.current?.remove()
      if (map.getLayer('city-labels')) map.removeLayer('city-labels')
      if (map.getLayer('city-dots')) map.removeLayer('city-dots')
      if (map.getSource('cities')) map.removeSource('cities')
    }
  }, [map])

  return null
}
