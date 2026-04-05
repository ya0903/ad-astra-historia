import { useEffect } from 'react'
import { useGameStore, useAuthStore } from './stores'
import SetupPage from './pages/SetupPage'
import GamePage from './pages/GamePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const token = useAuthStore(s => s.token)
  const gameState = useGameStore(s => s.state)
  const hasHydrated = useGameStore(s => s._hasHydrated)

  // Fallback: if onRehydrateStorage never fires (no stored state, or storage
  // unavailable), force-release the loading gate after a short delay.
  useEffect(() => {
    if (hasHydrated) return
    const t = window.setTimeout(() => {
      useGameStore.setState({ _hasHydrated: true })
    }, 300)
    return () => clearTimeout(t)
  }, [hasHydrated])

  // Wait for Zustand persist to finish rehydrating from localStorage before
  // rendering either page — prevents the stored state overwriting a freshly
  // started game and causing a blank screen.
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-blue-400 text-sm tracking-widest uppercase animate-pulse">Loading…</div>
      </div>
    )
  }

  if (!token) return <LoginPage />
  return gameState ? <GamePage /> : <SetupPage />
}
