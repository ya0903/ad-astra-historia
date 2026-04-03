import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { getCountryColour } from '@ad-astra/shared/countries'
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

// ── Label angle ───────────────────────────────────────────────────────────────
// Default to horizontal (0°). Only LABEL_ANGLE_OVERRIDES apply non-zero values
// for explicitly elongated countries (Chile, Norway, Sweden).

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeLabelAngle(_ring: Ring): number {
  return 0
}

// ── Name abbreviations ────────────────────────────────────────────────────────

const ABBR: Record<string, string> = {
  'United States of America': 'United States',
  'Democratic Republic of the Congo': 'DR Congo',
  'Republic of the Congo': 'Congo',
  'Central African Republic': 'C. African Rep.',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Trinidad and Tobago': 'Trinidad',
  'United Arab Emirates': 'UAE',
  'Papua New Guinea': 'Papua N. Guinea',
  'Equatorial Guinea': 'Eq. Guinea',
  'Dominican Republic': 'Dominican Rep.',
  'North Macedonia': 'N. Macedonia',
  "People's Republic of China": 'China',
  'Republic of Korea': 'S. Korea',
  "Democratic People's Republic of Korea": 'N. Korea',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Russian Federation': 'Russia',
  'Islamic Republic of Iran': 'Iran',
  'Republic of South Africa': 'South Africa',
  'São Tomé and Príncipe': 'São Tomé',
  'Saint Kitts and Nevis': 'St. Kitts',
  'Saint Vincent and the Grenadines': 'St. Vincent',
  'Antigua and Barbuda': 'Antigua',
  'Solomon Islands': 'Solomon Is.',
  'Marshall Islands': 'Marshall Is.',
  'Federated States of Micronesia': 'Micronesia',
  'British Indian Ocean Territory': 'BIOT',
  'South Georgia and the South Sandwich Islands': 'S. Georgia',
  'French Southern and Antarctic Lands': 'French S. Lands',
  'Heard Island and McDonald Islands': 'Heard Is.',
}

function abbreviateName(raw: string): string {
  if (ABBR[raw]) return ABBR[raw]
  let name = raw
  if (name.length > 16) {
    name = name
      .replace(/^Federative Republic of /i, '')
      .replace(/^Federal Republic of /i, '')
      .replace(/^Republic of /i, '')
      .replace(/^Kingdom of /i, '')
      .replace(/^State of /i, '')
      .replace(/^Principality of /i, '')
      .replace(/^The /i, '')
  }
  return name
}

// ── Label placement overrides ─────────────────────────────────────────────────

const LABEL_ANGLE_OVERRIDES: Record<string, number> = {
  // Wide/flat countries — force horizontal
  BRA: 0, RUS: 0, CHN: 0, USA: 0, CAN: 0, AUS: 0,
  KAZ: 0, IDN: 0, MLI: 0, NER: 0, TCD: 0, ETH: 0,
  AGO: 0, DZA: 0, IRN: 0, PER: 0, COD: 0, SDN: 0,
  ZMB: 0, MOZ: 0, MWI: 0, TZA: 0, KEN: 0, NGA: 0,
  COL: 0, VEN: 0, SAU: 0, IRQ: 0, TUR: 0, PAK: 0,
  // Elongated countries — use a natural slant
  NOR: -55, SWE: -25, CHL: -70,
}

const LABEL_POSITION_OVERRIDES: Record<string, [number, number]> = {
  // [lng, lat] override for label centroid
  NOR: [10.5, 62.5],   // South of Norway
  RUS: [55.0, 62.0],   // Western Russia
  CAN: [-96.0, 60.0],  // Central Canada
  USA: [-98.0, 39.5],  // Central USA
  AUS: [134.0, -27.0], // Central Australia
}

// ── Build label point features ────────────────────────────────────────────────

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
    const props = feature.properties as Record<string, unknown>
    let iso = (props?.ISO_A3 ?? props?.ADM0_A3 ?? '') as string
    if (!iso || iso === '-99') iso = (props?.ADMIN ?? props?.NAME ?? '') as string
    const rawName = (props?.ADMIN ?? props?.NAME ?? '') as string
    const centroid = LABEL_POSITION_OVERRIDES[iso] ?? ringCentroid(lr.ring)
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: centroid },
      properties: {
        ...feature.properties,
        sizeTier: sizeTier(area),
        labelName: abbreviateName(rawName),
        labelAngle: LABEL_ANGLE_OVERRIDES[iso] ?? computeLabelAngle(lr.ring),
      },
    })
  }
  return { type: 'FeatureCollection', features: points }
}

/**
 * Re-stamp player/controlled territory highlights onto GeoJSON that already
 * has fill_colour baked in by the server. The server's fill_colour is always
 * correct (from COUNTRY_COLOURS); we only override for player-owned territory.
 * We deliberately ignore countries[iso].colour from game state — it may contain
 * stale/wrong colours from old autosaves.
 */
