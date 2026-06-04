import { createClient } from '@/lib/supabase/server'
import { sendPushToAdmins } from '@/lib/push'
import { NextResponse } from 'next/server'

type NotifyBody =
  | { type: 'new_submission'; groupId: string; groupName: string }
  | { type: 'qr_issue';       groupId: string; groupName: string }
  | { type: 'checkpoint';     groupId: string; groupName: string; checkpointTitle: string; finished: boolean }
  | { type: 'chat_message';   groupId: string; groupName: string; preview: string }

// POST /api/push/notify — inviato da game/scan page (client-side)
// Non richiede autenticazione ma valida che l'evento sia reale
export async function POST(req: Request) {
  const body = await req.json() as NotifyBody
  const supabase = await createClient()

  if (body.type === 'new_submission') {
    // Verifica che esista effettivamente una submission pending per questo gruppo
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('group_id', body.groupId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (!data) return NextResponse.json({ ok: false })

    await sendPushToAdmins({
      title: '📸 Media da approvare',
      body: `${body.groupName} ha caricato un file`,
      tag: 'submission-' + body.groupId,
      url: '/admin',
    })

  } else if (body.type === 'qr_issue') {
    // Verifica che il gruppo abbia davvero segnalato il problema QR
    const { data } = await supabase
      .from('groups')
      .select('id')
      .eq('id', body.groupId)
      .eq('qr_issue_reported', true)
      .maybeSingle()

    if (!data) return NextResponse.json({ ok: false })

    await sendPushToAdmins({
      title: '⚠️ QR non trovato',
      body: `${body.groupName} non riesce a trovare il QR`,
      tag: 'qr-issue-' + body.groupId,
      url: '/admin',
    })

  } else if (body.type === 'checkpoint') {
    // Tag unico per ogni evento (non raggruppare notifiche diverse)
    const tag = body.finished
      ? 'finished-' + body.groupId
      : 'checkpoint-' + body.groupId + '-' + Date.now()
    await sendPushToAdmins(
      body.finished
        ? {
            title: '🏆 Percorso completato!',
            body: `${body.groupName} ha terminato la caccia al tesoro`,
            tag,
            url: '/admin',
          }
        : {
            title: '🏁 Tappa sbloccata',
            body: `${body.groupName}: ${body.checkpointTitle}`,
            tag,
            url: '/admin',
          }
    )
  }

  } else if (body.type === 'chat_message') {
    await sendPushToAdmins({
      title: `💬 ${body.groupName}`,
      body: body.preview || 'Ha inviato un messaggio',
      tag: 'chat-' + body.groupId,
      url: '/admin',
    })
  }

  return NextResponse.json({ ok: true })
}
