// server/tests/saves.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'
import { join } from 'path'
import { rmSync } from 'fs'
import os from 'os'

function makeTmpDir() {
  return join(os.tmpdir(), 'aah-test-' + Date.now())
}

describe('saves routes', () => {
  let tmpDir: string

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  it('POST /api/saves/mysave returns 201 with saved: true', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    const res = await request(app)
      .post('/api/saves/mysave')
      .send({ era: 'modern' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ saved: true, filename: 'mysave' })
  })

  it('POST /api/saves/bad/name returns 400 for invalid filename', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    const res = await request(app)
      .post('/api/saves/bad/name')
      .send({ era: 'modern' })
    expect(res.status).toBe(400)
  })

  it('GET /api/saves on empty dir returns { saves: [] }', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    const res = await request(app).get('/api/saves')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saves: [] })
  })

  it('GET /api/saves returns sorted list after posting save1 and save2', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    await request(app).post('/api/saves/save2').send({ era: 'ancient' })
    await request(app).post('/api/saves/save1').send({ era: 'medieval' })
    const res = await request(app).get('/api/saves')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saves: ['save1', 'save2'] })
  })

  it('GET /api/saves/mysave returns saved body', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    await request(app).post('/api/saves/mysave').send({ era: 'modern' })
    const res = await request(app).get('/api/saves/mysave')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ era: 'modern' })
  })

  it('GET /api/saves/nonexistent returns 404', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    const res = await request(app).get('/api/saves/nonexistent')
    expect(res.status).toBe(404)
  })

  it('DELETE /api/saves/mysave after posting returns 200 { deleted: true }', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    await request(app).post('/api/saves/mysave').send({ era: 'modern' })
    const res = await request(app).delete('/api/saves/mysave')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })
  })

  it('DELETE /api/saves/nonexistent returns 404', async () => {
    tmpDir = makeTmpDir()
    const app = createApp({ savesDir: tmpDir })
    const res = await request(app).delete('/api/saves/nonexistent')
    expect(res.status).toBe(404)
  })
})
