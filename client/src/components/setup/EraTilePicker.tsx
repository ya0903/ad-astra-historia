import { HISTORICAL_ERAS, MODERN_ERAS, type AnyEraId } from '@ad-astra/shared/eraConfig'

interface Props {
  selected: AnyEraId | null
  onSelect: (era: AnyEraId) => void
}

interface TileProps {
  id: AnyEraId
  yearLabel: string
  name: string
  tagline: string
  selected: boolean
  onSelect: () => void
  accent: 'amber' | 'purple' | 'cyan'
}

function Tile({ yearLabel, name, tagline, selected, onSelect, accent }: TileProps) {
  const accentMap = {
    amber:  selected ? 'border-amber-400 bg-amber-950/40 shadow-amber-500/30'  : 'border-amber-700/30 hover:border-amber-500/60',
    purple: selected ? 'border-purple-400 bg-purple-950/40 shadow-purple-500/30': 'border-purple-700/30 hover:border-purple-500/60',
    cyan:   selected ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/30'    : 'border-cyan-700/30 hover:border-cyan-500/60',
  }
  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-xl border bg-white/[0.03] p-3 transition-all ${
        selected ? `shadow-lg scale-[1.02] ${accentMap[accent]}` : `${accentMap[accent]}`
      }`}
    >
      <span className={`absolute top-2 right-3 text-[10px] font-mono font-bold ${
        accent === 'amber' ? 'text-amber-400' : accent === 'purple' ? 'text-purple-400' : 'text-cyan-400'
      }`}>{yearLabel}</span>
      <div className="text-sm font-bold text-white pr-12 leading-tight mb-1">{name}</div>
      <div className="text-[10px] text-gray-400 leading-snug line-clamp-2">{tagline}</div>
    </button>
  )
}

export default function EraTilePicker({ selected, onSelect }: Props) {
  const ancient = HISTORICAL_ERAS.filter(e => e.group === 'ancient')
  const medieval = HISTORICAL_ERAS.filter(e => e.group === 'medieval')
  const industrialHistorical = HISTORICAL_ERAS.filter(e => e.group === 'industrial')

  return (
    <div className="space-y-5">
      {/* Ancient & Classical */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-amber-400 font-semibold mb-2">Ancient & Classical</h3>
        <div className="grid grid-cols-3 gap-2">
          {ancient.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="amber" />
          ))}
        </div>
      </section>

      {/* Medieval & Early Modern */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-purple-400 font-semibold mb-2">Medieval & Early Modern</h3>
        <div className="grid grid-cols-3 gap-2">
          {medieval.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="purple" />
          ))}
        </div>
      </section>

      {/* Industrial & Modern */}
      <section>
        <h3 className="text-[11px] uppercase tracking-widest text-cyan-400 font-semibold mb-2">Industrial & Modern</h3>
        <div className="grid grid-cols-3 gap-2">
          {industrialHistorical.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id)} accent="cyan" />
          ))}
          {MODERN_ERAS.map(e => (
            <Tile key={e.id} id={e.id} yearLabel={e.yearLabel} name={e.name} tagline={e.tagline}
              selected={selected === e.id} onSelect={() => onSelect(e.id as AnyEraId)} accent="cyan" />
          ))}
        </div>
      </section>
    </div>
  )
}
