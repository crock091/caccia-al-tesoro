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
  if (!initVapid()) return

  const supabase = createAnonClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')

  if (!subs?.length) return

  await Promise.all(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload)
      ).catch(err => {
        // Rimuovi subscription scaduta/non valida
        if (err.statusCode === 410 || err.statusCode === 404) {
          supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      })
    )
  )
}
