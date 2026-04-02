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

        // Controlled region fills — colored in player tint
        map.addLayer({
          id: 'province-controlled',
          type: 'fill',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'fill-color': '#1a4a7a',
            'fill-opacity': ['step', ['zoom'], 0.55, 3, 0.50, 4, 0.40, 5, 0.25, 6, 0.12],
          },
        })

        // Controlled region border highlight
        map.addLayer({
          id: 'province-controlled-border',
          type: 'line',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'line-color': '#93c5fd',
            'line-width': 1.2,
            'line-opacity': 0.7,
          },
        })
      })
      .catch(() => { /* provinces.geojson not downloaded yet */ })

    return () => {
      for (const id of ['province-controlled-border', 'province-controlled', 'province-borders']) {
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
    map.setPaintProperty('province-controlled', 'fill-color', lightenForOccupied(playerColour))
  }, [map, controlledRegions, playerCountryId, countries])

  return null
}

function lightenForOccupied(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 50)},1)`
}
