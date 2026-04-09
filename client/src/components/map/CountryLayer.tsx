import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import difference from '@turf/difference'
import union from '@turf/union'
import buffer from '@turf/buffer'
import type { Feature, FeatureCollection, Polygon, MultiPolygon, LineString, Geometry, Position } from 'geojson'
import { getCountryColour } from '@ad-astra/shared/countries'
import { HISTORICAL_ERAS as HISTORICAL_ERA_DEFS } from '@ad-astra/shared/eraConfig'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

/**
 * Builds a single merged outline of [player + controlled] features so that
 * adjacent territories show one continuous border instead of an internal seam.
 * Returns a FeatureCollection with one Polygon/MultiPolygon feature, or empty
 * if the empire ISO list resolves to nothing.
 */
function buildEmpireOutline(
  geojson: GeoJSON.FeatureCollection,
  empireIsos: string[],
  controlledRegions: Array<{ name: string; adm0_a3: string }> = [],
  provincesGeojson: FeatureCollection | null = null,
): FeatureCollection {
  const set = new Set(empireIsos)
  const polys: Feature<Polygon | MultiPolygon>[] = []
  for (const f of geojson.features) {
    const p = f.properties as Record<string, unknown> | null
    const iso = String(p?.ISO_A3 ?? p?.ADM0_A3 ?? '')
    if (!set.has(iso)) continue
    if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
      polys.push(f as Feature<Polygon | MultiPolygon>)
    }
  }
  // Add any controlled provinces (e.g. annexed Kashmir) — they're separate
  // polygons in the provinces dataset, not in the country source.
  if (provincesGeojson && controlledRegions.length > 0) {
    for (const region of controlledRegions) {
      const needle = region.name.toLowerCase()
      const parentIso = region.adm0_a3.toUpperCase()
      for (const pf of provincesGeojson.features) {
        const pp = pf.properties as Record<string, unknown> ?? {}
        const pName = String(pp?.name ?? '').toLowerCase()
        const pIso = String(pp?.adm0_a3 ?? '').toUpperCase()
        if (pIso === parentIso && (pName.includes(needle) || needle.includes(pName))) {
          if (pf.geometry && (pf.geometry.type === 'Polygon' || pf.geometry.type === 'MultiPolygon')) {
            polys.push(pf as Feature<Polygon | MultiPolygon>)
          }
        }
      }
    }
  }
  if (polys.length === 0) return { type: 'FeatureCollection', features: [] }
  if (polys.length === 1) return { type: 'FeatureCollection', features: [polys[0]] }
  try {
    // Dilate each polygon by ~2km before unioning so adjacent borders that
    // don't share exact vertices still overlap and dissolve into a single
    // ring. Then erode the merged result back by 2km to restore size.
    const dilated = polys.map(p => {
      try { return buffer(p, 2, { units: 'kilometers' }) ?? p } catch { return p }
    }) as Feature<Polygon | MultiPolygon>[]
    let merged: Feature<Polygon | MultiPolygon> = dilated[0]
    for (let i = 1; i < dilated.length; i++) {
      const fc: FeatureCollection<Polygon | MultiPolygon> = { type: 'FeatureCollection', features: [merged, dilated[i]] }
      const u = union(fc)
      if (u) merged = u as Feature<Polygon | MultiPolygon>
    }
    const eroded = buffer(merged, -2, { units: 'kilometers' }) as Feature<Polygon | MultiPolygon> | undefined
    const final = eroded ?? merged
    // Strip interior rings (holes). Any holes left after buffer-dilate-union-
    // erode are sliver artefacts caused by vertex mismatches between the
    // country and province datasets — they would render as faint internal
    // seams along the annexed-province boundary. Dropping holes is safe for
    // border-line rendering: we're only tracing the empire perimeter and do
    // not need to preserve inland lake/enclave rings on this layer.
    const stripped = stripHoles(final.geometry as Polygon | MultiPolygon)
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: stripped }],
    }
  } catch (err) {
    console.warn('[CountryLayer] turf.union failed', err)
    return { type: 'FeatureCollection', features: polys }
  }
}

