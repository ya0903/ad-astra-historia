import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../stores'
import { TECH_TREE, ANCIENT_TECH_TREE } from '@ad-astra/shared/techTree'
import { HISTORICAL_TECH_TREES } from '@ad-astra/shared/historicalEraTechTrees'

// ── Command parser ────────────────────────────────────────────────────────────
// Supported commands:
//   help
//   set gdp <number>              e.g. set gdp 5t / 500b / 200m / 100000
//   set military <number>
//   set approval <number>
//   set softpower <number>
//   set tech <number>
//   set research <number>
//   set cultural <number>
//   set date <YYYY-MM-DD>
//   set sector <name> <number>    e.g. set sector defence 80
//   stability <0-100>             set player stability directly
//   empire <name>                 rename your empire
//   god                           max all stats
//   instabuild                    complete all build queue instantly
//   instaresearch                 complete all research instantly
//   unlockall                     unlock every tech across every era
//   yesman                        toggle yesman mode (countries auto-accept)
//   unlocktech <tech_id>          unlock a tech immediately
//   listtech                      list all tech IDs for current era
//   annex <iso_a3>                annex a country to your empire
//   knowledge_transfer <iso> <tech_id>  grant tech via knowledge transfer
//   ally <iso>                    form alliance with a country
//   war <iso>                     declare war on a country
//   peace <iso>                   make peace with a country
//   addmoney <amount>             add to GDP (e.g. addmoney 10b)
//   rp <amount>                  add research points
//   spawnnews <text…>             add a custom news headline
//   revealmap                     toggle reveal map mode

const HELP = `Available commands:
  set gdp <value>                 e.g. set gdp 5t  2b  500m
  set military <0-100>
  set approval <0-100>
  set softpower <0-100>
  set tech <0-100>
  set research <number>
  set cultural <0-100>
  set date <YYYY-MM-DD>
  set sector <name> <0-100>
    sectors: defence technology manufacturing
             space pharmaceuticals agriculture finance infrastructure
  stability <0-100>               set stability directly
  empire <name>                   rename your empire
  god                             max out everything
  instabuild                      finish all builds instantly
  instaresearch                   complete all research instantly
  unlockall                       unlock every tech across every era
  yesman                          toggle auto-diplomacy accept
  unlocktech <tech_id>            unlock a tech immediately
  listtech                        list tech IDs available this era
  annex <iso_a3>                  annex a country (e.g. annex ind)
  knowledge_transfer <iso> <id>   grant tech via transfer
  ally <iso>                      form alliance with a country
  war <iso>                       declare war on a country
  peace <iso>                     end war with a country
  addmoney <amount>               add to GDP (e.g. addmoney 10b)
  rp <amount>                     add research points (e.g. rp 500)
  spawnnews <text…>               inject a custom news headline
  revealmap                       toggle map reveal mode
  clear                           clear console`

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
const SECTOR_KEYS = ['defence', 'technology', 'manufacturing', 'space', 'pharmaceuticals', 'agriculture', 'finance', 'infrastructure'] as const

// ── All tech IDs for quick lookup ─────────────────────────────────────────────
const ALL_TECH_NODES = [...TECH_TREE, ...ANCIENT_TECH_TREE]
const ALL_TECH_IDS = new Set(ALL_TECH_NODES.map(t => t.id))

