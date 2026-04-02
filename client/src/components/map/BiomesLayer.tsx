import { useEffect, useRef } from 'react'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'

// FEATURECLA values present in ne_10m_geography_regions_polys
// Colours are semi-transparent tints designed for the dark (#0a1628) basemap
const BIOME_COLOURS: Record<string, string> = {
  // Arid / desert
  'Desert':                  'rgba(210,175,60,0.28)',
  'Dune':                    'rgba(220,195,80,0.22)',
  'Arid':                    'rgba(210,175,60,0.22)',
  // Cold / tundra
  'Tundra':                  'rgba(180,210,240,0.22)',
  'Ice Shelf/Tundra':        'rgba(200,230,255,0.25)',
  'Glaciated Areas':         'rgba(220,240,255,0.30)',
  // Forest / jungle
  'Forest':                  'rgba(30,110,50,0.30)',
  'Rain Forest':             'rgba(20,130,60,0.35)',
  'Tropical Rainforest':     'rgba(20,130,60,0.35)',
  'Coniferous Forest':       'rgba(40,100,55,0.28)',
  'Deciduous Forest':        'rgba(60,130,50,0.28)',
  // Grassland / savanna
  'Grassland':               'rgba(120,165,55,0.22)',
  'Steppe':                  'rgba(150,175,70,0.20)',
  'Savanna':                 'rgba(170,170,60,0.22)',
  'Prairie':                 'rgba(130,170,55,0.20)',
  // Wetland / marsh
  'Wetlands':                'rgba(30,140,130,0.28)',
  'Marsh':                   'rgba(40,150,120,0.28)',
  'Swamp':                   'rgba(30,130,110,0.28)',
  // Alpine / highland
  'Alpine':                  'rgba(160,180,200,0.25)',
  'Highland':                'rgba(150,160,180,0.22)',
  // Mediterranean / shrub
  'Mediterranean Shrubland': 'rgba(170,140,70,0.20)',
  'Shrubland':               'rgba(160,135,65,0.20)',
  // Plains / agricultural
  'Plains':                  'rgba(140,170,80,0.18)',
  'Agricultural':            'rgba(150,180,70,0.20)',
}

// Build a MapLibre match expression: ['match', ['get', 'FEATURECLA'], val, col, …, fallback]
function buildColourExpression(): ExpressionSpecification {
  const pairs = Object.entries(BIOME_COLOURS).flatMap(([k, v]) => [k, v])
  return ['match', ['get', 'FEATURECLA'], ...pairs, 'rgba(0,0,0,0)'] as unknown as ExpressionSpecification
}

export default function BiomesLayer() {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/biomes')
      .then(r => r.json())
      .then(geojson => {
        if (map.getSource('biomes')) return
        map.addSource('biomes', { type: 'geojson', data: geojson })

        // Fill — tinted biome colour
        map.addLayer({
          id: 'biomes-fill',
          type: 'fill',
          source: 'biomes',
          paint: {
            'fill-color': buildColourExpression(),
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 6, 0.85],
          },
        })

        // Subtle outline to help distinguish adjacent regions at zoom 4+
        map.addLayer({
          id: 'biomes-outline',
          type: 'line',
          source: 'biomes',
          minzoom: 4,
          paint: {
            'line-color': 'rgba(255,255,255,0.06)',
            'line-width': 0.5,
          },
        })
      })
      .catch(() => { /* biomes.geojson not downloaded yet */ })

    return () => {
      if (map.getLayer('biomes-outline')) map.removeLayer('biomes-outline')
      if (map.getLayer('biomes-fill')) map.removeLayer('biomes-fill')
      if (map.getSource('biomes')) map.removeSource('biomes')
      loadedRef.current = false
    }
  }, [map])

  return null
}
