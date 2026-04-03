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
  recentHistory: string
  warDamageSummary: string
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
  const [panelW, setPanelW] = useState(320)
  const [panelH, setPanelH] = useState(420)
  const dragRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null)
  const config = useConfigStore(s => s.config)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPanelW(Math.max(260, Math.min(600, dragRef.current.w + (dragRef.current.startX - e.clientX))))
      setPanelH(Math.max(200, Math.min(700, dragRef.current.h + (dragRef.current.startY - e.clientY))))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

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
      const historyBlock = gameContext.recentHistory
        ? `\nRecent events in this timeline that both sides are aware of:\n${gameContext.recentHistory}`
        : ''
      const damageBlock = gameContext.warDamageSummary
        ? `\nOngoing war damage: ${gameContext.warDamageSummary}`
        : ''
      const system = `You are the government of ${targetCountry} in ${gameContext.era} (${gameContext.currentDate}).
You are in diplomatic talks with ${gameContext.playerCountry}.
Respond as a realistic statesperson — protect your national interests, be cautious but not hostile by default.
React appropriately to recent events: if ${gameContext.playerCountry} has recently attacked, sanctioned, or provoked you, be guarded or hostile; if they've offered aid or cooperation, be warmer.
Keep responses concise (2-3 sentences). Reference real geopolitical context for the era.${historyBlock}${damageBlock}
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
        className="w-10 h-10 rounded-full bg-[#0d1f3c] border border-white/20 shadow-xl flex items-center justify-center text-lg hover:bg-blue-900 hover:border-blue-600 transition-all"
        title="Diplomatic Chats"
      >
        🤝
      </button>
    )
  }

  return (
    <div className="relative bg-[#0a1628] border border-white/15 rounded-2xl shadow-2xl flex flex-col"
      style={{ width: panelW, height: panelH }}
    >
      {/* Resize handle — top-left corner drag */}
      <div
        onMouseDown={e => { e.preventDefault(); dragRef.current = { startX: e.clientX, startY: e.clientY, w: panelW, h: panelH } }}
        className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
        title="Drag to resize"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 7L7 1M1 4L4 1" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round"/></svg>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <span>🤝</span>
          <div>
            <p className="text-xs font-bold text-white">{targetCountry ? `Talks with ${targetCountry}` : 'Diplomatic Chats'}</p>
            <p className="text-[10px] text-gray-600">Foreign relations</p>
          </div>
        </div>
        <div className="flex gap-1">
          {targetCountry && (
            <button onClick={reset} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors text-[10px] font-bold">←</button>
          )}
          <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-sm leading-none">✕</button>
        </div>
      </div>

      {/* Country picker */}
      {!targetCountry && (
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ minHeight: 0 }}>
          <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Select a nation to open talks</p>
          <input
            autoFocus
            placeholder="Search country…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/50 mb-2"
            onChange={e => {
              const el = document.getElementById('diplo-list')
              if (el) el.setAttribute('data-filter', e.target.value.toLowerCase())
            }}
          />
          <div id="diplo-list" className="space-y-0.5">
            {gameContext.countryNames.sort().map(name => (
              <button key={name} onClick={() => startTalks(name)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:bg-blue-900/30 hover:text-white transition-colors">
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

          <div className="flex items-center gap-2 px-3 py-3 border-t border-white/8 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Your proposal…"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              autoComplete="off"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors font-semibold">
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
