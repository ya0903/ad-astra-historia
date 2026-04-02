import { useEffect, useRef } from 'react'
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

const PASSAGE_NAMES: Record<string, string> = {
  hormuz: 'Strait of Hormuz',
  malacca: 'Strait of Malacca',
  suez: 'Suez Canal',
  panama: 'Panama Canal',
  bosporus: 'Bosporus Strait',
  gibraltar: 'Strait of Gibraltar',
  'bab-el-mandeb': 'Bab-el-Mandeb',
}

const STATUS_COLOUR: Record<PassageStatus, string> = {
  open: '#22c55e',
  tolled: '#eab308',
  blocked: '#ef4444',
}

const STATUS_LABEL: Record<PassageStatus, string> = {
  open: 'Open',
  tolled: 'Tolled',
  blocked: 'Blocked',
}

export default function LandUseLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const popupRef = useRef<maplibregl.Popup | null>(null)

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
            name: PASSAGE_NAMES[id] ?? id,
            statusLabel: STATUS_LABEL[status as PassageStatus] ?? status,
          },
        }
      }).filter((f): f is NonNullable<typeof f> => f !== null),
    }

    if (map.getSource('passages')) {
      (map.getSource('passages') as maplibregl.GeoJSONSource).setData(passageGeojson)
      return
    }

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

    // Hover tooltip on passage dots
    const onPassageMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      map.getCanvas().style.cursor = 'pointer'
      const props = e.features[0].properties as { name: string; statusLabel: string; colour: string }
      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
      }
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="color:#fff;background:#1e293b;padding:6px 10px;border-radius:6px;font-size:12px;line-height:1.5">
            <b>${props.name}</b><br/>
            <span style="color:${props.colour}">${props.statusLabel}</span>
          </div>
        `)
        .addTo(map)
    }

    const onPassageLeave = () => {
      map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      popupRef.current = null
    }

    map.on('mousemove', 'passage-dots', onPassageMove)
    map.on('mouseleave', 'passage-dots', onPassageLeave)

    return () => {
      map.off('mousemove', 'passage-dots', onPassageMove)
      map.off('mouseleave', 'passage-dots', onPassageLeave)
      popupRef.current?.remove()
      if (map.getLayer('passage-dots')) map.removeLayer('passage-dots')
      if (map.getLayer('passage-glow')) map.removeLayer('passage-glow')
      if (map.getSource('passages')) map.removeSource('passages')
      if (map.getLayer('land-use-fill')) map.removeLayer('land-use-fill')
      if (map.getSource('land-use')) map.removeSource('land-use')
    }
  }, [map, gameState])

  return null
}
