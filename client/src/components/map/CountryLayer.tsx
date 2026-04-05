import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { getCountryColour } from '@ad-astra/shared/countries'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

// ── Graph-colouring palette ───────────────────────────────────────────────────
// 10 visually distinct colours for the dark (#0a1628) base map.
// Neighbours must never share a colour (4-colour theorem guarantees ≥4 suffices,
// but we use 10 to maximise visual distinction).
const GEO_PALETTE = [
  '#1a6b9a', // deep blue
  '#8b3a3a', // brick red
  '#2d7a4f', // forest green
  '#7a5f1a', // dark gold
  '#5a2d7a', // purple
  '#1a7a7a', // teal
  '#7a3a5a', // mauve
  '#3a5a1a', // olive
  '#7a4a1a', // burnt orange
  '#1a4a7a', // navy
]

/**
 * Build an adjacency map from shared polygon vertices.
 * Uses an O(total_vertices) hash approach — much faster than O(n²×coords).
 * Round to 1dp (~11 km) so border points from adjacent polygons match.
 */
function buildAdjacency(geojson: GeoJSON.FeatureCollection): Map<string, Set<string>> {
  // coord-key → set of ISO codes that have a vertex there
  const coordToIsos = new Map<string, Set<string>>()

  for (const f of geojson.features) {
    const p = f.properties as Record<string, unknown>
    const iso = (p?.ISO_A3 ?? p?.ADM0_A3 ?? '') as string
    if (!iso) continue
    for (const [lng, lat] of extractCoords(f.geometry as GeoJSON.Geometry)) {
      const key = `${lng.toFixed(1)},${lat.toFixed(1)}`
      let s = coordToIsos.get(key)
      if (!s) { s = new Set(); coordToIsos.set(key, s) }
      s.add(iso)
    }
  }

  // Any coord shared by 2+ countries → those countries are adjacent
  const adj = new Map<string, Set<string>>()
  for (const isos of coordToIsos.values()) {
    if (isos.size < 2) continue
    const arr = [...isos]
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j]
        if (!adj.has(a)) adj.set(a, new Set())
        if (!adj.has(b)) adj.set(b, new Set())
        adj.get(a)!.add(b)
        adj.get(b)!.add(a)
      }
    }
  }
  return adj
}

function extractCoords(geom: GeoJSON.Geometry): [number, number][] {
  if (geom.type === 'Polygon') return geom.coordinates.flatMap(ring => ring as [number, number][])
  if (geom.type === 'MultiPolygon') return geom.coordinates.flatMap(poly => poly.flatMap(ring => ring as [number, number][]))
  return []
}

/**
 * Greedy graph colouring — assigns a palette index to each country such that
 * no two adjacent countries share a colour.
 */
function greedyColour(isoList: string[], adj: Map<string, Set<string>>): Map<string, string> {
  const result = new Map<string, string>()
  // Sort by degree descending (most-connected first) for better greedy results
  const sorted = [...isoList].sort((a, b) => (adj.get(b)?.size ?? 0) - (adj.get(a)?.size ?? 0))

  for (const iso of sorted) {
    const usedByNeighbours = new Set<string>()
    for (const nb of adj.get(iso) ?? []) {
      const c = result.get(nb)
      if (c) usedByNeighbours.add(c)
    }
    const colour = GEO_PALETTE.find(c => !usedByNeighbours.has(c)) ?? GEO_PALETTE[0]
    result.set(iso, colour)
  }
  return result
}

// Cache graph-coloured palette per GeoJSON reference so we don't recompute
const colourCache = new WeakMap<GeoJSON.FeatureCollection, Map<string, string>>()

/** Stamp fill_colour using a pre-computed graphColours map (or static fallback). */
function stampColours(
  geojson: GeoJSON.FeatureCollection,
  playerCountryId: string,
  controlledCountries: string[],
  graphColours: Map<string, string> | null,
): GeoJSON.FeatureCollection {
  const playerColour = getCountryColour(playerCountryId)
  const controlledSet = new Set(controlledCountries)
  return {
    ...geojson,
    features: geojson.features.map(f => {
      const p = f.properties as Record<string, unknown>
      const iso = (p?.ISO_A3 ?? p?.ADM0_A3 ?? '') as string
      const base = graphColours?.get(iso) ?? getCountryColour(iso)
      const colour =
        iso === playerCountryId ? lightenColour(base) :
        controlledSet.has(iso) ? tintOccupied(playerColour) :
        base
      return { ...f, properties: { ...p, fill_colour: colour } }
    }),
  }
}

/**
 * Compute graph colours asynchronously (deferred via setTimeout so the
 * browser paints the map first), then push an update to the GeoJSON source.
 */
