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
    // If a rail line has no explicit `stations` array (legacy lines built
    // before the station pipeline shipped), fall back to synthesising dots
    // from its waypoints so there's always visible markers on the route.
    const stationFeatures = gameState.railLines.flatMap(r => {
      const sts = r.stations ?? []
      if (sts.length > 0) {
        return sts.map(s => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: { name: s.name, level: s.level, city: s.city ?? '' },
        }))
      }
      // Fallback: first + last of waypoints (or from/to coords)
      const pts: [number, number][] = []
      if (r.waypoints && r.waypoints.length >= 2) {
        pts.push(r.waypoints[0] as [number, number])
        pts.push(r.waypoints[r.waypoints.length - 1] as [number, number])
      } else if (r.fromCoords && r.toCoords) {
        pts.push(r.fromCoords as [number, number])
        pts.push(r.toCoords as [number, number])
      }
      return pts.map((p, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p },
        properties: { name: i === 0 ? (r.fromCity ?? 'Origin') : (r.toCity ?? 'Terminus'), level: 1, city: '' },
      }))
    })
    const stationGeojson = { type: 'FeatureCollection' as const, features: stationFeatures }
    const STATION_SOURCE = 'rail-stations-src'
    const STATION_LAYER = 'rail-stations'
    if (map.getSource(STATION_SOURCE)) {
      (map.getSource(STATION_SOURCE) as maplibregl.GeoJSONSource).setData(stationGeojson)
    } else {
      map.addSource(STATION_SOURCE, { type: 'geojson', data: stationGeojson })
      map.addLayer({
        id: STATION_LAYER,
        type: 'circle',
        source: STATION_SOURCE,
        minzoom: 0,
        paint: {
          // Bigger so they're actually visible on top of the 2px rail line
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 6, 5, 9, 7],
          'circle-color': '#facc15',
          'circle-stroke-color': '#0a1020',
          'circle-stroke-width': 1.2,
        },
      })
    }

    // Always re-move the station layer to the very top so any rail-line
    // layers added later (new rail types) don't draw over the dots.
    if (map.getLayer(STATION_LAYER)) {
      try { map.moveLayer(STATION_LAYER) } catch { /* no-op */ }
      map.setLayoutProperty(STATION_LAYER, 'visibility', drawMode === 'idle' ? 'visible' : 'none')
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
      if (map.getLayer('rail-stations')) map.removeLayer('rail-stations')
      if (map.getSource('rail-stations-src')) map.removeSource('rail-stations-src')
      popupRef.current?.remove()
    }
  }, [map, gameState, drawMode])

  // ── Click handler: clicking a station starts a new rail line from it ──
  useEffect(() => {
    if (!map) return
    const LYR = 'rail-stations'

    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
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
    }
  }, [map])

  return null
}
