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

        // Background mask: opaque dark fill that hides the underlying parent
        // country's colour completely. Sits below the player tint.
        map.addLayer({
          id: 'province-controlled-mask',
          type: 'fill',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'fill-color': '#0a1628', // matches map background
            'fill-opacity': 1,
          },
        })

        // Controlled region fills — full player country colour, opaque
        // enough to look properly absorbed and hide the parent country fill
        map.addLayer({
          id: 'province-controlled',
          type: 'fill',
          source: 'provinces',
          filter: ['in', ['get', 'name'], ['literal', [] as string[]]],
          paint: {
            'fill-color': '#1a4a7a',
            'fill-opacity': 0.55,
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
      for (const id of ['province-controlled-border', 'province-controlled-border-glow', 'province-controlled', 'province-controlled-mask', 'province-borders']) {
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
    if (map.getLayer('province-controlled-mask')) {
      map.setFilter('province-controlled-mask', filter as never)
    }
    map.setFilter('province-controlled', filter as never)
    map.setFilter('province-controlled-border', filter as never)
    if (map.getLayer('province-controlled-border-glow')) {
      map.setFilter('province-controlled-border-glow', filter as never)
    }
    // Use the FULL player country colour so annexed regions look properly absorbed
    map.setPaintProperty('province-controlled', 'fill-color', playerColour)

    // Move province layers ABOVE country borders so they paint over the
    // border line between the parent country and the player. Layer order
    // (bottom to top): mask → tint → border glow → border
    try {
      if (map.getLayer('province-controlled-mask')) map.moveLayer('province-controlled-mask')
      if (map.getLayer('province-controlled')) map.moveLayer('province-controlled')
      if (map.getLayer('province-controlled-border-glow')) map.moveLayer('province-controlled-border-glow')
      if (map.getLayer('province-controlled-border')) map.moveLayer('province-controlled-border')
    } catch { /* layers may not all exist yet */ }
  }, [map, controlledRegions, playerCountryId, countries])

  return null
}
