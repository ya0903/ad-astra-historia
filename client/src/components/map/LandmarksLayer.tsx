import { useEffect } from 'react'
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { useMap } from './MapContext'

// ── Static geographic features ─────────────────────────────────────────────

type LandmarkType = 'ocean' | 'mountain_range' | 'desert' | 'basin' | 'plateau' | 'sea' | 'strait' | 'forest'

interface Landmark {
  name: string
  lng: number
  lat: number
  type: LandmarkType
  minzoom: number
}

const LANDMARKS: Landmark[] = [
  // ── Oceans (shown at all zoom levels) ───────────────────────────────────
  { name: 'PACIFIC OCEAN', lng: 175.0, lat: 5.0, type: 'ocean', minzoom: 2 },
  { name: 'PACIFIC OCEAN', lng: -135.0, lat: -10.0, type: 'ocean', minzoom: 2 },
  { name: 'ATLANTIC OCEAN', lng: -28.0, lat: 10.0, type: 'ocean', minzoom: 2 },
  { name: 'ATLANTIC OCEAN', lng: -20.0, lat: -25.0, type: 'ocean', minzoom: 2 },
  { name: 'INDIAN OCEAN', lng: 75.0, lat: -18.0, type: 'ocean', minzoom: 2 },
  { name: 'ARCTIC OCEAN', lng: 0.0, lat: 82.0, type: 'ocean', minzoom: 2 },
  { name: 'SOUTHERN OCEAN', lng: 0.0, lat: -62.0, type: 'ocean', minzoom: 2 },

  // ── Mountain ranges ──────────────────────────────────────────────────────
  { name: 'HIMALAYAS', lng: 83.0, lat: 28.5, type: 'mountain_range', minzoom: 3 },
  { name: 'ANDES', lng: -72.0, lat: -20.0, type: 'mountain_range', minzoom: 3 },
  { name: 'ROCKY MOUNTAINS', lng: -112.0, lat: 45.0, type: 'mountain_range', minzoom: 3 },
  { name: 'ALPS', lng: 10.5, lat: 46.5, type: 'mountain_range', minzoom: 4 },
  { name: 'CAUCASUS', lng: 44.0, lat: 42.5, type: 'mountain_range', minzoom: 4 },
  { name: 'URAL MOUNTAINS', lng: 60.0, lat: 57.0, type: 'mountain_range', minzoom: 4 },
  { name: 'ATLAS MOUNTAINS', lng: -3.0, lat: 32.5, type: 'mountain_range', minzoom: 4 },
  { name: 'HINDU KUSH', lng: 70.0, lat: 35.5, type: 'mountain_range', minzoom: 4 },
  { name: 'ZAGROS MOUNTAINS', lng: 47.0, lat: 32.5, type: 'mountain_range', minzoom: 4 },
  { name: 'PYRENEES', lng: 1.0, lat: 42.7, type: 'mountain_range', minzoom: 5 },
  { name: 'CARPATHIANS', lng: 24.0, lat: 47.5, type: 'mountain_range', minzoom: 5 },
  { name: 'APPALACHIANS', lng: -80.0, lat: 38.0, type: 'mountain_range', minzoom: 5 },
  { name: 'DRAKENSBERG', lng: 29.5, lat: -29.5, type: 'mountain_range', minzoom: 5 },
  { name: 'TIBETAN PLATEAU', lng: 88.0, lat: 33.0, type: 'plateau', minzoom: 4 },
  { name: 'ETHIOPIAN HIGHLANDS', lng: 38.0, lat: 9.5, type: 'mountain_range', minzoom: 5 },

  // ── Deserts ──────────────────────────────────────────────────────────────
  { name: 'SAHARA DESERT', lng: 13.0, lat: 23.5, type: 'desert', minzoom: 3 },
  { name: 'ARABIAN DESERT', lng: 46.0, lat: 23.0, type: 'desert', minzoom: 4 },
  { name: 'GOBI DESERT', lng: 105.0, lat: 43.0, type: 'desert', minzoom: 4 },
  { name: 'PATAGONIAN DESERT', lng: -68.0, lat: -42.0, type: 'desert', minzoom: 4 },
  { name: 'KALAHARI DESERT', lng: 22.0, lat: -24.0, type: 'desert', minzoom: 4 },
  { name: 'AUSTRALIAN OUTBACK', lng: 133.0, lat: -25.0, type: 'desert', minzoom: 4 },
  { name: 'KARAKUM DESERT', lng: 59.0, lat: 39.5, type: 'desert', minzoom: 5 },
  { name: 'TAKLAMAKAN DESERT', lng: 83.0, lat: 39.0, type: 'desert', minzoom: 5 },

  // ── Rainforests & basins ─────────────────────────────────────────────────
  { name: 'AMAZON RAINFOREST', lng: -61.0, lat: -3.5, type: 'forest', minzoom: 3 },
  { name: 'CONGO RAINFOREST', lng: 23.5, lat: -1.5, type: 'forest', minzoom: 4 },
  { name: 'BORNEO RAINFOREST', lng: 115.0, lat: 1.0, type: 'forest', minzoom: 5 },

  // ── Great plains & grasslands ────────────────────────────────────────────
  { name: 'GREAT PLAINS', lng: -100.0, lat: 40.0, type: 'basin', minzoom: 4 },
  { name: 'SIBERIAN PLAINS', lng: 80.0, lat: 62.0, type: 'basin', minzoom: 4 },
  { name: 'SERENGETI', lng: 35.0, lat: -3.0, type: 'basin', minzoom: 5 },
  { name: 'PAMPAS', lng: -64.0, lat: -34.0, type: 'basin', minzoom: 5 },

  // ── Seas & water bodies ──────────────────────────────────────────────────
  { name: 'MEDITERRANEAN SEA', lng: 15.0, lat: 36.0, type: 'sea', minzoom: 3 },
  { name: 'RED SEA', lng: 38.5, lat: 20.5, type: 'sea', minzoom: 4 },           // moved east — was clipping Sudan
  { name: 'ARABIAN SEA', lng: 63.0, lat: 17.0, type: 'sea', minzoom: 3 },
  { name: 'PERSIAN GULF', lng: 52.5, lat: 26.5, type: 'sea', minzoom: 5 },      // moved east — was inside Saudi Arabia
  { name: 'BAY OF BENGAL', lng: 88.0, lat: 14.0, type: 'sea', minzoom: 4 },
  { name: 'SOUTH CHINA SEA', lng: 113.0, lat: 12.0, type: 'sea', minzoom: 4 },
  { name: 'CASPIAN SEA', lng: 50.0, lat: 42.0, type: 'sea', minzoom: 4 },       // moved west — was too far right
  { name: 'BLACK SEA', lng: 34.0, lat: 43.0, type: 'sea', minzoom: 4 },
  { name: 'NORTH SEA', lng: 4.0, lat: 56.5, type: 'sea', minzoom: 4 },
  { name: 'BERING SEA', lng: -172.0, lat: 57.0, type: 'sea', minzoom: 4 },
  { name: 'GULF OF MEXICO', lng: -90.0, lat: 24.0, type: 'sea', minzoom: 4 },
  { name: 'CARIBBEAN SEA', lng: -75.0, lat: 15.0, type: 'sea', minzoom: 4 },
  { name: 'STRAIT OF HORMUZ', lng: 56.4, lat: 26.6, type: 'strait', minzoom: 5 },
  { name: 'STRAIT OF MALACCA', lng: 103.0, lat: 2.5, type: 'strait', minzoom: 5 },
  { name: 'BOSPHORUS', lng: 29.0, lat: 41.1, type: 'strait', minzoom: 6 },
  { name: 'SUEZ CANAL', lng: 32.4, lat: 30.5, type: 'strait', minzoom: 5 },

  // ── Lakes ────────────────────────────────────────────────────────────────
  { name: 'GREAT LAKES', lng: -85.0, lat: 45.5, type: 'sea', minzoom: 4 },
  { name: 'LAKE VICTORIA', lng: 33.0, lat: -1.0, type: 'sea', minzoom: 5 },
  { name: 'LAKE BAIKAL', lng: 107.5, lat: 53.5, type: 'sea', minzoom: 5 },
  // Aral Sea removed — mostly dried up in modern era; confusing at small scale
]

function buildLandmarksGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: LANDMARKS.map(lm => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lm.lng, lm.lat] },
      properties: { name: lm.name, ltype: lm.type, minzoom: lm.minzoom },
    })),
  }
}

// ── Colour by type ─────────────────────────────────────────────────────────

const TYPE_COLOURS: Record<LandmarkType, string> = {
  ocean:          'rgba(100,175,230,0.60)',
  mountain_range: 'rgba(200,190,170,0.75)',
  plateau:        'rgba(200,190,170,0.65)',
  desert:         'rgba(210,180,100,0.65)',
  basin:          'rgba(150,185,120,0.60)',
  forest:         'rgba(60,140,80,0.65)',
  sea:            'rgba(80,160,210,0.55)',
  strait:         'rgba(100,200,240,0.70)',
}

export default function LandmarksLayer() {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    if (map.getSource('landmarks')) return

    const geojson = buildLandmarksGeoJSON()
    map.addSource('landmarks', { type: 'geojson', data: geojson })

    // One layer per type so we can set individual colours / sizes
    const types: LandmarkType[] = ['ocean', 'mountain_range', 'plateau', 'desert', 'basin', 'forest', 'sea', 'strait']

    for (const t of types) {
      const colour = TYPE_COLOURS[t]
      const layerId = `landmark-${t}`
      const isOcean = t === 'ocean'
      map.addLayer({
        id: layerId,
        type: 'symbol',
        source: 'landmarks',
        minzoom: isOcean ? 1.5 : 2.5,
        filter: ['==', ['get', 'ltype'], t],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Medium'],
          'text-size': isOcean
            ? ['interpolate', ['linear'], ['zoom'], 1.5, 9, 3, 12, 5, 16] as ExpressionSpecification
            : ['interpolate', ['linear'], ['zoom'], 2.5, 8, 4, 10, 5, 12, 7, 14] as ExpressionSpecification,
          'text-letter-spacing': isOcean ? 0.45 : 0.25,
          'text-transform': 'uppercase',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-max-width': isOcean ? 10 : 8,
        },
        paint: {
          'text-color': colour,
          'text-halo-color': 'rgba(0,0,0,0.55)',
          'text-halo-width': isOcean ? 1.0 : 1.5,
          'text-halo-blur': 0.5,
          'text-opacity': isOcean
            ? ['interpolate', ['linear'], ['zoom'], 1.5, 0, 2, 1] as ExpressionSpecification
            : ['interpolate', ['linear'], ['zoom'], 2.5, 0, 3, 1] as ExpressionSpecification,
        },
      })
    }

    return () => {
      for (const t of types) {
        const layerId = `landmark-${t}`
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource('landmarks')) map.removeSource('landmarks')
    }
  }, [map])

  return null
}
