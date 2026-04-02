import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

export default function CountryLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map || !gameState) return

    const era = gameState.era
    const playerCountryId = gameState.playerCountryId

    // Fetch GeoJSON for this era
    fetch(`/api/game/geojson/${era}`)
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (map.getSource('countries')) return // already added

        // Build colour expression from country data
        // MapLibre expression: match ISO_A3 → colour
        const colourPairs = Object.entries(gameState.countries).flatMap(([iso, country]) => [
          iso,
          iso === playerCountryId ? lightenColour(country.colour) : country.colour,
        ])
        const colourExpression = [
          'match',
          ['get', 'ISO_A3'],
          ...colourPairs,
          '#374151', // fallback
        ] as unknown as ExpressionSpecification

        map.addSource('countries', {
          type: 'geojson',
          data: geojson,
        })

        map.addLayer({
          id: 'country-fills',
          type: 'fill',
          source: 'countries',
          paint: {
            'fill-color': colourExpression,
            'fill-opacity': [
              'case',
              ['==', ['get', 'ISO_A3'], playerCountryId],
              0.75,
              0.5,
            ] as ExpressionSpecification,
          },
        })

        map.addLayer({
          id: 'country-borders',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': '#1e3a5f',
            'line-width': 0.8,
          },
        })

        // Hover highlight layer
        map.addLayer({
          id: 'country-hover',
          type: 'fill',
          source: 'countries',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.15,
              0,
            ] as ExpressionSpecification,
          },
        })
      })
      .catch(console.error)

    // Hover events
    let hoveredId: string | number | undefined
    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        if (hoveredId !== undefined) {
          map.setFeatureState({ source: 'countries', id: hoveredId }, { hover: false })
        }
        hoveredId = e.features[0].id
        if (hoveredId !== undefined) {
          map.setFeatureState({ source: 'countries', id: hoveredId }, { hover: true })
        }
        const iso = e.features[0].properties?.ISO_A3 as string
        const country = gameState.countries[iso]
        const name = country?.name ?? iso

        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        }
        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`<div style="color:#fff;background:#1e293b;padding:4px 8px;border-radius:4px;font-size:12px">${name}</div>`)
          .addTo(map)
      }
    }

    const onMouseLeave = () => {
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: 'countries', id: hoveredId }, { hover: false })
        hoveredId = undefined
      }
      popupRef.current?.remove()
      popupRef.current = null
    }

    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const iso = e.features[0].properties?.ISO_A3 as string
        console.log('Clicked country:', iso)
      }
    }

    map.on('mousemove', 'country-fills', onMouseMove)
    map.on('mouseleave', 'country-fills', onMouseLeave)
    map.on('click', 'country-fills', onClick)

    return () => {
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      map.off('click', 'country-fills', onClick)
      popupRef.current?.remove()

      if (map.getLayer('country-hover')) map.removeLayer('country-hover')
      if (map.getLayer('country-borders')) map.removeLayer('country-borders')
      if (map.getLayer('country-fills')) map.removeLayer('country-fills')
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, gameState])

  return null
}

function lightenColour(hex: string): string {
  // Simple lightening: blend toward white by 30%
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.3))
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.3))
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.3))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
