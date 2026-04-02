import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

// ── Geometry helpers ──────────────────────────────────────────────────────────

type Ring = GeoJSON.Position[]

function ringArea(ring: Ring): number {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(area) / 2
}

function ringCentroid(ring: Ring): [number, number] {
  let cx = 0, cy = 0, area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    cx += (ring[j][0] + ring[i][0]) * cross
    cy += (ring[j][1] + ring[i][1]) * cross
    area += cross
  }
  area /= 2
  if (Math.abs(area) < 1e-10) {
    let x = 0, y = 0
    for (const [vx, vy] of ring) { x += vx; y += vy }
    return [x / ring.length, y / ring.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

function largestRing(geom: GeoJSON.Geometry): { ring: Ring; area: number } | null {
  const rings: Ring[] = []
  if (geom.type === 'Polygon') rings.push(geom.coordinates[0] as Ring)
  else if (geom.type === 'MultiPolygon') {
    for (const poly of (geom as GeoJSON.MultiPolygon).coordinates) rings.push(poly[0] as Ring)
  }
  if (rings.length === 0) return null
  let best = rings[0], bestArea = ringArea(best)
  for (let i = 1; i < rings.length; i++) {
    const a = ringArea(rings[i])
    if (a > bestArea) { bestArea = a; best = rings[i] }
  }
  return { ring: best, area: bestArea }
}

function sizeTier(area: number): number {
  if (area > 200) return 0
  if (area > 8)   return 1
  if (area > 0.3) return 2
  return 3
}

function buildLabelPoints(geojson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const best = new Map<string, { feature: GeoJSON.Feature; area: number }>()
  for (const feature of geojson.features) {
    const props = feature.properties as Record<string, unknown>
    let iso = (props?.ISO_A3 ?? props?.ADM0_A3 ?? '') as string
    if (!iso || iso === '-99') iso = (props?.ADMIN ?? props?.NAME ?? '') as string
    if (!iso) continue
    const lr = largestRing(feature.geometry as GeoJSON.Geometry)
    if (!lr) continue
    const existing = best.get(iso)
    if (!existing || lr.area > existing.area) best.set(iso, { feature, area: lr.area })
  }
  const points: GeoJSON.Feature[] = []
  for (const { feature, area } of best.values()) {
    const lr = largestRing(feature.geometry as GeoJSON.Geometry)
    if (!lr) continue
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: ringCentroid(lr.ring) },
      properties: { ...feature.properties, sizeTier: sizeTier(area) },
    })
  }
  return { type: 'FeatureCollection', features: points }
}

function buildColourExpression(
  countries: Record<string, { colour: string }>,
  playerCountryId: string
): ExpressionSpecification {
  const pairs = Object.entries(countries).flatMap(([iso, c]) => [
    iso,
    iso === playerCountryId ? lightenColour(c.colour) : c.colour,
  ])
  return ['match', ['get', 'ISO_A3'], ...pairs, '#374151'] as unknown as ExpressionSpecification
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CountryLayer() {
  const map = useMap()
  const countries = useGameStore(s => s.state?.countries ?? {})
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const hoveredIdRef = useRef<string | number | undefined>(undefined)

  // ── Effect 1: set up layers once when map is ready ────────────────────────
  useEffect(() => {
    if (!map || !playerCountryId) return

    fetch('/api/game/borders')
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (map.getSource('countries')) return

        const colourExpression = buildColourExpression(countries, playerCountryId)

        map.addSource('countries', { type: 'geojson', data: geojson })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            'fill-color': colourExpression,
            'fill-opacity': ['case', ['==', ['get', 'ISO_A3'], playerCountryId], 0.75, 0.5] as ExpressionSpecification,
          },
        })

        map.addLayer({
          id: 'country-borders', type: 'line', source: 'countries',
          paint: { 'line-color': '#1e3a5f', 'line-width': 0.8 },
        })

        map.addLayer({
          id: 'player-border-glow', type: 'line', source: 'countries',
          filter: ['==', ['get', 'ISO_A3'], playerCountryId] as ExpressionSpecification,
          paint: { 'line-color': '#60a5fa', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 6 },
        })

        map.addLayer({
          id: 'player-border', type: 'line', source: 'countries',
          filter: ['==', ['get', 'ISO_A3'], playerCountryId] as ExpressionSpecification,
          paint: { 'line-color': '#93c5fd', 'line-width': 1.5, 'line-opacity': 0.85 },
        })

        map.addLayer({
          id: 'country-hover', type: 'fill', source: 'countries',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0] as ExpressionSpecification,
          },
        })

        const labelPoints = buildLabelPoints(geojson)
        map.addSource('country-label-points', { type: 'geojson', data: labelPoints })

        const labelLayout = {
          'text-field': ['get', 'ADMIN'] as ExpressionSpecification,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 4, 12, 5, 13] as ExpressionSpecification,
          'text-max-width': 7,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-letter-spacing': 0.08,
          'text-transform': 'uppercase' as const,
        }
        const labelPaint = { 'text-color': '#e2e8f0', 'text-halo-color': '#0a1628', 'text-halo-width': 1.5 }

        map.addLayer({ id: 'country-labels-0', type: 'symbol', source: 'country-label-points', minzoom: 1.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 0] as ExpressionSpecification, layout: labelLayout, paint: labelPaint })
        map.addLayer({ id: 'country-labels-1', type: 'symbol', source: 'country-label-points', minzoom: 2, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 1] as ExpressionSpecification, layout: labelLayout, paint: labelPaint })
        map.addLayer({ id: 'country-labels-2', type: 'symbol', source: 'country-label-points', minzoom: 3.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 2] as ExpressionSpecification, layout: labelLayout, paint: labelPaint })
        map.addLayer({ id: 'country-labels-3', type: 'symbol', source: 'country-label-points', minzoom: 5.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 3] as ExpressionSpecification, layout: labelLayout, paint: labelPaint })
      })
      .catch(console.error)

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
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      for (const id of ['country-labels-3', 'country-labels-2', 'country-labels-1', 'country-labels-0', 'player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('country-label-points')) map.removeSource('country-label-points')
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, playerCountryId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: update fill colours when country stats change (no layer rebuild) ──
  useEffect(() => {
    if (!map || !playerCountryId || !map.getLayer('country-fills')) return
    map.setPaintProperty('country-fills', 'fill-color', buildColourExpression(countries, playerCountryId))
  }, [map, countries, playerCountryId])

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
