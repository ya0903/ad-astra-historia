import { useEffect, useRef, useState, useCallback } from 'react'
import type { ColonyBase } from '@ad-astra/shared/types'

interface Props {
  planet: 'moon' | 'mars'
  colonies: ColonyBase[]
  onColonyClick?: (colony: ColonyBase) => void
}

const PLANET_LABELS: Record<string, string> = {
  moon: 'The Moon',
  mars: 'Mars',
}

const PLANET_TINT: Record<string, string> = {
  moon: 'rgba(200,220,255,0.05)',
  mars: 'rgba(200,80,30,0.08)',
}

const COLONY_COLOUR: Record<string, string> = {
  moon: '#a8d8ea',
  mars: '#ff8c42',
}

// Notable named locations per planet for label display
const PLANET_FEATURES: Record<string, Array<{ name: string; lat: number; lng: number; type: 'crater' | 'mare' | 'mons' | 'vallis' | 'planitia' }>> = {
  moon: [
    { name: 'Mare Tranquillitatis', lat: 8, lng: 31, type: 'mare' },
    { name: 'Mare Imbrium', lat: 35, lng: -16, type: 'mare' },
    { name: 'Oceanus Procellarum', lat: 18, lng: -57, type: 'mare' },
    { name: 'Mare Serenitatis', lat: 28, lng: 17, type: 'mare' },
    { name: 'Apollo 11 Site', lat: 0.67, lng: 23.47, type: 'crater' },
    { name: 'Tycho', lat: -43, lng: -11, type: 'crater' },
    { name: 'Copernicus', lat: 10, lng: -20, type: 'crater' },
    { name: 'South Pole', lat: -90, lng: 0, type: 'crater' },
  ],
  mars: [
    { name: 'Olympus Mons', lat: 18, lng: -133, type: 'mons' },
    { name: 'Valles Marineris', lat: -13, lng: -59, type: 'vallis' },
    { name: 'Hellas Planitia', lat: -42, lng: 70, type: 'planitia' },
    { name: 'Gale Crater', lat: -5, lng: 138, type: 'crater' },
    { name: 'Chryse Planitia', lat: 22, lng: -49, type: 'planitia' },
    { name: 'Elysium Mons', lat: 25, lng: 147, type: 'mons' },
    { name: 'Argyre Planitia', lat: -50, lng: -43, type: 'planitia' },
    { name: 'Jezero Crater', lat: 18.4, lng: 77.7, type: 'crater' },
  ],
}

