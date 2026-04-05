/**
 * CountryLabelOverlay — HTML labels over the map using any CSS font.
 * - Direct DOM refs for position updates (no React state lag → labels stay glued to map).
 * - Labels only appear when the text fits inside the country at current zoom.
 * - Wide/flat countries (China, USA, Australia, Egypt…) always render horizontally.
 * - Liquid glass gradient text fill — no pill border.
 * Font priority: Missale AS Lunea → IM Fell English → serif
 */
import { useEffect, useRef, useState } from 'react'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'

const ANCIENT_ERAS = new Set(['greek', 'roman', 'ottoman', 'abbasid', 'tang', 'aztec', 'songhai', 'sengoku'])

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

/**
 * Returns the screen-rotation angle for the label plus the bounding-box
 * dimensions (in degrees) needed for the pixel-fit check.
 *
 * Rule: if the bbox is clearly wider than tall (ratio ≥ 1.4), OR the
 * principal axis is already near-horizontal (< 22°), force angle = 0.
 * This keeps China, USA, Australia, Egypt, Libya, Sudan, Greece etc. flat.
 */
function computeAngleAndBbox(ring: Ring): { angle: number; bboxW: number; bboxH: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const bboxW = maxX - minX
  const bboxH = maxY - minY

  // Principal axis via covariance
  let mx = 0, my = 0
  for (const [x, y] of ring) { mx += x; my += y }
  mx /= ring.length; my /= ring.length
  let cxx = 0, cyy = 0, cxy = 0
  for (const [x, y] of ring) {
    const dx = x - mx, dy = y - my
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy
  }
  // Negate: screen y-axis is inverted vs geographic latitude
  const raw = -Math.atan2(2 * cxy, cxx - cyy) * (90 / Math.PI)
  const deg = Math.max(-70, Math.min(70, Math.round(raw * 10) / 10))

  // Snap to horizontal for wide-bbox or near-horizontal countries
  if (bboxW > bboxH * 1.4 || Math.abs(deg) < 22) {
    return { angle: 0, bboxW, bboxH }
  }
  return { angle: deg, bboxW, bboxH }
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
  'Republic of Kosovo': 'Kosovo',
  'Somaliland': 'Somaliland',
  'Western Sahara': 'W. Sahara',
  'Ivory Coast': "Côte d'Ivoire",
  "Côte d'Ivoire": "Côte d'Ivoire",
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

// Skip only truly tiny/disputed territories with no meaningful area to render into
const SKIP_NAMES = new Set(['Northern Cyprus', 'Abkhazia', 'South Ossetia',
  'Transnistria', 'Nagorno-Karabakh'])

interface LabelDatum {
  iso: string
  name: string
  angle: number
  tier: number
  lng: number
  lat: number
  bboxW: number  // degrees longitude
  bboxH: number  // degrees latitude
}

const TIER_ZOOM_MIN = [1.5, 2.0, 3.5, 5.5]
const TIER_BASE_PX  = [16,  14,  12,  10]
const TIER_SCALE_PX = [18,  15,  13,  11]  // max font size at high zoom

// Approx text width per character: uppercase serif (≈0.60em) + letter-spacing (0.14em) = 0.74em
const CHAR_WIDTH_EM = 0.74

export default function CountryLabelOverlay() {
  const map = useMap()
  const era = useGameStore(s => s.state?.era)
  const [labelsData, setLabelsData] = useState<LabelDatum[]>([])
  // Refs to the rendered DOM elements so we can update positions without React state
  const labelRefsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  // ── Fetch borders, compute label data ──────────────────────────────────────
  useEffect(() => {
    if (!era) { setLabelsData([]); return }
    const controller = new AbortController()
    // Ancient eras: fetch era-specific polity borders and show polity names
    // Modern eras: fetch modern country borders
    const url = ANCIENT_ERAS.has(era) ? `/api/game/borders/${era}` : '/api/game/borders'
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        const best = new Map<string, {
          lng: number; lat: number; angle: number
          tier: number; area: number; name: string
          bboxW: number; bboxH: number
        }>()

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
          else if (geom.type === 'MultiPolygon')
            rings = (geom as GeoJSON.MultiPolygon).coordinates.map(p => p[0] as Ring)
          if (rings.length === 0) continue

          let bestRing = rings[0], bestArea = ringArea(rings[0])
          for (let i = 1; i < rings.length; i++) {
            const a = ringArea(rings[i])
            if (a > bestArea) { bestArea = a; bestRing = rings[i] }
          }

          const existing = best.get(iso)
          if (!existing || bestArea > existing.area) {
            const [lng, lat] = ringCentroid(bestRing)
            const { angle, bboxW, bboxH } = computeAngleAndBbox(bestRing)
            best.set(iso, {
              lng, lat, angle, bboxW, bboxH,
              tier: sizeTier(bestArea),
              area: bestArea,
              name: abbreviate(rawName),
            })
          }
        }

        setLabelsData(Array.from(best.entries()).map(([iso, d]) => ({ iso, ...d })))
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()
  }, [era])

  // ── Direct DOM update on every map render — zero React-state lag ──────────
  useEffect(() => {
    if (!map || labelsData.length === 0) return

    const update = () => {
      const zoom  = map.getZoom()
      const scale = Math.pow(1.35, zoom - 3)
      const canvas = map.getCanvas()

      // Pixels per degree of longitude — same for every label at this zoom/viewport
      const ctr = map.getCenter()
      const cp0 = map.project([ctr.lng, ctr.lat])
      const cp1 = map.project([ctr.lng + 1, ctr.lat])
      const pxPerDegLng = Math.abs(cp1.x - cp0.x)

      for (const d of labelsData) {
        const el = labelRefsRef.current.get(d.iso)
        if (!el) continue

        // Hard zoom gate (per tier)
        if (zoom < TIER_ZOOM_MIN[d.tier]) { el.style.display = 'none'; continue }

        const { x, y } = map.project([d.lng, d.lat])

        // Off-screen cull (generous margin for rotated labels near edges)
        if (x < -600 || x > canvas.width + 600 || y < -400 || y > canvas.height + 400) {
          el.style.display = 'none'; continue
        }

        const fontSize = Math.min(
          TIER_SCALE_PX[d.tier],
          Math.max(7, TIER_BASE_PX[d.tier] * scale)
        )

        // ── Text-fit check ──────────────────────────────────────────────────
        const ar = d.angle * Math.PI / 180
        const latStretch = 1 / Math.max(0.1, Math.cos(d.lat * Math.PI / 180))
        const countrySpanPx =
          d.bboxW * Math.abs(Math.cos(ar)) * pxPerDegLng +
          d.bboxH * Math.abs(Math.sin(ar)) * pxPerDegLng * latStretch

        const textPx = d.name.length * fontSize * CHAR_WIDTH_EM

        // fitFrac: 0 = text is tiny compared to country, 1 = text fills country edge-to-edge
        // Allow up to 0.95 — labels can slightly overflow the polygon boundary (CK-style)
        const fitFrac = textPx / Math.max(1, countrySpanPx)
        if (fitFrac > 0.95) { el.style.display = 'none'; continue }

        // Smooth fade: fully visible when fitFrac ≤ 0.75, fades 0.75→0.95
        const fitOpacity  = Math.max(0, Math.min(1, (0.95 - fitFrac) / 0.20))
        const zoomOpacity = Math.min(1, (zoom - TIER_ZOOM_MIN[d.tier] + 0.5) * 2)
        const opacity     = fitOpacity * zoomOpacity

        el.style.display   = 'block'
        el.style.left      = `${x}px`
        el.style.top       = `${y}px`
        el.style.fontSize  = `${fontSize}px`
        el.style.opacity   = String(opacity)
        el.style.transform = `translate(-50%, -50%) rotate(${d.angle}deg)`
      }
    }

    update()
    map.on('render', update)
    return () => { map.off('render', update) }
  }, [map, labelsData])

  if (!map) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, overflow: 'visible' }}>
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
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            lineHeight: 1,
            pointerEvents: 'none',
            // ── CK3-style: solid warm-white on a strong painted shadow ──────
            // The thick multi-layer shadow acts as the "outline" — no background
            // box needed. Visible on any terrain, dark or light.
            color: 'rgba(255, 248, 225, 0.95)',
            textShadow: [
              '0 0 3px rgba(0,0,0,1)',
              '0 0 6px rgba(0,0,0,1)',
              '0 1px 2px rgba(0,0,0,1)',
              '1px 0 2px rgba(0,0,0,0.8)',
              '-1px 0 2px rgba(0,0,0,0.8)',
              '0 -1px 2px rgba(0,0,0,0.8)',
              '0 0 20px rgba(0,0,0,0.55)',
            ].join(', '),
          } as React.CSSProperties}
        >
          {l.name}
        </div>
      ))}
    </div>
  )
}