/**
 * Removes all interior rings (holes) from a Polygon or MultiPolygon geometry,
 * keeping only each piece's outer ring. Used to dissolve sliver artefacts
 * left behind by turf.union when the input polygons come from datasets with
 * mismatched vertices along a shared edge.
 */
function stripHoles(geom: Polygon | MultiPolygon): Polygon | MultiPolygon {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: [geom.coordinates[0]] }
  }
  return {
    type: 'MultiPolygon',
    coordinates: geom.coordinates.map(poly => [poly[0]]),
  }
}

/**
 * Builds a LineString FeatureCollection containing only the OUTER rings of
 * every country polygon, EXCLUDING any country in `excludeIsos` (the player's
 * empire). This becomes the data source for the grey country-borders line
 * layer. Skipping inner rings prevents the grey line from tracing the holes
 * left in parent countries by injectColours' turf.difference clip — which
 * was the source of the faint internal seam around annexed provinces such
 * as Kashmir. Excluding empire countries also removes the parent country's
 * native eastern/western edge that ran along the annexed province border.
 *
 * The resulting outline of empire territory is drawn solely by the merged
 * `empire-outline` source (see buildEmpireOutline) which has no internal
 * rings and so renders as one seamless border.
 */
function geomBbox(geom: Geometry): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const x = c[0] as number, y = c[1] as number
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      return
    }
    if (Array.isArray(c)) for (const x of c) walk(x)
  }
  walk((geom as { coordinates: unknown }).coordinates)
  return [minX, minY, maxX, maxY]
}

function bboxIntersects(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3])
}

function buildBorderLines(
  geojson: GeoJSON.FeatureCollection,
  excludeIsos: string[],
  empireMask: Feature<Polygon | MultiPolygon> | null = null,
): FeatureCollection<LineString> {
  const exclude = new Set(excludeIsos.map(s => s.toUpperCase()))
  const empireBbox = empireMask?.geometry ? geomBbox(empireMask.geometry) : null
  const out: Feature<LineString>[] = []
  for (const f of geojson.features) {
    const p = f.properties as Record<string, unknown> | null
    const iso = String(p?.ISO_A3 ?? p?.ADM0_A3 ?? '').toUpperCase()
    if (exclude.has(iso)) continue

    // Bbox prefilter: only run the (very expensive) turf.difference for the
    // handful of countries whose bbox actually overlaps the empire. Everyone
    // else just emits their raw outer ring. This drops the per-update cost
    // from ~200 difference calls to typically 1-3.
    let geom: Geometry | null = f.geometry as Geometry | null
    if (empireMask && empireBbox && geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
      const cb = geomBbox(geom)
      if (bboxIntersects(cb, empireBbox)) {
        try {
          const fc: FeatureCollection<Polygon | MultiPolygon> = {
            type: 'FeatureCollection',
            features: [f as Feature<Polygon | MultiPolygon>, empireMask],
          }
          const diff = difference(fc)
          if (diff) geom = diff.geometry
          else geom = null // country fully consumed by empire
        } catch (err) {
          console.warn('[CountryLayer] buildBorderLines empire-mask difference failed for', iso, err)
        }
      }
    }

    if (!geom) continue
    const polys: Position[][][] =
      geom.type === 'Polygon' ? [(geom as Polygon).coordinates] :
      geom.type === 'MultiPolygon' ? (geom as MultiPolygon).coordinates :
      []
    for (const poly of polys) {
      // poly[0] is outer ring; poly[1..] are holes — drop holes entirely.
      if (!poly || poly.length === 0) continue
      const outer = poly[0]
      if (!outer || outer.length < 2) continue
      out.push({
        type: 'Feature',
        properties: { ...(p ?? {}) },
        geometry: { type: 'LineString', coordinates: outer },
      })
    }
  }
  return { type: 'FeatureCollection', features: out }
}

