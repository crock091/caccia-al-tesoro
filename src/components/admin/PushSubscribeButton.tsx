'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'

type PushStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'unsubscribed')
    } catch {
      setStatus('unsupported')
    }
  }

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subJson),
      })
      setStatus('subscribed')
    } catch {
      // Permission negata o errore
      if (Notification.permission === 'denied') setStatus('denied')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setStatus('unsubscribed')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null
  if (status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <span title="Notifiche bloccate nelle impostazioni del browser" className="text-xs text-gray-300 flex items-center gap-1 cursor-default select-none">
        <BellOff size={14} />
        <span className="hidden sm:inline">Notifiche bloccate</span>
      </span>
    )
  }

  if (status === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        title="Disattiva notifiche push"
        className="flex items-center gap-1.5 text-xs text-green-600 hover:text-gray-500 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
        <span className="hidden sm:inline">Notifiche attive</span>
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy}
      title="Attiva notifiche push"
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
      <span className="hidden sm:inline">Notifiche</span>
    </button>
  )
}
