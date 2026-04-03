import { useEffect } from 'react'
import { useMap } from './MapContext'

// ── Static geographic features ─────────────────────────────────────────────

type LandmarkType = 'mountain_range' | 'desert' | 'basin' | 'plateau' | 'sea' | 'strait' | 'forest'

interface Landmark {
  name: string
  lng: number
  lat: number
  type: LandmarkType
  minzoom: number
}

const LANDMARKS: Landmark[] = [
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
  { name: 'RED SEA', lng: 37.0, lat: 20.5, type: 'sea', minzoom: 4 },
  { name: 'PERSIAN GULF', lng: 51.0, lat: 26.5, type: 'sea', minzoom: 5 },
  { name: 'BAY OF BENGAL', lng: 88.0, lat: 14.0, type: 'sea', minzoom: 4 },
  { name: 'SOUTH CHINA SEA', lng: 113.0, lat: 12.0, type: 'sea', minzoom: 4 },
  { name: 'CASPIAN SEA', lng: 51.5, lat: 42.0, type: 'sea', minzoom: 4 },
  { name: 'BLACK SEA', lng: 34.0, lat: 43.0, type: 'sea', minzoom: 4 },
  { name: 'BERING SEA', lng: -172.0, lat: 57.0, type: 'sea', minzoom: 4 },
  { name: 'STRAIT OF HORMUZ', lng: 56.4, lat: 26.6, type: 'strait', minzoom: 5 },
  { name: 'STRAIT OF MALACCA', lng: 103.0, lat: 2.5, type: 'strait', minzoom: 5 },
  { name: 'BOSPHORUS', lng: 29.0, lat: 41.1, type: 'strait', minzoom: 6 },
  { name: 'SUEZ CANAL', lng: 32.4, lat: 30.5, type: 'strait', minzoom: 5 },

  // ── Lakes ────────────────────────────────────────────────────────────────
  { name: 'GREAT LAKES', lng: -85.0, lat: 45.5, type: 'sea', minzoom: 4 },
  { name: 'LAKE VICTORIA', lng: 33.0, lat: -1.0, type: 'sea', minzoom: 5 },
  { name: 'LAKE BAIKAL', lng: 107.5, lat: 53.5, type: 'sea', minzoom: 5 },
  { name: 'ARAL SEA', lng: 60.0, lat: 45.5, type: 'sea', minzoom: 5 },
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

    // One layer per type so we can set individual colours
    const types: LandmarkType[] = ['mountain_range', 'plateau', 'desert', 'basin', 'forest', 'sea', 'strait']

    for (const t of types) {
      const colour = TYPE_COLOURS[t]
      const layerId = `landmark-${t}`
      map.addLayer({
        id: layerId,
        type: 'symbol',
        source: 'landmarks',
        minzoom: 2.5,
        filter: ['==', ['get', 'ltype'], t],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Medium'],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            2.5, 8,
            4, 10,
            5, 12,
            7, 14,
          ],
          'text-letter-spacing': 0.25,
          'text-transform': 'uppercase',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-max-width': 8,
        },
        paint: {
          'text-color': colour,
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1.5,
          'text-halo-blur': 0.5,
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            2.5, 0,
            3, 1,
          ],
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
