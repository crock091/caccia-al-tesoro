import { NextResponse } from 'next/server'
import { sendPushToGroup } from '@/lib/push'

// POST /api/push/group-notify — invia notifica push a un gruppo specifico
export async function POST(req: Request) {
  const body = await req.json()
  const { type, groupId, preview, finished } = body as {
    type: 'admin_message' | 'unlocked'
    groupId: string
    preview?: string
    finished?: boolean
  }

  if (!groupId || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (type === 'admin_message') {
    await sendPushToGroup(groupId, {
      title: '💬 Messaggio dall\'organizzatore',
      body: preview || 'Hai un nuovo messaggio',
      tag: `admin-msg-${groupId}`,
      url: `/game/${groupId}`,
    })
  } else if (type === 'unlocked') {
    await sendPushToGroup(groupId, {
      title: finished ? '🎉 Hai completato la caccia!' : '✅ Tappa sbloccata!',
      body: finished
        ? 'Complimenti! Avete completato tutte le tappe!'
        : 'L\'organizzatore vi ha sbloccato la tappa successiva.',
      tag: `unlocked-${groupId}`,
      url: `/game/${groupId}`,
    })
  }

  return NextResponse.json({ ok: true })
}
