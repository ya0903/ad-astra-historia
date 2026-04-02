/**
 * CountryLabelOverlay — HTML labels over the map using any CSS font.
 * Positions are updated via direct DOM refs (no React state) so labels
 * track the map perfectly without lag.
 * Font priority: Missale AS Lunea → IM Fell English → serif
 */
import { useEffect, useRef, useState } from 'react'
import { useMap } from './MapContext'

type Ring = [number, number][]

function ringArea(ring: Ring): number {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(a) / 2
}

function ringCentroid(ring: Ring): [number, number] {
  let cx = 0, cy = 0, area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    cx += (ring[j][0] + ring[i][0]) * cross
    cy += (ring[j][1] + ring[i][1]) * cross
    area += cross
  }
  area /= 2
  if (Math.abs(area) < 1e-10) {
    let x = 0, y = 0
    for (const [vx, vy] of ring) { x += vx; y += vy }
    return [x / ring.length, y / ring.length]
  }
  return [cx / (6 * area), cy / (6 * area)]
}

function computeAngle(ring: Ring): number {
  let mx = 0, my = 0
  for (const [x, y] of ring) { mx += x; my += y }
  mx /= ring.length; my /= ring.length
  let cxx = 0, cyy = 0, cxy = 0
  for (const [x, y] of ring) {
    const dx = x - mx, dy = y - my
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy
  }
  const deg = -Math.atan2(2 * cxy, cxx - cyy) * (90 / Math.PI)
  return Math.max(-70, Math.min(70, Math.round(deg * 10) / 10))
}

function sizeTier(area: number): number {
  if (area > 200) return 0
  if (area > 8)   return 1
  if (area > 0.3) return 2
  return 3
}

const ABBR: Record<string, string> = {
  'United States of America': 'United States',
  'Democratic Republic of the Congo': 'DR Congo',
  'Republic of the Congo': 'Congo',
  'Central African Republic': 'C. African Rep.',
  'Bosnia and Herzegovina': 'Bosnia',
  'Trinidad and Tobago': 'Trinidad',
  'United Arab Emirates': 'UAE',
  'Papua New Guinea': 'Papua N. Guinea',
  'Equatorial Guinea': 'Eq. Guinea',
  'Dominican Republic': 'Dominican Rep.',
  'North Macedonia': 'N. Macedonia',
  "People's Republic of China": 'China',
  'Republic of Korea': 'S. Korea',
  "Democratic People's Republic of Korea": 'N. Korea',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Russian Federation': 'Russia',
  'Islamic Republic of Iran': 'Iran',
  'Republic of South Africa': 'South Africa',
  'São Tomé and Príncipe': 'São Tomé',
  'Saint Kitts and Nevis': 'St. Kitts',
  'Saint Vincent and the Grenadines': 'St. Vincent',
  'Antigua and Barbuda': 'Antigua',
  'Solomon Islands': 'Solomon Is.',
  'Marshall Islands': 'Marshall Is.',
  'Federated States of Micronesia': 'Micronesia',
  'British Indian Ocean Territory': 'BIOT',
  'South Georgia and the South Sandwich Islands': 'S. Georgia',
  'French Southern and Antarctic Lands': 'Fr. S. Lands',
  'Heard Island and McDonald Islands': 'Heard Is.',
}
function abbreviate(name: string): string {
  if (ABBR[name]) return ABBR[name]
  if (name.length > 16) {
    name = name
      .replace(/^Federative Republic of /i, '')
      .replace(/^Federal Republic of /i, '')
      .replace(/^Republic of /i, '')
      .replace(/^Kingdom of /i, '')
      .replace(/^State of /i, '')
      .replace(/^Principality of /i, '')
      .replace(/^The /i, '')
  }
  return name
}

const SKIP_NAMES = new Set(['Somaliland', 'Kosovo', 'Northern Cyprus', 'Abkhazia', 'South Ossetia',
  'Transnistria', 'Nagorno-Karabakh', 'Western Sahara'])

interface LabelDatum {
  iso: string
  name: string
  angle: number
  tier: number
  lng: number
  lat: number
}

