import { Router } from 'express'
import type { AIConfig, GameAction } from '@ad-astra/shared/types'

export const aiRouter = Router()

// ── Shared AI call helper ────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant'; content: string }

async function callAI(config: AIConfig, system: string, messages: Message[]): Promise<string> {
  if (config.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: config.model, max_tokens: 1024, system, messages }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const data = await res.json() as { content: Array<{ text: string }> }
    return data.content[0]?.text ?? ''

  } else if (config.provider === 'openai' || config.provider === 'custom') {
    // Use base URL exactly as provided — no path injection.
    // Open WebUI:  set base URL to  https://host:port/api
    // Ollama:      set base URL to  http://host:11434/api
    // OpenAI:      set base URL to  https://api.openai.com/v1
    // LM Studio:   set base URL to  http://localhost:1234/v1
    const base = (config.provider === 'custom' && config.baseUrl
      ? config.baseUrl : 'https://api.openai.com/v1').replace(/\/$/, '')
    const url = `${base}/chat/completions`
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (config.apiKey) headers['authorization'] = `Bearer ${config.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model, max_tokens: 1024,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })
    if (!res.ok) throw new Error(`${url} → ${res.status}: ${await res.text()}`)
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    return data.choices[0]?.message?.content ?? ''

  } else if (config.provider === 'google') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`)
    const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
    return data.candidates[0]?.content?.parts[0]?.text ?? ''

  } else {
    throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// ── POST /api/ai/suggest ─────────────────────────────────────────────────────

aiRouter.post('/suggest', async (req, res) => {
  const { text, config, playerCountry, currentDate } = req.body as {
    text: string; config: AIConfig; playerCountry?: string; currentDate?: string
  }
  if (!text?.trim()) { res.status(400).json({ error: 'text is required' }); return }
  if (!config?.apiKey || !config?.model) { res.status(400).json({ error: 'AI config required' }); return }

  const system = `You are a geopolitical strategy advisor. The player leads ${playerCountry ?? 'a country'} on ${currentDate ?? 'an unknown date'}. Refine rough ideas into a single specific, actionable policy decision in one clear sentence (under 20 words). Return only the action text.`
  try {
    const suggestion = await callAI(config, system, [{ role: 'user', content: text }])
    res.json({ suggestion: suggestion.trim() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'AI error' })
  }
})

// ── POST /api/ai/execute ─────────────────────────────────────────────────────
// Body: { actions: GameAction[], gameContext: {...}, config: AIConfig }
// Returns: { results: ActionResult[] }

interface GameContext {
  playerCountry: string
  currentDate: string
  era: string
  stats: Record<string, number>
}

aiRouter.post('/execute', async (req, res) => {
  const { actions, gameContext, config } = req.body as {
    actions: GameAction[]
    gameContext: GameContext
    config: AIConfig
  }
  if (!actions?.length) { res.status(400).json({ error: 'actions required' }); return }
  if (!config?.apiKey || !config?.model) { res.status(400).json({ error: 'AI config required' }); return }

  const { playerCountry, currentDate, era, stats } = gameContext
  const statsStr = Object.entries(stats)
    .map(([k, v]) => `${k}: ${typeof v === 'number' && v > 1e8 ? `$${(v / 1e9).toFixed(1)}B` : v}`)
    .join(', ')

  const actionList = actions.map((a, i) => `${i + 1}. ${a.text}`).join('\n')

  const system = `You are simulating realistic geopolitical outcomes for a strategy game set in the ${era} era. Be concise, plausible, and grounded in real-world geopolitics. Respond ONLY with valid JSON — no markdown, no code fences.`

  const prompt = `Player: ${playerCountry} | Date: ${currentDate} | Era: ${era}
Current stats: ${statsStr}

The player has ordered these actions:
${actionList}

Respond with a JSON object in this exact shape:
{
  "results": [
    {
      "actionId": "<id from input>",
      "summary": "<one sentence — what happened>",
      "fullNarrative": "<2-3 sentences — outcome and consequences>",
      "worldReaction": "<one sentence — international response>",
      "statDeltas": { "gdp": <number in USD, can be negative>, "military": <-10 to 10>, "approval": <-10 to 10>, "softPower": <-5 to 5>, "techLevel": <-3 to 3> },
      "tags": ["<tag1>", "<tag2>"]
    }
  ]
}

One result per action, in order. ActionIds: ${actions.map(a => a.id).join(', ')}.
Make stat deltas realistic — most domestic actions move approval ±2-5, economic actions move GDP by 0.1-2% of current GDP.`

  try {
    const raw = await callAI(config, system, [{ role: 'user', content: prompt }])
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { results: unknown[] }
    res.json({ results: parsed.results })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'AI error' })
  }
})

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
// Advisor chat — ask anything about the game world
// Body: { message, history: Message[], gameContext, config }

aiRouter.post('/chat', async (req, res) => {
  const { message, history, gameContext, config } = req.body as {
    message: string
    history: Message[]
    gameContext: GameContext & { topCountries?: Array<{ name: string; gdp: number }> }
    config: AIConfig
  }
  if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return }
  if (!config?.apiKey || !config?.model) { res.status(400).json({ error: 'AI config required' }); return }

  const { playerCountry, currentDate, era, stats } = gameContext
  const statsStr = Object.entries(stats)
    .map(([k, v]) => `${k}: ${typeof v === 'number' && v > 1e8 ? `$${(v / 1e9).toFixed(1)}B` : v}`)
    .join(', ')

  const topEconomiesStr = gameContext.topCountries?.slice(0, 10)
    .map((c, i) => `${i + 1}. ${c.name} ($${(c.gdp / 1e9).toFixed(0)}B)`)
    .join('\n') ?? 'Data unavailable'

  const system = `You are a geopolitical intelligence advisor in a strategy game set in the ${era} era (${currentDate}).
The player leads ${playerCountry}. Their current stats: ${statsStr}.

Top world economies by GDP:
${topEconomiesStr}

Answer questions about the game world concisely and in-character as a knowledgeable advisor. For out-of-game world knowledge questions (film awards, sports results, historical events), answer based on real-world knowledge appropriate to the era. Keep responses under 200 words.`

  const messages: Message[] = [
    ...history.slice(-6), // last 6 exchanges for context
    { role: 'user', content: message },
  ]

  try {
    const reply = await callAI(config, system, messages)
    res.json({ reply: reply.trim() })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'AI error' })
  }
})
