import { useMemo, useState } from 'react'
import { useRailDrawStore, useGameStore } from '../stores'
import {
  interpolateStraight, interpolateBend, interpolateDoubleBend, interpolateSquiggle,
  lineLengthKm, railLineCost, stationBuildCost, type LngLat,
} from '@ad-astra/shared/railDrawing'
import type { RailLine, RailStation, RailType } from '@ad-astra/shared/types'
import { formatCurrency } from '../lib/currency'

function interpolatePath(tool: string, waypoints: LngLat[]): LngLat[] {
  if (waypoints.length < 2) return waypoints
  switch (tool) {
    case 'bend': return interpolateBend(waypoints)
    case 'doubleBend': return interpolateDoubleBend(waypoints)
    case 'squiggle': return interpolateSquiggle(waypoints)
    default: return interpolateStraight(waypoints)
  }
}

const TOOL_BUTTONS: { id: 'straight' | 'bend' | 'doubleBend' | 'squiggle'; icon: string; label: string }[] = [
  { id: 'straight', icon: '—', label: 'Straight' },
  { id: 'bend', icon: '∫', label: 'Single bend' },
  { id: 'doubleBend', icon: '∿', label: 'Double bend' },
  { id: 'squiggle', icon: '≈', label: 'Squiggle' },
]

