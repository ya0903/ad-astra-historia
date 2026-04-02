import { useEffect, useRef } from 'react'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'

// FEATURECLA values present in ne_10m_geography_regions_polys
const BIOME_COLOURS: Record<string, string> = {
  // Arid / desert
  'Desert':                  'rgba(210,175,60,0.55)',
  'Dune':                    'rgba(220,195,80,0.45)',
  'Arid':                    'rgba(210,175,60,0.45)',
  // Cold / tundra
  'Tundra':                  'rgba(180,210,240,0.40)',
  'Ice Shelf/Tundra':        'rgba(200,230,255,0.45)',
  'Glaciated Areas':         'rgba(220,240,255,0.50)',
  // Forest / jungle
  'Forest':                  'rgba(30,110,50,0.55)',
  'Rain Forest':             'rgba(20,130,60,0.60)',
  'Tropical Rainforest':     'rgba(20,130,60,0.60)',
  'Coniferous Forest':       'rgba(40,100,55,0.52)',
  'Deciduous Forest':        'rgba(60,130,50,0.52)',
  // Grassland / savanna
  'Grassland':               'rgba(120,165,55,0.42)',
  'Steppe':                  'rgba(150,175,70,0.38)',
  'Savanna':                 'rgba(170,170,60,0.42)',
  'Prairie':                 'rgba(130,170,55,0.40)',
  // Wetland / marsh
  'Wetlands':                'rgba(30,140,130,0.52)',
  'Marsh':                   'rgba(40,150,120,0.52)',
  'Swamp':                   'rgba(30,130,110,0.50)',
  // Alpine / highland
  'Alpine':                  'rgba(160,180,200,0.45)',
  'Highland':                'rgba(150,160,180,0.42)',
  // Mediterranean / shrub
  'Mediterranean Shrubland': 'rgba(170,140,70,0.40)',
  'Shrubland':               'rgba(160,135,65,0.38)',
  // Plains / agricultural
  'Plains':                  'rgba(140,170,80,0.36)',
  'Agricultural':            'rgba(150,180,70,0.38)',
}

function buildColourExpression(): ExpressionSpecification {
  const pairs = Object.entries(BIOME_COLOURS).flatMap(([k, v]) => [k, v])
  return ['match', ['get', 'FEATURECLA'], ...pairs, 'rgba(0,0,0,0)'] as unknown as ExpressionSpecification
}

/** Insert layers immediately before 'country-fills' if it exists, otherwise before first symbol layer. */
function addBiomeLayers(map: maplibregl.Map) {
  if (map.getSource('biomes')) return // already added

  // Find insertion point — just before country-fills so biomes sit under country tint
  const beforeId = map.getLayer('country-fills') ? 'country-fills' : undefined

  map.addLayer({
    id: 'biomes-fill',
    type: 'fill',
    source: 'biomes',
    paint: {
      'fill-color': buildColourExpression(),
      'fill-opacity': 1,
    },
  }, beforeId)

  map.addLayer({
    id: 'biomes-outline',
    type: 'line',
    source: 'biomes',
    minzoom: 4,
    paint: {
      'line-color': 'rgba(255,255,255,0.07)',
      'line-width': 0.5,
    },
  }, beforeId)
}

export default function BiomesLayer() {
  const map = useMap()
  const geojsonRef = useRef<unknown>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    fetch('/api/game/biomes')
      .then(r => r.json())
      .then(geojson => {
        geojsonRef.current = geojson
        if (map.getSource('biomes')) return
        map.addSource('biomes', { type: 'geojson', data: geojson })

        if (map.getLayer('country-fills')) {
          // Country layer already loaded — insert immediately before it
          addBiomeLayers(map)
        } else {
          // Country layer not ready yet — wait for it, then insert
          const onSourceData = () => {
            if (map.getLayer('country-fills') && !map.getLayer('biomes-fill')) {
              addBiomeLayers(map)
              map.off('sourcedata', onSourceData)
            }
          }
          map.on('sourcedata', onSourceData)
        }
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
