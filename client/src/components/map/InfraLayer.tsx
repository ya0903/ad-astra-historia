import { useEffect, useRef } from 'react'
import type { GeoJSON } from 'geojson'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'
import { INFRA_COLOURS, HIDDEN_INFRA_TYPES } from '@ad-astra/shared/infraColours'

export default function InfraLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map || !gameState) return

    const playerCountryId = gameState.playerCountryId

    // Filter infra — hide sensitive types from other countries
    const visible = gameState.infrastructureMap.filter(item => {
      if ((HIDDEN_INFRA_TYPES as readonly string[]).includes(item.type)) {
        return item.countryId === playerCountryId
      }
      return true
    })

    // Build GeoJSON FeatureCollection
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visible.map(item => ({
        type: 'Feature',
        id: item.id,
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
        properties: {
          id: item.id,
          type: item.type,
          name: item.name,
          level: item.level,
          countryId: item.countryId,
          colour: INFRA_COLOURS[item.type],
        },
      })),
    }

    if (map.getSource('infrastructure')) {
      // Update existing source
      (map.getSource('infrastructure') as maplibregl.GeoJSONSource).setData(geojson)
      return
    }

    map.addSource('infrastructure', { type: 'geojson', data: geojson })

    // Glow effect: large faint circle behind small bright dot
    map.addLayer({
      id: 'infra-glow',
      type: 'circle',
      source: 'infrastructure',
      minzoom: 4,
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'colour'],
        'circle-opacity': 0.2,
        'circle-blur': 1,
      },
    })

    map.addLayer({
      id: 'infra-dots',
      type: 'circle',
      source: 'infrastructure',
      minzoom: 4,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 6],
        'circle-color': ['get', 'colour'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.4,
      },
    })

    // Hover
    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      map.getCanvas().style.cursor = 'pointer'
      const props = e.features[0].properties as { name: string; type: string; level: number }
      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
      }
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`<div style="color:#fff;background:#1e293b;padding:4px 8px;border-radius:4px;font-size:12px"><b>${props.name}</b><br/>${props.type} (lv ${props.level})</div>`)
        .addTo(map)
    }

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      popupRef.current = null
    }

    map.on('mousemove', 'infra-dots', onMouseMove)
    map.on('mouseleave', 'infra-dots', onMouseLeave)

    return () => {
      map.off('mousemove', 'infra-dots', onMouseMove)
      map.off('mouseleave', 'infra-dots', onMouseLeave)
      popupRef.current?.remove()
      if (map.getLayer('infra-dots')) map.removeLayer('infra-dots')
      if (map.getLayer('infra-glow')) map.removeLayer('infra-glow')
      if (map.getSource('infrastructure')) map.removeSource('infrastructure')
    }
  }, [map, gameState])

  return null
}
