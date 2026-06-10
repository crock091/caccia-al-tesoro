import LiveMap from '@/components/admin/LiveMap'
import { createClient } from '@/lib/supabase/server'

export default async function AdminMapPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('status', 'active')

  return (
    <div>
      <h1 className="display text-2xl font-bold text-white drop-shadow mb-4">Mappa live</h1>
      {!events?.length ? (
        <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <p>Nessun evento attivo al momento.</p>
        </div>
      ) : (
        <LiveMap events={events} />
      )}
    </div>
  )
}
