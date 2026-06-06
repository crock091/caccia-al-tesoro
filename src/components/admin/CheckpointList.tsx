'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, MapPin, Camera, QrCode, X, Download, Pencil, Check, RefreshCw, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react'
import type { Checkpoint } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'
import { v4 as uuidv4 } from 'uuid'
import { useRef } from 'react'

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
  requires_qr: boolean
  requires_media: boolean
  has_survey: boolean
  latitude: string
  longitude: string
  geo_radius_meters: string
  clue_image_url: string
}

export default function CheckpointList({ checkpoints: initialCheckpoints, eventId }: { checkpoints: Checkpoint[]; eventId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [checkpoints, setCheckpoints] = useState(initialCheckpoints)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const editImageRef = useRef<HTMLInputElement>(null)
  const [qrCheckpoint, setQrCheckpoint] = useState<Checkpoint | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => setCheckpoints(initialCheckpoints), [initialCheckpoints])

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa tappa?')) return
    setDeletingId(id)
    await supabase.from('checkpoints').delete().eq('id', id)
    router.refresh()
    setDeletingId(null)
  }

  function startEdit(cp: Checkpoint) {
    setEditingId(cp.id)
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditForm({
      title: cp.title,
      clue: cp.clue,
      unlock_message: cp.unlock_message ?? '',
      requires_qr: cp.requires_qr ?? true,
      requires_media: cp.requires_media,
      has_survey: cp.has_survey ?? false,
      latitude: cp.latitude?.toString() ?? '',
      longitude: cp.longitude?.toString() ?? '',
      geo_radius_meters: cp.geo_radius_meters?.toString() ?? '200',
      clue_image_url: cp.clue_image_url ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
    setEditImageFile(null)
    setEditImagePreview(null)
  }

  async function handleSave(cp: Checkpoint) {
    if (!editForm) return
    setSavingId(cp.id)

    let clue_image_url: string | null = editForm.clue_image_url || null
    if (editImageFile) {
      const ext = editImageFile.name.split('.').pop()
      const path = `checkpoints/${cp.id}/clue.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, editImageFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
        clue_image_url = publicUrl
      }
    }

    const { error } = await supabase.from('checkpoints').update({
      title: editForm.title,
      clue: editForm.clue,
      clue_image_url,
      unlock_message: editForm.unlock_message || null,
      requires_qr: editForm.requires_qr,
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
    setEditImageFile(null)
    setEditImagePreview(null)
    router.refresh()
  }

  async function handleRegenerateQr(cp: Checkpoint) {
    if (!confirm('Rigenerare il QR? I codici QR stampati precedentemente non funzioneranno più.')) return
    setRegeneratingId(cp.id)
    const newToken = uuidv4()
    const { error } = await supabase.from('checkpoints').update({ qr_token: newToken }).eq('id', cp.id)
    if (!error) {
      const updated = { ...cp, qr_token: newToken }
      setCheckpoints(prev => prev.map(c => c.id === cp.id ? updated : c))
      setQrCheckpoint(updated)
    }
    setRegeneratingId(null)
  }

  async function moveCheckpoint(cp: Checkpoint, dir: 'up' | 'down') {
    const idx = checkpoints.findIndex(c => c.id === cp.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= checkpoints.length) return
    setMovingId(cp.id)

    // Riordina l'array localmente
    const reordered = [...checkpoints]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(swapIdx, 0, moved)

    // Riassegna order_index sequenziali (0, 1, 2...) per evitare conflitti UNIQUE
    const withNewIndices = reordered.map((c, i) => ({ ...c, order_index: i }))

    // Aggiorna ogni checkpoint che ha cambiato posizione (sequenziale per evitare conflitti)
    for (const c of withNewIndices) {
      const original = checkpoints.find(o => o.id === c.id)
      if (original && original.order_index !== c.order_index) {
        await supabase.from('checkpoints').update({ order_index: c.order_index }).eq('id', c.id)
      }
    }

    setCheckpoints(withNewIndices)
    setMovingId(null)
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
          <li key={cp.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-green-300 transition-colors">
            {/* Header tappa */}
            <div className="flex items-start gap-3 p-3">
              <div className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{cp.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cp.clue}</p>
                {cp.clue_image_url && (
                  <div className="mt-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cp.clue_image_url} alt="Foto luogo" className="h-12 rounded-lg object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {cp.latitude && cp.longitude && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <MapPin size={11} />GPS
                    </span>
                  )}
                  {!(cp.requires_qr ?? true) && (
                    <span className="text-xs text-cyan-600 font-medium">No QR</span>
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
                  onClick={() => moveCheckpoint(cp, 'up')}
                  disabled={i === 0 || movingId === cp.id}
                  title="Sposta su"
                  className="text-gray-300 hover:text-green-600 transition-colors disabled:opacity-20"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  onClick={() => moveCheckpoint(cp, 'down')}
                  disabled={i === checkpoints.length - 1 || movingId === cp.id}
                  title="Sposta giù"
                  className="text-gray-300 hover:text-green-600 transition-colors disabled:opacity-20"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  onClick={() => editingId === cp.id ? cancelEdit() : startEdit(cp)}
                  title="Modifica tappa"
                  className={`transition-colors ${editingId === cp.id ? 'text-green-600' : 'text-gray-300 hover:text-green-600'}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setQrCheckpoint(cp)}
                  title="Mostra QR"
                  className="text-gray-300 hover:text-green-600 transition-colors"
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
              <div className="border-t border-green-200 bg-green-50 px-4 py-4 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titolo *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Indizio *</label>
                  <textarea
                    required
                    value={editForm.clue}
                    onChange={e => setEditForm(f => f ? { ...f, clue: e.target.value } : f)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Messaggio di sblocco</label>
                  <textarea
                    value={editForm.unlock_message}
                    onChange={e => setEditForm(f => f ? { ...f, unlock_message: e.target.value } : f)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                    placeholder="Mostrato ai gruppi quando sbloccano questa tappa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Foto del luogo <span className="text-gray-400 font-normal">(opzionale)</span></label>
                  {(editImagePreview || editForm.clue_image_url) && (
                    <div className="relative mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editImagePreview || editForm.clue_image_url || undefined}
                        alt="Foto luogo"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null)
                          setEditImagePreview(null)
                          setEditForm(f => f ? { ...f, clue_image_url: '' } : f)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <input
                    ref={editImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setEditImageFile(file)
                        setEditImagePreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => editImageRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <ImageIcon size={13} />
                    {editForm.clue_image_url ? 'Cambia foto' : 'Aggiungi foto del luogo'}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">Mostrata ai gruppi come riferimento visivo.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Latitudine GPS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editForm.latitude}
                      onChange={e => setEditForm(f => f ? { ...f, latitude: e.target.value } : f)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder={"8.0343 o 8\u00b002'03.4\"E"}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-requires-qr-${cp.id}`}
                    checked={editForm.requires_qr}
                    onChange={e => setEditForm(f => f ? { ...f, requires_qr: e.target.checked } : f)}
                    className="accent-cyan-600"
                  />
                  <label htmlFor={`edit-requires-qr-${cp.id}`} className="text-sm text-gray-700">
                    <span className="font-medium text-cyan-700">Richiede scansione QR</span>
                    <span className="text-gray-400 text-xs ml-1">(se disattivato, sblocco tramite approvazione media)</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-requires-media-${cp.id}`}
                    checked={editForm.requires_media}
                    onChange={e => setEditForm(f => f ? { ...f, requires_media: e.target.checked } : f)}
                    className="accent-green-700"
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
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
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
            <div className="flex gap-2 w-full">
              <button
                onClick={() => handleRegenerateQr(qrCheckpoint)}
                disabled={regeneratingId === qrCheckpoint.id}
                className="flex-1 flex items-center justify-center gap-2 border border-green-400 text-green-800 hover:bg-green-50 disabled:opacity-60 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              >
                {regeneratingId === qrCheckpoint.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Rigenera QR
              </button>
              <button
                onClick={() => downloadQR(qrCheckpoint)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              >
                <Download size={15} />
                Scarica SVG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

