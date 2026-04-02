#!/usr/bin/env node
// shared/eras/download.mjs
// Downloads Natural Earth GeoJSON files for countries and cities.
// Run with: node shared/eras/download.mjs
// Re-running is safe — skips files that already exist.

import { existsSync, writeFileSync, copyFileSync } from 'fs'
import { get } from 'https'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function downloadFile(url, destPath, label) {
  return new Promise((resolve, reject) => {
    if (existsSync(destPath)) {
      console.log(`${label} already exists — skipping.`)
      resolve(null)
      return
    }

    console.log(`Downloading ${label}...`)
    const chunks = []

    get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${label}`))
        return
      }
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        let data
        try {
          data = JSON.parse(raw)
        } catch {
          reject(new Error(`${label}: downloaded file is not valid JSON`))
          return
        }
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
          reject(new Error(`${label}: not a valid GeoJSON FeatureCollection`))
          return
        }
        writeFileSync(destPath, raw, 'utf8')
        console.log(`${label} verified (${data.features.length} features).`)
        resolve(data)
      })
    }).on('error', err => reject(err))
  })
}

const modernPath = join(__dirname, 'modern.geojson')
const citiesPath = join(__dirname, 'cities.geojson')

const COUNTRIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

const CITIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places.geojson'

try {
  const countriesData = await downloadFile(COUNTRIES_URL, modernPath, 'modern.geojson (countries)')

  if (countriesData !== null) {
    // Fresh download — copy to era files
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
  }

  await downloadFile(CITIES_URL, citiesPath, 'cities.geojson (populated places)')

  console.log('\nAll files ready.')
  console.log('  Countries: modern.geojson + era copies')
  console.log('  Cities:    cities.geojson')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
