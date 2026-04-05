import type { PlanetBody } from '@ad-astra/shared/types'

interface Props {
  active: PlanetBody
  onSelect: (planet: PlanetBody) => void
  moonUnlocked: boolean
  marsUnlocked: boolean
}

const PLANETS: { id: PlanetBody; label: string; icon: string; lockedTip: string }[] = [
  { id: 'earth', label: 'Earth',  icon: '🌍', lockedTip: '' },
  { id: 'moon',  label: 'Moon',   icon: '🌕', lockedTip: 'Requires moon_landing tech' },
  { id: 'mars',  label: 'Mars',   icon: '🔴', lockedTip: 'Requires mars_mission tech' },
]

export default function PlanetSwitcher({ active, onSelect, moonUnlocked, marsUnlocked }: Props) {
  function isUnlocked(id: PlanetBody): boolean {
    if (id === 'earth') return true
    if (id === 'moon') return moonUnlocked
    if (id === 'mars') return marsUnlocked
    return false
  }

  return (
    <div
      className="flex items-center gap-0.5 bg-[#080f1e]/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-xl"
      title="Switch planet view"
    >
      {PLANETS.map(p => {
        const unlocked = isUnlocked(p.id)
        const isActive = active === p.id
        return (
          <button
            key={p.id}
            onClick={() => unlocked && onSelect(p.id)}
            disabled={!unlocked}
            title={unlocked ? p.label : p.lockedTip}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all select-none ${
              isActive
                ? 'bg-blue-600/50 text-white border border-blue-500/40 shadow-inner'
                : unlocked
                  ? 'text-gray-400 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  : 'text-gray-700 cursor-not-allowed border border-transparent'
            }`}
          >
            <span className={unlocked ? '' : 'opacity-30'}>{p.icon}</span>
            <span className={`hidden sm:inline ${unlocked ? '' : 'opacity-30'}`}>{p.label}</span>
            {!unlocked && <span className="text-[8px] opacity-40">🔒</span>}
          </button>
        )
      })}
    </div>
  )
}
