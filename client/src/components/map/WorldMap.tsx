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

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku'])

// Era-specific starting camera positions
const ERA_CAMERA: Record<string, { center: [number, number]; zoom: number }> = {
  greek:   { center: [25,  38], zoom: 4.0 },   // Aegean Sea
  roman:   { center: [15,  41], zoom: 3.5 },   // Mediterranean
  ottoman: { center: [32,  39], zoom: 3.5 },   // Anatolia / eastern Med
  abbasid: { center: [44,  33], zoom: 4.0 },   // Baghdad
  tang:    { center: [108, 34], zoom: 4.0 },   // Xi'an / central China
  aztec:   { center: [-99, 19], zoom: 4.5 },   // Mexico City area
  songhai: { center: [ -3, 16], zoom: 4.0 },   // Timbuktu / Niger bend
  sengoku: { center: [136, 36], zoom: 4.5 },   // Honshu, Japan
}
const ANCIENT_CENTER: [number, number] = [28, 38]  // Mediterranean fallback
const ANCIENT_ZOOM = 3.5

// ── Biome colours ──────────────────────────────────────────────────────────────
// FEATURECLA values from ne_10m_geography_regions_polys (actual values in data)
// Colors tuned for the dark (#0a1628) base: semi-transparent so the hillshade
// topography bleeds through and gives a textured, painterly look.
const BIOME_COLOURS: Record<string, string> = {
  // Arid / desert — warm ochre/sand
  'Desert':                  'rgba(195,155,55,0.62)',
  // Cold / polar
  'Tundra':                  'rgba(155,195,225,0.44)',
  // Grassland / plains
  'Plain':                   'rgba(105,152,48,0.48)',
  'Lowland':                 'rgba(118,158,50,0.46)',
  // Wetland
  'Wetlands':                'rgba(28,128,118,0.58)',
  'Delta':                   'rgba(35,138,110,0.55)',
  // Valleys and basins — muted greens
  'Valley':                  'rgba(65,120,58,0.48)',
  'Basin':                   'rgba(100,140,65,0.42)',
  // Depression — dry/arid feel
  'Depression':              'rgba(175,145,55,0.45)',
  // Gorge — rocky grey
  'Gorge':                   'rgba(120,130,150,0.45)',
  // Geographic areas — subtle neutral
  'Geoarea':                 'rgba(110,130,100,0.30)',
  // Coast / peninsula — subtle blue-grey
  'Coast':                   'rgba(80,120,150,0.30)',
  'Pen/cape':                'rgba(90,130,145,0.28)',
  'Peninsula':               'rgba(90,130,145,0.28)',
  'Isthmus':                 'rgba(85,125,140,0.30)',
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

          // Buffer ring layers — outermost first (level 3), lowest opacity
          // Each ring uses the blendOpacity from the feature property, scaled by zoom
          for (const level of [3, 2, 1] as const) {
            map.addLayer({
              id: `biomes-buffer-${level}`,
              type: 'fill',
              source: 'biomes',
              minzoom: 2,
              filter: ['==', ['get', 'bufferLevel'], level] as unknown as ExpressionSpecification,
              paint: {
                'fill-color': buildBiomeColour(),
                'fill-opacity': ['interpolate', ['linear'], ['zoom'],
                  2, ['*', ['coalesce', ['get', 'blendOpacity'], 0.1], 0.6],
                  4, ['*', ['coalesce', ['get', 'blendOpacity'], 0.1], 0.9],
                  7, ['*', ['coalesce', ['get', 'blendOpacity'], 0.1], 0.75],
                ] as unknown as ExpressionSpecification,
                'fill-antialias': true,
              },
            })
          }

          // Core biome fills — bufferLevel 0 (highest opacity)
          map.addLayer({
            id: 'biomes-fill',
            type: 'fill',
            source: 'biomes',
            minzoom: 2,
            filter: ['==', ['get', 'bufferLevel'], 0] as unknown as ExpressionSpecification,
            paint: {
              'fill-color': buildBiomeColour(),
              'fill-opacity': ['interpolate', ['linear'], ['zoom'],
                2, 0.30,
                4, 0.48,
                7, 0.38,
              ] as ExpressionSpecification,
              'fill-antialias': true,
            },
          })

          // Fallback layer for raw biomes.geojson (no bufferLevel property)
          map.addLayer({
            id: 'biomes-fill-fallback',
            type: 'fill',
            source: 'biomes',
            minzoom: 2,
            filter: ['!', ['has', 'bufferLevel']] as unknown as ExpressionSpecification,
            paint: {
              'fill-color': buildBiomeColour(),
              'fill-opacity': ['interpolate', ['linear'], ['zoom'],
                2, 0.30,
                4, 0.48,
                7, 0.38,
              ] as ExpressionSpecification,
              'fill-antialias': true,
            },
          })

          // Soft blurred edge layer — wide blurry lines along biome boundaries
          // give the appearance of gradual gradient transitions rather than hard
          // polygon edges. Only applied to core polygons (bufferLevel 0) or
          // features without bufferLevel (fallback path).
          map.addLayer({
            id: 'biomes-edge-blur',
            type: 'line',
            source: 'biomes',
            minzoom: 2,
            filter: ['any',
              ['==', ['get', 'bufferLevel'], 0],
              ['!', ['has', 'bufferLevel']],
            ] as unknown as ExpressionSpecification,
            paint: {
              'line-color': buildBiomeColour(),
              'line-width': ['interpolate', ['linear'], ['zoom'],
                2, 18,
                4, 35,
                7, 55,
              ] as ExpressionSpecification,
              'line-blur': ['interpolate', ['linear'], ['zoom'],
                2, 12,
                4, 24,
                7, 38,
              ] as ExpressionSpecification,
              'line-opacity': ['interpolate', ['linear'], ['zoom'],
                2, 0.20,
                4, 0.30,
                7, 0.22,
              ] as ExpressionSpecification,
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

  // ── WASD / Arrow key smooth map panning ──────────────────────────────────
  useEffect(() => {
    if (!mapInstance) return
    const keys = new Set<string>()
    let raf = 0

    const PAN_SPEED = 16   // pixels per frame at zoom 2; scales with zoom
    const ACCEL_FRAMES = 10 // frames to reach full speed
    let frameCount = 0

    const tick = () => {
      if (keys.size === 0) { raf = 0; frameCount = 0; return }
      frameCount++
      const zoom = mapInstance.getZoom()
      // Smooth acceleration ramp: 0→1 over ACCEL_FRAMES
      const accel = Math.min(1, frameCount / ACCEL_FRAMES)
      // Pan speed inversely scales with zoom so movement feels consistent;
      // use 1.3 instead of 1.5 so it doesn't slow down as aggressively when zoomed in
      const speed = PAN_SPEED * accel / Math.pow(1.3, Math.max(0, zoom - 2))
      let dx = 0, dy = 0
      if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) dx -= speed
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += speed
      if (keys.has('ArrowUp')    || keys.has('w') || keys.has('W')) dy -= speed
      if (keys.has('ArrowDown')  || keys.has('s') || keys.has('S')) dy += speed
      if (dx !== 0 || dy !== 0) mapInstance.panBy([dx, dy], { animate: false })
      raf = requestAnimationFrame(tick)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const dirs = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'])
      if (!dirs.has(e.key)) return
      // Only prevent default for arrow keys to avoid page scroll; let WASD pass through
      if (e.key.startsWith('Arrow')) e.preventDefault()
      keys.add(e.key)
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key)
      if (keys.size === 0) { cancelAnimationFrame(raf); raf = 0; frameCount = 0 }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      cancelAnimationFrame(raf)
    }
  }, [mapInstance])

  // ── Apply era-specific camera when era or map instance changes ────────────
  useEffect(() => {
    if (!mapInstance) return
    if (era && ANCIENT_ERAS.has(era)) {
      const cam = ERA_CAMERA[era] ?? { center: ANCIENT_CENTER, zoom: ANCIENT_ZOOM }
      mapInstance.flyTo({ center: cam.center, zoom: cam.zoom, duration: 1200 })
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
