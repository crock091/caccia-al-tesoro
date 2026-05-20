'use client'

import { useState } from 'react'
import { Copy, Check, MapPin } from 'lucide-react'
import type { Group } from '@/lib/types'
import Link from 'next/link'

export default function GroupList({ groups, totalCheckpoints }: { groups: Group[]; totalCheckpoints: number }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copyLink(code: string) {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!groups.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nessun gruppo ancora. Aggiungine uno!</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map(group => {
        const progress = totalCheckpoints > 0
          ? Math.round((group.current_checkpoint_index / totalCheckpoints) * 100)
          : 0

        return (
          <li key={group.id} className="p-3 border border-gray-100 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-sm text-gray-900">{group.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Codice: {group.invite_code}</p>
              </div>
              <div className="flex items-center gap-1">
                {group.finished ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Finito</span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {group.current_checkpoint_index}/{totalCheckpoints}
                  </span>
                )}
                <button
                  onClick={() => copyLink(group.invite_code)}
                  className="ml-1 p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded"
                  title="Copia link invito"
                >
                  {copied === group.invite_code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            {/* Progress bar */}
            {totalCheckpoints > 0 && (
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${group.finished ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${group.finished ? 100 : progress}%` }}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
