import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// POST /api/push/group-subscribe — salva la subscription di un gruppo (senza auth)
export async function POST(req: Request) {
  const supabase = createServiceClient()

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