export default function PlanetMap({ planet, colonies, onColonyClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [selectedColony, setSelectedColony] = useState<ColonyBase | null>(null)

  // Pan/zoom
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [, forceRender] = useState(0)

  // Load texture image
  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
    imgRef.current = null

    const img = new Image()
    img.src = `/textures/${planet}.jpg`
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.onerror = () => {
      setImgError(true)
    }
  }, [planet])

  // Convert equirectangular lat/lng → canvas pixel coords
  const latlngToCanvas = useCallback((lat: number, lng: number, cw: number, ch: number) => {
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y
    const sc = scaleRef.current
    const rawX = ((lng + 180) / 360) * cw
    const rawY = ((90 - lat) / 180) * ch
    return { x: rawX * sc + ox, y: rawY * sc + oy }
  }, [])

  // Draw frame
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width: cw, height: ch } = canvas

    ctx.clearRect(0, 0, cw, ch)

    // Background
    ctx.fillStyle = '#020408'
    ctx.fillRect(0, 0, cw, ch)

    const ox = offsetRef.current.x
    const oy = offsetRef.current.y
    const sc = scaleRef.current

    // Draw planet texture
    if (imgRef.current && imgLoaded) {
      ctx.save()
      ctx.drawImage(imgRef.current, ox, oy, cw * sc, ch * sc)
      // Subtle overlay tint
      ctx.fillStyle = PLANET_TINT[planet] ?? 'rgba(0,0,0,0)'
      ctx.fillRect(ox, oy, cw * sc, ch * sc)
      ctx.restore()
    } else if (!imgError) {
      // Loading placeholder
      ctx.fillStyle = planet === 'moon' ? '#1a1e2e' : '#2a1208'
      ctx.fillRect(ox, oy, cw * sc, ch * sc)
      ctx.fillStyle = '#4b5563'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Loading surface map…', cw / 2, ch / 2)
    } else {
      // Error — procedural fallback
      ctx.fillStyle = planet === 'moon' ? '#1a1e2e' : '#2a1208'
      ctx.fillRect(ox, oy, cw * sc, ch * sc)
      // Pseudo-craters
      ctx.strokeStyle = planet === 'moon' ? '#2d3748' : '#4a2010'
      ctx.lineWidth = 1
      const seed = planet === 'moon' ? 42 : 99
      for (let i = 0; i < 30; i++) {
        const fx = ((Math.sin(i * seed) * 0.5 + 0.5) * cw) * sc + ox
        const fy = ((Math.cos(i * seed * 1.7) * 0.5 + 0.5) * ch) * sc + oy
        const r = (5 + Math.abs(Math.sin(i * 3.14)) * 20) * sc
        ctx.beginPath()
        ctx.arc(fx, fy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Draw named features (subtle labels)
    if (sc > 0.8) {
      const features = PLANET_FEATURES[planet] ?? []
      ctx.font = `${Math.max(9, 10 * sc)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      for (const feat of features) {
        const { x, y } = latlngToCanvas(feat.lat, feat.lng, cw, ch)
        if (x < -50 || x > cw + 50 || y < -20 || y > ch + 20) continue
        const icon = feat.type === 'crater' ? '○' : feat.type === 'mare' ? '~' : feat.type === 'mons' ? '△' : '◇'
        ctx.fillText(`${icon} ${feat.name}`, x, y)
      }
    }

    // Draw colonies
    const colonyRadius = (level: number) => (7 + level * 3) * Math.min(sc, 2)
    for (const colony of colonies) {
      const { x, y } = latlngToCanvas(colony.lat, colony.lng, cw, ch)
      if (x < -20 || x > cw + 20 || y < -20 || y > ch + 20) continue

      const r = colonyRadius(colony.level)
      const isSelected = selectedColony?.id === colony.id
      const baseColour = COLONY_COLOUR[planet] ?? '#60a5fa'

      // Outer glow ring
      ctx.beginPath()
      ctx.arc(x, y, r + 4, 0, Math.PI * 2)
      ctx.strokeStyle = isSelected ? baseColour : `${baseColour}66`
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()

      // Colony dot
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? baseColour : `${baseColour}99`
      ctx.fill()

      // Level indicator dots
      for (let i = 0; i < colony.level; i++) {
        const dx = (i - (colony.level - 1) / 2) * 5
        ctx.beginPath()
        ctx.arc(x + dx, y + r + 5, 2, 0, Math.PI * 2)
        ctx.fillStyle = baseColour
        ctx.fill()
      }

      // Colony name label
      ctx.font = `bold ${Math.max(9, 11 * Math.min(sc, 1.5))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 4
      ctx.fillText(colony.name, x, y - r - 5)
      ctx.shadowBlur = 0
    }

    // Latitude / longitude grid (subtle)
    if (sc > 1.2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([4, 8])
      // Meridians every 30°
      for (let lng = -180; lng <= 180; lng += 30) {
        const { x } = latlngToCanvas(0, lng, cw, ch)
        ctx.beginPath()
        ctx.moveTo(x, oy)
        ctx.lineTo(x, oy + ch * sc)
        ctx.stroke()
      }
      // Parallels every 30°
      for (let lat = -90; lat <= 90; lat += 30) {
        const { y } = latlngToCanvas(lat, 0, cw, ch)
        ctx.beginPath()
        ctx.moveTo(ox, y)
        ctx.lineTo(ox + cw * sc, y)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }
  }, [planet, colonies, selectedColony, imgLoaded, latlngToCanvas, imgError])

  useEffect(() => { draw() }, [draw])

  // Mouse handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const newScale = Math.max(0.5, Math.min(5, scaleRef.current - e.deltaY * 0.001))
    scaleRef.current = newScale
    forceRender(n => n + 1)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    offsetRef.current = {
      x: dragRef.current.ox + e.clientX - dragRef.current.sx,
      y: dragRef.current.oy + e.clientY - dragRef.current.sy,
    }
    forceRender(n => n + 1)
  }, [])

  const handleMouseUp = useCallback(() => { dragRef.current = null }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) return // was a drag
    const rect = canvasRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const cw = canvasRef.current.width
    const ch = canvasRef.current.height
    for (const colony of colonies) {
      const { x, y } = latlngToCanvas(colony.lat, colony.lng, cw, ch)
      if (Math.hypot(cx - x, cy - y) < 16) {
        setSelectedColony(prev => prev?.id === colony.id ? null : colony)
        onColonyClick?.(colony)
        return
      }
    }
    setSelectedColony(null)
  }, [colonies, latlngToCanvas, onColonyClick])

  return (
    <div className="relative w-full h-full bg-[#020408] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />

      {/* Planet label */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
          {PLANET_LABELS[planet] ?? planet}
        </span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onMouseDown={() => { scaleRef.current = Math.min(5, scaleRef.current + 0.2); forceRender(n => n + 1) }}
          className="w-7 h-7 rounded bg-white/10 border border-white/20 text-white text-sm flex items-center justify-center hover:bg-white/20"
        >+</button>
        <button
          onMouseDown={() => { scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 }; forceRender(n => n + 1) }}
          className="w-7 h-7 rounded bg-white/10 border border-white/20 text-white text-[9px] flex items-center justify-center hover:bg-white/20"
        >⌂</button>
        <button
          onMouseDown={() => { scaleRef.current = Math.max(0.5, scaleRef.current - 0.2); forceRender(n => n + 1) }}
          className="w-7 h-7 rounded bg-white/10 border border-white/20 text-white text-sm flex items-center justify-center hover:bg-white/20"
        >−</button>
      </div>

      {/* Selected colony tooltip */}
      {selectedColony && (
        <div className="absolute top-4 right-4 w-48 bg-[#080f1e]/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl">
          <p className="text-xs font-bold text-white">{selectedColony.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{selectedColony.planet} Colony · Level {selectedColony.level}</p>
          <div className="mt-2 space-y-1 text-[10px] text-gray-300">
            <div className="flex justify-between"><span className="text-gray-500">Population</span><span>{selectedColony.population.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Resource Output</span><span>{selectedColony.resourceOutput}/yr</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Established</span><span>{selectedColony.established}</span></div>
            {selectedColony.terraformProgress !== undefined && (
              <div className="flex justify-between"><span className="text-gray-500">Terraforming</span><span className="text-green-400">{selectedColony.terraformProgress}%</span></div>
            )}
          </div>
        </div>
      )}

      {/* No colonies message */}
      {colonies.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl mb-2">{planet === 'moon' ? '🌕' : '🔴'}</p>
            <p className="text-xs text-gray-500">No colonies established</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Unlock {planet === 'moon' ? 'moon_landing' : 'mars_mission'} tech to colonise
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
