// server/routes/saves.ts
import { Router, Request, Response } from 'express'
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { resolveSession } from './auth.js'
import type { GameState } from '@ad-astra/shared/types'

const FILENAME_REGEX = /^[\w\-]+$/

function requireAuth(req: Request, res: Response): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Login required' }); return null }
  const userId = resolveSession(token)
  if (!userId) { res.status(401).json({ error: 'Session expired — please log in again' }); return null }
  return userId
}

export function createSavesRouter(savesDir: string) {
  const router = Router()

  // POST /api/saves/:filename — save a game
  router.post('/:filename', (req: Request, res: Response) => {
    const userId = requireAuth(req, res)
    if (!userId) return
    const { filename } = req.params
    if (!FILENAME_REGEX.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' })
    }
    const body = req.body as GameState
    const userDir = join(savesDir, userId)
    const filePath = join(userDir, filename + '.json')
    try {
      mkdirSync(userDir, { recursive: true })
      writeFileSync(filePath, JSON.stringify(body))
      return res.status(201).json({ saved: true, filename })
    } catch {
      return res.status(500).json({ error: 'Failed to write save file' })
    }
  })

  // GET /api/saves — list saves for current user
  router.get('/', (req: Request, res: Response) => {
    const userId = requireAuth(req, res)
    if (!userId) return
    const userDir = join(savesDir, userId)
    if (!existsSync(userDir)) return res.status(200).json({ saves: [] })
    try {
      const files = readdirSync(userDir)
      const saves = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.slice(0, -5))
        .filter(name => FILENAME_REGEX.test(name))
        .sort()
      return res.status(200).json({ saves })
    } catch {
      return res.status(500).json({ error: 'Failed to read saves directory' })
    }
  })

  // GET /api/saves/:filename — load a save
  router.get('/:filename', (req: Request, res: Response) => {
    const userId = requireAuth(req, res)
    if (!userId) return
    const { filename } = req.params
    if (!FILENAME_REGEX.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    const filePath = join(savesDir, userId, filename + '.json')
    try {
      const data = readFileSync(filePath, 'utf-8')
      return res.status(200).json(JSON.parse(data))
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(404).json({ error: 'Save not found' })
      }
      return res.status(500).json({ error: 'Failed to read save file' })
    }
  })

  // DELETE /api/saves/:filename — delete a save
  router.delete('/:filename', (req: Request, res: Response) => {
    const userId = requireAuth(req, res)
    if (!userId) return
    const { filename } = req.params
    if (!FILENAME_REGEX.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    const filePath = join(savesDir, userId, filename + '.json')
    try {
      unlinkSync(filePath)
      return res.status(200).json({ deleted: true })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(404).json({ error: 'Save not found' })
      }
      return res.status(500).json({ error: 'Failed to delete save file' })
    }
  })

  router.post('/*', (_req, res) => res.status(400).json({ error: 'Invalid filename' }))
  router.get('/*', (_req, res) => res.status(400).json({ error: 'Invalid filename' }))
  router.delete('/*', (_req, res) => res.status(400).json({ error: 'Invalid filename' }))

  return router
}
