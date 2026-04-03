import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { MapContext } from './MapContext'
import { useMapStore } from '../../stores'

interface Props {
  children?: ReactNode
  era?: string
}

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman'])
const ANCIENT_CENTER: [number, number] = [28, 38]  // Mediterranean — starting camera position
const ANCIENT_ZOOM = 3.5

// ── Biome colours ──────────────────────────────────────────────────────────────
// FEATURECLA values from ne_10m_geography_regions_polys
// Colors tuned for the dark (#0a1628) base: semi-transparent so the hillshade
// topography bleeds through and gives a textured, painterly look.
const BIOME_COLOURS: Record<string, string> = {
  // Arid / desert — warm ochre/sand
  'Desert':                  'rgba(195,155,55,0.62)',
  'Dune':                    'rgba(210,180,75,0.52)',
  'Arid':                    'rgba(195,155,55,0.52)',
  // Cold / polar
  'Tundra':                  'rgba(155,195,225,0.44)',
  'Ice Shelf/Tundra':        'rgba(185,220,250,0.50)',
  'Glaciated Areas':         'rgba(210,235,255,0.55)',
  // Forest — rich greens, varying shade by type
  'Forest':                  'rgba(28,100,48,0.62)',
  'Rain Forest':             'rgba(18,120,55,0.68)',
  'Tropical Rainforest':     'rgba(18,120,55,0.68)',
  'Coniferous Forest':       'rgba(35,90,50,0.58)',
  'Deciduous Forest':        'rgba(55,120,48,0.58)',
  // Grassland / steppe
  'Grassland':               'rgba(105,152,48,0.48)',
  'Steppe':                  'rgba(138,162,62,0.44)',
  'Savanna':                 'rgba(158,158,52,0.48)',
  'Prairie':                 'rgba(118,158,50,0.46)',
  'Plains':                  'rgba(125,158,72,0.42)',
  // Wetland
  'Wetlands':                'rgba(28,128,118,0.58)',
  'Marsh':                   'rgba(35,138,110,0.58)',
  'Swamp':                   'rgba(25,118,100,0.55)',
  // Highland / mountain
  'Alpine':                  'rgba(148,168,192,0.50)',
  'Highland':                'rgba(138,150,172,0.48)',
  // Shrubland / Mediterranean
  'Mediterranean Shrubland': 'rgba(158,128,62,0.46)',
  'Shrubland':               'rgba(148,125,58,0.44)',
  // Farmland
  'Agricultural':            'rgba(138,168,62,0.44)',
}

function buildBiomeColour(): ExpressionSpecification {
  const pairs = Object.entries(BIOME_COLOURS).flatMap(([k, v]) => [k, v])
  return ['match', ['get', 'FEATURECLA'], ...pairs, 'rgba(0,0,0,0)'] as unknown as ExpressionSpecification
}

export default function WorldMap({ children, era }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const setMapStore = useMapStore(s => s.setMap)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#0a1628' } },
        ],
      },
      center: [20, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: false,
    })

    mapRef.current = map

    map.on('load', () => {
      // ── 1. Hillshade (sync — always first) ──────────────────────────────────
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 512,
        encoding: 'terrarium',
        maxzoom: 8,
      })
      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'terrain-dem',
        minzoom: 3,
        paint: {
          'hillshade-shadow-color': '#060c1a',
          'hillshade-highlight-color': '#1a2e4a',
          'hillshade-accent-color': '#0a1628',
          'hillshade-exaggeration': 0.55,
        },
      })

      // ── 2. Fetch ocean + biomes in parallel before giving child components
      //       access to the map — this guarantees:
      //       background → hillshade → ocean-fill → biomes-fill
      //                                          → [country-fills added by CountryLayer]
      Promise.allSettled([
        fetch('/api/game/ocean').then(r => { if (!r.ok) throw new Error('no ocean'); return r.json() }),
        fetch('/api/game/biomes').then(r => { if (!r.ok) throw new Error('no biomes'); return r.json() }),
      ]).then(([oceanRes, biomesRes]) => {
        // Ocean mask — fills sea areas with background, hiding hillshade there
        if (oceanRes.status === 'fulfilled') {
          map.addSource('ocean', { type: 'geojson', data: oceanRes.value as never })
          map.addLayer({
            id: 'ocean-fill',
            type: 'fill',
            source: 'ocean',
            paint: { 'fill-color': '#0a1628', 'fill-opacity': 1 },
          })
        }

        // Biome tint — desert, forest, grassland, wetland, tundra overlays
        if (biomesRes.status === 'fulfilled') {
          map.addSource('biomes', { type: 'geojson', data: biomesRes.value as never })
          map.addLayer({
            id: 'biomes-fill',
            type: 'fill',
            source: 'biomes',
            minzoom: 2,
            paint: {
              'fill-color': buildBiomeColour(),
              // Low opacity keeps polygon edges visually soft — the dark base
              // (#0a1628) bleeds through and acts as a natural buffer between
              // neighbouring biomes. Fade in from zoom 2, slight pull-back at
              // high zoom so hillshade terrain detail shows through clearly.
              'fill-opacity': ['interpolate', ['linear'], ['zoom'],
                2, 0.22,
                4, 0.40,
                7, 0.32,
              ] as ExpressionSpecification,
              'fill-antialias': true,
            },
          })
        }

        // ── 3. Open map context to child components (CountryLayer etc.)
        setMapInstance(map)
        setMapStore(map)
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapInstance(null)
      setMapStore(null)
    }
  }, [setMapStore])

  // ── Apply era-specific camera when era or map instance changes ────────────
  useEffect(() => {
    if (!mapInstance) return
    if (era && ANCIENT_ERAS.has(era)) {
      // Start camera at Mediterranean for ancient eras, but don't restrict bounds
      // — the Americas are colonised by Spain/Portugal and should be explorable
      mapInstance.flyTo({ center: ANCIENT_CENTER, zoom: ANCIENT_ZOOM, duration: 1200 })
    }
    // Always clear any previously set bounds restriction
    mapInstance.setMaxBounds(null as unknown as maplibregl.LngLatBoundsLike)
  }, [era, mapInstance])

  const isAncient = era && ANCIENT_ERAS.has(era)

  return (
    <MapContext.Provider value={mapInstance}>
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />
        {/* CK3-style edge vignette for ancient eras */}
        {isAncient && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 120px 60px #050d1e',
              zIndex: 3,
            }}
          />
        )}
        {children}
      </div>
    </MapContext.Provider>
  )
}
