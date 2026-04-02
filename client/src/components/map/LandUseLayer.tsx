import { useEffect } from 'react'
import type { FeatureCollection } from 'geojson'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'
import { LAND_USE_COLOURS } from '@ad-astra/shared/infraColours'
import type { LandUseType, PassageStatus } from '@ad-astra/shared/types'

const PASSAGE_LOCATIONS: Record<string, [number, number]> = {
  hormuz: [56.5, 26.5],
  malacca: [103.8, 1.25],
  suez: [32.5, 30.7],
  panama: [-79.9, 9.1],
  bosporus: [29.0, 41.0],
  gibraltar: [-5.35, 35.99],
  'bab-el-mandeb': [43.4, 12.6],
}

const STATUS_COLOUR: Record<PassageStatus, string> = {
  open: '#22c55e',
  tolled: '#eab308',
  blocked: '#ef4444',
}

export default function LandUseLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)

  useEffect(() => {
    if (!map || !gameState) return

    // Land use polygons
    const landUseGeojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: gameState.landUseRegions.map(region => ({
        type: 'Feature',
        id: region.id,
        geometry: {
          type: 'Polygon',
          // Close the polygon
          coordinates: [[...region.polygon, region.polygon[0]]],
        },
        properties: {
          id: region.id,
          type: region.type,
          colour: LAND_USE_COLOURS[region.type as LandUseType],
        },
      })),
    }

    if (map.getSource('land-use')) {
      (map.getSource('land-use') as maplibregl.GeoJSONSource).setData(landUseGeojson)
    } else {
      map.addSource('land-use', { type: 'geojson', data: landUseGeojson })
      map.addLayer({
        id: 'land-use-fill',
        type: 'fill',
        source: 'land-use',
        paint: {
          'fill-color': ['get', 'colour'],
          'fill-opacity': 0.4,
        },
      })
    }

    // Strategic passages
    const passageGeojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: Object.entries(gameState.strategicPassages).map(([id, status]) => {
        const coords = PASSAGE_LOCATIONS[id]
        if (!coords) return null
        return {
          type: 'Feature' as const,
          id,
          geometry: { type: 'Point' as const, coordinates: coords },
          properties: {
            id,
            status,
            colour: STATUS_COLOUR[status as PassageStatus],
            label: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          },
        }
      }).filter((f): f is NonNullable<typeof f> => f !== null),
    }

    if (map.getSource('passages')) {
      (map.getSource('passages') as maplibregl.GeoJSONSource).setData(passageGeojson)
    } else {
      map.addSource('passages', { type: 'geojson', data: passageGeojson })

      map.addLayer({
        id: 'passage-glow',
        type: 'circle',
        source: 'passages',
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'colour'],
          'circle-opacity': 0.25,
          'circle-blur': 1,
        },
      })

      map.addLayer({
        id: 'passage-dots',
        type: 'circle',
        source: 'passages',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'colour'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.7,
        },
      })
    }

    return () => {
      if (map.getLayer('passage-dots')) map.removeLayer('passage-dots')
      if (map.getLayer('passage-glow')) map.removeLayer('passage-glow')
      if (map.getSource('passages')) map.removeSource('passages')
      if (map.getLayer('land-use-fill')) map.removeLayer('land-use-fill')
      if (map.getSource('land-use')) map.removeSource('land-use')
    }
  }, [map, gameState])

  return null
}
