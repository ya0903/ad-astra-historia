import type { InfrastructureType } from './types.js'

export const INFRA_COLOURS: Record<InfrastructureType, string> = {
  research_centre:   '#818cf8',
  university:        '#a78bfa',
  intelligence_agency: '#c084fc',
  telecom_node:      '#38bdf8',
  city:              '#60a5fa',
  capital:           '#93c5fd',
  port:              '#34d399',
  airport:           '#2dd4bf',
  solar_farm:        '#facc15',
  wind_farm:         '#a3e635',
  hydro_dam:         '#22d3ee',
  fossil_fuel_plant: '#fb923c',
  nuclear_plant:     '#4ade80',
  military_base:     '#f87171',
  nuclear_silo:      '#f43f5e',
  defence_system:    '#e879f9',
  financial_institution: '#f59e0b',
  emergency_services: '#fb7185',
  industrial_zone:   '#fbbf24',
  desalination_plant: '#06b6d4',
  data_centre:       '#64748b',
  embassy:           '#86efac',
  stadium:           '#f97316',
  arts_centre:       '#d946ef',
  film_studio:       '#ec4899',
  rail_line:         '#94a3b8',
  high_speed_rail:   '#e2e8f0',
}

export const RAIL_COLOURS: Record<string, string> = {
  domestic_hsr:    '#fbbf24',
  cross_continent: '#e879f9',
  undersea_tunnel: '#e2e8f0',
}

export const LAND_USE_COLOURS: Record<string, string> = {
  forest:            'rgba(21,128,61,0.35)',
  deforested:        'rgba(120,80,30,0.35)',
  national_park:     'rgba(74,222,128,0.3)',
  nature_corridor:   'rgba(74,222,128,0.5)',
  desert_agriculture: 'rgba(180,210,80,0.3)',
  desertification:   'rgba(210,180,100,0.3)',
}

// Infrastructure types hidden from other countries
export const HIDDEN_INFRA_TYPES: InfrastructureType[] = [
  'nuclear_silo',
  'defence_system',
  'intelligence_agency',
]
