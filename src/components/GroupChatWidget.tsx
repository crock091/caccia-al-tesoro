'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import GroupChat from '@/components/GroupChat'

interface GroupChatWidgetProps {
  groupId: string
}

export default function GroupChatWidget({ groupId }: GroupChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  function openChat() {
    setOpen(true)
    setUnreadCount(0)
  }

  function closeChat() {
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={open ? closeChat : openChat}
        aria-label="Chat con l'organizzatore"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          boxShadow: '0 8px 30px rgba(234,88,12,0.45)',
        }}
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <>
            <MessageCircle size={24} className="text-white" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-40 flex flex-col"
          style={{
            bottom: '5.5rem',
            right: '1.5rem',
            width: 'min(340px, calc(100vw - 2rem))',
            height: 'min(480px, calc(100vh - 8rem))',
            background: 'rgba(15,23,42,0.97)',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <MessageCircle size={15} className="text-amber-400" />
              <span className="text-sm font-semibold text-slate-200">Chat con l&apos;organizzatore</span>
            </div>
            <button onClick={closeChat} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X size={15} className="text-slate-400" />
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <GroupChat
              groupId={groupId}
              sender="group"
              hideHeader
              onUnread={(_gid, _content) => {
                if (!open) setUnreadCount(prev => prev + 1)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
