import { useEffect, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'
import { useRailDrawStore } from '../../stores/railDrawStore'
import { RAIL_COLOURS } from '@ad-astra/shared/infraColours'
import type { RailType } from '@ad-astra/shared/types'

const RAIL_DASH: Record<RailType, number[] | null> = {
  domestic_hsr: null,
  cross_continent: [4, 3],
  undersea_tunnel: [2, 4],
}

const RAIL_WIDTH: Record<RailType, number> = {
  domestic_hsr: 2,
  cross_continent: 2,
  undersea_tunnel: 1.5,
}

export default function RailLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const drawMode = useRailDrawStore(s => s.mode)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map || !gameState) return

    const railTypes: RailType[] = ['domestic_hsr', 'cross_continent', 'undersea_tunnel']

    railTypes.forEach(railType => {
      const sourceId = `rail-${railType}`
      const layerId = `rail-line-${railType}`

      const lines = gameState.railLines.filter(r => r.type === railType)

      const geojson: FeatureCollection = {
        type: 'FeatureCollection',
        features: lines.map(r => ({
          type: 'Feature',
          id: r.id,
          geometry: {
            type: 'LineString',
            coordinates: r.waypoints ?? [r.fromCoords, r.toCoords],
          },
          properties: {
            id: r.id,
            type: r.type,
            fromCity: r.fromCity,
            toCity: r.toCity,
            label: r.waypoints && r.waypoints.length > 2
              ? `${r.fromCity} → … → ${r.toCity}`
              : `${r.fromCity} → ${r.toCity}`,
          },
        })),
      }

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson)
        return
      }

      map.addSource(sourceId, { type: 'geojson', data: geojson })

      const paint: maplibregl.LineLayerSpecification['paint'] = {
        'line-color': RAIL_COLOURS[railType],
        'line-width': RAIL_WIDTH[railType],
        'line-opacity': 0.85,
      }

      if (RAIL_DASH[railType]) {
        paint['line-dasharray'] = RAIL_DASH[railType] as number[]
      }

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        minzoom: 3,
        paint,
      })
    })

    // Hover for all rail types
    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features?.length) return
      map.getCanvas().style.cursor = 'pointer'
      const props = e.features[0].properties as { fromCity: string; toCity: string; type: string; label: string }
      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
      }
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`<div style="color:#fff;background:#1e293b;padding:4px 8px;border-radius:4px;font-size:12px"><b>${props.label ?? `${props.fromCity} → ${props.toCity}`}</b><br/>${props.type}</div>`)
        .addTo(map)
    }

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      popupRef.current = null
    }

    // ── Station dots on top of rail lines ──
    const stationFeatures = gameState.railLines.flatMap(r =>
      (r.stations ?? []).map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { name: s.name, level: s.level, city: s.city ?? '' },
      }))
    )
    const stationGeojson = { type: 'FeatureCollection' as const, features: stationFeatures }
    const STATION_SOURCE = 'rail-stations'
    const STATION_LAYER = 'rail-station-dots'
    if (map.getSource(STATION_SOURCE)) {
      (map.getSource(STATION_SOURCE) as maplibregl.GeoJSONSource).setData(stationGeojson)
    } else {
      map.addSource(STATION_SOURCE, { type: 'geojson', data: stationGeojson })
      map.addLayer({
        id: STATION_LAYER,
        type: 'circle',
        source: STATION_SOURCE,
        minzoom: 3,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'level'], 1, 3, 3, 6, 5, 10],
          'circle-color': '#ffffff',
          'circle-stroke-color': ['interpolate', ['linear'], ['get', 'level'], 1, '#94a3b8', 3, '#60a5fa', 5, '#22d3ee'],
          'circle-stroke-width': ['interpolate', ['linear'], ['get', 'level'], 1, 0.5, 3, 1.5, 5, 3],
        },
      })
    }

    const railLayerIds = ['rail-line-domestic_hsr', 'rail-line-cross_continent', 'rail-line-undersea_tunnel']
    railLayerIds.forEach(id => {
      map.on('mousemove', id, onMouseMove)
      map.on('mouseleave', id, onMouseLeave)
    })

    return () => {
      railLayerIds.forEach(id => {
        map.off('mousemove', id, onMouseMove)
        map.off('mouseleave', id, onMouseLeave)
        if (map.getLayer(id)) map.removeLayer(id)
      })
      railTypes.forEach(t => {
        if (map.getSource(`rail-${t}`)) map.removeSource(`rail-${t}`)
      })
      if (map.getLayer('rail-station-dots')) map.removeLayer('rail-station-dots')
      if (map.getSource('rail-stations')) map.removeSource('rail-stations')
      popupRef.current?.remove()
    }
  }, [map, gameState])

  // ── Clickable yellow dots to start a new rail line from existing stations ──
  useEffect(() => {
    if (!map || !gameState) return
    const playerCountryId = gameState.playerCountryId
    const SRC = 'rail-start-dots-src'
    const LYR = 'rail-start-dots-layer'

    const features = gameState.railLines
      .filter(r => r.countryId === playerCountryId)
      .flatMap(r => (r.stations ?? []).map(s => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { name: s.name, lng: s.lng, lat: s.lat },
      })))
    const data = { type: 'FeatureCollection' as const, features }

    if (map.getSource(SRC)) {
      (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(data)
    } else {
      map.addSource(SRC, { type: 'geojson', data })
      map.addLayer({
        id: LYR,
        type: 'circle',
        source: SRC,
        minzoom: 3,
        paint: {
          // Small dot that sits inside the existing station marker on the
          // rail line. Significantly smaller than `rail-stations` (3-10px)
          // so it reads as a subtle "click me to branch off" indicator.
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1, 9, 2.5],
          'circle-color': '#facc15',
          'circle-stroke-color': '#1a1a1a',
          'circle-stroke-width': 0.5,
        },
      })
    }

    // Toggle visibility based on draw mode
    if (map.getLayer(LYR)) {
      map.setLayoutProperty(LYR, 'visibility', drawMode === 'idle' ? 'visible' : 'none')
    }

    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0]
      if (!f) return
      const props = f.properties as { lng: number; lat: number }
      const lng = typeof props.lng === 'number' ? props.lng : Number(props.lng)
      const lat = typeof props.lat === 'number' ? props.lat : Number(props.lat)
      const store = useRailDrawStore.getState()
      store.startDrawing('domestic_hsr')
      useRailDrawStore.getState().addWaypoint(lng, lat)
      e.originalEvent?.stopPropagation?.()
    }
    const onEnter = () => { map.getCanvas().style.cursor = 'pointer' }
    const onLeave = () => { map.getCanvas().style.cursor = '' }

    map.on('click', LYR, onClick)
    map.on('mouseenter', LYR, onEnter)
    map.on('mouseleave', LYR, onLeave)

    return () => {
      map.off('click', LYR, onClick)
      map.off('mouseenter', LYR, onEnter)
      map.off('mouseleave', LYR, onLeave)
      if (map.getLayer(LYR)) map.removeLayer(LYR)
      if (map.getSource(SRC)) map.removeSource(SRC)
    }
  }, [map, gameState, drawMode])

  return null
}
