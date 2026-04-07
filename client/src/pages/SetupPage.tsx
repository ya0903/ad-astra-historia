import { useState, useEffect } from 'react'
import type { AIProvider, AIConfig, Era, Difficulty, EraStartConditions } from '@ad-astra/shared/types'
import { useConfigStore, useGameStore } from '../stores'
import { fetchEraConditions, listSaves, loadSave, deleteSave, renameSave } from '../lib/api'
import EraTilePicker from '../components/setup/EraTilePicker'
import type { AnyEraId } from '@ad-astra/shared/eraConfig'

// ── helpers ──────────────────────────────────────────────────────────────────

const COUNTRY_HISTORY_KEY = 'aah-country-history'

function loadCountryHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COUNTRY_HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function bumpCountryHistory(iso: string) {
  const history = loadCountryHistory()
  history[iso] = (history[iso] ?? 0) + 1
  try { localStorage.setItem(COUNTRY_HISTORY_KEY, JSON.stringify(history)) } catch { /* ignore */ }
}

const MODEL_HINTS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-2.0-flash',
  custom: 'qwen2.5:14b',
}

const ERAS: { label: string; value: Era; desc: string; group: 'ancient' | 'modern' }[] = [
  // ── Ancient / Medieval ──────────────────────────────────────────────────────
  { label: '431 BCE — Greek City-States', value: 'greek',   desc: 'Peloponnesian War — Athens vs Sparta, Persian Empire at its height', group: 'ancient' },
  { label: '117 CE — Roman Empire',       value: 'roman',   desc: 'Trajan\'s Rome at its peak — Legions, roads, and the Parthian frontier', group: 'ancient' },
  { label: '1520 CE — Ottoman Sultanate', value: 'ottoman', desc: 'Suleiman the Magnificent — Janissaries, gunpowder, and the siege of Vienna', group: 'ancient' },
  // ── Modern ──────────────────────────────────────────────────────────────────
  { label: '1945', value: '1945', desc: 'Post-WWII world order', group: 'modern' },
  { label: '1960s', value: '1960s', desc: 'Cold War tensions', group: 'modern' },
  { label: '1990s', value: '1990s', desc: 'Post-Soviet realignment', group: 'modern' },
  { label: '2010s', value: '2010s', desc: 'Multipolar world', group: 'modern' },
  { label: 'Modern', value: 'modern', desc: 'Present day', group: 'modern' },
]

const DIFFICULTIES: { label: string; value: Difficulty; description: string }[] = [
  { label: 'Passive', value: 'passive', description: 'AI plays gently' },
  { label: 'Realistic', value: 'realistic', description: 'Normal challenge' },
  { label: 'Aggressive', value: 'aggressive', description: 'AI plays hard' },
]

function configLabel(c: AIConfig) {
  let name: string = c.provider
  if (c.provider === 'custom') {
    try { name = c.baseUrl ? new URL(c.baseUrl).hostname : 'Custom' } catch { name = c.baseUrl || 'Custom' }
  }
  return `${name} · ${c.model}`
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-blue-300 mb-4">{children}</h2>
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-red-400 text-sm mt-2">{msg}</p>
}

// ── main component ────────────────────────────────────────────────────────────

type View = 'landing' | 'setup'

