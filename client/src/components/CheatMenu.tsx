import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../stores'

// ── Command parser ────────────────────────────────────────────────────────────
// Supported commands:
//   help
//   set gdp <number>         e.g. set gdp 5t / 500b / 200m / 100000
//   set military <number>
//   set approval <number>
//   set softpower <number>
//   set tech <number>
//   set research <number>
//   set cultural <number>
//   set date <YYYY-MM-DD>
//   set sector <name> <number>   e.g. set sector defence 80
//   god                          max all stats

const HELP = `Available commands:
  set gdp <value>          e.g. set gdp 5t  2b  500m
  set military <0-100>
  set approval <0-100>
  set softpower <0-100>
  set tech <0-100>
  set research <number>
  set cultural <0-100>
  set date <YYYY-MM-DD>
  set sector <name> <0-100>
    sectors: defence technology batteries microchips
             space pharmaceuticals agriculture finance
  god                      max out everything
  clear                    clear console`

function parseValue(raw: string): number | null {
  const s = raw.toLowerCase().trim()
  if (s.endsWith('t')) return parseFloat(s) * 1e12
  if (s.endsWith('b')) return parseFloat(s) * 1e9
  if (s.endsWith('m')) return parseFloat(s) * 1e6
  if (s.endsWith('k')) return parseFloat(s) * 1e3
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const STAT_KEYS = ['gdp', 'military', 'approval', 'softpower', 'tech', 'research', 'cultural'] as const
const SECTOR_KEYS = ['defence', 'technology', 'batteries', 'microchips', 'space', 'pharmaceuticals', 'agriculture', 'finance'] as const

// ── Component ─────────────────────────────────────────────────────────────────
export default function CheatMenu({ onClose }: { onClose: () => void }) {
  const gameState = useGameStore(s => s.state)
  const cheatPatch = useGameStore(s => s.cheatPatch)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<{ text: string; type: 'cmd' | 'ok' | 'err' | 'info' }[]>([
    { text: 'Cheat Console — type "help" for commands', type: 'info' },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [lines])
  useEffect(() => { inputRef.current?.focus() }, [])

  const push = (text: string, type: 'ok' | 'err' | 'info') =>
    setLines(l => [...l, { text, type }])

  const run = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    setLines(l => [...l, { text: `> ${cmd}`, type: 'cmd' }])

    if (!gameState) { push('No game loaded.', 'err'); return }

    const parts = cmd.toLowerCase().split(/\s+/)

    if (parts[0] === 'help') { push(HELP, 'info'); return }
    if (parts[0] === 'clear') { setLines([]); return }

    if (parts[0] === 'god') {
      cheatPatch({
        stats: { gdp: 50e12, military: 100, approval: 100, softPower: 100, techLevel: 100, researchPoints: 9999, culturalReach: 100 },
        sectors: { defence: 100, technology: 100, batteries: 100, microchips: 100, space: 100, pharmaceuticals: 100, agriculture: 100, finance: 100 },
      })
      push('God mode activated. All stats maxed.', 'ok')
      return
    }

    if (parts[0] === 'set' && parts.length >= 3) {
      const key = parts[1]
      const valRaw = parts[2]

      // date
      if (key === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valRaw)) { push('Invalid date format. Use YYYY-MM-DD.', 'err'); return }
        cheatPatch({ date: valRaw })
        push(`Date set to ${valRaw}.`, 'ok')
        return
      }

      // sector
      if (key === 'sector' && parts.length >= 4) {
        const sName = parts[2] as typeof SECTOR_KEYS[number]
        const sVal = parseValue(parts[3])
        if (!SECTOR_KEYS.includes(sName)) { push(`Unknown sector. Try: ${SECTOR_KEYS.join(', ')}`, 'err'); return }
        if (sVal === null) { push('Invalid value.', 'err'); return }
        cheatPatch({ sectors: { [sName]: sVal } })
        push(`Sector ${sName} set to ${sVal}.`, 'ok')
        return
      }

      const val = parseValue(valRaw)
      if (val === null) { push('Invalid value. Use numbers, e.g. 5t 2b 500m 100.', 'err'); return }

      const statMap: Record<string, keyof NonNullable<Parameters<typeof cheatPatch>[0]['stats']>> = {
        gdp: 'gdp', military: 'military', approval: 'approval',
        softpower: 'softPower', tech: 'techLevel', research: 'researchPoints', cultural: 'culturalReach',
      }

      if (!statMap[key]) {
        push(`Unknown key "${key}". Try: ${STAT_KEYS.join(', ')}, date, sector`, 'err')
        return
      }

      cheatPatch({ stats: { [statMap[key]]: val } })
      const display = val >= 1e12 ? `${(val/1e12).toFixed(2)}T` : val >= 1e9 ? `${(val/1e9).toFixed(2)}B` : val >= 1e6 ? `${(val/1e6).toFixed(2)}M` : String(val)
      push(`${key} set to ${display}.`, 'ok')
      return
    }

    push(`Unknown command: "${cmd}". Type "help".`, 'err')
  }

  return (
    <div className="fixed bottom-12 left-80 z-50 w-[480px] bg-[#050d1a]/95 border border-green-800/60 rounded-lg shadow-2xl backdrop-blur-sm flex flex-col"
      style={{ maxHeight: '320px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-green-900/40 shrink-0">
        <span className="text-xs font-mono text-green-400 tracking-widest uppercase">Cheat Console</span>
        <button onClick={onClose} className="text-green-600 hover:text-green-300 text-sm leading-none">✕</button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs space-y-0.5" style={{ minHeight: 0 }}>
        {lines.map((l, i) => (
          <div key={i} className={
            l.type === 'cmd' ? 'text-white' :
            l.type === 'ok'  ? 'text-green-400' :
            l.type === 'err' ? 'text-red-400' :
            'text-green-600 whitespace-pre'
          }>{l.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-green-900/40 shrink-0">
        <span className="text-green-500 font-mono text-xs">{'>'}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { run(input); setInput('') }
            if (e.key === 'Escape') onClose()
          }}
          className="flex-1 bg-transparent text-green-300 font-mono text-xs outline-none placeholder-green-900"
          placeholder="type a command…"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
