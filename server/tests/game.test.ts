// server/tests/game.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'

describe('GET /api/game/geojson/:era', () => {
  it('returns 200 with a FeatureCollection for modern', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/geojson/modern')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(Array.isArray(res.body.features)).toBe(true)
    expect(res.body.features.length).toBeGreaterThan(0)
  })

  it('returns 400 for an invalid era', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/geojson/invalid')
    expect(res.status).toBe(400)
  })
})

describe('GET /api/game/borders/classical_greek', () => {
  it('returns 200 with normalised polity properties', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/borders/classical_greek')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(res.body.features.length).toBeGreaterThan(0)
    const props = res.body.features[0].properties
    expect(props.polity_id).toMatch(/classical_greek:/)
    expect(props.name).toBeDefined()
    expect(props.fill_colour).toMatch(/^#/)
  })
})

describe('GET /api/game/era/:era', () => {
  it('returns 200 with countries record containing at least 100 countries for modern', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/modern')
    expect(res.status).toBe(200)
    expect(res.body.countries).toBeDefined()
    expect(Object.keys(res.body.countries).length).toBeGreaterThanOrEqual(100)
  })

  it('returns 400 for an invalid era', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/invalid')
    expect(res.status).toBe(400)
  })

  it('returns countries.USA.id === USA for modern', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/era/modern')
    expect(res.status).toBe(200)
    expect(res.body.countries.USA).toBeDefined()
    expect(res.body.countries.USA.id).toBe('USA')
  })
})

describe('GET /api/game/lakes', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/lakes')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(Array.isArray(res.body.features)).toBe(true)
    expect(res.body.features.length).toBeGreaterThan(0)
  })
})

describe('GET /api/game/biomes', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/biomes')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(Array.isArray(res.body.features)).toBe(true)
    expect(res.body.features.length).toBeGreaterThan(0)
  })
})

describe('GET /api/game/rivers', () => {
  it('returns 200 with a FeatureCollection', async () => {
    const app = createApp()
    const res = await request(app).get('/api/game/rivers')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(Array.isArray(res.body.features)).toBe(true)
    expect(res.body.features.length).toBeGreaterThan(0)
  })
})
