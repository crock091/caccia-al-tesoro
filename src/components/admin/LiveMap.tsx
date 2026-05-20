'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { GroupPosition, Group, Checkpoint } from '@/lib/types'

// Leaflet non supporta SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false })

interface LiveMapProps {
  events: { id: string; name: string }[]
}

interface GroupWithPosition extends Group {
  group_positions: GroupPosition | null
}

export default function LiveMap({ events }: LiveMapProps) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '')
  const [groups, setGroups] = useState<GroupWithPosition[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!selectedEventId) return
    loadData(selectedEventId, false)
    const interval = setInterval(() => loadData(selectedEventId, true), 60000)
    return () => clearInterval(interval)
  }, [selectedEventId])

  async function loadData(eventId: string, silent = false) {
    if (!silent) setLoading(true)
    const [{ data: g }, { data: cps }] = await Promise.all([
      supabase
        .from('groups')
        .select('*, group_positions(*)')
        .eq('event_id', eventId),
      supabase
        .from('checkpoints')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index'),
    ])
    setGroups((g as GroupWithPosition[]) ?? [])
    setCheckpoints(cps ?? [])
    setLoading(false)
  }

  // Auto-fit bounds after data loads
  useEffect(() => {
    if (!mounted || !mapRef.current) return
    const pts = checkpoints
      .filter(cp => cp.latitude != null && cp.longitude != null)
      .map(cp => [cp.latitude!, cp.longitude!] as [number, number])
    if (pts.length > 1) {
      mapRef.current.fitBounds(pts, { padding: [50, 50] })
    } else if (pts.length === 1) {
      mapRef.current.setView(pts[0], 15)
    }
  }, [checkpoints, mounted])

  const center: [number, number] = [44.6936, 8.0359] // Langhe/Roero

  // Calcola centro e zoom dai checkpoint con coordinate
  const cpsWithCoords = checkpoints.filter(cp => cp.latitude != null && cp.longitude != null)
  const mapCenter: [number, number] = cpsWithCoords.length > 0
    ? [
        cpsWithCoords.reduce((s, cp) => s + cp.latitude!, 0) / cpsWithCoords.length,
        cpsWithCoords.reduce((s, cp) => s + cp.longitude!, 0) / cpsWithCoords.length,
      ]
    : center
  const routePoints: [number, number][] = cpsWithCoords.map(cp => [cp.latitude!, cp.longitude!])

  return (
    <div>
      {events.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading || !mounted ? (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-2xl">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '70vh' }}>
          <MapContainer key={selectedEventId} ref={mapRef} center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Linea del percorso */}
            {routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                pathOptions={{ color: '#6366f1', weight: 2, opacity: 0.5, dashArray: '6 4' }}
              />
            )}

            {/* Marker tappe (indigo) */}
            {checkpoints.map((cp, i) => cp.latitude && cp.longitude ? (
              <CircleMarker
                key={cp.id}
                center={[cp.latitude, cp.longitude]}
                radius={14}
                pathOptions={{ fillColor: '#6366f1', color: 'white', weight: 2.5, fillOpacity: 1 }}
              >
                <Tooltip permanent direction="top" offset={[0, -16]} opacity={1}
                  className="leaflet-checkpoint-label"
                >
                  <span style={{ fontWeight: 700, fontSize: 11 }}>{i + 1}. {cp.title}</span>
                </Tooltip>
                <Popup><strong>Tappa {i + 1}: {cp.title}</strong>{cp.clue ? <><br /><em style={{fontSize:12}}>{cp.clue}</em></> : null}</Popup>
              </CircleMarker>
            ) : null)}

            {/* Marker gruppi (arancio) */}
            {groups.map(group => {
              const pos = group.group_positions
              if (!pos) return null
              return (
                <CircleMarker
                  key={group.id}
                  center={[pos.latitude, pos.longitude]}
                  radius={11}
                  pathOptions={{ fillColor: group.finished ? '#22c55e' : '#d97706', color: 'white', weight: 2, fillOpacity: 1 }}
                >
                  <Popup>
                    <strong>{group.name}</strong><br />
                    Tappa {group.current_checkpoint_index + 1}/{checkpoints.length}<br />
                    {group.finished ? '✓ Finito!' : ''}
                    <br />
                    <span style={{fontSize: '11px', color: '#9ca3af'}}>
                      Aggiornato: {new Date(pos.updated_at).toLocaleTimeString('it-IT')}
                    </span>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#6366f1] border-2 border-white shadow" />
          Tappe ({cpsWithCoords.length}/{checkpoints.length} con GPS)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#d97706] border-2 border-white shadow" />
          Gruppi in gioco
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow" />
          Gruppi finiti
        </span>
      </div>

      {/* Card gruppi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {groups.map(group => (
          <div key={group.id} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="font-medium text-sm text-gray-900">{group.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.finished ? '✓ Completato' : `Tappa ${group.current_checkpoint_index + 1}/${checkpoints.length}`}
            </p>
            {group.group_positions ? (
              <p className="text-xs text-green-600 mt-0.5">● GPS attivo</p>
            ) : (
              <p className="text-xs text-gray-300 mt-0.5">● Nessun segnale</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
