/**
 * CountryLabelOverlay — renders country name labels as HTML elements so any
 * web font (including Missale AS Lunea) can be applied.
 *
 * Place the font file at:  client/public/fonts/MissaleASLunea.woff2  (or .ttf)
 * The @font-face is declared in index.css.
 *
 * This overlay hides the MapLibre symbol layers when the font is available and
 * uses React-positioned divs instead, which support CSS rotation and any font.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useMap } from './MapContext'

interface LabelEntry {
  id: string
  name: string
  angle: number          // degrees
  tier: number           // 0 = largest
  x: number             // screen px
  y: number             // screen px
  lng: number
  lat: number
}

const TIER_MIN_ZOOM = [1.5, 2, 3.5, 5.5]
const TIER_FONT_SIZE = [15, 13, 11, 9]     // base px at zoom 3; scaled below

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)) }

export default function CountryLabelOverlay() {
  const map = useMap()
  const [labels, setLabels] = useState<LabelEntry[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const sourceLoadedRef = useRef(false)

  const projectLabels = useCallback(() => {
    if (!map || !sourceLoadedRef.current) return
    const zoom = map.getZoom()
    const source = map.getSource('country-label-points') as maplibregl.GeoJSONSource | undefined
    if (!source) return

    // Access the underlying data (MapLibre stores it on _data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (source as any)._data as GeoJSON.FeatureCollection | undefined
    if (!data?.features) return

    const next: LabelEntry[] = []
    for (const f of data.features) {
      const props = f.properties as Record<string, unknown>
      const tier = (props.sizeTier as number) ?? 3
      if (zoom < TIER_MIN_ZOOM[tier]) continue

      const geom = f.geometry as GeoJSON.Point
      const [lng, lat] = geom.coordinates
      const { x, y } = map.project([lng, lat])

      next.push({
        id: String(props.ISO_A3 ?? props.ADMIN ?? Math.random()),
        name: String(props.labelName ?? props.ADMIN ?? ''),
        angle: Number(props.labelAngle ?? 0),
        tier,
        x,
        y,
        lng,
        lat,
      })
    }
    setLabels(next)
  }, [map])

  useEffect(() => {
    if (!map) return

    const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId === 'country-label-points' && e.isSourceLoaded) {
        sourceLoadedRef.current = true
        projectLabels()
      }
    }
    const onRender = () => { if (sourceLoadedRef.current) projectLabels() }

    map.on('sourcedata', onSourceData)
    map.on('render', onRender)
    return () => {
      map.off('sourcedata', onSourceData)
      map.off('render', onRender)
    }
  }, [map, projectLabels])

  if (!map) return null

  const zoom = map.getZoom()
  // Font size scales with zoom
  const zoomScale = lerp(0.7, 1.4, (zoom - 1.5) / 4)

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {labels.map(l => {
        const fontSize = TIER_FONT_SIZE[l.tier] * zoomScale
        return (
          <div
            key={l.id}
            style={{
              position: 'absolute',
              left: l.x,
              top: l.y,
              transform: `translate(-50%, -50%) rotate(${l.angle}deg)`,
              fontFamily: "'Missale AS Lunea', 'IM Fell English', 'Palatino Linotype', serif",
              fontSize: `${fontSize}px`,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#ffffff',
              textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7), 1px 1px 2px rgba(0,0,0,1)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              lineHeight: 1.1,
            }}
          >
            {l.name}
          </div>
        )
      })}
    </div>
  )
}
