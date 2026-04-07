import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import difference from '@turf/difference'
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Geometry } from 'geojson'
import { getCountryColour } from '@ad-astra/shared/countries'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

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
): GeoJSON.FeatureCollection {
  const playerColour = getCountryColour(playerCountryId)
  const controlledSet = new Set(controlledCountries)

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
      const base = getCountryColour(iso)
      const colour =
        iso === playerCountryId ? lightenColour(base) :
        controlledSet.has(iso) ? tintOccupied(playerColour) :
        base

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

      return { ...f, geometry: outputGeometry, properties: { ...p, fill_colour: colour } }
    }),
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku'])

export default function CountryLayer() {
  const map = useMap()
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? [])
  const controlledRegions = useGameStore(s => s.state?.controlledRegions ?? [])
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
        const coloured = injectColours(geojson, playerCountryId, controlledCountries, controlledRegions, provinces)

        map.addSource('countries', { type: 'geojson', data: coloured })

        map.addLayer({
          id: 'country-fills', type: 'fill', source: 'countries',
          paint: {
            'fill-color': ['coalesce', ['get', 'fill_colour'], '#1a4a7a'] as ExpressionSpecification,
            'fill-opacity': ['step', ['zoom'],
              0.35,
              3, 0.30,
              4, 0.25,
              5, 0.22,
              6, 0.18,
              8, 0.12,
            ] as ExpressionSpecification,
          },
        })

        map.addLayer({
          id: 'country-borders', type: 'line', source: 'countries',
          paint: {
            'line-color': '#4a5568',
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 3, 0.8, 5, 1.2, 7, 1.8] as ExpressionSpecification,
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 3, 0.65, 6, 0.8] as ExpressionSpecification,
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
      provincesGeojsonRef.current = null
      map.off('mousemove', 'country-fills', onMouseMove)
      map.off('mouseleave', 'country-fills', onMouseLeave)
      for (const id of ['player-border', 'player-border-glow', 'country-hover', 'country-borders', 'country-fills']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('countries')) map.removeSource('countries')
    }
  }, [map, playerCountryId, era]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: re-inject colours and re-clip provinces when empire changes ──
  useEffect(() => {
    if (!map || !playerCountryId || !rawGeojsonRef.current) return
    const src = map.getSource('countries') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData(injectColours(
      rawGeojsonRef.current,
      playerCountryId,
      controlledCountries,
      controlledRegions,
      provincesGeojsonRef.current,
    ))
    const empireFilter = ['in', ['get', 'ISO_A3'], ['literal', [playerCountryId, ...controlledCountries]]] as ExpressionSpecification
    if (map.getLayer('player-border')) map.setFilter('player-border', empireFilter)
    if (map.getLayer('player-border-glow')) map.setFilter('player-border-glow', empireFilter)
  }, [map, playerCountryId, controlledCountries, controlledRegions])

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
