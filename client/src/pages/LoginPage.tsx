import { useState } from 'react'
import { login, signup } from '../lib/api'
import { useAuthStore } from '../stores'

export default function LoginPage() {
  const setAuth = useAuthStore(s => s.setAuth)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'signup'
        ? await signup(username.trim(), password)
        : await login(username.trim(), password)
      setAuth(res.username, res.token, res.userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#060d1a] text-white">
      {/* Background subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-1">Ad Astra</h1>
          <p className="text-xs text-gray-600 tracking-widest uppercase">Historia</p>
        </div>

        {/* Card */}
        <div className="bg-[#080f1e]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {/* Mode toggle */}
          <div className="flex mb-6 rounded-xl bg-white/[0.04] p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/60 transition-colors"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/60 transition-colors"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter password'}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || !username.trim() || !password}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-colors shadow-lg shadow-blue-900/30 mt-2">
              {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-4">
          Each account has its own save files.
        </p>
      </div>
    </div>
  )
}
