import { useEffect, useRef } from 'react'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

// Renders war damage overlays on countries:
//   nuked   → near-black fill + pulsing red glow
//   bombed  → dark desaturated overlay

export default function DamageLayer() {
  const map = useMap()
  const warDamage = useGameStore(s => s.state?.warDamage ?? {})
  const gameState = useGameStore(s => s.state)
  const initialised = useRef(false)

  // Wait for the countries source to exist, then add damage layers on top
  useEffect(() => {
    if (!map) return

    const addLayers = () => {
      if (!map.getSource('countries')) return
      if (initialised.current) return
      initialised.current = true

      // Bombed overlay — dark brownish
      map.addLayer({
        id: 'damage-bombed',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#1a0a00',
          'fill-opacity': 0,
        },
      })

      // Nuked overlay — near-black with slight red tint
      map.addLayer({
        id: 'damage-nuked',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#0a0000',
          'fill-opacity': 0,
        },
      })

      // Nuked glow border
      map.addLayer({
        id: 'damage-nuked-border',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#ff2200',
          'line-width': 3,
          'line-opacity': 0,
          'line-blur': 4,
        },
      })
    }

    if (map.isStyleLoaded() && map.getSource('countries')) {
      addLayers()
    } else {
      map.on('sourcedata', addLayers)
      map.on('idle', addLayers)
    }

    return () => {
      map.off('sourcedata', addLayers)
      map.off('idle', addLayers)
      for (const id of ['damage-nuked-border', 'damage-nuked', 'damage-bombed']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      initialised.current = false
    }
  }, [map])

  // Update paint expressions whenever warDamage changes
  useEffect(() => {
    if (!map || !initialised.current) return

    // Exclude any country the player has since annexed — no point painting
    // our own territory as war-damaged (user saw Israel still showing brown
    // after conquest).
    const excluded = new Set<string>([
      ...(gameState?.controlledCountries ?? []),
      gameState?.playerCountryId ?? '',
    ])
    const nukedIsos = Object.entries(warDamage).filter(([k, v]) => v === 'nuked' && !excluded.has(k)).map(([k]) => k)
    const bombedIsos = Object.entries(warDamage).filter(([k, v]) => v === 'bombed' && !excluded.has(k)).map(([k]) => k)

    const nukedOpacity: ExpressionSpecification = nukedIsos.length > 0
      ? ['match', ['get', 'ISO_A3'], nukedIsos, 0.88, 0] as unknown as ExpressionSpecification
      : 0 as unknown as ExpressionSpecification

    const bombedOpacity: ExpressionSpecification = bombedIsos.length > 0
      ? ['match', ['get', 'ISO_A3'], bombedIsos, 0.65, 0] as unknown as ExpressionSpecification
      : 0 as unknown as ExpressionSpecification

    const nukedBorderOpacity: ExpressionSpecification = nukedIsos.length > 0
      ? ['match', ['get', 'ISO_A3'], nukedIsos, 0.7, 0] as unknown as ExpressionSpecification
      : 0 as unknown as ExpressionSpecification

    if (map.getLayer('damage-nuked')) {
      map.setPaintProperty('damage-nuked', 'fill-opacity', nukedOpacity)
    }
    if (map.getLayer('damage-bombed')) {
      map.setPaintProperty('damage-bombed', 'fill-opacity', bombedOpacity)
    }
    if (map.getLayer('damage-nuked-border')) {
      map.setPaintProperty('damage-nuked-border', 'line-opacity', nukedBorderOpacity)
    }
  }, [map, warDamage, gameState?.controlledCountries, gameState?.playerCountryId])

  return null
}