const TIER_ZOOM_MIN = [1.5, 2.0, 3.5, 5.5]
const TIER_BASE_PX   = [14,  12,  10,  8]

export default function CountryLabelOverlay() {
  const map = useMap()
  const [labelsData, setLabelsData] = useState<LabelDatum[]>([])
  // One ref per label iso — updated directly on each map render (no state lag)
  const labelRefsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  // Fetch and compute geo data once
  useEffect(() => {
    fetch('/api/game/borders')
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        const best = new Map<string, { lng: number; lat: number; angle: number; tier: number; area: number; name: string }>()
        for (const feature of geojson.features) {
          const props = feature.properties as Record<string, unknown>
          const rawName = (props?.ADMIN ?? props?.NAME ?? '') as string
          if (SKIP_NAMES.has(rawName)) continue

          let iso = (props?.ISO_A3 ?? props?.ADM0_A3 ?? '') as string
          if (!iso || iso === '-99') iso = rawName
          if (!iso) continue

          const geom = feature.geometry as GeoJSON.Geometry
          let rings: Ring[] = []
          if (geom.type === 'Polygon') rings = [geom.coordinates[0] as Ring]
          else if (geom.type === 'MultiPolygon') rings = (geom as GeoJSON.MultiPolygon).coordinates.map(p => p[0] as Ring)
          if (rings.length === 0) continue

          let best_ring = rings[0], bestArea = ringArea(rings[0])
          for (let i = 1; i < rings.length; i++) {
            const a = ringArea(rings[i])
            if (a > bestArea) { bestArea = a; best_ring = rings[i] }
          }

          const existing = best.get(iso)
          if (!existing || bestArea > existing.area) {
            const [lng, lat] = ringCentroid(best_ring)
            best.set(iso, { lng, lat, angle: computeAngle(best_ring), tier: sizeTier(bestArea), area: bestArea, name: abbreviate(rawName) })
          }
        }
        setLabelsData(Array.from(best.entries()).map(([iso, d]) => ({ iso, ...d })))
      })
      .catch(() => {})
  }, [])

  // Direct DOM position updates on every map render — no React state, no lag
  useEffect(() => {
    if (!map || labelsData.length === 0) return

    const update = () => {
      const zoom = map.getZoom()
      const scale = Math.pow(1.35, zoom - 3)

      for (const d of labelsData) {
        const el = labelRefsRef.current.get(d.iso)
        if (!el) continue

        if (zoom < TIER_ZOOM_MIN[d.tier]) {
          el.style.display = 'none'
          continue
        }

        const { x, y } = map.project([d.lng, d.lat])
        const fontSize = Math.max(6, TIER_BASE_PX[d.tier] * scale)
        const opacity = Math.min(1, (zoom - TIER_ZOOM_MIN[d.tier] + 0.5) * 2)

        el.style.display = 'block'
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.fontSize = `${fontSize}px`
        el.style.opacity = String(opacity)
        el.style.transform = `translate(-50%, -50%) rotate(${d.angle}deg)`
      }
    }

    update()
    map.on('render', update)
    return () => { map.off('render', update) }
  }, [map, labelsData])

  if (!map) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {labelsData.map(l => (
        <div
          key={l.iso}
          ref={el => {
            if (el) labelRefsRef.current.set(l.iso, el)
            else labelRefsRef.current.delete(l.iso)
          }}
          style={{
            position: 'absolute',
            display: 'none',
            fontFamily: "'Missale AS Lunea', 'IM Fell English', 'Palatino Linotype', serif",
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            lineHeight: 1,
            pointerEvents: 'none',
            // Liquid glass pill
            color: 'rgba(210, 220, 235, 0.92)',
            background: 'rgba(140, 155, 180, 0.13)',
            backdropFilter: 'blur(6px) saturate(0.9)',
            WebkitBackdropFilter: 'blur(6px) saturate(0.9)',
            border: '1px solid rgba(200, 215, 240, 0.14)',
            borderRadius: '20px',
            padding: '1px 7px 2px',
            textShadow: '0 1px 6px rgba(160,185,230,0.25), 0 0 12px rgba(0,0,0,0.6)',
            boxShadow: '0 1px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {l.name}
        </div>
      ))}
    </div>
  )
}
