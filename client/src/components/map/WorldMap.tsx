import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapContext } from './MapContext'
import { useMapStore } from '../../stores'

interface Props {
  children?: ReactNode
}

export default function WorldMap({ children }: Props) {
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
        // Hosted glyph font needed for any text/symbol layers
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sources: {
          'terrain-dem': {
            type: 'raster-dem' as const,
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium' as const,
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0a1628' },
          },
          {
            id: 'hillshade',
            type: 'hillshade' as const,
            source: 'terrain-dem',
            paint: {
              'hillshade-shadow-color': '#0a1a2e',
              'hillshade-highlight-color': '#c8ddf8',
              'hillshade-illumination-altitude': 45,
              'hillshade-exaggeration': 0.3,
              'hillshade-accent-color': '#091525',
            },
          },
        ],
      },
      center: [20, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: false,
    })

    mapRef.current = map
    map.on('load', () => { setMapInstance(map); setMapStore(map) })

    return () => {
      map.remove()
      mapRef.current = null
      setMapInstance(null)
      setMapStore(null)
    }
  }, [setMapStore])

  return (
    <MapContext.Provider value={mapInstance}>
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />
        {children}
      </div>
    </MapContext.Provider>
  )
}
