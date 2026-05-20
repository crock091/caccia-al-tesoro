'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { GroupPosition, Group, Checkpoint } from '@/lib/types'

// Leaflet non supporta SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(m => m.Circle), { ssr: false })

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
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!selectedEventId) return
    loadData(selectedEventId)
  }, [selectedEventId])

  async function loadData(eventId: string) {
    setLoading(true)
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

    // Realtime posizioni
    supabase
      .channel(`positions-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_positions' }, () => {
        loadData(eventId)
      })
      .subscribe()
  }

  const center: [number, number] = [44.6936, 8.0359] // Langhe/Roero

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
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Marker tappe */}
            {checkpoints.map((cp, i) => cp.latitude && cp.longitude ? (
              <Marker key={cp.id} position={[cp.latitude, cp.longitude]}>
                <Popup>
                  <strong>Tappa {i + 1}: {cp.title}</strong>
                </Popup>
              </Marker>
            ) : null)}

            {/* Marker gruppi */}
            {groups.map(group => {
              const pos = group.group_positions
              if (!pos) return null
              return (
                <Marker key={group.id} position={[pos.latitude, pos.longitude]}>
                  <Popup>
                    <strong>{group.name}</strong><br />
                    Tappa {group.current_checkpoint_index + 1}/{checkpoints.length}<br />
                    {group.finished ? '✓ Finito!' : ''}
                    <br />
                    <span className="text-xs text-gray-400">
                      Aggiornato: {new Date(pos.updated_at).toLocaleTimeString('it-IT')}
                    </span>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      )}

      {/* Legenda gruppi */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