// ── Component ─────────────────────────────────────────────────────────────────
export default function CheatMenu({ onClose }: { onClose: () => void }) {
  const gameState = useGameStore(s => s.state)
  const cheatPatch = useGameStore(s => s.cheatPatch)
  const setEmpireName = useGameStore(s => s.setEmpireName)
  const instaBuild = useGameStore(s => s.instaBuild)
  const instaResearch = useGameStore(s => s.instaResearch)
  const cheatUnlockTech = useGameStore(s => s.cheatUnlockTech)
  const cheatAnnex = useGameStore(s => s.cheatAnnex)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<{ text: string; type: 'cmd' | 'ok' | 'err' | 'info' }[]>([
    { text: 'Cheat Console — type "help" for commands', type: 'info' },
  ])
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [lines])
  useEffect(() => { inputRef.current?.focus() }, [])

  const push = (text: string, type: 'ok' | 'err' | 'info') =>
    setLines(l => [...l, { text, type }])

  const run = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    setHistory(h => [cmd, ...h].slice(0, 50))
    setHistIdx(-1)
    setLines(l => [...l, { text: `> ${cmd}`, type: 'cmd' }])

    if (!gameState) { push('No game loaded.', 'err'); return }

    const parts = cmd.toLowerCase().split(/\s+/)

    if (parts[0] === 'help') { push(HELP, 'info'); return }
    if (parts[0] === 'clear') { setLines([]); return }

    // empire <name…>
    if (parts[0] === 'empire') {
      const name = cmd.slice('empire'.length).trim()
      if (!name) { push('Usage: empire <name>  e.g. empire Caliphate of Pakistan', 'err'); return }
      setEmpireName(name)
      push(`Empire renamed to "${name}".`, 'ok')
      return
    }

    if (parts[0] === 'instabuild') {
      instaBuild()
      push('All build projects completed instantly.', 'ok')
      return
    }

    if (parts[0] === 'instaresearch') {
      instaResearch()
      push('All research projects completed instantly.', 'ok')
      return
    }

    if (parts[0] === 'unlockall' || parts[0] === 'unlockalltech') {
      // Union of modern, ancient, industrial and every historical-era tree.
      const historicalIds = Object.values(HISTORICAL_TECH_TREES)
        .flat()
        .map(n => n.id as unknown as import('@ad-astra/shared/types').TechId)
      const allIds = new Set<import('@ad-astra/shared/types').TechId>([
        ...ALL_TECH_IDS as Set<import('@ad-astra/shared/types').TechId>,
        ...historicalIds,
      ])
      const existing = new Set(gameState.unlockedTechs ?? [])
      for (const id of allIds) existing.add(id)
      cheatPatch({ unlockedTechs: Array.from(existing) as import('@ad-astra/shared/types').TechId[] })
      instaResearch() // clears the research queue too
      push(`Unlocked all ${existing.size} techs across every era.`, 'ok')
      return
    }

    if (parts[0] === 'yesman') {
      const next = !gameState.yesman
      cheatPatch({ yesman: next })
      push(`Yesman mode ${next ? 'ON — countries will auto-accept all proposals.' : 'OFF.'}`, 'ok')
      return
    }

    if (parts[0] === 'god') {
      cheatPatch({
        stats: { gdp: 50e12, military: 100, approval: 100, softPower: 100, techLevel: 100, researchPoints: 9999, culturalReach: 100 },
        sectors: { defence: 100, technology: 100, manufacturing: 100, space: 100, pharmaceuticals: 100, agriculture: 100, finance: 100, infrastructure: 100 },
      })
      instaBuild()
      instaResearch()
      push('God mode activated. All stats maxed, builds and research completed.', 'ok')
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

    // stability <0-100>
    if (parts[0] === 'stability') {
      const val = parts[1] !== undefined ? parseValue(parts[1]) : null
      if (val === null || val < 0 || val > 100) { push('Usage: stability <0-100>', 'err'); return }
      cheatPatch({ stats: { stability: val } })
      push(`Stability set to ${val}.`, 'ok')
      return
    }

    // unlocktech <tech_id>
    if (parts[0] === 'unlocktech') {
      const techId = parts[1]
      if (!techId) { push('Usage: unlocktech <tech_id>  — type "listtech" to see IDs', 'err'); return }
      if (!ALL_TECH_IDS.has(techId as any)) {
        push(`Unknown tech "${techId}". Available IDs: ${[...ALL_TECH_IDS].join(', ')}`, 'err')
        return
      }
      cheatUnlockTech(techId)
      const node = ALL_TECH_NODES.find(t => t.id === techId)
      push(`Tech unlocked: ${node?.name ?? techId}.`, 'ok')
      return
    }

    // listtech
    if (parts[0] === 'listtech') {
      const era = gameState.era
      const eraTechs = ALL_TECH_NODES.filter(t => t.unlocksEra.includes(era))
      const unlocked = new Set(gameState.unlockedTechs ?? [])
      const available = eraTechs.filter(t => !unlocked.has(t.id)).map(t => t.id)
      const alreadyOwned = eraTechs.filter(t => unlocked.has(t.id)).map(t => t.id)
      push(`Era: ${era}`, 'info')
      push(`Available (not yet unlocked): ${available.length ? available.join(', ') : 'none'}`, 'info')
      push(`Already unlocked: ${alreadyOwned.length ? alreadyOwned.join(', ') : 'none'}`, 'info')
      return
    }

    // annex <iso>
    if (parts[0] === 'annex') {
      const iso = parts[1]
      if (!iso) { push('Usage: annex <iso_a3>  e.g. annex ind', 'err'); return }
      cheatAnnex(iso)
      push(`Annexed ${iso.toUpperCase()} — added to controlled territories.`, 'ok')
      return
    }

    // knowledge_transfer <iso> <tech_id>
    if (parts[0] === 'knowledge_transfer') {
      const iso = parts[1]
      const techId = parts[2]
      if (!iso || !techId) { push('Usage: knowledge_transfer <iso> <tech_id>  e.g. knowledge_transfer chn high_speed_rail', 'err'); return }
      if (!ALL_TECH_IDS.has(techId as any)) {
        push(`Unknown tech "${techId}". Type "listtech" to see available IDs.`, 'err')
        return
      }
      cheatUnlockTech(techId)
      const node = ALL_TECH_NODES.find(t => t.id === techId)
      push(`Knowledge transfer from ${iso.toUpperCase()} successful — acquired: ${node?.name ?? techId}.`, 'ok')
      return
    }

    // ally <iso>
    if (parts[0] === 'ally') {
      const iso = parts[1]
      if (!iso) { push('Usage: ally <iso_a3>  e.g. ally fra', 'err'); return }
      const isoUpper = iso.toUpperCase()
      const current = gameState.allies ?? []
      if (current.includes(isoUpper)) { push(`${isoUpper} is already an ally.`, 'info'); return }
      cheatPatch({ allies: [...current, isoUpper] })
      push(`Diplomatic alliance established with ${isoUpper}.`, 'ok')
      return
    }

    // war <iso>
    if (parts[0] === 'war') {
      const iso = parts[1]
      if (!iso) { push('Usage: war <iso_a3>  e.g. war rus', 'err'); return }
      const isoUpper = iso.toUpperCase()
      const current = gameState.atWarWith ?? []
      if (current.includes(isoUpper)) { push(`Already at war with ${isoUpper}.`, 'info'); return }
      cheatPatch({ atWarWith: [...current, isoUpper] })
      push(`War declared on ${isoUpper}.`, 'ok')
      return
    }

    // peace <iso>
    if (parts[0] === 'peace') {
      const iso = parts[1]
      if (!iso) { push('Usage: peace <iso_a3>  e.g. peace rus', 'err'); return }
      const isoUpper = iso.toUpperCase()
      const current = gameState.atWarWith ?? []
      if (!current.includes(isoUpper)) { push(`Not currently at war with ${isoUpper}.`, 'info'); return }
      cheatPatch({ atWarWith: current.filter((c: string) => c !== isoUpper) })
      push(`Peace agreement reached with ${isoUpper}.`, 'ok')
      return
    }

    // addmoney <amount>
    if (parts[0] === 'addmoney') {
      const amount = parts[1] !== undefined ? parseValue(parts[1]) : null
      if (amount === null || amount <= 0) { push('Usage: addmoney <amount>  e.g. addmoney 10b', 'err'); return }
      const pid = gameState.playerCountryId
      const currentGdp = gameState.countries[pid]?.stats?.gdp ?? 0
      const newGdp = currentGdp + amount
      cheatPatch({ stats: { gdp: newGdp } })
      const display = amount >= 1e12 ? `${(amount/1e12).toFixed(2)}T` : amount >= 1e9 ? `${(amount/1e9).toFixed(2)}B` : amount >= 1e6 ? `${(amount/1e6).toFixed(2)}M` : String(amount)
      push(`Added ${display} to GDP. New GDP: ${newGdp >= 1e12 ? `${(newGdp/1e12).toFixed(2)}T` : newGdp >= 1e9 ? `${(newGdp/1e9).toFixed(2)}B` : `${(newGdp/1e6).toFixed(2)}M`}.`, 'ok')
      return
    }

    // rp <amount> — add research points
    if (parts[0] === 'rp') {
      const val = parseValue(parts[1] ?? '')
      if (val === null) { push('Usage: rp <amount>  e.g. rp 500', 'err'); return }
      const country = gameState.countries[gameState.playerCountryId]
      if (!country) return
      const current = country.stats.researchPoints ?? 0
      cheatPatch({ stats: { researchPoints: current + val } })
      push(`Added ${val.toLocaleString()} RP. Balance: ${(current + val).toLocaleString()}`, 'ok')
      return
    }

    // spawnnews <text…>
    if (parts[0] === 'spawnnews') {
      const headline = cmd.slice('spawnnews'.length).trim()
      if (!headline) { push('Usage: spawnnews <headline text>', 'err'); return }
      const worldEvent = { headline, narrative: `[Cheat] ${headline}` }
      cheatPatch({ worldEvents: [...(gameState.worldEvents ?? []), worldEvent] })
      push(`News injected: "${headline}"`, 'ok')
      return
    }

    // revealmap
    if (parts[0] === 'revealmap') {
      const next = !gameState.revealMap
      cheatPatch({ revealMap: next })
      push(`Reveal map mode ${next ? 'ON — full map visibility enabled.' : 'OFF.'}`, 'ok')
      return
    }

    push(`Unknown command: "${cmd}". Type "help".`, 'err')
  }

  return (
    <div
      className="fixed z-50 w-[480px] bg-[#050d1a]/95 border border-green-800/60 rounded-lg shadow-2xl backdrop-blur-sm flex flex-col"
      style={{ bottom: '110px', left: '16px', maxHeight: 'min(360px, calc(100vh - 140px))' }}
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
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const next = Math.min(histIdx + 1, history.length - 1)
              setHistIdx(next)
              if (history[next] !== undefined) setInput(history[next])
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              const next = histIdx - 1
              if (next < 0) { setHistIdx(-1); setInput('') }
              else { setHistIdx(next); if (history[next] !== undefined) setInput(history[next]) }
            }
          }}
          className="flex-1 bg-transparent text-green-300 font-mono text-xs outline-none placeholder-green-900"
          placeholder="type a command…"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-green-900/40 shrink-0">
        {[
          { label: '+50B GDP',     cmd: 'addmoney 50b', toggled: false },
          { label: '+500 RP',      cmd: 'rp 500', toggled: false },
          { label: 'Insta Build',  cmd: 'instabuild', toggled: false },
          { label: 'Insta Research',cmd: 'instaresearch', toggled: false },
          { label: 'Unlock All Tech', cmd: 'unlockall', toggled: false },
          { label: gameState?.yesman ? 'Yesman: ON' : 'Yesman: OFF', cmd: 'yesman', toggled: !!gameState?.yesman },
          { label: 'God',          cmd: 'god', toggled: false },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => run(btn.cmd)}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              btn.toggled
                ? 'border-amber-500/70 bg-amber-900/50 text-amber-200 hover:bg-amber-800/60'
                : 'border-green-900/60 bg-green-950/40 text-green-300 hover:bg-green-900/60 hover:text-green-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
