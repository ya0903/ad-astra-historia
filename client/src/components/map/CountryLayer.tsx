import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

export default function CountryLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  // No popup — country names are shown as permanent labels on the map
  const hoveredIdRef = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    if (!map || !gameState) return

    const era = gameState.era
    const playerCountryId = gameState.playerCountryId

    fetch(`/api/game/geojson/${era}`)
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (map.getSource('countries')) return

        const colourPairs = Object.entries(gameState.countries).flatMap(([iso, country]) => [
          iso,
          iso === playerCountryId ? lightenColour(country.colour) : country.colour,
        ])
        const colourExpression = [
          'match',
          ['get', 'ISO_A3'],
          ...colourPairs,
          '#374151',
        ] as unknown as ExpressionSpecification

        map.addSource('countries', { type: 'geojson', data: geojson })

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

        // Hover highlight
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

        // Permanent country name labels — CK3/Pax Historia style
        // Names sit over the landmass at the polygon centroid
        map.addLayer({
          id: 'country-labels',
          type: 'symbol',
          source: 'countries',
          minzoom: 1.5,
          layout: {
            'text-field': ['get', 'ADMIN'],
            // Noto Sans Regular is available from the protomaps glyphs CDN
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 4, 11, 6, 14],
            'text-max-width': 7,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-letter-spacing': 0.05,
          },
          paint: {
            'text-color': '#e2e8f0',
            'text-halo-color': '#0a1628',
            'text-halo-width': 1.5,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 1.5, 0, 2, 1],
          },
        })
      })
      .catch(console.error)

    // Hover highlight (no popup — label is always visible)
    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        if (hoveredIdRef.current !== undefined) {
          map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: false })
        }
        hoveredIdRef.current = e.features[0].id
        if (hoveredIdRef.current !== undefined) {
          map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: true })
        }
      }
    }

    const onMouseLeave = () => {
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = undefined
      }
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

      if (map.getLayer('country-labels')) map.removeLayer('country-labels')
      if (map.getLayer('country-hover')) map.removeLayer('country-hover')
      if (map.getLayer('country-borders')) map.removeLayer('country-borders')
      if (map.getLayer('country-fills')) map.removeLayer('country-fills')
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, gameState])

  return null
}

function lightenColour(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.3))
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.3))
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.3))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
