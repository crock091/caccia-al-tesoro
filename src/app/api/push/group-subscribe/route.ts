import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/push/group-subscribe — salva la subscription di un gruppo (senza auth)
export async function POST(req: Request) {
  const supabase = await createClient()

  const body = await req.json()
  const { groupId, endpoint, keys } = body as {
    groupId: string
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!groupId || !endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verifica che il gruppo esista
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Upsert della subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { group_id: groupId, user_id: null, endpoint, p256dh: keys.p256dh, auth_key: keys.auth },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('[push/group-subscribe]', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
