import { useState, useRef, useEffect } from 'react'
import { useConfigStore } from '../stores'
import { callAI } from '../lib/aiClient'

interface GameContext {
  playerCountry: string
  currentDate: string
  era: string
  yesman: boolean
  countryNames: string[]
  stats: Record<string, number>
}

interface Message {
  role: 'player' | 'country'
  content: string
  country?: string
}

interface Props {
  gameContext: GameContext
}

export default function DiplomacyPanel({ gameContext }: Props) {
  const [open, setOpen] = useState(false)
  const [targetCountry, setTargetCountry] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const config = useConfigStore(s => s.config)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startTalks = (country: string) => {
    setTargetCountry(country)
    setMessages([{
      role: 'country',
      country,
      content: `Greetings from ${country}. What does ${gameContext.playerCountry} wish to discuss?`,
    }])
    setError('')
  }

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || loading || !targetCountry) return
    if (!config) { setError('No AI configured.'); return }

    setInput('')
    setError('')
    const newMsg: Message = { role: 'player', content: msg }
    setMessages(m => [...m, newMsg])
    setLoading(true)

    try {
      const yesmanNote = gameContext.yesman
        ? 'YESMAN MODE: The country is extremely cooperative and will agree to any reasonable proposal.'
        : ''
      const system = `You are the government of ${targetCountry} in ${gameContext.era} (${gameContext.currentDate}).
You are in diplomatic talks with ${gameContext.playerCountry}.
Respond as a realistic statesperson — protect your national interests, be cautious but not hostile by default.
Keep responses concise (2-3 sentences). Reference real geopolitical context for the era.
${yesmanNote}
Return ONLY the spoken diplomatic response. No labels, no narration.`

      const history = messages.map(m => ({
        role: (m.role === 'player' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }))
      history.push({ role: 'user', content: msg })

      const reply = await callAI(config, system, history)
      setMessages(m => [...m, { role: 'country', country: targetCountry, content: reply.trim() }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI error')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setTargetCountry(''); setMessages([]); setError('') }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-12 h-12 rounded-full bg-[#0d1f3c] border border-white/20 shadow-lg flex items-center justify-center text-xl hover:bg-blue-900/60 transition-colors"
        title="Diplomacy"
      >
        🤝
      </button>
    )
  }

  return (
    <div className="w-80 bg-[#0a1628]/95 border border-blue-800/60 rounded-xl shadow-2xl backdrop-blur-sm flex flex-col"
      style={{ maxHeight: '420px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-900/40 shrink-0">
        <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">
          {targetCountry ? `Talks with ${targetCountry}` : 'Diplomacy'}
        </span>
        <div className="flex gap-1">
          {targetCountry && (
            <button onClick={reset} className="text-blue-600 hover:text-blue-300 text-xs px-1">← Back</button>
          )}
          <button onClick={() => setOpen(false)} className="text-blue-600 hover:text-blue-300 text-sm leading-none">✕</button>
        </div>
      </div>

      {/* Country picker */}
      {!targetCountry && (
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ minHeight: 0 }}>
          <p className="text-xs text-gray-500 mb-2">Select a country to open talks:</p>
          <input
            autoFocus
            placeholder="Search country…"
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500 mb-2"
            onChange={e => {
              const el = document.getElementById('diplo-list')
              if (el) el.setAttribute('data-filter', e.target.value.toLowerCase())
            }}
          />
          <div id="diplo-list" className="space-y-0.5">
            {gameContext.countryNames.sort().map(name => (
              <button key={name} onClick={() => startTalks(name)}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-300 hover:bg-blue-800/40 hover:text-white transition-colors">
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      {targetCountry && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'player' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-600 mb-0.5">
                  {m.role === 'player' ? gameContext.playerCountry : m.country}
                </span>
                <div className={`rounded-lg px-3 py-1.5 text-xs max-w-[85%] ${
                  m.role === 'player'
                    ? 'bg-blue-700/70 text-white'
                    : 'bg-white/10 text-gray-200'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 animate-pulse">
                  {targetCountry} is thinking…
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border-t border-blue-900/40 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Your proposal…"
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-600"
              autoComplete="off"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-2 py-1 rounded text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 transition-colors">
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
