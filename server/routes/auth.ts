import { Router, Request, Response } from 'express'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '../../data')
const ACCOUNTS_FILE = join(DATA_DIR, 'accounts.json')
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')

const scryptAsync = promisify(scrypt)

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface Account { id: string; username: string; salt: string; hash: string }
interface Session  { token: string; userId: string; expires: number }

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readAccounts(): Account[] {
  ensureDataDir()
  if (!existsSync(ACCOUNTS_FILE)) return []
  try { return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8')) } catch { return [] }
}

function writeAccounts(accounts: Account[]) {
  ensureDataDir()
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2))
}

function readSessions(): Session[] {
  ensureDataDir()
  if (!existsSync(SESSIONS_FILE)) return []
  try { return JSON.parse(readFileSync(SESSIONS_FILE, 'utf-8')) } catch { return [] }
}

function writeSessions(sessions: Session[]) {
  ensureDataDir()
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions))
}

async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64) as Buffer).toString('hex')
  return { salt, hash }
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  try {
    const hash = await scryptAsync(password, salt, 64) as Buffer
    const stored = Buffer.from(storedHash, 'hex')
    return hash.length === stored.length && timingSafeEqual(hash, stored)
  } catch { return false }
}

function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex')
  const sessions = readSessions().filter(s => s.expires > Date.now()) // purge expired
  sessions.push({ token, userId, expires: Date.now() + SESSION_TTL_MS })
  writeSessions(sessions)
  return token
}

// ── Validate session token — used by auth middleware ──────────────────────────
export function resolveSession(token: string): string | null {
  const sessions = readSessions()
  const session = sessions.find(s => s.token === token && s.expires > Date.now())
  return session?.userId ?? null
}

export const authRouter = Router()

// POST /api/auth/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  if (username.length < 2 || username.length > 32) {
    return res.status(400).json({ error: 'Username must be 2–32 characters' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const accounts = readAccounts()
  if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already taken' })
  }
  const { salt, hash } = await hashPassword(password)
  const id = randomBytes(12).toString('hex')
  accounts.push({ id, username, salt, hash })
  writeAccounts(accounts)
  const token = createSession(id)
  return res.status(201).json({ userId: id, username, token })
})

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  const accounts = readAccounts()
  const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase())
  if (!account) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  const ok = await verifyPassword(password, account.salt, account.hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  const token = createSession(account.id)
  return res.status(200).json({ userId: account.id, username: account.username, token })
})

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const sessions = readSessions().filter(s => s.token !== token)
    writeSessions(sessions)
  }
  return res.status(200).json({ ok: true })
})
