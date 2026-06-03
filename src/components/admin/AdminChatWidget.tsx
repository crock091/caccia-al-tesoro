'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, X, ChevronLeft } from 'lucide-react'
import GroupChat from '@/components/GroupChat'
import type { Group } from '@/lib/types'

interface EventRow { id: string; name: string }

export default function AdminChatWidget() {
  const [groups, setGroups] = useState<Group[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [open, setOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const selectedGroupIdRef = useRef<string | null>(null)
  const supabase = createClient()

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  useEffect(() => {
    supabase.from('groups').select('*').then(({ data }) => setGroups(data ?? []))
    supabase.from('events').select('id, name').then(({ data }) => setEvents(data ?? []))

    const channel = supabase
      .channel('admin-chat-widget-v1')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { group_id: string; sender: string }
          if (msg.sender !== 'group') return
          if (selectedGroupIdRef.current !== msg.group_id) {
            setUnreadCounts(prev => ({ ...prev, [msg.group_id]: (prev[msg.group_id] ?? 0) + 1 }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectGroup(id: string) {
    setSelectedGroupId(id)
    selectedGroupIdRef.current = id
    setUnreadCounts(prev => ({ ...prev, [id]: 0 }))
  }

  function backToList() {
    setSelectedGroupId(null)
    selectedGroupIdRef.current = null
  }

  function toggleOpen() {
    setOpen(v => !v)
    if (open) {
      setSelectedGroupId(null)
      selectedGroupIdRef.current = null
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggleOpen}
        aria-label="Chat gruppi"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6DAB3C, #206134)', boxShadow: '0 8px 30px rgba(109,171,60,0.4)' }}
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <>
            <MessageCircle size={24} className="text-white" />
            {totalUnread > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}
              >
                {totalUnread > 99 ? '99+' : totalUnread}
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
            height: 'min(500px, calc(100vh - 8rem))',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #f1f5f9' }}
          >
            {selectedGroup ? (
              <button
                onClick={backToList}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={16} />
                {selectedGroup.name}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-green-600" />
                <span className="text-sm font-semibold text-gray-800">Chat gruppi</span>
                {totalUnread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: '#ef4444' }}>
                    {totalUnread}
                  </span>
                )}
              </div>
            )}
            <button onClick={toggleOpen} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={15} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          {selectedGroup ? (
            <div className="flex-1 overflow-hidden">
              <GroupChat
                groupId={selectedGroup.id}
                sender="admin"
                hideHeader
                onUnread={() => {
                  setUnreadCounts(prev => ({ ...prev, [selectedGroup.id]: 0 }))
                }}
              />
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <li className="py-16 text-center text-sm text-gray-400">Nessun gruppo</li>
              ) : (
                groups.map(group => {
                  const unread = unreadCounts[group.id] ?? 0
                  const event = events.find(e => e.id === group.event_id)
                  return (
                    <li key={group.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <button
                        onClick={() => selectGroup(group.id)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                          {event && <p className="text-xs text-gray-400 truncate">{event.name}</p>}
                        </div>
                        {unread > 0 && (
                          <span
                            className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                            style={{ background: '#ef4444' }}
                          >
                            {unread}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
