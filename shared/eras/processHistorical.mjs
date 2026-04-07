#!/usr/bin/env node
// shared/eras/processHistorical.mjs
//
// Downloads aourednik/historical-basemaps GeoJSON files for our 15 historical eras,
// then normalises them into our internal era format with stable polity_id slugs,
// border precision metadata, and pre-computed fill_colour from a deterministic
// hash. Run automatically on server startup; safe to re-run (idempotent).

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { get } from 'https'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, 'raw')
const OUT_DIR = __dirname

const HISTORICAL_ERAS = [
  { id: 'bronze_age',         file: 'world_bc1500' },
  { id: 'classical_greek',    file: 'world_bc500' },
  { id: 'alexander',          file: 'world_bc323' },
  { id: 'qin_expansion',      file: 'world_bc300' },
  { id: 'punic_wars',         file: 'world_bc200' },
  { id: 'roman_peak',         file: 'world_100' },
  { id: 'late_antiquity',     file: 'world_500' },
  { id: 'tang_abbasid',       file: 'world_800' },
  { id: 'high_medieval',      file: 'world_1279' },
  { id: 'age_of_exploration', file: 'world_1492' },
  { id: 'ottoman_classical',  file: 'world_1530' },
  { id: 'enlightenment',      file: 'world_1715' },
  { id: 'industrial_dawn',    file: 'world_1880' },
  { id: 'great_war',          file: 'world_1914' },
  { id: 'interwar',           file: 'world_1938' },
]

const BASE_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/'

function downloadFile(url, destPath, label, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error(`${label}: too many redirects`))
      return
    }
    console.log(`[processHistorical] Downloading ${label}...`)
    const chunks = []
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        downloadFile(res.headers.location, destPath, label, redirects + 1).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${label}`))
        return
      }
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        try {
          const json = JSON.parse(raw)
          if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
            reject(new Error(`${label}: not a FeatureCollection`))
            return
          }
          writeFileSync(destPath, raw, 'utf8')
          console.log(`[processHistorical] OK ${label} (${json.features.length} features)`)
          resolve(json)
        } catch (e) {
          reject(new Error(`${label}: ${e.message}`))
        }
      })
    }).on('error', reject)
  })
}

function polityIdFor(eraId, name) {
  const slug = String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${eraId}:${slug}`
}

function djb2(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

function hslToHex(h, s, l) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generatePolityColour(name, era) {
  const hash = djb2(`${era}:${name}`)
  const hue = hash % 360
  const sat = 55 + ((hash >> 8) % 20)
  const light = 45 + ((hash >> 16) % 15)
  return hslToHex(hue, sat, light)
}

function normaliseEra(eraId, geojson) {
  return {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => {
      const props = f.properties || {}
      const name = props.NAME || props.SUBJECTO || 'Unknown'
      const id = polityIdFor(eraId, name)
      return {
        ...f,
        properties: {
          ...props,
          polity_id: id,
          name,
          ISO_A3: id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
          ADMIN: name,
          NAME: name,
          fill_colour: generatePolityColour(name, eraId),
          border_precision: typeof props.BORDERPRECISION === 'number' ? props.BORDERPRECISION : 2,
        },
      }
    }),
  }
}

async function main() {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true })

  let downloaded = 0
  let processed = 0

  for (const era of HISTORICAL_ERAS) {
    const rawPath = join(RAW_DIR, `${era.file}.geojson`)
    const outPath = join(OUT_DIR, `${era.id}.geojson`)

    let raw
    if (existsSync(rawPath)) {
      try {
        raw = JSON.parse(readFileSync(rawPath, 'utf8'))
      } catch {
        raw = await downloadFile(`${BASE_URL}${era.file}.geojson`, rawPath, `${era.file}.geojson`)
        downloaded++
      }
    } else {
      raw = await downloadFile(`${BASE_URL}${era.file}.geojson`, rawPath, `${era.file}.geojson`)
      downloaded++
    }

    const normalised = normaliseEra(era.id, raw)
    writeFileSync(outPath, JSON.stringify(normalised), 'utf8')
    processed++
  }

  console.log(`[processHistorical] Done — ${downloaded} downloaded, ${processed} processed.`)
}

main().catch((e) => {
  console.error('[processHistorical] Failed:', e.message)
  process.exit(1)
})
