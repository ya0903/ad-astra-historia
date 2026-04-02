import type { AIConfig } from '@ad-astra/shared/types'

export interface AIMessage { role: 'user' | 'assistant'; content: string }

// Calls the AI provider directly from the browser.
// No server proxy — avoids SSL / network issues between the server and local AI endpoints.
export async function callAI(config: AIConfig, system: string, messages: AIMessage[]): Promise<string> {
  if (config.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: config.model, max_tokens: 1200, system, messages }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const data = await res.json() as { content: Array<{ text: string }> }
    return data.content[0]?.text ?? ''

  } else if (config.provider === 'openai' || config.provider === 'custom') {
    const base = (config.provider === 'custom' && config.baseUrl
      ? config.baseUrl : 'https://api.openai.com/v1').replace(/\/$/, '')
    const url = `${base}/chat/completions`
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (config.apiKey) headers['authorization'] = `Bearer ${config.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1200,
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
          contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
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
