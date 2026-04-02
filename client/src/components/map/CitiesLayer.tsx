import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'

// SCALERANK in Natural Earth 10m populated places:
//   1–2  = world capitals + megacities (London, NYC, Tokyo)
//   3–4  = major regional cities (Karachi, Lagos, Lahore)
//   5–6  = significant cities (Faisalabad, Peshawar, Quetta)
//   7–8  = smaller cities / towns
//
// Zoom-dependent filter — shows progressively more cities as you zoom in.
// This naturally gives ~1-2 cities for Bhutan, ~5 for Pakistan, ~10-15 for India.

export default function CitiesLayer() {
  const map = useMap()
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    fetch('/api/game/cities')
      .then(r => r.json())
      .then((geojson: unknown) => {
        if (map.getSource('cities')) return

        map.addSource('cities', {
          type: 'geojson',
          data: geojson as GeoJSON.FeatureCollection,
        })

        // Dot layer — visible size and zoom-dependent density via scalerank filter
        map.addLayer({
          id: 'city-dots',
          type: 'circle',
          source: 'cities',
          minzoom: 2,
          // Show only cities with scalerank <= threshold that steps up with zoom
          filter: [
            'case',
            ['<', ['zoom'], 3], ['<=', ['get', 'SCALERANK'], 2],
            ['<', ['zoom'], 4], ['<=', ['get', 'SCALERANK'], 3],
            ['<', ['zoom'], 5], ['<=', ['get', 'SCALERANK'], 5],
            ['<', ['zoom'], 7], ['<=', ['get', 'SCALERANK'], 7],
            ['<=', ['get', 'SCALERANK'], 10],
          ],
          paint: {
            // Bigger dots — easy to hover, visible at a glance
            'circle-radius': ['interpolate', ['linear'], ['zoom'],
              2, ['case', ['<=', ['get', 'SCALERANK'], 2], 4, 2],
              5, ['case', ['<=', ['get', 'SCALERANK'], 2], 7, ['<=', ['get', 'SCALERANK'], 4], 5, 4],
              9, ['case', ['<=', ['get', 'SCALERANK'], 2], 9, ['<=', ['get', 'SCALERANK'], 4], 7, 5],
            ],
            'circle-color': [
              'case',
              ['<=', ['get', 'SCALERANK'], 2], '#f8fafc',  // capitals/megacities: bright white
              ['<=', ['get', 'SCALERANK'], 4], '#e2e8f0',  // major cities: light
              '#94a3b8',                                    // smaller cities: muted
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 6, 1.5],
            'circle-stroke-color': '#0a1628',
            'circle-stroke-opacity': 0.8,
          },
        })

        // City name labels — appear progressively with zoom
        map.addLayer({
          id: 'city-labels',
          type: 'symbol',
          source: 'cities',
          minzoom: 3,
          filter: [
            'case',
            ['<', ['zoom'], 4], ['<=', ['get', 'SCALERANK'], 2],
            ['<', ['zoom'], 5], ['<=', ['get', 'SCALERANK'], 4],
            ['<', ['zoom'], 6], ['<=', ['get', 'SCALERANK'], 6],
            ['<=', ['get', 'SCALERANK'], 10],
          ],
          layout: {
            'text-field': ['get', 'NAME'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 5, 11, 8, 13],
            'text-offset': [0, 0.9],
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

        // Hover popup showing city + country + population
        const onMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (!e.features?.length) return
          map.getCanvas().style.cursor = 'pointer'
          const props = e.features[0].properties as {
            NAME: string
            ADM0NAME?: string
            POP_MAX?: number
            SCALERANK?: number
          }
          const pop = props.POP_MAX && props.POP_MAX > 0
            ? props.POP_MAX >= 1e6
              ? ` · ${(props.POP_MAX / 1e6).toFixed(1)}M`
              : ` · ${Math.round(props.POP_MAX / 1000)}K`
            : ''
          if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
          }
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="color:#fff;background:#1e293b;padding:5px 10px;border-radius:5px;font-size:12px;line-height:1.5">
                <b>${props.NAME}</b>${pop}
                ${props.ADM0NAME ? `<br/><span style="color:#94a3b8">${props.ADM0NAME}</span>` : ''}
              </div>
            `)
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
      .catch(() => { /* cities.geojson not yet downloaded */ })

    return () => {
      popupRef.current?.remove()
      if (map.getLayer('city-labels')) map.removeLayer('city-labels')
      if (map.getLayer('city-dots')) map.removeLayer('city-dots')
      if (map.getSource('cities')) map.removeSource('cities')
    }
  }, [map])

  return null
}
