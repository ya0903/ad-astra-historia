import { useState, useRef, useEffect } from 'react'
import { useConfigStore } from '../stores'
import { callAI } from '../lib/aiClient'

interface GameContext {
  playerCountry: string
  currentDate: string
  era: string
  stats: Record<string, number>
  topCountries: Array<{ name: string; gdp: number }>
  recentHistory: string
  warDamageSummary: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'What are the top 10 economies right now?',
  'What should I focus on next?',
  'How does my military compare to neighbours?',
  'What major world events are happening?',
  'How can I improve my approval rating?',
  'What are the biggest geopolitical risks for me?',
]

interface Props {
  gameContext: GameContext
}

export default function AdvisorPanel({ gameContext }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const config = useConfigStore(s => s.config)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return
    if (!config) { setError('No AI configured — add your API key on the setup screen.'); return }

    setError('')
    const userMsg: ChatMessage = { role: 'user', content: msg }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      const { playerCountry, currentDate, era, stats, topCountries, recentHistory, warDamageSummary } = gameContext
      const statsStr = Object.entries(stats)
        .map(([k, v]) => `${k}: ${typeof v === 'number' && v > 1e8 ? `$${(v / 1e9).toFixed(1)}B` : v}`)
        .join(', ')
      const topStr = topCountries.slice(0, 10)
        .map((c, i) => `${i + 1}. ${c.name} ($${(c.gdp / 1e9).toFixed(0)}B)`)
        .join('\n')
      const historyBlock = recentHistory ? `\nRecent events in this timeline:\n${recentHistory}` : ''
      const damageBlock = warDamageSummary ? `\nWar damage on map: ${warDamageSummary}` : ''
      const system = `You are a geopolitical intelligence advisor in a strategy game set in the ${era} era (${currentDate}). The player leads ${playerCountry}. Stats: ${statsStr}.\n\nTop world economies:\n${topStr}${historyBlock}${damageBlock}\n\nBase your advice on what has already happened in this timeline. Answer concisely in under 200 words, in-character as a knowledgeable advisor.`

      const reply = await callAI(config, system, [
        ...messages.slice(-6) as ChatMessage[],
        { role: 'user', content: msg },
      ])
      setMessages([...newHistory, { role: 'assistant', content: reply.trim() }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-full bg-[#0d1f3c] border border-white/20 shadow-xl flex items-center justify-center hover:bg-purple-900 hover:border-purple-600 transition-all"
          title="Intelligence Advisor"
        >
          <span className="text-lg">🎖️</span>
        </button>
      ) : (
        <div className="w-80 flex flex-col rounded-2xl bg-[#0a1628] border border-white/15 shadow-2xl" style={{ height: '420px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <span>🎖️</span>
              <div>
                <p className="text-xs font-bold text-white">Intelligence Advisor</p>
                <p className="text-[10px] text-gray-600">Strategic counsel</p>
              </div>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors text-xs" title="Clear chat">↺</button>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-sm leading-none">×</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">Ask your advisor anything about the world situation, your country's position, or geopolitical strategy.</p>
                <div className="space-y-1">
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-purple-900/30 text-gray-400 hover:text-white transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-700/60 text-white'
                    : 'bg-white/10 text-gray-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 animate-pulse">Analysing…</div>
              </div>
            )}
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/8 shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder="Ask your advisor…"
                disabled={loading}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors">
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
