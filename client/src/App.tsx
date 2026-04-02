import { useGameStore, useAuthStore } from './stores'
import SetupPage from './pages/SetupPage'
import GamePage from './pages/GamePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const token = useAuthStore(s => s.token)
  const gameState = useGameStore(s => s.state)

  if (!token) return <LoginPage />
  return gameState ? <GamePage /> : <SetupPage />
}
