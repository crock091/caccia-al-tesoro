'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import type { Message } from '@/lib/types'

interface GroupChatProps {
  groupId: string
  sender: 'group' | 'admin'
  onUnread?: (groupId: string, content: string) => void
  hideHeader?: boolean
}

export default function GroupChat({ groupId, sender, onUnread, hideHeader = false }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoadedRef = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    if (sender === 'group' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') Notification.requestPermission()
    }

    isLoadedRef.current = false
    setUnreadCount(0)

    supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoading(false)
        isLoadedRef.current = true
      })

    const channel = supabase
      .channel(`chat-${groupId}-${sender}-v2`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          if (msg.sender !== sender && isLoadedRef.current) {
            setUnreadCount(prev => prev + 1)
            onUnread?.(groupId, msg.content)
            if (sender === 'group' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification("Messaggio dall'organizzatore ðŸ’¬", { body: msg.content, icon: '/favicon.ico' })
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    await supabase.from('messages').insert({ group_id: groupId, content: text, sender })
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const isGroup = sender === 'group'

  const containerStyle = isGroup
    ? { background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '1rem' }
    : { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }
  const inputAreaStyle = isGroup
    ? { background: 'rgba(148,163,184,0.08)', borderTop: '1px solid rgba(148,163,184,0.12)' }
    : { background: '#fff', borderTop: '1px solid #e2e8f0' }
  const inputStyle = isGroup
    ? { background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#f1f5f9', borderRadius: '0.625rem' }
    : { background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '0.625rem' }

  return (
    <div style={containerStyle} className="flex flex-col overflow-hidden">
      {/* Header con badge — nascosto se usato dentro un widget */}
      {!hideHeader && (
        <div
          className={`flex items-center justify-between px-3 py-2 text-xs font-semibold ${isGroup ? 'text-slate-400' : 'text-gray-500'}`}
          style={isGroup ? { borderBottom: '1px solid rgba(148,163,184,0.1)' } : { borderBottom: '1px solid #e2e8f0' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={13} />
            Chat con {isGroup ? "l'organizzatore" : 'il gruppo'}
          </div>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold" style={{ background: '#ef4444' }}>
              {unreadCount}
            </span>
          )}
        </div>
      )}

      {/* Messaggi */}
      <div className="flex flex-col gap-2 px-3 py-3 overflow-y-auto" style={{ maxHeight: '260px', minHeight: '80px' }}>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className={`animate-spin ${isGroup ? 'text-slate-500' : 'text-gray-300'}`} />
          </div>
        ) : messages.length === 0 ? (
          <p className={`text-xs text-center py-3 ${isGroup ? 'text-slate-500' : 'text-gray-400'}`}>Nessun messaggio ancora</p>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender === sender
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className="px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words"
                  style={isMine
                    ? isGroup ? { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff' } : { background: '#3b82f6', color: '#fff' }
                    : isGroup ? { background: 'rgba(148,163,184,0.15)', color: '#e2e8f0' } : { background: '#e2e8f0', color: '#1e293b' }
                  }
                >
                  {msg.content}
                </div>
                <span className={`text-[10px] ${isGroup ? 'text-slate-600' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2" style={inputAreaStyle}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setUnreadCount(0)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 text-sm px-3 py-1.5 outline-none"
          style={inputStyle}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40"
          style={isGroup ? { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff' } : { background: '#3b82f6', color: '#fff' }}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
