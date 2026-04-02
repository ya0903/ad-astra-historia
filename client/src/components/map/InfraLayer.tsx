import { useEffect, useRef } from 'react'
import type { GeoJSON } from 'geojson'
import maplibregl from 'maplibre-gl'
import { useMap } from './MapContext'
import { useGameStore } from '../../stores'
import { INFRA_COLOURS, HIDDEN_INFRA_TYPES } from '@ad-astra/shared/infraColours'

const RAIL_TYPES = new Set(['rail_line', 'high_speed_rail'])

export default function InfraLayer() {
  const map = useMap()
  const gameState = useGameStore(s => s.state)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!map || !gameState) return

    const playerCountryId = gameState.playerCountryId

    // ── Completed infrastructure ──────────────────────────────────────────
    const visible = gameState.infrastructureMap.filter(item => {
      if ((HIDDEN_INFRA_TYPES as readonly string[]).includes(item.type)) {
        return item.countryId === playerCountryId
      }
      return true
    })

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visible.map(item => ({
        type: 'Feature',
        id: item.id,
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
        properties: {
          id: item.id,
          type: item.type,
          name: item.name,
          level: item.level,
          countryId: item.countryId,
          colour: INFRA_COLOURS[item.type] ?? '#94a3b8',
        },
      })),
    }

    // ── Under-construction items (point infra only, must have coords) ─────
    const underConstruction = (gameState.buildQueue ?? []).filter(
      b => !RAIL_TYPES.has(b.type) && b.lat != null && b.lng != null
    )

    const constructionGeojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: underConstruction.map(b => ({
        type: 'Feature',
        id: b.id,
        geometry: { type: 'Point', coordinates: [b.lng!, b.lat!] },
        properties: {
          id: b.id,
          type: b.type,
          name: b.name,
          colour: INFRA_COLOURS[b.type as keyof typeof INFRA_COLOURS] ?? '#94a3b8',
          pct: Math.round((1 - b.weeksRemaining / b.totalWeeks) * 100),
          weeksLeft: b.weeksRemaining,
        },
      })),
    }

    // ── Update existing sources ───────────────────────────────────────────
    if (map.getSource('infrastructure')) {
      (map.getSource('infrastructure') as maplibregl.GeoJSONSource).setData(geojson);
      (map.getSource('infra-construction') as maplibregl.GeoJSONSource)?.setData(constructionGeojson)
      return
    }

    // ── First render: add sources + layers ───────────────────────────────

    // Completed infra
    map.addSource('infrastructure', { type: 'geojson', data: geojson })
    map.addLayer({
      id: 'infra-glow',
      type: 'circle',
      source: 'infrastructure',
      minzoom: 4,
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'colour'],
        'circle-opacity': 0.2,
        'circle-blur': 1,
      },
    })
    map.addLayer({
      id: 'infra-dots',
      type: 'circle',
      source: 'infrastructure',
      minzoom: 4,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 6],
        'circle-color': ['get', 'colour'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.4,
      },
    })

    // Under-construction infra — dashed outline style
    map.addSource('infra-construction', { type: 'geojson', data: constructionGeojson })
    map.addLayer({
      id: 'infra-construction-ring',
      type: 'circle',
      source: 'infra-construction',
      minzoom: 4,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 7, 8, 12],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 2,
        'circle-stroke-color': ['get', 'colour'],
        'circle-stroke-opacity': 0.7,
      },
    })
    map.addLayer({
      id: 'infra-construction-dot',
      type: 'circle',
      source: 'infra-construction',
      minzoom: 4,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 5],
        'circle-color': ['get', 'colour'],
        'circle-opacity': 0.5,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#facc15',
        'circle-stroke-opacity': 0.8,
      },
    })

    // ── Hover popups ──────────────────────────────────────────────────────
    const showPopup = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }, isConstruction: boolean) => {
      if (!e.features?.length) return
      map.getCanvas().style.cursor = 'pointer'
      const props = e.features[0].properties as { name: string; type: string; level?: number; colour?: string; pct?: number; weeksLeft?: number }
      const colour = props.colour ?? '#94a3b8'
      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
      }
      const body = isConstruction
        ? `<div style="color:#64748b;font-size:11px;margin-top:2px;text-transform:capitalize">${props.type.replace(/_/g, ' ')} · Under construction</div>
           <div style="color:#facc15;font-size:11px">${props.pct ?? 0}% complete · ${props.weeksLeft ?? '?'}w left</div>`
        : `<div style="color:#64748b;font-size:11px;margin-top:2px;text-transform:capitalize">${props.type.replace(/_/g, ' ')} · Level ${props.level ?? 1}</div>`
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(`<div style="background:#0d1b31;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px 12px;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;min-width:140px;box-shadow:0 4px 20px rgba(0,0,0,0.6)">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${colour};flex-shrink:0;display:inline-block"></span>
            <span style="color:#fff;font-weight:600;font-size:13px">${props.name}</span>
          </div>${body}</div>`)
        .addTo(map)
    }

    const hidePopup = () => {
      map.getCanvas().style.cursor = ''
      popupRef.current?.remove()
      popupRef.current = null
    }

    map.on('mousemove', 'infra-dots', e => showPopup(e, false))
    map.on('mouseleave', 'infra-dots', hidePopup)
    map.on('mousemove', 'infra-construction-dot', e => showPopup(e, true))
    map.on('mouseleave', 'infra-construction-dot', hidePopup)

    return () => {
      map.off('mousemove', 'infra-dots', e => showPopup(e, false))
      map.off('mouseleave', 'infra-dots', hidePopup)
      map.off('mousemove', 'infra-construction-dot', e => showPopup(e, true))
      map.off('mouseleave', 'infra-construction-dot', hidePopup)
      popupRef.current?.remove()
      for (const id of ['infra-dots', 'infra-glow', 'infra-construction-dot', 'infra-construction-ring']) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      for (const id of ['infrastructure', 'infra-construction']) {
        if (map.getSource(id)) map.removeSource(id)
      }
    }
  }, [map, gameState])

  return null
}
