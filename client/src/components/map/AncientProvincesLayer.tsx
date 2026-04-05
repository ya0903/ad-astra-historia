import { useEffect, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

/**
 * Renders ancient administrative divisions (Roman provinces, Ottoman eyalets,
 * Greek regions) as a subtle overlay on top of the era country fills.
 *
 * Uses /api/game/ancient-provinces/:era which reads Natural Earth admin-1
 * polygons annotated with era-specific province metadata.
 */
export default function AncientProvincesLayer() {
  const map = useMap()
  const era = useGameStore(s => s.state?.era ?? '')
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledCountries = useGameStore(s => s.state?.controlledCountries ?? [])
  const countries = useGameStore(s => s.state?.countries ?? {})

  const loadedEraRef = useRef<string>('')

  // ── Load / reload province data when era changes ───────────────────────────
  useEffect(() => {
    if (!map || !era) return
    if (loadedEraRef.current === era && map.getSource('ancient-provinces')) return

    // Clean up any previous instance
    for (const id of [
      'ancient-prov-fill', 'ancient-prov-player-fill',
      'ancient-prov-border', 'ancient-prov-labels',
    ]) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    if (map.getSource('ancient-provinces')) map.removeSource('ancient-provinces')

    fetch(`/api/game/ancient-provinces/${era}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((geojson: FeatureCollection) => {
        if (!map || map.getSource('ancient-provinces')) return
        loadedEraRef.current = era

        map.addSource('ancient-provinces', { type: 'geojson', data: geojson })

        // ── Subtle background fill — gives a parchment-map subdivided feel ──
        map.addLayer({
          id: 'ancient-prov-fill',
          type: 'fill',
          source: 'ancient-provinces',
          minzoom: 2,
          paint: {
            'fill-color': 'rgba(210,180,100,0.06)',
            'fill-opacity': ['interpolate', ['linear'], ['zoom'],
              2, 0.0,
              3, 0.5,
              5, 1.0,
            ],
          },
        })

        // ── Player / ally controlled province highlight ────────────────────
        map.addLayer({
          id: 'ancient-prov-player-fill',
          type: 'fill',
          source: 'ancient-provinces',
          minzoom: 2,
          filter: ['in', ['get', 'polityId'], ['literal', [] as string[]]],
          paint: {
            'fill-color': 'rgba(100,180,255,0.12)',
            'fill-opacity': 1,
          },
        })

        // ── Province borders — thin, readable at zoom 3+ ───────────────────
        map.addLayer({
          id: 'ancient-prov-border',
          type: 'line',
          source: 'ancient-provinces',
          minzoom: 2,
          paint: {
            'line-color': 'rgba(210,180,100,0.35)',
            'line-width': ['interpolate', ['linear'], ['zoom'],
              2, 0.3,
              4, 0.6,
              6, 0.9,
            ],
          },
        })

        // ── Province name labels — visible when zoomed in ──────────────────
        map.addLayer({
          id: 'ancient-prov-labels',
          type: 'symbol',
          source: 'ancient-provinces',
          minzoom: 4,
          layout: {
            'text-field': ['get', 'ancientName'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'],
              4, 9,
              6, 11,
              8, 13,
            ],
            'text-max-width': 8,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': 'rgba(220,190,130,0.75)',
            'text-halo-color': 'rgba(5,10,22,0.85)',
            'text-halo-width': 1.2,
          },
        })
      })
      .catch(() => {
        // provinces.geojson not downloaded yet — fail silently
      })

    return () => {
      for (const id of [
        'ancient-prov-fill', 'ancient-prov-player-fill',
        'ancient-prov-border', 'ancient-prov-labels',
      ]) {
        if (map?.getLayer(id)) map.removeLayer(id)
      }
      if (map?.getSource('ancient-provinces')) map.removeSource('ancient-provinces')
      loadedEraRef.current = ''
    }
  }, [map, era])

  // ── Update player-polity highlight when controlled countries change ────────
  useEffect(() => {
    if (!map || !map.getLayer('ancient-prov-player-fill')) return

    // Highlight polities controlled by the player (direct + annexed countries)
    const playerPolity = playerCountryId.toUpperCase()
    const controlledPolities = [playerPolity, ...controlledCountries.map(c => c.toUpperCase())]

    // Use player country colour for the fill
    const playerColour = countries[playerCountryId]?.colour ?? '#3b82f6'
    const [r, g, b] = hexToRgb(playerColour)

    map.setFilter('ancient-prov-player-fill',
      ['in', ['get', 'polityId'], ['literal', controlledPolities]]
    )
    map.setPaintProperty('ancient-prov-player-fill',
      'fill-color', `rgba(${r},${g},${b},0.15)`
    )
  }, [map, playerCountryId, controlledCountries, countries])

  return null
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length !== 6) return [59, 130, 246]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}
