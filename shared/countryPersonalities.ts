import type { CountryPersonality } from './types.js'
import { MODERN_COUNTRY_DATA } from './countryData.js'

// ── Manual Personality Profiles ──────────────────────────────────────────────
// Hand-tuned for major/notable countries. All others are derived from stats.

const MANUAL_PERSONALITIES: Record<string, CountryPersonality> = {
  USA: { aggression: 75, diplomacy: 60, economicFocus: 70, stability: 75, unpredictability: 18 },
  CHN: { aggression: 55, diplomacy: 50, economicFocus: 85, stability: 80, unpredictability: 8 },
  RUS: { aggression: 70, diplomacy: 35, economicFocus: 45, stability: 55, unpredictability: 15 },
  GBR: { aggression: 40, diplomacy: 75, economicFocus: 70, stability: 85, unpredictability: 10 },
  FRA: { aggression: 40, diplomacy: 80, economicFocus: 65, stability: 70, unpredictability: 12 },
  DEU: { aggression: 20, diplomacy: 85, economicFocus: 80, stability: 90, unpredictability: 5 },
  IND: { aggression: 35, diplomacy: 55, economicFocus: 70, stability: 60, unpredictability: 8 },
  JPN: { aggression: 20, diplomacy: 70, economicFocus: 85, stability: 90, unpredictability: 4 },
  BRA: { aggression: 15, diplomacy: 55, economicFocus: 60, stability: 55, unpredictability: 10 },
  TUR: { aggression: 55, diplomacy: 50, economicFocus: 55, stability: 55, unpredictability: 14 },
  IRN: { aggression: 60, diplomacy: 30, economicFocus: 40, stability: 50, unpredictability: 16 },
  SAU: { aggression: 45, diplomacy: 45, economicFocus: 70, stability: 65, unpredictability: 12 },
  ISR: { aggression: 65, diplomacy: 40, economicFocus: 60, stability: 70, unpredictability: 14 },
  EGY: { aggression: 35, diplomacy: 50, economicFocus: 45, stability: 50, unpredictability: 10 },
  KOR: { aggression: 25, diplomacy: 60, economicFocus: 80, stability: 80, unpredictability: 6 },
  PRK: { aggression: 80, diplomacy: 10, economicFocus: 15, stability: 60, unpredictability: 20 },
  AUS: { aggression: 20, diplomacy: 70, economicFocus: 65, stability: 90, unpredictability: 6 },
  PAK: { aggression: 50, diplomacy: 35, economicFocus: 35, stability: 40, unpredictability: 14 },
  NGA: { aggression: 25, diplomacy: 40, economicFocus: 50, stability: 35, unpredictability: 12 },
  ZAF: { aggression: 20, diplomacy: 55, economicFocus: 55, stability: 50, unpredictability: 10 },
  MEX: { aggression: 15, diplomacy: 50, economicFocus: 55, stability: 45, unpredictability: 10 },
  IDN: { aggression: 20, diplomacy: 55, economicFocus: 60, stability: 60, unpredictability: 8 },
  CHE: { aggression: 5,  diplomacy: 90, economicFocus: 85, stability: 95, unpredictability: 2 },
  NOR: { aggression: 10, diplomacy: 80, economicFocus: 75, stability: 92, unpredictability: 3 },
  SWE: { aggression: 10, diplomacy: 80, economicFocus: 70, stability: 90, unpredictability: 4 },
  NZL: { aggression: 8,  diplomacy: 75, economicFocus: 60, stability: 92, unpredictability: 3 },
  CRI: { aggression: 3,  diplomacy: 65, economicFocus: 55, stability: 80, unpredictability: 4 },
  AFG: { aggression: 40, diplomacy: 15, economicFocus: 15, stability: 15, unpredictability: 18 },
  SOM: { aggression: 35, diplomacy: 10, economicFocus: 10, stability: 10, unpredictability: 18 },
  SYR: { aggression: 45, diplomacy: 20, economicFocus: 20, stability: 20, unpredictability: 16 },
  YEM: { aggression: 40, diplomacy: 15, economicFocus: 15, stability: 15, unpredictability: 17 },
  MMR: { aggression: 45, diplomacy: 15, economicFocus: 25, stability: 20, unpredictability: 16 },
  UKR: { aggression: 40, diplomacy: 55, economicFocus: 40, stability: 35, unpredictability: 12 },
}

// ── Utility ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ── Derived Personality ───────────────────────────────────────────────────────
// Derives personality traits from CountryBaseData statistics for countries
// without a manual profile.

function derivePersonality(iso: string): CountryPersonality {
  const d = MODERN_COUNTRY_DATA[iso]
  if (!d) throw new Error(`Unknown country ISO: ${iso}`)

  const aggression = clamp(
    d.defenceSpendingPct * 15 + (1 - d.hdi) * 30,
    0, 100
  )

  const diplomacy = clamp(
    d.hdi * 80 + (d.urbanisationRate / 100) * 20,
    0, 100
  )

  const economicFocus = clamp(
    Math.min(d.gdpPerCapita / 1000, 60) + d.sectorServices * 0.4,
    0, 100
  )

  const stability = clamp(
    d.hdi * 60 + (100 - d.corruptionIndex) * 0.4,
    0, 100
  )

  const unpredictability = clamp(
    (100 - stability) * 0.15 + d.corruptionIndex * 0.05,
    0, 20
  )

  return { aggression, diplomacy, economicFocus, stability, unpredictability }
}

// ── Full Personality Map ──────────────────────────────────────────────────────
// Built at module load: manual profiles take priority, rest are derived.

export const COUNTRY_PERSONALITIES: Record<string, CountryPersonality> = (() => {
  const result: Record<string, CountryPersonality> = {}
  for (const iso of Object.keys(MODERN_COUNTRY_DATA)) {
    result[iso] = MANUAL_PERSONALITIES[iso] ?? derivePersonality(iso)
  }
  return result
})()