/**
 * Stamps fill_colour onto every GeoJSON feature using the shared COUNTRY_COLOURS
 * table. Player territory is lightened; controlled territory gets a player-tinted hue.
 *
 * Also clips controlled provinces out of their parent country polygon using
 * turf.difference — so the annexed region no longer has the parent country's
 * fill rendering underneath at all.
 */
function injectColours(
  geojson: GeoJSON.FeatureCollection,
  playerCountryId: string,
  controlledCountries: string[],
  controlledRegions: Array<{ name: string; adm0_a3: string }>,
  provincesGeojson: FeatureCollection | null,
  foreignAnnexations: Array<{ iso: string; newOwner: string }> = [],
  countryNamesByIso: Record<string, string> = {},
): GeoJSON.FeatureCollection {
  const playerColour = getCountryColour(playerCountryId)
  const controlledSet = new Set(controlledCountries)
  const foreignOwnerByIso = new Map<string, string>()
  for (const fa of foreignAnnexations) foreignOwnerByIso.set(fa.iso.toUpperCase(), fa.newOwner.toUpperCase())

  // Pre-resolve the province polygons that will be clipped from their parents,
  // grouped by parent country ISO_A3
  const provincesByParent = new Map<string, Feature<Polygon | MultiPolygon>[]>()
  if (provincesGeojson && controlledRegions.length > 0) {
    for (const region of controlledRegions) {
      const needle = region.name.toLowerCase()
      const parentIso = region.adm0_a3.toUpperCase()
      for (const pf of provincesGeojson.features) {
        const pp = pf.properties as Record<string, unknown> ?? {}
        const pName = String(pp?.name ?? '').toLowerCase()
        const pIso = String(pp?.adm0_a3 ?? '').toUpperCase()
        if (pIso === parentIso && (pName.includes(needle) || needle.includes(pName))) {
          const geom = pf.geometry as Geometry
          if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
            if (!provincesByParent.has(parentIso)) provincesByParent.set(parentIso, [])
            provincesByParent.get(parentIso)!.push(pf as Feature<Polygon | MultiPolygon>)
          }
        }
      }
    }
  }

  return {
    ...geojson,
    features: geojson.features.map(f => {
      const p = f.properties as Record<string, unknown>
      const iso = (p?.ISO_A3 ?? p?.ADM0_A3 ?? '') as string
      // Historical eras pre-compute fill_colour per polity; modern eras use
      // the shared COUNTRY_COLOURS table keyed by ISO_A3.
      const preComputed = (p?.fill_colour as string | undefined)
      const base = preComputed ?? getCountryColour(iso)
      const foreignOwner = foreignOwnerByIso.get(iso.toUpperCase())
      // Player territory and directly-controlled (annexed) territory both use
      // the SAME lightened player colour, so absorbed countries blend
      // seamlessly with the player's own land — no visible seam between
      // original and annexed territory.
      const colour =
        iso === playerCountryId ? lightenColour(playerColour) :
        controlledSet.has(iso) ? lightenColour(playerColour) :
        foreignOwner ? getCountryColour(foreignOwner) :
        base
      // If this country has been conquered by a non-player state, relabel it
      // with the new owner's name so country-label layers show the new name
      // instead of the defunct one.
      let displayName = p?.NAME as string | undefined
      let displayAdmin = p?.ADMIN as string | undefined
      if (foreignOwner) {
        const newName = countryNamesByIso[foreignOwner]
        if (newName) {
          displayName = newName
          displayAdmin = newName
        }
      }

      // If this parent country has controlled provinces, clip them out of its polygon
      let outputGeometry = f.geometry
      const provincesToClip = provincesByParent.get(iso.toUpperCase())
      if (provincesToClip && provincesToClip.length > 0 && f.geometry
          && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
        try {
          let clipped: Feature<Polygon | MultiPolygon> = f as Feature<Polygon | MultiPolygon>
          for (const province of provincesToClip) {
            // @turf/difference v7 takes a FeatureCollection of exactly 2 features
            const fc: FeatureCollection<Polygon | MultiPolygon> = {
              type: 'FeatureCollection',
              features: [clipped, province],
            }
            const diff = difference(fc)
            if (diff) clipped = diff
          }
          outputGeometry = clipped.geometry
        } catch (err) {
          console.warn('[CountryLayer] turf.difference failed for', iso, err)
        }
      }

      return {
        ...f,
        geometry: outputGeometry,
        properties: {
          ...p,
          fill_colour: colour,
          ...(displayName ? { NAME: displayName } : {}),
          ...(displayAdmin ? { ADMIN: displayAdmin } : {}),
        },
      }
    }),
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const ANCIENT_ERAS = new Set<string>([
  'greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku',
  ...HISTORICAL_ERA_DEFS.map(e => e.id),
])

// Stable empty defaults so the zustand selectors don't return a new []/array
// reference on every state change — that was forcing the heavy turf.difference
// pipeline to re-run on every keystroke / tick.
const EMPTY_ISOS: string[] = []
const EMPTY_REGIONS: Array<{ name: string; adm0_a3: string }> = []
const EMPTY_ANNEX: Array<{ iso: string; newOwner: string }> = []

export default function CountryLayer() {
  const map = useMap()
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? EMPTY_ISOS)
  const controlledRegions = useGameStore(s => s.state?.controlledRegions ?? EMPTY_REGIONS)
  const foreignAnnexations = useGameStore(s => s.state?.foreignAnnexations ?? EMPTY_ANNEX)
  const countries = useGameStore(s => s.state?.countries)
  const era = useGameStore(s => s.state?.era)
  const hoveredIdRef = useRef<string | number | undefined>(undefined)
  // Raw GeoJSON stored after fetch — Effect 2 re-injects colours when empire changes
  const rawGeojsonRef = useRef<GeoJSON.FeatureCollection | null>(null)
  // Province GeoJSON cached so we can clip controlled regions out of parent country polygons
  const provincesGeojsonRef = useRef<FeatureCollection | null>(null)

  // ── Effect 1: fetch borders and set up layers ─────────────────────────────
  useEffect(() => {
    if (!map || !playerCountryId || !era) return

    const controller = new AbortController()
    const bordersUrl = ANCIENT_ERAS.has(era) ? `/api/game/borders/${era}` : '/api/game/borders'
    // Fetch both borders and provinces in parallel so the clipping step has both
    Promise.all([
      fetch(bordersUrl, { signal: controller.signal }).then(r => r.json() as Promise<GeoJSON.FeatureCollection>),
      fetch('/api/game/provinces', { signal: controller.signal })
        .then(r => r.ok ? r.json() as Promise<FeatureCollection> : null)
        .catch(() => null),
    ])
      .then(([geojson, provinces]) => {
        if (map.getSource('countries')) return

        rawGeojsonRef.current = geojson
        provincesGeojsonRef.current = provinces
        const countryNamesByIso: Record<string, string> = {}
        if (countries) {
          for (const [iso, c] of Object.entries(countries)) {
            if (c && typeof c === 'object' && 'name' in c) countryNamesByIso[iso.toUpperCase()] = (c as { name: string }).name
          }
        }
        const coloured = injectColours(geojson, playerCountryId, controlledCountries, controlledRegions, provinces, foreignAnnexations, countryNamesByIso)

        map.addSource('countries', { type: 'geojson', data: coloured })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            'fill-color': ['coalesce', ['get', 'fill_colour'], '#1a4a7a'] as ExpressionSpecification,
            'fill-opacity': ['step', ['zoom'],
              0.65,
              3, 0.58,
              4, 0.50,
              5, 0.42,
              6, 0.35,
              8, 0.25,
            ] as ExpressionSpecification,
          },
        })

        // Grey country borders are drawn from a SEPARATE LineString source
        // (`country-border-lines`) that contains only outer rings of countries
        // NOT in the player's empire. This avoids two seam-causing artefacts:
        //   1. Pakistan's eastern edge being drawn alongside the Kashmir
        //      polygon's western edge (two near-coincident grey lines).
        //   2. India's polygon hole (left by injectColours' difference clip)
        //      tracing a grey ring around the annexed Kashmir province.
        // Compute the merged empire polygon FIRST so we can use it as a mask
        // when building country border lines (so India's outer ring doesn't
        // trace the old PAK↔Kashmir boundary).
        const empireOutline = buildEmpireOutline(geojson, [playerCountryId, ...controlledCountries], controlledRegions, provinces)
        const empireMask = (empireOutline.features[0] as Feature<Polygon | MultiPolygon> | undefined) ?? null
        const borderLines = buildBorderLines(geojson, [playerCountryId, ...controlledCountries], empireMask)
        map.addSource('country-border-lines', { type: 'geojson', data: borderLines })

        map.addLayer({
          id: 'country-borders', type: 'line', source: 'country-border-lines',
          paint: {
            'line-color': '#4a5568',
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 3, 0.8, 5, 1.2, 7, 1.8] as ExpressionSpecification,
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 3, 0.65, 6, 0.8] as ExpressionSpecification,
            'line-dasharray': [
              'case',
              ['<=', ['coalesce', ['get', 'border_precision'], 3], 1], ['literal', [3, 3]],
              ['literal', [1, 0]],
            ] as ExpressionSpecification,
            'line-blur': [
              'case',
              ['<=', ['coalesce', ['get', 'border_precision'], 3], 1], 1,
              ['<=', ['coalesce', ['get', 'border_precision'], 3], 2], 0.5,
              0,
            ] as ExpressionSpecification,
          },
        })

        // Empire outline source (data already computed above and used as the
        // border-lines clip mask).
        map.addSource('empire-outline', { type: 'geojson', data: empireOutline })

        map.addLayer({
          id: 'player-border-glow', type: 'line', source: 'empire-outline',
          paint: { 'line-color': '#60a5fa', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 6 },
        })

        map.addLayer({
          id: 'player-border', type: 'line', source: 'empire-outline',
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
      provincesGeojsonRef.current = null
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      for (const id of ['player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('countries')) map.removeSource('countries')
      if (map.getSource('empire-outline')) map.removeSource('empire-outline')
      if (map.getSource('country-border-lines')) map.removeSource('country-border-lines')
    }
  }, [map, playerCountryId, era]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: re-inject colours and re-clip provinces when empire changes ──
  useEffect(() => {
    if (!map || !playerCountryId || !rawGeojsonRef.current) return
    const src = map.getSource('countries') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    const countryNamesByIso: Record<string, string> = {}
    if (countries) {
      for (const [iso, c] of Object.entries(countries)) {
        if (c && typeof c === 'object' && 'name' in c) countryNamesByIso[iso.toUpperCase()] = (c as { name: string }).name
      }
    }
    src.setData(injectColours(
      rawGeojsonRef.current,
      playerCountryId,
      controlledCountries,
      controlledRegions,
      provincesGeojsonRef.current,
      foreignAnnexations,
      countryNamesByIso,
    ))
    const newEmpireOutline = buildEmpireOutline(rawGeojsonRef.current, [playerCountryId, ...controlledCountries], controlledRegions, provincesGeojsonRef.current)
    const newEmpireMask = (newEmpireOutline.features[0] as Feature<Polygon | MultiPolygon> | undefined) ?? null
    const outlineSrc = map.getSource('empire-outline') as maplibregl.GeoJSONSource | undefined
    if (outlineSrc) outlineSrc.setData(newEmpireOutline)
    const borderSrc = map.getSource('country-border-lines') as maplibregl.GeoJSONSource | undefined
    if (borderSrc) borderSrc.setData(buildBorderLines(rawGeojsonRef.current, [playerCountryId, ...controlledCountries], newEmpireMask))
  }, [map, playerCountryId, controlledCountries, controlledRegions, foreignAnnexations]) // eslint-disable-line react-hooks/exhaustive-deps

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
