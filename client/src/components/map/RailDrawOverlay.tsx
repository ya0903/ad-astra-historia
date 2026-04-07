import { useEffect, useMemo } from 'react'
import type { FeatureCollection } from 'geojson'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'
import { useRailDrawStore, useGameStore } from '../../stores'
import { isCoordInCountry } from '../../lib/mapFly'
import {
  interpolateStraight,
  interpolateBend,
  interpolateDoubleBend,
  interpolateSquiggle,
  lineLengthKm,
  type LngLat,
} from '@ad-astra/shared/railDrawing'
import type { RailStation } from '@ad-astra/shared/types'

const SOURCE_ID = 'rail-draft'
const LINE_LAYER = 'rail-draft-line'
const POINTS_LAYER = 'rail-draft-points'
const STATIONS_LAYER = 'rail-draft-stations'
const STATIONS_LABEL_LAYER = 'rail-draft-station-labels'

function interpolatePath(tool: string, waypoints: LngLat[]): LngLat[] {
  if (waypoints.length < 2) return waypoints
  switch (tool) {
    case 'bend': return interpolateBend(waypoints)
    case 'doubleBend': return interpolateDoubleBend(waypoints)
    case 'squiggle': return interpolateSquiggle(waypoints)
    default: return interpolateStraight(waypoints)
  }
}

function nearestPointOnPath(path: LngLat[], lng: number, lat: number): LngLat {
  let best: LngLat = path[0]
  let bestD = Infinity
  for (const p of path) {
    const dx = p[0] - lng
    const dy = p[1] - lat
    const d = dx * dx + dy * dy
    if (d < bestD) { bestD = d; best = p }
  }
  return best
}

export default function RailDrawOverlay() {
  const map = useMap()
  const mode = useRailDrawStore(s => s.mode)
  const tool = useRailDrawStore(s => s.tool)
  const railType = useRailDrawStore(s => s.railType)
  const waypoints = useRailDrawStore(s => s.waypoints)
  const stations = useRailDrawStore(s => s.stations)
  const borderValid = useRailDrawStore(s => s.borderValid)
  const addWaypoint = useRailDrawStore(s => s.addWaypoint)
  const undoWaypoint = useRailDrawStore(s => s.undoWaypoint)
  const cancel = useRailDrawStore(s => s.cancel)
  const setBorderValid = useRailDrawStore(s => s.setBorderValid)
  const addStation = useRailDrawStore(s => s.addStation)

  const playerCountryId = useGameStore(s => s.state?.playerCountryId)
  const allies = useGameStore(s => s.state?.allies ?? [])
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? [])

  const renderedPath = useMemo<LngLat[]>(
    () => interpolatePath(tool, waypoints as LngLat[]),
    [tool, waypoints],
  )

  // Border validity check
  useEffect(() => {
    if (mode === 'idle' || !playerCountryId || renderedPath.length < 2) {
      setBorderValid(true)
      return
    }
    const allowed = new Set<string>([
      playerCountryId.toUpperCase(),
      ...allies.map(a => a.toUpperCase()),
      ...controlledCountries.map(c => c.toUpperCase()),
    ])
    const sampleCount = 30
    const step = Math.max(1, Math.floor(renderedPath.length / sampleCount))
    let valid = true
    for (let i = 0; i < renderedPath.length; i += step) {
      const [lng, lat] = renderedPath[i]
      let inAny = false
      for (const iso of allowed) {
        if (isCoordInCountry(lng, lat, iso)) { inAny = true; break }
      }
      if (!inAny) { valid = false; break }
    }
    setBorderValid(valid)
  }, [mode, renderedPath, playerCountryId, allies, controlledCountries, setBorderValid])

  // Map click handler
  useEffect(() => {
    if (!map || mode === 'idle') return
    const handler = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      if (mode === 'drawing') {
        addWaypoint(lng, lat)
      } else if (mode === 'stationing') {
        if (renderedPath.length < 2) return
        const nearest = nearestPointOnPath(renderedPath, lng, lat)
        // 40km dedupe
        for (const st of stations) {
          const d = lineLengthKm([[st.lng, st.lat], nearest])
          if (d < 40) return
        }
        const max = railType === 'domestic_hsr' ? 8 : 12
        if (stations.length >= max) return
        const station: RailStation = {
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          lng: nearest[0],
          lat: nearest[1],
          name: `Station ${stations.length + 1}`,
          level: 1,
        }
        addStation(station)
      }
    }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map, mode, renderedPath, stations, railType, addWaypoint, addStation])

  // Keyboard listeners
  useEffect(() => {
    if (mode === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { cancel() }
      else if (e.key === 'Backspace' || (e.ctrlKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault()
        undoWaypoint()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, cancel, undoWaypoint])

  // Render the draft source/layers
  useEffect(() => {
    if (!map) return
    const colour = borderValid ? '#c084fc' : '#ef4444'

    const features: FeatureCollection['features'] = []
    if (renderedPath.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: renderedPath },
        properties: { kind: 'line' },
      })
    }
    for (const wp of waypoints) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: wp },
        properties: { kind: 'waypoint' },
      })
    }
    stations.forEach((st, i) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [st.lng, st.lat] },
        properties: { kind: 'station', name: st.name, level: st.level, label: String(i + 1) },
      })
    })

    const data: FeatureCollection = { type: 'FeatureCollection', features }

    if (map.getSource(SOURCE_ID)) {
      (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(data)
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data })
      map.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'line'],
        paint: {
          'line-color': colour,
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      })
      map.addLayer({
        id: POINTS_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'waypoint'],
        paint: {
          'circle-radius': 5,
          'circle-color': colour,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      // Stations: bigger filled circle so they're clearly distinct from waypoints
      map.addLayer({
        id: STATIONS_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'station'],
        paint: {
          'circle-radius': 12,
          'circle-color': '#a855f7',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        },
      })
      // Station number label inside the circle
      map.addLayer({
        id: STATIONS_LABEL_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'station'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-font': ['Noto Sans Regular'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })
    }

    // Update line colour dynamically
    if (map.getLayer(LINE_LAYER)) map.setPaintProperty(LINE_LAYER, 'line-color', colour)
    if (map.getLayer(POINTS_LAYER)) map.setPaintProperty(POINTS_LAYER, 'circle-color', colour)
    if (map.getLayer(STATIONS_LAYER)) map.setPaintProperty(STATIONS_LAYER, 'circle-stroke-color', colour)
  }, [map, renderedPath, waypoints, stations, borderValid])

  // Cleanup when leaving idle mode entirely
  useEffect(() => {
    if (!map) return
    if (mode !== 'idle') return
    if (map.getLayer(STATIONS_LABEL_LAYER)) map.removeLayer(STATIONS_LABEL_LAYER)
    if (map.getLayer(STATIONS_LAYER)) map.removeLayer(STATIONS_LAYER)
    if (map.getLayer(LINE_LAYER)) map.removeLayer(LINE_LAYER)
    if (map.getLayer(POINTS_LAYER)) map.removeLayer(POINTS_LAYER)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  }, [map, mode])

  return null
}
