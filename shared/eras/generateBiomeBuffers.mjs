import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import buffer from '@turf/buffer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const INPUT_PATH = join(__dirname, 'biomes.geojson')
const OUTPUT_PATH = join(__dirname, 'biomes-blended.geojson')

if (!existsSync(INPUT_PATH)) {
  console.error(`[generateBiomeBuffers] ERROR: biomes.geojson not found at ${INPUT_PATH}`)
  console.error('Run: node shared/eras/download.mjs')
  process.exit(1)
}

const BUFFER_LEVELS = [
  { distance: 30,  opacity: 0.25, level: 1 },
  { distance: 70,  opacity: 0.12, level: 2 },
  { distance: 120, opacity: 0.05, level: 3 },
]

console.log('[generateBiomeBuffers] Reading biomes.geojson...')
const raw = readFileSync(INPUT_PATH, 'utf-8')
const geojson = JSON.parse(raw)

const features = geojson.features
console.log(`[generateBiomeBuffers] Processing ${features.length} features with ${BUFFER_LEVELS.length} buffer rings each...`)

const outputFeatures = []

// Add original features with bufferLevel=0 and blendOpacity=1.0
for (const feature of features) {
  outputFeatures.push({
    ...feature,
    properties: {
      ...feature.properties,
      bufferLevel: 0,
      blendOpacity: 1.0,
    },
  })
}

// Generate buffer rings
let processed = 0
for (const feature of features) {
  if (processed % 50 === 0 && processed > 0) {
    console.log(`[generateBiomeBuffers] Progress: ${processed}/${features.length} features buffered...`)
  }

  for (const { distance, opacity, level } of BUFFER_LEVELS) {
    try {
      const buffered = buffer(feature, distance, { units: 'kilometers' })
      if (!buffered) continue

      outputFeatures.push({
        ...buffered,
        properties: {
          ...feature.properties,
          bufferLevel: level,
          blendOpacity: opacity,
        },
      })
    } catch (err) {
      // Skip degenerate geometry
    }
  }

  processed++
}

console.log(`[generateBiomeBuffers] Done. Total output features: ${outputFeatures.length}`)

const output = {
  type: 'FeatureCollection',
  features: outputFeatures,
}

console.log(`[generateBiomeBuffers] Writing biomes-blended.geojson...`)
writeFileSync(OUTPUT_PATH, JSON.stringify(output))
console.log(`[generateBiomeBuffers] Written to ${OUTPUT_PATH}`)
