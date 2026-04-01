import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { aiRouter } from './routes/ai.js'
import { createSavesRouter } from './routes/saves.js'
import { gameRouter } from './routes/game.js'

interface AppOptions {
  savesDir?: string
}

export function createApp(options: AppOptions = {}) {
  const savesDir = options.savesDir ?? './saves'
  const app = express()
  app.use(cors({ origin: 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/ai', aiRouter)
  app.use('/api/saves', createSavesRouter(savesDir))
  app.use('/api/game', gameRouter)

  return app
}

// Only start server when run directly (not during tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ?? 3001
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
