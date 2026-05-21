'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, MapPin, Camera, QrCode, X, Download, Pencil, Check } from 'lucide-react'
import type { Checkpoint } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'

/** Converte decimale o DMS (44°41'41.3"N) in numero decimale */
function parseCoord(value: string): number | null {
  if (!value.trim()) return null
  // Formato decimale
  const decimal = parseFloat(value)
  if (!isNaN(decimal) && !/[°'"]/.test(value)) return decimal
  // Formato DMS: 44°41'41.3"N oppure 44 41 41.3 N
  const m = value.trim().match(/^([\d.]+)[°\s]+(\d+)['\'\s]+([\d.]+)["\"\s]*([NSEWnsew])?$/)
  if (m) {
    const result = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600
    return (m[4]?.toUpperCase() === 'S' || m[4]?.toUpperCase() === 'W') ? -result : result
  }
  return null
}

interface EditForm {
  title: string
  clue: string
  unlock_message: string
  requires_media: boolean
  has_survey: boolean
  latitude: string
  longitude: string
  geo_radius_meters: string
}

export default function CheckpointList({ checkpoints, eventId }: { checkpoints: Checkpoint[]; eventId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [qrCheckpoint, setQrCheckpoint] = useState<Checkpoint | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa tappa?')) return
    setDeletingId(id)
    await supabase.from('checkpoints').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  function startEdit(cp: Checkpoint) {
    setEditingId(cp.id)
    setEditForm({
      title: cp.title,
      clue: cp.clue,
      unlock_message: cp.unlock_message ?? '',
      requires_media: cp.requires_media,
      has_survey: cp.has_survey ?? false,
      latitude: cp.latitude?.toString() ?? '',
      longitude: cp.longitude?.toString() ?? '',
      geo_radius_meters: cp.geo_radius_meters?.toString() ?? '200',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function handleSave(cp: Checkpoint) {
    if (!editForm) return
    setSavingId(cp.id)
    const { error } = await supabase.from('checkpoints').update({
      title: editForm.title,
      clue: editForm.clue,
      unlock_message: editForm.unlock_message || null,
      requires_media: editForm.requires_media,
      has_survey: editForm.has_survey,
      latitude: editForm.latitude ? parseCoord(editForm.latitude) : null,
      longitude: editForm.longitude ? parseCoord(editForm.longitude) : null,
      geo_radius_meters: parseInt(editForm.geo_radius_meters) || 200,
    }).eq('id', cp.id)
    setSavingId(null)
    if (error) {
      alert('Errore salvataggio: ' + error.message)
      return
    }
    setEditingId(null)
    setEditForm(null)
    router.refresh()
  }

  function downloadQR(cp: Checkpoint) {
    const svg = document.getElementById(`qr-svg-${cp.id}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-tappa-${cp.order_index + 1}-${cp.title}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scanUrl = (cp: Checkpoint) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/scan/${cp.qr_token}`
      : `/scan/${cp.qr_token}`

  if (!checkpoints.length) {
    return <p className="text-sm text-gray-400 text-center py-8">Nessuna tappa ancora. Aggiungine una!</p>
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {checkpoints.map((cp, i) => (
          <li key={cp.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-amber-200 transition-colors">
            {/* Header tappa */}
            <div className="flex items-start gap-3 p-3">
              <div className="flex-shrink-0 w-7 h-7 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{cp.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cp.clue}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {cp.latitude && cp.longitude && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <MapPin size={11} />GPS
                    </span>
                  )}
                  {cp.requires_media && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <Camera size={11} />Media richiesto
                    </span>
                  )}
                  {cp.has_survey && (
                    <span className="text-xs text-violet-600 font-medium">⭐ Sondaggio</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => editingId === cp.id ? cancelEdit() : startEdit(cp)}
                  title="Modifica tappa"
                  className={`transition-colors ${editingId === cp.id ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setQrCheckpoint(cp)}
                  title="Mostra QR"
                  className="text-gray-300 hover:text-amber-500 transition-colors"
                >
                  <QrCode size={15} />
                </button>
                <button
                  onClick={() => handleDelete(cp.id)}
                  disabled={deletingId === cp.id}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {deletingId === cp.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </div>

            {/* Form modifica inline */}
            {editingId === cp.id && editForm && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-4 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Indizio *</label>
                  <textarea
                    required
                    value={editForm.clue}
                    onChange={e => setEditForm(f => f ? { ...f, clue: e.target.value } : f)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio di sblocco</label>
                  <textarea
                    value={editForm.unlock_message}
                    onChange={e => setEditForm(f => f ? { ...f, unlock_message: e.target.value } : f)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    placeholder="Mostrato ai gruppi quando sbloccano questa tappa"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Latitudine GPS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editForm.latitude}
                      onChange={e => setEditForm(f => f ? { ...f, latitude: e.target.value } : f)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder={"44.6948 o 44\u00b041'41.3\"N"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Longitudine GPS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editForm.longitude}
                      onChange={e => setEditForm(f => f ? { ...f, longitude: e.target.value } : f)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder={"8.0343 o 8\u00b002'03.4\"E"}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-requires-media-${cp.id}`}
                    checked={editForm.requires_media}
                    onChange={e => setEditForm(f => f ? { ...f, requires_media: e.target.checked } : f)}
                    className="accent-amber-600"
                  />
                  <label htmlFor={`edit-requires-media-${cp.id}`} className="text-sm text-gray-700">
                    Richiede upload foto/video per sbloccare
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-has-survey-${cp.id}`}
                    checked={editForm.has_survey}
                    onChange={e => setEditForm(f => f ? { ...f, has_survey: e.target.checked } : f)}
                    className="accent-violet-600"
                  />
                  <label htmlFor={`edit-has-survey-${cp.id}`} className="text-sm text-gray-700">
                    <span className="font-medium text-violet-700">Valutazione caccia al tesoro</span>
                    <span className="text-gray-400 text-xs ml-1">(sondaggio di fine giornata)</span>
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(cp)}
                    disabled={savingId === cp.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    {savingId === cp.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Salva
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* Modale QR */}
      {qrCheckpoint && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setQrCheckpoint(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-bold text-gray-900">Tappa {qrCheckpoint.order_index + 1} — {qrCheckpoint.title}</h3>
              <button onClick={() => setQrCheckpoint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <QRCodeSVG
              id={`qr-svg-${qrCheckpoint.id}`}
              value={scanUrl(qrCheckpoint)}
              size={220}
              level="M"
              includeMargin
            />
            <p className="text-xs text-gray-400 text-center break-all">{scanUrl(qrCheckpoint)}</p>
            <p className="text-xs text-gray-500 text-center">
              {qrCheckpoint.requires_media
                ? 'Scannerizzare porta all\'upload della prova.'
                : qrCheckpoint.has_survey
                ? 'Scannerizzare apre il sondaggio di valutazione.'
                : 'Scannerizzare sblocca automaticamente la tappa successiva.'}
            </p>
            <button
              onClick={() => downloadQR(qrCheckpoint)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Download size={15} />
              Scarica SVG
            </button>
          </div>
        </div>
      )}
    </>
  )
}

