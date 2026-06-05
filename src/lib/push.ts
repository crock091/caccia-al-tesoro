import webpush from 'web-push'
import { createServerClient } from '@supabase/ssr'

// Usa il client con anon key (la tabella push_subscriptions ha RLS con SELECT pubblico)
function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

function initVapid() {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  return true
}

export interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!initVapid()) {
    console.error('[push] VAPID not configured')
    return
  }

  const supabase = createAnonClient()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .is('group_id', null)   // solo admin

  if (error) { console.error('[push] fetch subs error:', error.message); return }
  if (!subs?.length) { console.log('[push] no admin subscriptions found'); return }

  console.log(`[push] sending "${payload.title}" to ${subs.length} admin sub(s)`)

  await Promise.all(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
        { TTL: 60 }
      ).catch(err => {
        console.error('[push] send error', err.statusCode, err.body)
        if (err.statusCode === 410 || err.statusCode === 404) {
          supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      })
    )
  )
}

export async function sendPushToGroup(groupId: string, payload: PushPayload): Promise<void> {
  if (!initVapid()) return

  const supabase = createAnonClient()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('group_id', groupId)

  if (error) { console.error('[push] fetch group subs error:', error.message); return }
  if (!subs?.length) { console.log('[push] no group subscriptions for', groupId); return }

  console.log(`[push] sending "${payload.title}" to group ${groupId} (${subs.length} sub(s))`)

  await Promise.all(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
        { TTL: 60 }
      ).catch(err => {
        console.error('[push] group send error', err.statusCode, err.body)
        if (err.statusCode === 410 || err.statusCode === 404) {
          supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      })
    )
  )
}
