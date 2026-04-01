import { useGameStore } from './stores'
import SetupPage from './pages/SetupPage'
import GamePage from './pages/GamePage'

export default function App() {
  const gameState = useGameStore(s => s.state)
  return gameState ? <GamePage /> : <SetupPage />
}