function injectColours(
  geojson: GeoJSON.FeatureCollection,
  _countries: Record<string, { colour: string }>,
  playerCountryId: string,
  controlledCountries: string[]
): GeoJSON.FeatureCollection {
  const playerColour = getCountryColour(playerCountryId)
  const controlledSet = new Set(controlledCountries)
  return {
    ...geojson,
    features: geojson.features.map(f => {
      const p = f.properties as Record<string, unknown>
      const iso = (p?.ISO_A3 ?? p?.ADM0_A3 ?? '') as string
      // Server already set fill_colour; only override for player/controlled territory
      const base = (p?.fill_colour as string | undefined) ?? getCountryColour(iso)
      const colour =
        iso === playerCountryId ? lightenColour(base) :
        controlledSet.has(iso) ? tintOccupied(playerColour) :
        base
      return { ...f, properties: { ...p, fill_colour: colour } }
    }),
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman'])

export default function CountryLayer() {
  const map = useMap()
  const countries = useGameStore(s => s.state?.countries ?? {})
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? [])
  const era = useGameStore(s => s.state?.era)
  const hoveredIdRef = useRef<string | number | undefined>(undefined)
  // Raw GeoJSON stored after fetch — Effect 2 re-injects colours into it
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
        const coloured = injectColours(geojson, countries, playerCountryId, controlledCountries)

        map.addSource('countries', { type: 'geojson', data: coloured })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            // Colour is baked into each feature property — no match expression needed
            'fill-color': ['get', 'fill_colour'] as ExpressionSpecification,
            'fill-opacity': ['step', ['zoom'],
              0.72,
              3, 0.68,
              4, 0.60,
              5, 0.50,
              6, 0.38,
              8, 0.20,
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

        const labelPoints = buildLabelPoints(geojson)
        map.addSource('country-label-points', { type: 'geojson', data: labelPoints })

        const labelLayout = {
          'text-field': ['get', 'labelName'] as ExpressionSpecification,
          'text-font': ['Noto Sans Medium'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 8, 3, 12, 4, 15, 5, 17] as ExpressionSpecification,
          'text-max-width': 6,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-letter-spacing': 0.2,
          'text-transform': 'uppercase' as const,
          'text-rotate': ['get', 'labelAngle'] as ExpressionSpecification,
          'text-padding': 4,
        }
        const labelPaint = {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.85)',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        }

        const hiddenPaint = { ...labelPaint, 'text-opacity': 0 }
        map.addLayer({ id: 'country-labels-0', type: 'symbol', source: 'country-label-points', minzoom: 1.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 0] as ExpressionSpecification, layout: labelLayout, paint: hiddenPaint })
        map.addLayer({ id: 'country-labels-1', type: 'symbol', source: 'country-label-points', minzoom: 2, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 1] as ExpressionSpecification, layout: labelLayout, paint: hiddenPaint })
        map.addLayer({ id: 'country-labels-2', type: 'symbol', source: 'country-label-points', minzoom: 3.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 2] as ExpressionSpecification, layout: labelLayout, paint: hiddenPaint })
        map.addLayer({ id: 'country-labels-3', type: 'symbol', source: 'country-label-points', minzoom: 5.5, maxzoom: 8, filter: ['==', ['get', 'sizeTier'], 3] as ExpressionSpecification, layout: labelLayout, paint: hiddenPaint })
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
      for (const id of ['country-labels-3', 'country-labels-2', 'country-labels-1', 'country-labels-0', 'player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('country-label-points')) map.removeSource('country-label-points')
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, playerCountryId, era]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: re-inject colours when game state changes ───────────────────
  // Uses setData() so MapLibre picks up the new fill_colour property values
  // without any paint expression needing to be recomputed.
  useEffect(() => {
    if (!map || !playerCountryId || !rawGeojsonRef.current) return
    const src = map.getSource('countries') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData(injectColours(rawGeojsonRef.current, countries, playerCountryId, controlledCountries))
    const empireFilter = ['in', ['get', 'ISO_A3'], ['literal', [playerCountryId, ...controlledCountries]]] as ExpressionSpecification
    if (map.getLayer('player-border')) map.setFilter('player-border', empireFilter)
    if (map.getLayer('player-border-glow')) map.setFilter('player-border-glow', empireFilter)
  }, [map, countries, playerCountryId, controlledCountries])

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

/** Occupied/controlled territory: player hue, slightly darker and more muted than the player's own territory */
function tintOccupied(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const or_ = Math.min(255, Math.round(r + (255 - r) * 0.15))
  const og = Math.min(255, Math.round(g + (255 - g) * 0.15))
  const ob = Math.min(255, Math.round(b + (255 - b) * 0.15))
  return `#${or_.toString(16).padStart(2, '0')}${og.toString(16).padStart(2, '0')}${ob.toString(16).padStart(2, '0')}`
}
