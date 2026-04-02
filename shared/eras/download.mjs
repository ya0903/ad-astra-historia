#!/usr/bin/env node
// shared/eras/download.mjs
// Downloads Natural Earth 110m country polygons and creates all era GeoJSON files.
// Run with: node shared/eras/download.mjs
// Re-running is safe — exits early if modern.geojson already exists.

import { existsSync, writeFileSync, copyFileSync, readFileSync } from 'fs'
import { get } from 'https'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const modernPath = join(__dirname, 'modern.geojson')

if (existsSync(modernPath)) {
  console.log('modern.geojson already exists. Delete it manually to re-download.')
  process.exit(0)
}

const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

console.log('Downloading Natural Earth 110m countries...')

const chunks = []

get(URL, res => {
  if (res.statusCode !== 200) {
    console.error(`Download failed: HTTP ${res.statusCode}`)
    process.exit(1)
  }

  res.on('data', chunk => chunks.push(chunk))

  res.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')

    // Validate before writing
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      console.error('Downloaded file is not valid JSON. Aborting.')
      process.exit(1)
    }

    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
      console.error('Downloaded file is not a valid GeoJSON FeatureCollection. Aborting.')
      process.exit(1)
    }

    writeFileSync(modernPath, raw, 'utf8')
    console.log(`Download verified (${data.features.length} features).`)

    // Copy to era files
    const eras = ['2010s', '1990s', '1960s', '1945']
    for (const era of eras) {
      const dest = join(__dirname, `${era}.geojson`)
      if (!existsSync(dest)) {
        copyFileSync(modernPath, dest)
        console.log(`Created ${era}.geojson`)
      } else {
        console.log(`${era}.geojson already exists — skipping.`)
      }
    }

    console.log('All era files ready. Historical border adjustments are handled server-side.')
  })
}).on('error', err => {
  console.error('Download error:', err.message)
  process.exit(1)
})
