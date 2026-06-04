'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, MessageCircle, Paperclip, X, FileText } from 'lucide-react'
import type { Message } from '@/lib/types'

interface GroupChatProps {
  groupId: string
  groupName?: string
  sender: 'group' | 'admin'
  onUnread?: (groupId: string, content: string) => void
  hideHeader?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function GroupChat({ groupId, groupName, sender, onUnread, hideHeader = false }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mediaPreview, setMediaPreview] = useState<{ file: File; localUrl: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoadedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
            if (
              sender === 'group' &&
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification("Messaggio dall'organizzatore", {
                body: msg.content || 'Ha inviato un file',
                icon: '/favicon.ico',
              })
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      alert('File troppo grande (max 10 MB)')
      return
    }
    const localUrl = URL.createObjectURL(file)
    setMediaPreview({ file, localUrl })
    // reset input so the same file can be re-selected
    e.target.value = ''
  }

  function cancelMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.localUrl)
    setMediaPreview(null)
  }

  async function sendMessage() {
    const text = input.trim()
    if ((!text && !mediaPreview) || sending || uploading) return

    let mediaUrl: string | null = null

    if (mediaPreview) {
      setUploading(true)
      const ext = mediaPreview.file.name.split('.').pop() ?? 'bin'
      const path = `${groupId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('chat-media')
        .upload(path, mediaPreview.file, { upsert: false })

      if (error) {
        alert('Errore upload: ' + error.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      URL.revokeObjectURL(mediaPreview.localUrl)
      setMediaPreview(null)
      setUploading(false)
    }

    setSending(true)
    setInput('')
    await supabase.from('messages').insert({
      group_id: groupId,
      content: text,
      media_url: mediaUrl,
      sender,
    })
    // Notifica push all'admin quando è il gruppo a scrivere
    if (sender === 'group') {
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat_message',
          groupId,
          groupName: groupName ?? 'Gruppo',
          preview: text || (mediaUrl ? '📎 File allegato' : ''),
        }),
      }).catch(() => {/* non bloccante */})
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const isGroup = sender === 'group'
  const isBusy = sending || uploading

  const containerStyle = isGroup
    ? { background: 'transparent', border: 'none', borderRadius: 0 }
    : { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }
  const inputAreaStyle = isGroup
    ? { background: 'rgba(109,171,60,0.05)', borderTop: '1px solid rgba(109,171,60,0.15)' }
    : { background: '#fff', borderTop: '1px solid #e2e8f0' }
  const inputStyle = isGroup
    ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(109,171,60,0.2)', color: '#f1f5f9', borderRadius: '0.75rem' }
    : { background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '0.625rem' }

  function renderMedia(url: string, isMine: boolean) {
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url)
    const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="immagine"
            className="rounded-xl max-w-full"
            style={{ maxHeight: '200px', maxWidth: '220px', display: 'block' }}
          />
        </a>
      )
    }
    if (isVideo) {
      return (
        <video
          src={url}
          controls
          className="rounded-xl max-w-full"
          style={{ maxHeight: '200px', maxWidth: '220px' }}
        />
      )
    }
    // Generic file
    const filename = url.split('/').pop() ?? 'file'
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs underline"
        style={isMine ? { color: 'rgba(255,255,255,0.9)' } : { color: '#3b82f6' }}
      >
        <FileText size={14} />
        {filename}
      </a>
    )
  }

  return (
    <div style={containerStyle} className="flex flex-col overflow-hidden">
      {/* Header */}
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
                  className="rounded-2xl text-sm max-w-[85%] break-words overflow-hidden"
                  style={
                    msg.media_url && !msg.content
                      ? { background: 'transparent', padding: 0 }
                      : isMine
                        ? isGroup
                          ? { background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff', padding: '6px 12px' }
                          : { background: '#3b82f6', color: '#fff', padding: '6px 12px' }
                        : isGroup
                          ? { background: 'rgba(148,163,184,0.15)', color: '#e2e8f0', padding: '6px 12px' }
                          : { background: '#e2e8f0', color: '#1e293b', padding: '6px 12px' }
                  }
                >
                  {msg.media_url && renderMedia(msg.media_url, isMine)}
                  {msg.content && (
                    <span style={
                      msg.media_url
                        ? isMine
                          ? isGroup ? { display: 'block', marginTop: '4px', padding: '4px 8px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', borderRadius: '12px' }
                            : { display: 'block', marginTop: '4px', padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: '12px' }
                          : isGroup ? { display: 'block', marginTop: '4px', padding: '4px 8px', background: 'rgba(148,163,184,0.15)', color: '#e2e8f0', borderRadius: '12px' }
                            : { display: 'block', marginTop: '4px', padding: '4px 8px', background: '#e2e8f0', color: '#1e293b', borderRadius: '12px' }
                        : undefined
                    }>{msg.content}</span>
                  )}
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

      {/* Preview media selezionato */}
      {mediaPreview && (
        <div
          className="mx-3 mb-1 flex items-center gap-2 px-2 py-1.5 rounded-xl"
          style={isGroup ? { background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' } : { background: '#f1f5f9', border: '1px solid #e2e8f0' }}
        >
          {mediaPreview.file.type.startsWith('image/') ? (
            <img src={mediaPreview.localUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isGroup ? 'rgba(148,163,184,0.15)' : '#e2e8f0' }}>
              <FileText size={18} className={isGroup ? 'text-slate-400' : 'text-gray-400'} />
            </div>
          )}
          <span className={`text-xs flex-1 truncate ${isGroup ? 'text-slate-300' : 'text-gray-600'}`}>{mediaPreview.file.name}</span>
          <button onClick={cancelMedia} className={`p-0.5 rounded-md ${isGroup ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-colors`}>
            <X size={13} className={isGroup ? 'text-slate-400' : 'text-gray-400'} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-1.5 px-3 py-2" style={inputAreaStyle}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40"
          style={isGroup ? { color: 'rgba(148,163,184,0.6)' } : { color: '#94a3b8' }}
          title="Allega file"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setUnreadCount(0)}
          placeholder={mediaPreview ? 'Aggiungi una didascalia...' : 'Scrivi un messaggio...'}
          className="flex-1 text-sm px-3 py-1.5 outline-none"
          style={inputStyle}
        />
        <button
          onClick={sendMessage}
          disabled={(!input.trim() && !mediaPreview) || isBusy}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40"
          style={isGroup ? { background: 'linear-gradient(135deg, #6DAB3C, #206134)', color: '#fff', borderRadius: '8px', padding: '6px' } : { background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '6px' }}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
