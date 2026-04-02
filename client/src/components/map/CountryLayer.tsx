import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

// ── Geometry helpers ──────────────────────────────────────────────────────────

type Ring = GeoJSON.Position[]

// Shoelace formula — actual polygon area in deg² (much more accurate than
// vertex count, correctly picks mainland Norway over Svalbard, etc.)
function ringArea(ring: Ring): number {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(area) / 2
}

// Geometric centroid of polygon (not bbox — handles elongated shapes like Norway correctly)
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
    // Fallback: vertex average
    let x = 0, y = 0
    for (const [vx, vy] of ring) { x += vx; y += vy }
    return [x / ring.length, y / ring.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

// Returns the ring with the largest area from any geometry type
function largestRing(geom: GeoJSON.Geometry): { ring: Ring; area: number } | null {
  const rings: Ring[] = []
  if (geom.type === 'Polygon') rings.push(geom.coordinates[0] as Ring)
  else if (geom.type === 'MultiPolygon') {
    for (const poly of (geom as GeoJSON.MultiPolygon).coordinates) rings.push(poly[0] as Ring)
  }
  if (rings.length === 0) return null
  let best = rings[0]
  let bestArea = ringArea(best)
  for (let i = 1; i < rings.length; i++) {
    const a = ringArea(rings[i])
    if (a > bestArea) { bestArea = a; best = rings[i] }
  }
  return { ring: best, area: bestArea }
}

// Size tier controls when the label appears:
//  0 = huge   (Russia, USA, China, Brazil, Australia…) area > 200 deg²
//  1 = large  (France, Sweden, Norway, UK, Pakistan…)  area > 8
//  2 = small  (Belgium, Croatia, Bosnia…)              area > 0.3
//  3 = micro  (Vatican, Monaco, Isle of Man…)          area ≤ 0.3
function sizeTier(area: number): number {
  if (area > 200) return 0
  if (area > 8)   return 1
  if (area > 0.3) return 2
  return 3
}

function buildLabelPoints(geojson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  // Group by ISO_A3, keep the feature whose main ring has the largest area
  const best = new Map<string, { feature: GeoJSON.Feature; area: number }>()

  for (const feature of geojson.features) {
    const props = feature.properties as Record<string, unknown>
    let iso = (props?.ISO_A3 ?? props?.ADM0_A3 ?? '') as string
    // Disputed/special territories have ISO_A3 = '-99'; use ADMIN name as key instead
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

// ── Component ────────────────────────────────────────────────────────────────

export default function CountryLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const hoveredIdRef = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    if (!map || !gameState) return
    const playerCountryId = gameState.playerCountryId

    fetch('/api/game/borders')
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (map.getSource('countries')) return

        const colourPairs = Object.entries(gameState.countries).flatMap(([iso, country]) => [
          iso,
          iso === playerCountryId ? lightenColour(country.colour) : country.colour,
        ])
        const colourExpression = [
          'match', ['get', 'ISO_A3'], ...colourPairs, '#374151',
        ] as unknown as ExpressionSpecification

        map.addSource('countries', { type: 'geojson', data: geojson })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            'fill-color': colourExpression,
            'fill-opacity': [
              'case', ['==', ['get', 'ISO_A3'], playerCountryId], 0.75, 0.5,
            ] as ExpressionSpecification,
          },
        })

        map.addLayer({
          id: 'country-borders', type: 'line', source: 'countries',
          paint: { 'line-color': '#1e3a5f', 'line-width': 0.8 },
        })

        // ── Player country glow border ──
        // Outer glow — thick blurred line
        map.addLayer({
          id: 'player-border-glow', type: 'line', source: 'countries',
          filter: ['==', ['get', 'ISO_A3'], playerCountryId] as ExpressionSpecification,
          paint: {
            'line-color': '#60a5fa',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 6,
          },
        })
        // Inner crisp line
        map.addLayer({
          id: 'player-border', type: 'line', source: 'countries',
          filter: ['==', ['get', 'ISO_A3'], playerCountryId] as ExpressionSpecification,
          paint: {
            'line-color': '#93c5fd',
            'line-width': 1.5,
            'line-opacity': 0.85,
          },
        })

        map.addLayer({
          id: 'country-hover', type: 'fill', source: 'countries',
          paint: {
            'fill-color': '#ffffff',
            'fill-opacity': [
              'case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0,
            ] as ExpressionSpecification,
          },
        })

        // ── One label per country, size-aware zoom (4 separate layers by tier) ──
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
        const labelPaint = {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0a1628',
          'text-halo-width': 1.5,
        }
        // Tier 0: huge (Russia, USA, China, Brazil) — visible from zoom 1.5
        map.addLayer({ id: 'country-labels-0', type: 'symbol', source: 'country-label-points',
          minzoom: 1.5, maxzoom: 8,
          filter: ['==', ['get', 'sizeTier'], 0] as ExpressionSpecification,
          layout: labelLayout, paint: labelPaint,
        })
        // Tier 1: large (France, Sweden, Norway, UK, Pakistan) — visible from zoom 2
        map.addLayer({ id: 'country-labels-1', type: 'symbol', source: 'country-label-points',
          minzoom: 2, maxzoom: 8,
          filter: ['==', ['get', 'sizeTier'], 1] as ExpressionSpecification,
          layout: labelLayout, paint: labelPaint,
        })
        // Tier 2: small (Belgium, Croatia, Bosnia) — visible from zoom 3.5
        map.addLayer({ id: 'country-labels-2', type: 'symbol', source: 'country-label-points',
          minzoom: 3.5, maxzoom: 8,
          filter: ['==', ['get', 'sizeTier'], 2] as ExpressionSpecification,
          layout: labelLayout, paint: labelPaint,
        })
        // Tier 3: microstates (Vatican, Monaco, Isle of Man) — visible from zoom 5.5
        map.addLayer({ id: 'country-labels-3', type: 'symbol', source: 'country-label-points',
          minzoom: 5.5, maxzoom: 8,
          filter: ['==', ['get', 'sizeTier'], 3] as ExpressionSpecification,
          layout: labelLayout, paint: labelPaint,
        })
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
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features?.length) console.log('Clicked:', e.features[0].properties?.ISO_A3)
    }

    map.on('mousemove', 'country-fills', onMouseMove)
    map.on('mouseleave', 'country-fills', onMouseLeave)
    map.on('click', 'country-fills', onClick)

    return () => {
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      map.off('click', 'country-fills', onClick)
      for (const id of ['country-labels-3', 'country-labels-2', 'country-labels-1', 'country-labels-0', 'player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('country-label-points')) map.removeSource('country-label-points')
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
