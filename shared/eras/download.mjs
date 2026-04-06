#!/usr/bin/env node
// shared/eras/download.mjs
// Downloads Natural Earth GeoJSON files for countries and cities.
// Run with: node shared/eras/download.mjs
// Re-running is safe — skips files that already exist (unless stale).

import { existsSync, writeFileSync, copyFileSync, readFileSync, unlinkSync } from 'fs'
import { get } from 'https'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function downloadFile(url, destPath, label) {
  return new Promise((resolve, reject) => {
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

function featureCount(filePath) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    return data?.features?.length ?? 0
  } catch {
    return 0
  }
}

const modernPath = join(__dirname, 'modern.geojson')
const citiesPath = join(__dirname, 'cities.geojson')

const COUNTRIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

// 50m country borders — more detail than 110m, includes Gaza, small island nations etc.
const BORDERS_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'

// 10m populated places — ~7,300 cities, includes SCALERANK for density filtering
const CITIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson'

// 50m rivers and lake centerlines
const RIVERS_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson'

// 10m geographic regions — deserts, forests, tundra, grasslands, wetlands
const BIOMES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson'

// 110m ocean polygons — used to mask hillshade over sea areas
const OCEAN_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_ocean.geojson'

// 10m lakes
const LAKES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson'

// 50m admin-1 provinces/states — for sub-national territory control
const PROVINCES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson'

try {
  // Countries
  let countriesData = null
  if (existsSync(modernPath)) {
    console.log('modern.geojson already exists — skipping.')
  } else {
    countriesData = await downloadFile(COUNTRIES_URL, modernPath, 'modern.geojson (110m countries)')
  }

  if (countriesData !== null) {
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

  // 50m borders
  const bordersPath = join(__dirname, 'borders.geojson')
  if (existsSync(bordersPath)) {
    console.log(`borders.geojson already exists (${featureCount(bordersPath)} features) — skipping.`)
  } else {
    await downloadFile(BORDERS_URL, bordersPath, 'borders.geojson (50m countries)')
  }

  // Cities — re-download if stale (old 110m file had only 243 features)
  const existingCount = featureCount(citiesPath)
  if (existsSync(citiesPath) && existingCount >= 1000) {
    console.log(`cities.geojson already exists (${existingCount} features) — skipping.`)
  } else {
    if (existsSync(citiesPath)) {
      console.log(`cities.geojson has only ${existingCount} features (stale 110m data) — replacing with 10m dataset...`)
      unlinkSync(citiesPath)
    }
    await downloadFile(CITIES_URL, citiesPath, 'cities.geojson (10m populated places)')
  }

  // Rivers
  const riversPath = join(__dirname, 'rivers.geojson')
  if (existsSync(riversPath)) {
    console.log(`rivers.geojson already exists (${featureCount(riversPath)} features) — skipping.`)
  } else {
    await downloadFile(RIVERS_URL, riversPath, 'rivers.geojson (50m rivers)')
  }

  // Biomes / geographic regions
  const biomesPath = join(__dirname, 'biomes.geojson')
  if (existsSync(biomesPath)) {
    console.log(`biomes.geojson already exists (${featureCount(biomesPath)} features) — skipping.`)
  } else {
    await downloadFile(BIOMES_URL, biomesPath, 'biomes.geojson (10m geographic regions)')
  }

  // Ocean polygons
  const oceanPath = join(__dirname, 'ocean.geojson')
  if (existsSync(oceanPath)) {
    console.log(`ocean.geojson already exists (${featureCount(oceanPath)} features) — skipping.`)
  } else {
    await downloadFile(OCEAN_URL, oceanPath, 'ocean.geojson (110m ocean polygons)')
  }

  // Lakes
  const lakesPath = join(__dirname, 'lakes.geojson')
  if (existsSync(lakesPath)) {
    console.log(`lakes.geojson already exists (${featureCount(lakesPath)} features) — skipping.`)
  } else {
    await downloadFile(LAKES_URL, lakesPath, 'lakes.geojson (10m lakes)')
  }

  // Provinces
  const provincesPath = join(__dirname, 'provinces.geojson')
  if (existsSync(provincesPath)) {
    console.log(`provinces.geojson already exists (${featureCount(provincesPath)} features) — skipping.`)
  } else {
    await downloadFile(PROVINCES_URL, provincesPath, 'provinces.geojson (50m admin-1 states/provinces)')
  }

  console.log('\nAll files ready.')
  console.log('  Countries:  modern.geojson + era copies (110m, for game data)')
  console.log('  Borders:    borders.geojson (50m, for map rendering)')
  console.log('  Cities:     cities.geojson (10m populated places)')
  console.log('  Rivers:     rivers.geojson (50m rivers)')
  console.log('  Biomes:     biomes.geojson (10m geographic regions)')
  console.log('  Ocean:      ocean.geojson (110m ocean polygons)')
  console.log('  Lakes:      lakes.geojson (10m lakes)')
  console.log('  Provinces:  provinces.geojson (50m admin-1 states/provinces)')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
