import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { aiRouter } from './routes/ai.js'
import { createSavesRouter } from './routes/saves.js'
import { gameRouter } from './routes/game.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface AppOptions {
  savesDir?: string
}

export function createApp(options: AppOptions = {}) {
  const savesDir = options.savesDir ?? './saves'
  const app = express()

  // In production the client is built to client/dist — serve it from Express.
  // In development Vite runs on its own port so we allow localhost:3000.
  const clientDist = join(__dirname, '../../client/dist')
  const isProd = existsSync(clientDist)

  app.use(cors({ origin: isProd ? false : 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/ai', aiRouter)
  app.use('/api/saves', createSavesRouter(savesDir))
  app.use('/api/game', gameRouter)

  // Serve built frontend in production
  if (isProd) {
    app.use(express.static(clientDist))
    app.get('*', (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'))
    })
  }

  return app
}

// Only start server when run directly (not during tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT ?? 3001)
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
