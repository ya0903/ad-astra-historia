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
// Playable region for ancient eras: western Europe to India, N. Africa to Scandinavia
const ANCIENT_BOUNDS: [[number, number], [number, number]] = [[-20, -15], [115, 72]]
const ANCIENT_CENTER: [number, number] = [28, 38]  // Mediterranean
const ANCIENT_ZOOM = 3.5

// ── Biome colours ──────────────────────────────────────────────────────────────
// FEATURECLA values from ne_10m_geography_regions_polys
const BIOME_COLOURS: Record<string, string> = {
  'Desert':                  'rgba(210,175,60,0.55)',
  'Dune':                    'rgba(220,195,80,0.45)',
  'Arid':                    'rgba(210,175,60,0.45)',
  'Tundra':                  'rgba(180,210,240,0.40)',
  'Ice Shelf/Tundra':        'rgba(200,230,255,0.45)',
  'Glaciated Areas':         'rgba(220,240,255,0.50)',
  'Forest':                  'rgba(30,110,50,0.55)',
  'Rain Forest':             'rgba(20,130,60,0.60)',
  'Tropical Rainforest':     'rgba(20,130,60,0.60)',
  'Coniferous Forest':       'rgba(40,100,55,0.52)',
  'Deciduous Forest':        'rgba(60,130,50,0.52)',
  'Grassland':               'rgba(120,165,55,0.42)',
  'Steppe':                  'rgba(150,175,70,0.38)',
  'Savanna':                 'rgba(170,170,60,0.42)',
  'Prairie':                 'rgba(130,170,55,0.40)',
  'Wetlands':                'rgba(30,140,130,0.52)',
  'Marsh':                   'rgba(40,150,120,0.52)',
  'Swamp':                   'rgba(30,130,110,0.50)',
  'Alpine':                  'rgba(160,180,200,0.45)',
  'Highland':                'rgba(150,160,180,0.42)',
  'Mediterranean Shrubland': 'rgba(170,140,70,0.40)',
  'Shrubland':               'rgba(160,135,65,0.38)',
  'Plains':                  'rgba(140,170,80,0.36)',
  'Agricultural':            'rgba(150,180,70,0.38)',
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
            minzoom: 4,
            paint: { 'fill-color': buildBiomeColour(), 'fill-opacity': 1 },
          })
          map.addLayer({
            id: 'biomes-outline',
            type: 'line',
            source: 'biomes',
            minzoom: 4,
            paint: { 'line-color': 'rgba(255,255,255,0.07)', 'line-width': 0.5 },
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

  // ── Apply era-specific bounds + camera when era or map instance changes ────
  useEffect(() => {
    if (!mapInstance) return
    if (era && ANCIENT_ERAS.has(era)) {
      mapInstance.setMaxBounds(ANCIENT_BOUNDS)
      mapInstance.flyTo({ center: ANCIENT_CENTER, zoom: ANCIENT_ZOOM, duration: 1200 })
    } else {
      // Remove bounds restriction for modern eras
      mapInstance.setMaxBounds(undefined as unknown as maplibregl.LngLatBoundsLike)
    }
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
