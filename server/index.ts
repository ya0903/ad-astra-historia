import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { aiRouter } from './routes/ai.js'
import { authRouter } from './routes/auth.js'
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
  const clientDist = join(__dirname, '../client/dist')
  const isProd = existsSync(clientDist)

  app.use(cors({ origin: isProd ? false : 'http://localhost:3000' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/ai', aiRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/saves', createSavesRouter(savesDir))
  app.use('/api/game', gameRouter)

  // Serve built frontend in production
  if (isProd) {
    // Hashed assets (JS/CSS with content hash in filename) can be cached long-term.
    // index.html must never be cached — it references the current hashed bundle names.
    app.use(express.static(clientDist, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        }
      },
    }))
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.sendFile(join(clientDist, 'index.html'))
    })
  }

  return app
}

function ensureGeoData() {
  const erasDir = join(__dirname, '../shared/eras')
  const required = ['biomes.geojson', 'rivers.geojson', 'ocean.geojson', 'lakes.geojson']
  const missing = required.filter(f => !existsSync(join(erasDir, f)))
  if (missing.length > 0) {
    console.warn(`[startup] Missing GeoJSON files: ${missing.join(', ')} — running download script...`)
    try {
      execSync('node shared/eras/download.mjs', {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 120_000,
      })
    } catch (err) {
      console.warn('[startup] GeoJSON download failed — map features may be unavailable.', err)
    }
  }

  // Process historical eras (downloads aourednik files + normalises)
  try {
    console.log('[startup] Running processHistorical.mjs...')
    execSync('node shared/eras/processHistorical.mjs', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 600_000,
    })
  } catch (err) {
    console.warn('[startup] Historical era processing failed.', (err as Error).message)
  }
}

// Only start server when run directly (not during tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureGeoData()
  const PORT = Number(process.env.PORT ?? 3001)
  createApp().listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
