import { useEffect, useRef } from 'react'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

interface ProvinceProps { name?: string; adm0_a3?: string; [key: string]: unknown }

export default function ProvincesLayer() {
  const map = useMap()
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')
  const controlledRegions = useGameStore(s => s.state?.controlledRegions ?? [])
  const countries = useGameStore(s => s.state?.countries ?? {})
  const geojsonRef = useRef<FeatureCollection | null>(null)

  // ── Load province GeoJSON once ───────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    if (map.getSource('provinces')) return

    fetch('/api/game/provinces')
      .then(r => { if (!r.ok) throw new Error('no provinces'); return r.json() })
      .then((geojson: FeatureCollection) => {
        geojsonRef.current = geojson
        if (map.getSource('provinces')) return

        map.addSource('provinces', { type: 'geojson', data: geojson })

        // Faint province borders — visible when zoomed in
        map.addLayer({
          id: 'province-borders',
          type: 'line',
          source: 'provinces',
          minzoom: 4,
          paint: {
            'line-color': 'rgba(255,255,255,0.08)',
            'line-width': 0.5,
          },
        })

        // Controlled region fills — uses the SAME lightened player country
        // colour and SAME opacity steps as country-fills, so the territory
        // visually matches the player's own land. Cities/rivers/infrastructure
        // render above this so they remain fully visible.
        map.addLayer({
          id: 'province-controlled',
          type: 'fill',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'fill-color': '#1a4a7a',
            'fill-opacity': ['step', ['zoom'],
              0.35, // z<3
              3, 0.30,
              4, 0.25,
              5, 0.22,
              6, 0.18,
              8, 0.12,
            ],
          },
        })

        // Controlled region border highlight — bright player-colour glow
        map.addLayer({
          id: 'province-controlled-border-glow',
          type: 'line',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'line-color': '#60a5fa',
            'line-width': 6,
            'line-opacity': 0.45,
            'line-blur': 4,
          },
        })

        map.addLayer({
          id: 'province-controlled-border',
          type: 'line',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'line-color': '#93c5fd',
            'line-width': 2,
            'line-opacity': 0.95,
          },
        })
      })
      .catch(() => { /* provinces.geojson not downloaded yet */ })

    return () => {
      for (const id of ['province-controlled-border', 'province-controlled-border-glow', 'province-controlled', 'province-borders']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource('provinces')) map.removeSource('provinces')
      geojsonRef.current = null
    }
  }, [map])

  // ── Update controlled province filters whenever regions change ───────────────
  useEffect(() => {
    if (!map || !map.getLayer('province-controlled') || !geojsonRef.current) return

    const playerColour = countries[playerCountryId]?.colour ?? '#1a4a7a'

    // Fuzzy-match controlled regions against province feature names
    const matchedNames: string[] = []
    for (const controlled of controlledRegions) {
      const needle = controlled.name.toLowerCase()
      const parentIso = controlled.adm0_a3.toUpperCase()
      for (const feature of geojsonRef.current.features) {
        const props = (feature as Feature<Geometry, ProvinceProps>).properties ?? {}
        const fName = (props.name ?? '').toLowerCase()
        const fIso = (props.adm0_a3 ?? '').toUpperCase()
        if (fIso === parentIso && (fName.includes(needle) || needle.includes(fName))) {
          if (props.name) matchedNames.push(props.name as string)
        }
      }
    }

    const filter = ['in', ['get', 'name'], ['literal', matchedNames]]
    map.setFilter('province-controlled', filter as never)
    map.setFilter('province-controlled-border', filter as never)
    if (map.getLayer('province-controlled-border-glow')) {
      map.setFilter('province-controlled-border-glow', filter as never)
    }
    // Use the same LIGHTENED player country colour as the player's own
    // country fill, so the annexed region visually matches your land
    map.setPaintProperty('province-controlled', 'fill-color', lightenColour(playerColour))

    // Place province layers above country-borders (so the parent border line
    // is hidden inside the annexed region) but below cities/rivers/lakes
    // (so all those features remain fully visible inside the annexed area).
    // We anchor before 'lakes-fill' if present, else 'rivers-line', else nothing.
    const beforeLayer =
      map.getLayer('lakes-fill') ? 'lakes-fill' :
      map.getLayer('rivers-line') ? 'rivers-line' :
      undefined
    try {
      if (map.getLayer('province-controlled')) map.moveLayer('province-controlled', beforeLayer)
      if (map.getLayer('province-controlled-border-glow')) map.moveLayer('province-controlled-border-glow', beforeLayer)
      if (map.getLayer('province-controlled-border')) map.moveLayer('province-controlled-border', beforeLayer)
    } catch { /* layers may not all exist yet */ }
  }, [map, controlledRegions, playerCountryId, countries])

  return null
}

function lightenColour(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.3))
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.3))
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.3))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
