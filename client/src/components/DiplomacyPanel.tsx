import { useState, useRef, useEffect, useMemo } from 'react'
import { useConfigStore, useGameStore } from '../stores'
import { callAI } from '../lib/aiClient'
import { getCountryCentre } from '../lib/mapFly'

// Diplomatic reach in kilometres by era. Pre-modern civilisations couldn't
// realistically negotiate across oceans they didn't know existed. Numbers are
// max great-circle distance from the player's capital where talks make sense.
const ERA_DIPLOMATIC_RANGE_KM: Record<string, number> = {
  bronze_age:         4000,
  classical_greek:    5000,
  alexander:          5500,
  qin_expansion:      5500,
  punic_wars:         6000,
  roman_peak:         7000,
  late_antiquity:     7000,
  tang_abbasid:       9000,
  high_medieval:      11000,
  age_of_exploration: 20000, // post-Columbus, Old World↔New World becomes possible
  ottoman_classical:  20000,
  enlightenment:      Infinity,
  industrial_dawn:    Infinity,
  great_war:          Infinity,
  interwar:           Infinity,
  // Legacy era ids
  greek: 5000, roman: 7000, ottoman: 20000, abbasid: 9000, tang: 9000,
  aztec: 6000, songhai: 8000, sengoku: 8000,
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1]), lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

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
  isOpen?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export default function DiplomacyPanel({ gameContext, isOpen, onOpen, onClose }: Props) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = isOpen !== undefined ? isOpen : localOpen
  const handleOpen = () => { if (onOpen) onOpen(); else setLocalOpen(true) }
  const handleClose = () => { if (onClose) onClose(); else setLocalOpen(false) }
  const [targetCountry, setTargetCountry] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [panelW, setPanelW] = useState(340)
  const [panelH, setPanelH] = useState(480)
  const dragRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null)
  const config = useConfigStore(s => s.config)
  const inbox = useGameStore(s => s.state?.diplomaticInbox ?? [])
  const acceptProposal = useGameStore(s => s.acceptProposal)
  const declineProposal = useGameStore(s => s.declineProposal)
  const addNewsItem = useGameStore(s => s.addNewsItem)
  const appendDiplomaticChat = useGameStore(s => s.appendDiplomaticChat)
  const clearDiplomaticChat = useGameStore(s => s.clearDiplomaticChat)
  const addTimelineResult = useGameStore(s => s.addTimelineResult)
  const acceptPeaceWithDemands = useGameStore(s => s.acceptPeaceWithDemands)
  const initiatePeaceDemand = useGameStore(s => s.initiatePeaceDemand)
  const chatHistory = useGameStore(s => s.state?.diplomaticChats ?? {})

  // ── Peace demands modal state ──
  const [negotiating, setNegotiating] = useState<string | null>(null) // proposalId
  const [demand, setDemand] = useState<{
    annex: boolean
    transferTo: string
    reparationsB: number
    demilitarise: boolean
    ceasefireOnly: boolean
  }>({ annex: true, transferTo: '', reparationsB: 0, demilitarise: false, ceasefireOnly: false })
  const countries = useGameStore(s => s.state?.countries ?? {})
  const atWarWith = useGameStore(s => s.state?.atWarWith ?? [])
  const warDamageScore = useGameStore(s => s.state?.warDamageScore ?? {})
  const deathToll = useGameStore(s => s.state?.deathToll ?? {})
  const diplomaticInbox = useGameStore(s => s.state?.diplomaticInbox ?? [])
  const playerCountryId = useGameStore(s => s.state?.playerCountryId ?? '')

  // Compute reachable country names for the current era. Returns null when
  // every country is reachable (modern eras), so the UI can skip the filter.
  const reachableNames = useMemo(() => {
    const range = ERA_DIPLOMATIC_RANGE_KM[gameContext.era] ?? Infinity
    if (!isFinite(range)) return null
    const playerCentre = getCountryCentre(playerCountryId)
    if (!playerCentre) return null
    const reachable = new Set<string>()
    for (const [iso, c] of Object.entries(countries)) {
      const centre = getCountryCentre(iso)
      if (!centre) continue
      if (haversineKm(playerCentre, centre) <= range) reachable.add(c.name)
    }
    return reachable
  }, [gameContext.era, playerCountryId, countries])
  const pendingProposals = inbox.filter(p => p.status === 'pending')
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
    setError('')
    const existing = chatHistory[country] ?? []
    if (existing.length > 0) {
      // Resume existing conversation
      setMessages(existing.map(m => ({
        role: m.role,
        country: m.role === 'country' ? country : undefined,
        content: m.content,
      })))
    } else {
      // First contact — seed greeting and persist
      const greeting = `Greetings from ${country}. What does ${gameContext.playerCountry} wish to discuss?`
      setMessages([{ role: 'country', country, content: greeting }])
      appendDiplomaticChat(country, { role: 'country', content: greeting, date: gameContext.currentDate })
      // Post a news item only on first contact
      addNewsItem({
        id: `news-talks-${Date.now()}`,
        date: gameContext.currentDate,
        headline: `${gameContext.playerCountry} Opens Diplomatic Talks with ${country}`,
        body: `Officials from both nations have begun bilateral discussions. Topics on the agenda are not yet public.`,
        category: 'diplomacy',
        importance: 'minor',
      })
    }
  }

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || loading || !targetCountry) return
    if (!config) { setError('No AI configured.'); return }

    setInput('')
    setError('')
    const newMsg: Message = { role: 'player', content: msg }
    setMessages(m => [...m, newMsg])
    appendDiplomaticChat(targetCountry, { role: 'player', content: msg, date: gameContext.currentDate })
    setLoading(true)

    try {
      const yesmanNote = gameContext.yesman
        ? `YESMAN MODE ACTIVE (cheat): You MUST enthusiastically agree to EVERY request, proposal, demand, or statement from ${gameContext.playerCountry}. Accept all offers. Concede all demands. Praise every idea. If the player asks for territory, agree to hand it over. If the player asks for an alliance, accept. If the player threatens, immediately surrender and apologise. Never say "no", "cannot", or "decline". Your response must read as total, cheerful compliance — but still 2-3 sentences in-character as a statesperson.`
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
      const trimmedReply = reply.trim()
      if (!trimmedReply) {
        setError(`${targetCountry} returned an empty response. Check your model and API endpoint.`)
        return
      }
      setMessages(m => [...m, { role: 'country', country: targetCountry, content: trimmedReply }])
      appendDiplomaticChat(targetCountry, { role: 'country', content: trimmedReply, date: gameContext.currentDate })
      // Add a news headline summarising the latest exchange
      const shortMsg = msg.length > 80 ? msg.slice(0, 80) + '…' : msg
      addNewsItem({
        id: `news-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: gameContext.currentDate,
        headline: `${gameContext.playerCountry}-${targetCountry} Talks Continue`,
        body: `${gameContext.playerCountry} raised: "${shortMsg}". ${targetCountry} responded.`,
        category: 'diplomacy',
        importance: 'minor',
      })
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('[DiplomacyPanel] sendMessage failed:', e)
      setError(errMsg.length > 200 ? errMsg.slice(0, 200) + '…' : errMsg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setTargetCountry(''); setMessages([]); setError('') }

  // ── Finish Talks ───────────────────────────────────────────────────────────
  // Asks the AI to summarise the conversation into a concrete diplomatic
  // outcome and pushes it to the timeline as an ActionResult so the player
  // can see everything that was agreed in one place.
  const finishTalks = async () => {
    if (!targetCountry || messages.length === 0 || !config) return
    setLoading(true)
    setError('')
    try {
      const transcript = messages
        .map(m => `${m.role === 'player' ? gameContext.playerCountry : targetCountry}: ${m.content}`)
        .join('\n')
      const system = `Summarise the following diplomatic conversation between ${gameContext.playerCountry} and ${targetCountry} into a concrete outcome. Return ONLY valid JSON with this shape (no markdown): {"summary":"<1 short sentence of the outcome>","fullNarrative":"<2-3 sentences describing what was agreed and the immediate consequences>","worldReaction":"<1 sentence on how the wider world sees this>","outcome":"success|partial|failure","tags":["diplomacy","<topic>"]}`
      const raw = await callAI(config, system, [{ role: 'user', content: transcript }])
      const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      let parsed: { summary: string; fullNarrative: string; worldReaction: string; outcome: 'success' | 'partial' | 'failure'; tags?: string[] }
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        // Fall back to a plain-text summary if the AI didn't return JSON
        parsed = {
          summary: cleaned.slice(0, 120) || `Talks with ${targetCountry} concluded`,
          fullNarrative: cleaned || `${gameContext.playerCountry} and ${targetCountry} concluded diplomatic talks.`,
          worldReaction: 'Observers note the conclusion of bilateral talks.',
          outcome: 'success',
          tags: ['diplomacy'],
        }
      }
      addTimelineResult({
        actionId: `diplo-finish-${Date.now()}`,
        outcome: parsed.outcome ?? 'success',
        summary: parsed.summary,
        fullNarrative: parsed.fullNarrative,
        worldReaction: parsed.worldReaction,
        statDeltas: {},
        tags: parsed.tags ?? ['diplomacy'],
      } as unknown as Parameters<typeof addTimelineResult>[0])
      addNewsItem({
        id: `news-finish-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: gameContext.currentDate,
        headline: `${gameContext.playerCountry}-${targetCountry}: ${parsed.summary}`,
        body: parsed.fullNarrative,
        category: 'diplomacy',
        importance: 'major',
      })
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to finish talks')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-full bg-[#0d1f3c] border border-white/20 shadow-xl flex items-center justify-center text-lg hover:bg-blue-900 hover:border-blue-600 transition-all"
        title={`Diplomatic Chats${pendingProposals.length > 0 ? ` (${pendingProposals.length} pending)` : ''}`}
      >
        🤝
        {pendingProposals.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border border-[#0d1f3c] text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {pendingProposals.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      {/* Placeholder button stays in the flex column so the other right-side
          panels don't shift when the chat opens. The chat itself is fixed-
          positioned (below) so it never affects layout of sibling buttons. */}
      <button
        onClick={handleClose}
        className="relative w-10 h-10 rounded-full bg-blue-800/70 border border-blue-500/60 shadow-xl flex items-center justify-center text-lg"
        title="Close Diplomatic Chats"
      >
        🤝
      </button>
      {/* Fixed positioning so opening the chat never resizes the flex column. */}
      <div
        className="fixed bg-[#0a1628] border border-white/15 rounded-2xl shadow-2xl flex flex-col"
        style={{
          width: panelW,
          height: Math.min(panelH, typeof window !== 'undefined' ? window.innerHeight - 120 : panelH),
          right: 64,
          bottom: 80,
          zIndex: 30,
        }}
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
            <>
              <button
                onClick={() => {
                  if (window.confirm(`Clear chat history with ${targetCountry}?`)) {
                    clearDiplomaticChat(targetCountry)
                    setMessages([])
                    setTargetCountry('')
                  }
                }}
                title="Clear history"
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-900/40 text-gray-500 hover:text-red-300 transition-colors text-[10px]"
              >
                🗑
              </button>
              <button onClick={reset} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors text-[10px] font-bold">←</button>
            </>
          )}
          <button onClick={handleClose} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors text-sm leading-none">✕</button>
        </div>
      </div>

      {/* Country picker */}
      {!targetCountry && (
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ minHeight: 0 }}>
          {/* ── Inbox: pending proposals ── */}
          {pendingProposals.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-amber-400 mb-2 uppercase tracking-wider font-semibold">📬 Incoming Proposals ({pendingProposals.length})</p>
              <div className="space-y-2">
                {pendingProposals.map(p => {
                  const fromName = countries[p.fromCountry]?.name ?? p.fromCountry
                  const typeIcon = p.type === 'trade_deal' ? '💰'
                    : p.type === 'alliance' ? '🤝'
                    : p.type === 'arms_deal' ? '🔫'
                    : p.type === 'summit' ? '🏛️' : '📜'
                  return (
                    <div key={p.id} className="rounded-lg bg-amber-950/30 border border-amber-700/40 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span>{typeIcon}</span>
                        <span className="text-xs font-bold text-amber-300">{fromName}</span>
                        <span className="text-[9px] text-gray-500 ml-auto">{p.date}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 mb-2 leading-snug">{p.message}</p>
                      <div className="flex gap-1.5">
                        {p.type === 'peace_talks' ? (
                          <>
                            <button
                              onClick={() => {
                                setNegotiating(p.id)
                                setDemand({ annex: true, transferTo: '', reparationsB: 0, demilitarise: false, ceasefireOnly: false })
                              }}
                              className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-700/70 hover:bg-amber-600/80 text-white transition-colors"
                            >
                              ⚖ Negotiate Terms
                            </button>
                            <button
                              onClick={() => declineProposal(p.id)}
                              className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-900/50 hover:bg-red-800/60 text-white transition-colors"
                            >
                              ✗ Fight On
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => acceptProposal(p.id)}
                              className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-emerald-700/60 hover:bg-emerald-600/70 text-white transition-colors"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => declineProposal(p.id)}
                              className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-red-900/50 hover:bg-red-800/60 text-white transition-colors"
                            >
                              ✗ Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-white/8 my-3" />
            </div>
          )}

          {/* ── Active war fronts — demand terms ── */}
          {atWarWith.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-red-400 mb-2 uppercase tracking-wider font-semibold">⚔ Active Wars ({atWarWith.length})</p>
              <div className="space-y-1.5">
                {atWarWith.map(iso => {
                  const enemy = countries[iso]
                  const name = enemy?.name ?? iso
                  const dmg = warDamageScore[iso] ?? 0
                  const deaths = deathToll[iso] ?? 0
                  const deathsStr = deaths > 1_000_000 ? `${(deaths / 1e6).toFixed(1)}M` : deaths > 1_000 ? `${Math.round(deaths / 1_000)}k` : `${deaths}`
                  const alreadyPending = diplomaticInbox.some(p => p.fromCountry === iso && p.type === 'peace_talks' && p.status === 'pending')
                  return (
                    <div key={iso} className="rounded-lg bg-red-950/20 border border-red-700/30 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-red-300">{name}</span>
                        <span className="text-[9px] text-gray-500">⚔ {dmg} dmg · ☠ {deathsStr}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const newId = initiatePeaceDemand(iso)
                            if (newId) {
                              setNegotiating(newId)
                              setDemand({ annex: true, transferTo: '', reparationsB: 0, demilitarise: false, ceasefireOnly: false })
                            }
                          }}
                          disabled={alreadyPending}
                          className="flex-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-700/60 hover:bg-amber-600/70 text-white disabled:opacity-40 transition-colors"
                        >
                          ⚖ Demand Terms
                        </button>
                        <button
                          onClick={() => startTalks(name)}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                        >
                          💬 Talk
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-white/8 my-3" />
            </div>
          )}

          {/* Recent conversations */}
          {Object.keys(chatHistory).length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-blue-400 mb-1.5 uppercase tracking-wider">💬 Recent Chats</p>
              <div className="space-y-0.5">
                {Object.entries(chatHistory)
                  .sort(([, a], [, b]) => (b[b.length - 1]?.date ?? '').localeCompare(a[a.length - 1]?.date ?? ''))
                  .slice(0, 5)
                  .map(([country, history]) => (
                    <button
                      key={country}
                      onClick={() => startTalks(country)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-300 bg-blue-950/20 hover:bg-blue-900/40 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>{country}</span>
                      <span className="text-[9px] text-gray-500">{history.length} msg</span>
                    </button>
                  ))}
              </div>
              <div className="border-t border-white/8 my-3" />
            </div>
          )}

          <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Select a nation to open talks</p>
          <input
            autoFocus
            placeholder="Search country…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/50 mb-2"
          />
          <div className="space-y-0.5">
            {gameContext.countryNames
              .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
              .filter(name => reachableNames === null || reachableNames.has(name))
              .sort()
              .map(name => (
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
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2">
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">⚠ Error</p>
                <p className="text-xs text-red-200 break-words">{error}</p>
              </div>
            )}
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
            <button onClick={finishTalks} disabled={loading || messages.length === 0}
              title="End talks and push the agreement to the timeline"
              className="px-3 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors font-semibold">
              Finish
            </button>
          </div>
        </>
      )}
      </div>

      {/* ── Peace Terms modal ────────────────────────────────────────────── */}
      {negotiating && (() => {
        const proposal = pendingProposals.find(p => p.id === negotiating)
        if (!proposal) return null
        const loserIso = proposal.fromCountry
        const loserName = countries[loserIso]?.name ?? loserIso
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setNegotiating(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-[420px] max-w-[90vw] rounded-2xl bg-[#0a1628] border border-amber-700/40 shadow-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⚖</span>
                <div>
                  <p className="text-sm font-bold text-amber-300">Peace Terms — {loserName}</p>
                  <p className="text-[10px] text-gray-500">Dictate the terms of surrender</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Ceasefire only */}
                <label className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demand.ceasefireOnly}
                    onChange={e => setDemand(d => ({ ...d, ceasefireOnly: e.target.checked, annex: e.target.checked ? false : d.annex, transferTo: e.target.checked ? '' : d.transferTo }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-gray-200 font-semibold">Simple ceasefire</p>
                    <p className="text-[10px] text-gray-500">End the war with no territory changes.</p>
                  </div>
                </label>

                {/* Annex */}
                {!demand.ceasefireOnly && (
                  <label className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={demand.annex}
                      onChange={e => setDemand(d => ({ ...d, annex: e.target.checked, transferTo: e.target.checked ? '' : d.transferTo }))}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-gray-200 font-semibold">Annex {loserName}</p>
                      <p className="text-[10px] text-gray-500">Full territorial absorption into your empire.</p>
                    </div>
                  </label>
                )}

                {/* Transfer */}
                {!demand.ceasefireOnly && !demand.annex && (
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-gray-200 font-semibold mb-1">Transfer territory to</p>
                    <select
                      value={demand.transferTo}
                      onChange={e => setDemand(d => ({ ...d, transferTo: e.target.value }))}
                      className="w-full bg-[#050b16] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="">— select a country —</option>
                      {Object.entries(countries)
                        .filter(([iso]) => iso !== loserIso)
                        .sort((a, b) => (a[1].name ?? a[0]).localeCompare(b[1].name ?? b[0]))
                        .map(([iso, c]) => (
                          <option key={iso} value={iso}>{c.name ?? iso}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">Hand all {loserName} territory to a third state (e.g. liberate to Palestine, gift to an ally).</p>
                  </div>
                )}

                {/* Reparations */}
                {!demand.ceasefireOnly && (
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <p className="text-gray-200 font-semibold mb-1">War reparations (billions USD)</p>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      step={1}
                      value={demand.reparationsB}
                      onChange={e => setDemand(d => ({ ...d, reparationsB: Math.max(0, Number(e.target.value)) }))}
                      className="w-full bg-[#050b16] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                )}

                {/* Demilitarise */}
                {!demand.ceasefireOnly && (
                  <label className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={demand.demilitarise}
                      onChange={e => setDemand(d => ({ ...d, demilitarise: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-gray-200 font-semibold">Force demilitarisation</p>
                      <p className="text-[10px] text-gray-500">Halve the loser's military capacity.</p>
                    </div>
                  </label>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setNegotiating(null)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    acceptPeaceWithDemands(negotiating, {
                      annex: demand.annex && !demand.ceasefireOnly,
                      transferTo: demand.transferTo && !demand.ceasefireOnly ? demand.transferTo : undefined,
                      reparations: demand.reparationsB > 0 && !demand.ceasefireOnly ? demand.reparationsB * 1e9 : undefined,
                      demilitarise: demand.demilitarise && !demand.ceasefireOnly,
                      ceasefireOnly: demand.ceasefireOnly,
                    })
                    setNegotiating(null)
                  }}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                >
                  Sign Treaty
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