export default function RailDrawPanel() {
  const era = useGameStore(s => s.state?.era ?? 'modern')
  const fmtMoney = (v: number) => formatCurrency(v, era, 'native')
  const mode = useRailDrawStore(s => s.mode)
  const tool = useRailDrawStore(s => s.tool)
  const railType = useRailDrawStore(s => s.railType)
  const waypoints = useRailDrawStore(s => s.waypoints)
  const stations = useRailDrawStore(s => s.stations)
  const borderValid = useRailDrawStore(s => s.borderValid)
  const setTool = useRailDrawStore(s => s.setTool)
  const startDrawing = useRailDrawStore(s => s.startDrawing)
  const undoWaypoint = useRailDrawStore(s => s.undoWaypoint)
  const cancel = useRailDrawStore(s => s.cancel)
  const reset = useRailDrawStore(s => s.reset)
  const enterStationMode = useRailDrawStore(s => s.enterStationMode)
  const addStation = useRailDrawStore(s => s.addStation)
  const removeStation = useRailDrawStore(s => s.removeStation)
  const upgradeStation = useRailDrawStore(s => s.upgradeStation)
  const renameStation = useRailDrawStore(s => s.renameStation)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const commitDrawnRail = useGameStore(s => s.commitDrawnRail)

  const renderedPath = useMemo<LngLat[]>(
    () => interpolatePath(tool, waypoints as LngLat[]),
    [tool, waypoints],
  )
  const km = useMemo(() => renderedPath.length >= 2 ? lineLengthKm(renderedPath) : 0, [renderedPath])
  const isHsr = railType === 'domestic_hsr'
  const lineCost = useMemo(() => railLineCost(km, isHsr), [km, isHsr])
  const stationsTotal = useMemo(
    () => stations.reduce((sum, s) => sum + stationBuildCost(s.level), 0),
    [stations],
  )
  const totalCost = lineCost + stationsTotal

  if (mode === 'idle') return null

  const handleFinalise = () => {
    let finalStations = stations
    if (finalStations.length < 2 && renderedPath.length >= 2) {
      const start: RailStation = {
        id: `st-${Date.now()}-a`,
        lng: renderedPath[0][0],
        lat: renderedPath[0][1],
        name: 'Origin',
        level: 1,
      }
      const end: RailStation = {
        id: `st-${Date.now()}-b`,
        lng: renderedPath[renderedPath.length - 1][0],
        lat: renderedPath[renderedPath.length - 1][1],
        name: 'Terminus',
        level: 1,
      }
      if (finalStations.length === 0) {
        addStation(start)
        addStation(end)
        finalStations = [start, end]
      } else {
        addStation(end)
        finalStations = [...finalStations, end]
      }
    }
    const finalStationsCost = finalStations.reduce((sum, s) => sum + stationBuildCost(s.level), 0)
    const finalTotal = lineCost + finalStationsCost

    const rail: Omit<RailLine, 'id' | 'countryId'> = {
      fromCity: finalStations[0]?.name ?? 'Origin',
      toCity: finalStations[finalStations.length - 1]?.name ?? 'Terminus',
      fromCoords: renderedPath[0],
      toCoords: renderedPath[renderedPath.length - 1],
      waypoints: renderedPath,
      type: railType as RailType,
      stations: finalStations,
      lengthKm: km,
    }
    commitDrawnRail(rail, finalTotal)
    reset()
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[460px] bg-[#0a1628]/95 backdrop-blur-md border border-purple-500/40 rounded-2xl shadow-2xl text-white">
      {mode === 'drawing' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-purple-400 font-semibold tracking-widest">STEP 1 / 2</p>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">🛤️ Draw Track Path</h3>
            </div>
            <span className="text-[10px] text-gray-500">Esc cancel · Ctrl+Z undo</span>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => startDrawing('domestic_hsr')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                railType === 'domestic_hsr'
                  ? 'bg-purple-700/60 border-purple-400 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >Standard HSR</button>
            <button
              onClick={() => startDrawing('cross_continent')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                railType === 'cross_continent'
                  ? 'bg-purple-700/60 border-purple-400 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >Cross-Continent</button>
          </div>

          {/* Tool selector */}
          <div className="flex gap-2">
            {TOOL_BUTTONS.map(b => (
              <button
                key={b.id}
                title={b.label}
                onClick={() => setTool(b.id)}
                className={`flex-1 h-9 rounded-lg text-lg font-bold border transition-colors ${
                  tool === b.id
                    ? 'bg-purple-700/60 border-purple-400 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >{b.icon}</button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Length</div>
              <div className="font-bold">{km.toFixed(0)} km</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Cost</div>
              <div className="font-bold">{fmtMoney(lineCost)}</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Points</div>
              <div className="font-bold">{waypoints.length}</div>
            </div>
          </div>

          {!borderValid && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1.5">
              ⚠ Route exits your or friendly territory
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={undoWaypoint}
              disabled={waypoints.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >Undo</button>
            <button
              onClick={cancel}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:text-white"
            >Cancel</button>
            <button
              onClick={enterStationMode}
              disabled={waypoints.length < 2 || !borderValid}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-700/70 border border-purple-400 text-white hover:bg-purple-600/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >Confirm → Place Stations</button>
          </div>
        </div>
      )}

      {mode === 'stationing' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-purple-400 font-semibold tracking-widest">STEP 2 / 2</p>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">📍 Place Stations</h3>
            </div>
            <span className="text-[10px] text-gray-500">Click line to add</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Stations</div>
              <div className="font-bold">{stations.length}</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Station Cost</div>
              <div className="font-bold">{fmtMoney(stationsTotal)}</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-gray-500 uppercase">Total</div>
              <div className="font-bold">{fmtMoney(totalCost)}</div>
            </div>
          </div>

          {/* Station list */}
          <div className="bg-white/[0.03] rounded-lg border border-white/10 max-h-40 overflow-y-auto">
            {stations.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
                No stations placed yet.<br />
                Click anywhere on the line to add a stop.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {stations.map((s, i) => {
                  const isEditing = editingId === s.id
                  const commitRename = () => {
                    if (editText.trim()) renameStation(s.id, editText.trim())
                    setEditingId(null)
                  }
                  return (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04]">
                      <span className="w-5 h-5 rounded-full bg-purple-700/60 border border-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 bg-white/10 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingId(s.id); setEditText(s.name) }}
                          className="flex-1 text-left text-xs text-gray-200 hover:text-purple-300 truncate"
                          title="Click to rename"
                        >{s.name}</button>
                      )}
                      <span className="text-[9px] text-gray-500 shrink-0">L{s.level}</span>
                      <button
                        onClick={() => upgradeStation(s.id)}
                        disabled={s.level >= 5}
                        className="text-[11px] text-gray-500 hover:text-amber-400 px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={s.level >= 5 ? 'Max level' : `Upgrade to L${s.level + 1}`}
                      >▲</button>
                      <button
                        onClick={() => removeStation(s.id)}
                        className="text-[11px] text-gray-500 hover:text-red-400 px-1"
                        title="Remove station"
                      >✕</button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:text-red-300"
            >Cancel Line</button>
            <button
              onClick={handleFinalise}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700/70 border border-emerald-400 text-white hover:bg-emerald-600/80"
            >Finalise →</button>
          </div>
        </div>
      )}
    </div>
  )
}
