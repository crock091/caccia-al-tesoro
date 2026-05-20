'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown, Check, X, GripVertical } from 'lucide-react'
import type { SurveyQuestion } from '@/lib/types'

interface Props {
  initialQuestions: SurveyQuestion[]
}

export default function SurveyQuestionsEditor({ initialQuestions }: Props) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function startEdit(q: SurveyQuestion) {
    setEditingId(q.id)
    setEditText(q.text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function saveEdit(q: SurveyQuestion) {
    if (!editText.trim()) return
    setSavingId(q.id)
    const { error } = await supabase
      .from('survey_questions')
      .update({ text: editText.trim() })
      .eq('id', q.id)
    setSavingId(null)
    if (error) { alert('Errore: ' + error.message); return }
    setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, text: editText.trim() } : x))
    setEditingId(null)
  }

  async function deleteQuestion(q: SurveyQuestion) {
    if (!confirm(`Eliminare la domanda "${q.text}"?`)) return
    setDeleting(q.id)
    const { error } = await supabase.from('survey_questions').delete().eq('id', q.id)
    setDeleting(null)
    if (error) { alert('Errore: ' + error.message); return }
    // Reorder remaining
    const remaining = questions.filter(x => x.id !== q.id)
    const reordered = remaining.map((x, i) => ({ ...x, order_index: i + 1 }))
    for (const r of reordered) {
      await supabase.from('survey_questions').update({ order_index: r.order_index }).eq('id', r.id)
    }
    setQuestions(reordered)
  }

  async function moveQuestion(q: SurveyQuestion, dir: 'up' | 'down') {
    const idx = questions.findIndex(x => x.id === q.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= questions.length) return

    const newOrder = [...questions]
    const [a, b] = [newOrder[idx], newOrder[swapIdx]]
    newOrder[idx] = { ...b, order_index: a.order_index }
    newOrder[swapIdx] = { ...a, order_index: b.order_index }

    setQuestions(newOrder)
    await Promise.all([
      supabase.from('survey_questions').update({ order_index: newOrder[idx].order_index }).eq('id', newOrder[idx].id),
      supabase.from('survey_questions').update({ order_index: newOrder[swapIdx].order_index }).eq('id', newOrder[swapIdx].id),
    ])
  }

  async function toggleActive(q: SurveyQuestion) {
    const { error } = await supabase
      .from('survey_questions')
      .update({ active: !q.active })
      .eq('id', q.id)
    if (error) { alert('Errore: ' + error.message); return }
    setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, active: !x.active } : x))
  }

  async function addQuestion() {
    if (!newText.trim()) return
    setSaving(true)
    const nextIndex = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 1
    const { data, error } = await supabase
      .from('survey_questions')
      .insert({ order_index: nextIndex, text: newText.trim(), active: true })
      .select()
      .single()
    setSaving(false)
    if (error) { alert('Errore: ' + error.message); return }
    setQuestions(qs => [...qs, data])
    setNewText('')
    setAddingNew(false)
  }

  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="flex flex-col gap-3">
      {/* Lista domande */}
      {sorted.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Nessuna domanda. Aggiungine una qui sotto.</p>
      )}
      {sorted.map((q, i) => (
        <div
          key={q.id}
          className={`bg-white rounded-2xl border ${q.active ? 'border-gray-200' : 'border-gray-100 opacity-60'} shadow-sm p-4 flex gap-3 items-start`}
        >
          {/* Numero */}
          <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {i + 1}
          </span>

          {/* Contenuto */}
          <div className="flex-1 min-w-0">
            {editingId === q.id ? (
              <div className="flex gap-2 items-start">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={2}
                  className="flex-1 border border-violet-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  autoFocus
                />
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => saveEdit(q)}
                    disabled={savingId === q.id}
                    className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${q.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{q.text}</p>
            )}
          </div>

          {/* Azioni */}
          {editingId !== q.id && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => toggleActive(q)}
                title={q.active ? 'Disattiva' : 'Attiva'}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${q.active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {q.active ? 'Attiva' : 'Off'}
              </button>
              <button onClick={() => moveQuestion(q, 'up')} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-colors">
                <ChevronUp size={15} />
              </button>
              <button onClick={() => moveQuestion(q, 'down')} disabled={i === sorted.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-20 transition-colors">
                <ChevronDown size={15} />
              </button>
              <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500 transition-colors">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => deleteQuestion(q)}
                disabled={deleting === q.id}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Aggiungi nuova domanda */}
      {addingNew ? (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4 flex gap-3 items-start">
          <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {sorted.length + 1}
          </span>
          <div className="flex-1 flex gap-2 items-start">
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              rows={2}
              placeholder="Testo della domanda…"
              className="flex-1 border border-violet-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              autoFocus
            />
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={addQuestion}
                disabled={saving || !newText.trim()}
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setAddingNew(false); setNewText('') }}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-violet-200 text-violet-500 hover:border-violet-400 hover:bg-violet-50 transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Aggiungi domanda
        </button>
      )}
    </div>
  )
}