export default function SetupPage() {
  const savedConfig = useConfigStore(s => s.config)
  const configHistory = useConfigStore(s => s.configHistory)
  const setStoreConfig = useConfigStore(s => s.setConfig)
  const initGame = useGameStore(s => s.initGame)
  const loadGameStore = useGameStore(s => s.loadGame)

  const [view, setView] = useState<View>('landing')

  // ── model list (for custom provider) ──
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // ── landing state ──
  const [saves, setSaves] = useState<string[]>([])
  const [savesLoading, setSavesLoading] = useState(false)
  const [landingError, setLandingError] = useState('')
  const [renamingName, setRenamingName] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  // ── config state ──
  const [provider, setProvider] = useState<AIProvider>(savedConfig?.provider ?? 'custom')
  const [apiKey, setApiKey] = useState(savedConfig?.apiKey ?? '')
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl ?? '')
  const [model, setModel] = useState(savedConfig?.model ?? MODEL_HINTS['custom'])
  const [configSaved, setConfigSaved] = useState(savedConfig !== null)
  const [configError, setConfigError] = useState('')

  // ── era / country / difficulty state ──
  const [selectedEra, setSelectedEra] = useState<Era | null>(null)
  const [eraConditions, setEraConditions] = useState<EraStartConditions | null>(null)
  const [eraLoading, setEraLoading] = useState(false)
  const [eraError, setEraError] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('realistic')
  const [startError, setStartError] = useState('')
  const [countryHistory] = useState<Record<string, number>>(() => loadCountryHistory())

  useEffect(() => {
    // Load saves list for landing screen
    setSavesLoading(true)
    listSaves()
      .then(r => setSaves(r.saves))
      .catch(() => setSaves([]))
      .finally(() => setSavesLoading(false))
  }, [])

  // ── handlers ─────────────────────────────────────────────────────────────

  function applyConfig(cfg: AIConfig) {
    setProvider(cfg.provider)
    setApiKey(cfg.apiKey)
    setBaseUrl(cfg.baseUrl ?? '')
    setModel(cfg.model)
    setConfigSaved(true)
    setConfigError('')
  }

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    setModel(MODEL_HINTS[p])
    setConfigSaved(false)
    setAvailableModels([])
  }

  async function fetchModels() {
    if (!baseUrl.trim()) return
    setModelsLoading(true)
    try {
      const base = baseUrl.trim().replace(/\/$/, '')
      const headers: Record<string, string> = {}
      if (apiKey.trim()) headers['authorization'] = `Bearer ${apiKey.trim()}`
      const res = await fetch(`${base}/models`, { headers })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as { data?: Array<{ id: string }>; models?: Array<{ id?: string; name?: string }> }
      const models: string[] = []
      if (data.data) data.data.forEach(m => models.push(m.id))
      else if (data.models) data.models.forEach(m => { if (m.id) models.push(m.id) })
      setAvailableModels(models)
      if (models.length > 0 && !models.includes(model)) setModel(models[0])
    } catch {
      setAvailableModels([])
    } finally {
      setModelsLoading(false)
    }
  }

  function handleSaveConfig() {
    setConfigError('')
    if (!model.trim()) { setConfigError('Model name is required.'); return }
    if (provider !== 'custom' && !apiKey.trim()) { setConfigError('API key is required.'); return }
    const cfg: AIConfig = {
      provider, apiKey: apiKey.trim(), model: model.trim(),
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
    }
    setStoreConfig(cfg)
    setConfigSaved(true)
  }

  async function handleEraSelect(era: Era) {
    setSelectedEra(era); setEraConditions(null); setEraError('')
    setSelectedCountry(''); setCountrySearch(''); setEraLoading(true)
    try { setEraConditions(await fetchEraConditions(era)) }
    catch (err) { setEraError(err instanceof Error ? err.message : 'Failed to load era') }
    finally { setEraLoading(false) }
  }

  function handleStartGame() {
    if (!eraConditions) { setStartError('Select an era first.'); return }
    if (!selectedCountry) { setStartError('Select a country.'); return }
    bumpCountryHistory(selectedCountry)
    initGame(eraConditions, selectedCountry, difficulty)
  }

  async function handleLoadSave(name: string) {
    setLandingError('')
    try { loadGameStore(await loadSave(name)) }
    catch (err) { setLandingError(err instanceof Error ? err.message : 'Failed to load save') }
  }

  async function handleDeleteSave(name: string) {
    setLandingError('')
    try {
      await deleteSave(name)
      setSaves(s => s.filter(n => n !== name))
    } catch (err) { setLandingError(err instanceof Error ? err.message : 'Failed to delete') }
  }

  async function handleRenameSave(oldName: string) {
    const newName = renameText.trim()
    if (!newName || newName === oldName) { setRenamingName(null); return }
    setLandingError('')
    try {
      await renameSave(oldName, newName)
      setSaves(s => s.map(n => n === oldName ? newName : n))
      setRenamingName(null)
    } catch (err) { setLandingError(err instanceof Error ? err.message : 'Failed to rename') }
  }

  const sortedCountries = eraConditions
    ? Object.values(eraConditions.countries)
        .filter(c => !countrySearch.trim() || c.name.toLowerCase().includes(countrySearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  // ── LANDING VIEW ─────────────────────────────────────────────────────────

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold tracking-widest text-white mb-2">AD ASTRA</h1>
            <p className="text-blue-400 tracking-[0.4em] text-sm uppercase">Historia</p>
          </div>

          {/* Saves */}
          <Panel>
            <SectionTitle>Continue</SectionTitle>
            {savesLoading && <p className="text-blue-400 text-sm animate-pulse">Loading saves…</p>}
            {landingError && <ErrorMsg msg={landingError} />}
            {!savesLoading && saves.length === 0 && (
              <p className="text-gray-500 text-sm">No saved games found.</p>
            )}
            <div className="space-y-1.5">
              {saves.map(name => (
                <div key={name} className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                  {renamingName === name ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input autoFocus value={renameText} onChange={e => setRenameText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSave(name); if (e.key === 'Escape') setRenamingName(null) }}
                        className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" />
                      <button onClick={() => handleRenameSave(name)} className="text-xs text-green-400 hover:text-green-300 px-1">Save</button>
                      <button onClick={() => setRenamingName(null)} className="text-xs text-gray-500 hover:text-gray-300 px-1">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button onClick={() => handleLoadSave(name)}
                        className="flex-1 text-left px-4 py-3 hover:bg-blue-800/40 transition-colors flex items-center justify-between group">
                        <p className="text-sm font-medium text-white">{name}</p>
                        <span className="text-xs text-gray-500 group-hover:text-blue-300 transition-colors">Load →</span>
                      </button>
                      <button onClick={() => { setRenamingName(name); setRenameText(name) }}
                        className="px-3 py-3 text-xs text-gray-500 hover:text-blue-300 transition-colors border-l border-white/10" title="Rename">✎</button>
                      <button onClick={() => handleDeleteSave(name)}
                        className="px-3 py-3 text-xs text-gray-500 hover:text-red-400 transition-colors border-l border-white/10" title="Delete">✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <button onClick={() => setView('setup')}
            className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold text-lg tracking-wide transition-colors">
            New Game
          </button>
        </div>
      </div>
    )
  }

  // ── SETUP VIEW ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a1628] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="text-center mb-8">
          <button onClick={() => setView('landing')} className="text-gray-500 hover:text-gray-300 text-sm mb-4 block mx-auto transition-colors">← Back</button>
          <h1 className="text-4xl font-bold tracking-widest text-white mb-1">AD ASTRA: HISTORIA</h1>
          <p className="text-blue-400 text-sm tracking-wide">New Game Setup</p>
        </div>

        {/* ── Step 1: AI Configuration ── */}
        <Panel>
          <SectionTitle>Step 1 — AI Configuration</SectionTitle>

          {/* Saved config history */}
          {configHistory.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Previous Configs</label>
              <div className="flex flex-wrap gap-2">
                {configHistory.map((c, i) => (
                  <button key={i} onClick={() => applyConfig(c)}
                    className="px-3 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-gray-300 hover:bg-blue-800/40 hover:text-white transition-colors">
                    {configLabel(c)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Provider */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Provider</label>
            <div className="flex flex-wrap gap-2">
              {(['openai', 'anthropic', 'google', 'custom'] as AIProvider[]).map(p => (
                <button key={p} onClick={() => handleProviderChange(p)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${provider === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                  {p === 'openai' ? 'OpenAI' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">API Key{provider === 'custom' ? ' (optional)' : ' *'}</label>
            <input type="password" value={apiKey}
              onChange={e => { setApiKey(e.target.value); setConfigSaved(false) }}
              placeholder={provider === 'custom' ? 'Optional' : 'sk-...'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
          </div>

          {/* Base URL (custom) */}
          {provider === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Base URL</label>
              <input type="text" value={baseUrl}
                onChange={e => { setBaseUrl(e.target.value); setConfigSaved(false) }}
                placeholder="https://host:port/api"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-gray-500 mt-1">
                Open WebUI: <span className="font-mono text-gray-400">https://host:port/api</span> ·
                Ollama: <span className="font-mono text-gray-400">http://host:11434/api</span> ·
                LM Studio: <span className="font-mono text-gray-400">http://host:port/v1</span>
              </p>
            </div>
          )}

          {/* Model */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-400">Model *</label>
              {provider === 'custom' && baseUrl.trim() && (
                <button onClick={fetchModels} disabled={modelsLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors">
                  {modelsLoading ? 'Loading…' : '⟳ Fetch models'}
                </button>
              )}
            </div>
            {availableModels.length > 0 ? (
              <select value={model} onChange={e => { setModel(e.target.value); setConfigSaved(false) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {availableModels.map(m => (
                  <option key={m} value={m} className="bg-[#0a1628]">{m}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={model}
                onChange={e => { setModel(e.target.value); setConfigSaved(false) }}
                placeholder={MODEL_HINTS[provider] || 'model-name'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
            )}
            {provider === 'custom' && availableModels.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Enter Base URL above then click "Fetch models", or type manually. Recommended: <span className="text-gray-400">qwen2.5:14b</span> · <span className="text-gray-400">qwen2.5:7b</span> · <span className="text-gray-400">mistral-nemo</span>
              </p>
            )}
          </div>

          {configError && <ErrorMsg msg={configError} />}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleSaveConfig} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">Save Config</button>
            {configSaved && <span className="text-green-400 text-sm">Saved ✓</span>}
          </div>
        </Panel>

        {/* ── Step 2: Era Selection ── */}
        <Panel>
          <SectionTitle>Step 2 — Select Era</SectionTitle>
          <EraTilePicker
            selected={selectedEra as AnyEraId | null}
            onSelect={(era) => handleEraSelect(era as Era)}
          />
          {eraLoading && <p className="text-blue-400 text-sm mt-3 animate-pulse">Loading era conditions…</p>}
          {eraError && <ErrorMsg msg={eraError} />}
          {eraConditions && !eraLoading && (
            <p className="text-gray-500 text-xs mt-3">{Object.keys(eraConditions.countries).length} countries · starts {eraConditions.startDate}</p>
          )}
        </Panel>

        {/* ── Step 3: Country + Difficulty ── */}
        {eraConditions && (
          <Panel>
            <SectionTitle>Step 3 — Country &amp; Difficulty</SectionTitle>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              {(() => {
                const fromHistory = Object.entries(countryHistory)
                  .filter(([iso]) => eraConditions?.countries[iso])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([iso]) => eraConditions!.countries[iso])
                // Fallback to popular default picks if no history yet
                const POPULAR_FALLBACK = ['USA', 'CHN', 'RUS', 'GBR', 'IND', 'DEU', 'FRA', 'JPN', 'PAK', 'BRA']
                const fallback = POPULAR_FALLBACK
                  .filter(iso => eraConditions?.countries[iso])
                  .slice(0, 5)
                  .map(iso => eraConditions!.countries[iso])
                const topChosen = fromHistory.length > 0 ? fromHistory : fallback
                const label = fromHistory.length > 0 ? '★ Most Chosen' : '★ Popular Picks'
                return topChosen.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1.5">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topChosen.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCountry(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                            selectedCountry === c.id
                              ? 'bg-amber-700/60 border-amber-500 text-white'
                              : 'bg-amber-950/30 border-amber-700/40 text-amber-200 hover:bg-amber-900/50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <input type="text" value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                placeholder="Search countries…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-2" />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
                {sortedCountries.length === 0
                  ? <p className="text-gray-500 text-sm px-3 py-2">No countries match.</p>
                  : sortedCountries.map(c => (
                    <button key={c.id} onClick={() => setSelectedCountry(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedCountry === c.id ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(({ label, value, description }) => (
                  <button key={value} onClick={() => setDifficulty(value)} title={description}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${difficulty === value ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-1">{DIFFICULTIES.find(d => d.value === difficulty)?.description}</p>
            </div>
          </Panel>
        )}

        {/* ── Step 4: Start ── */}
        {eraConditions && (
          <Panel>
            <SectionTitle>Step 4 — Start</SectionTitle>
            {startError && <ErrorMsg msg={startError} />}
            <button onClick={handleStartGame} disabled={!selectedCountry}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-base font-semibold transition-colors">
              Start Game as {selectedCountry ? (eraConditions.countries[selectedCountry]?.name ?? selectedCountry) : '…'}
            </button>
          </Panel>
        )}

      </div>
    </div>
  )
}