function buildGraphColoursAsync(
  geojson: GeoJSON.FeatureCollection,
  onDone: (colours: Map<string, string>) => void,
): void {
  // Already cached — call back immediately next tick
  const cached = colourCache.get(geojson)
  if (cached) { setTimeout(() => onDone(cached), 0); return }

  setTimeout(() => {
    const adj = buildAdjacency(geojson)
    const isoList = geojson.features.map(f => {
      const p = f.properties as Record<string, unknown>
      return (p?.ISO_A3 ?? p?.ADM0_A3 ?? '') as string
    }).filter(Boolean)
    const colours = greedyColour(isoList, adj)
    colourCache.set(geojson, colours)
    onDone(colours)
  }, 0)
}

// ── Component ────────────────────────────────────────────────────────────────

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku'])

export default function CountryLayer() {
  const map = useMap()
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? [])
  const era = useGameStore(s => s.state?.era)
  const hoveredIdRef = useRef<string | number | undefined>(undefined)
  // Raw GeoJSON stored after fetch — Effect 2 re-injects colours when empire changes
  const rawGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null)

  // ── Effect 1: fetch borders and set up layers ─────────────────────────────
  useEffect(() => {
    if (!map || !playerCountryId || !era) return

    const controller = new AbortController()
    const bordersUrl = ANCIENT_ERAS.has(era) ? `/api/game/borders/${era}` : '/api/game/borders'
    fetch(bordersUrl, { signal: controller.signal })
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (map.getSource('countries')) return

        rawGeojsonRef.current = geojson
        // Render immediately with static colours so map paints without blocking
        const coloured = stampColours(geojson, playerCountryId, controlledCountries, null)
        map.addSource('countries', { type: 'geojson', data: coloured })

        // Compute adjacency off the critical path, then re-colour
        buildGraphColoursAsync(geojson, (graphColours) => {
          const src = map.getSource('countries') as maplibregl.GeoJSONSource | undefined
          if (!src) return
          src.setData(stampColours(geojson, playerCountryId, controlledCountries, graphColours))
        })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            'fill-color': ['coalesce', ['get', 'fill_colour'], '#1a4a7a'] as ExpressionSpecification,
            'fill-opacity': ['step', ['zoom'],
              0.75,
              3, 0.70,
              4, 0.62,
              5, 0.52,
              6, 0.40,
              8, 0.22,
            ] as ExpressionSpecification,
          },
        })

        map.addLayer({
          id: 'country-borders', type: 'line', source: 'countries',
          paint: {
            'line-color': '#2a5580',
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 3, 1.0, 5, 1.6, 7, 2.2] as ExpressionSpecification,
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 3, 0.75, 6, 0.9] as ExpressionSpecification,
          },
        })

        const empireFilter = ['in', ['get', 'ISO_A3'], ['literal', [playerCountryId, ...controlledCountries]]] as ExpressionSpecification

        map.addLayer({
          id: 'player-border-glow', type: 'line', source: 'countries',
          filter: empireFilter,
          paint: { 'line-color': '#60a5fa', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 6 },
        })

        map.addLayer({
          id: 'player-border', type: 'line', source: 'countries',
          filter: empireFilter,
          paint: { 'line-color': '#93c5fd', 'line-width': 1.5, 'line-opacity': 0.85 },
        })

        map.addLayer({
          id: 'country-hover', type: 'fill', source: 'countries',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0] as ExpressionSpecification,
          },
        })
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })

    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        if (hoveredIdRef.current !== undefined)
          map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = e.features[0].id
        if (hoveredIdRef.current !== undefined)
          map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: true })
      }
    }
    const onMouseLeave = () => {
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState({ source: 'countries', id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = undefined
      }
    }

    map.on('mousemove', 'country-fills', onMouseMove)
    map.on('mouseleave', 'country-fills', onMouseLeave)

    return () => {
      controller.abort()
      rawGeojsonRef.current = null
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      for (const id of ['player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, playerCountryId, era]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: re-inject colours when empire changes ───────────────────────
  useEffect(() => {
    if (!map || !playerCountryId || !rawGeojsonRef.current) return
    const src = map.getSource('countries') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    const geojson = rawGeojsonRef.current
    const graphColours = colourCache.get(geojson) ?? null
    src.setData(stampColours(geojson, playerCountryId, controlledCountries, graphColours))
    const empireFilter = ['in', ['get', 'ISO_A3'], ['literal', [playerCountryId, ...controlledCountries]]] as ExpressionSpecification
    if (map.getLayer('player-border')) map.setFilter('player-border', empireFilter)
    if (map.getLayer('player-border-glow')) map.setFilter('player-border-glow', empireFilter)
  }, [map, playerCountryId, controlledCountries])

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

function tintOccupied(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const or_ = Math.min(255, Math.round(r + (255 - r) * 0.15))
  const og = Math.min(255, Math.round(g + (255 - g) * 0.15))
  const ob = Math.min(255, Math.round(b + (255 - b) * 0.15))
  return `#${or_.toString(16).padStart(2, '0')}${og.toString(16).padStart(2, '0')}${ob.toString(16).padStart(2, '0')}`
}
