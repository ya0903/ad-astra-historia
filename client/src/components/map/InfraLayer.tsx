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
      const colour = (e.features[0].properties as { colour?: string }).colour ?? '#94a3b8'
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="
            background:#0d1b31;
            border:1px solid rgba(255,255,255,0.12);
            border-radius:10px;
            padding:8px 12px;
            font-family:system-ui,sans-serif;
            font-size:12px;
            line-height:1.5;
            min-width:120px;
            box-shadow:0 4px 20px rgba(0,0,0,0.6);
          ">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${colour};flex-shrink:0;display:inline-block"></span>
              <span style="color:#fff;font-weight:600;font-size:13px">${props.name}</span>
            </div>
            <div style="color:#64748b;font-size:11px;margin-top:2px;text-transform:capitalize">${props.type} · Level ${props.level}</div>
          </div>
        `)
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
