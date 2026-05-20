'use client'

import { useState } from 'react'
import { Star, Loader2, Send } from 'lucide-react'

const DEFAULT_QUESTIONS = [
  { id: 'q1',  text: 'Esperienza complessiva della caccia al tesoro' },
  { id: 'q2',  text: 'Difficoltà degli indizi (1 = troppo facile, 5 = troppo difficile)' },
  { id: 'q3',  text: 'Percorso e luoghi visitati' },
  { id: 'q4',  text: 'Organizzazione dell\'evento' },
  { id: 'q5',  text: 'Interesse e originalità delle tappe' },
  { id: 'q6',  text: 'Divertimento e coinvolgimento del gruppo' },
  { id: 'q7',  text: 'Durata dell\'evento' },
  { id: 'q8',  text: 'Chiarezza delle istruzioni ricevute' },
  { id: 'q9',  text: 'Atmosfera e clima della giornata' },
  { id: 'q10', text: 'Consiglieresti questa esperienza ad altri?' },
]

interface Props {
  questions?: { id: string; text: string }[]
  onSubmit: (answers: Record<string, number>, message: string) => Promise<void>
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} stelle`}
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-100 text-gray-300'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500 self-center">{value}/5</span>
      )}
    </div>
  )
}

export default function SurveyForm({ questions, onSubmit }: Props) {
  const QUESTIONS = (questions && questions.length > 0) ? questions : DEFAULT_QUESTIONS
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answeredCount = Object.keys(answers).filter(k => answers[k] > 0).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (answeredCount < QUESTIONS.length) {
      setError('Rispondi a tutte le domande prima di inviare.')
      return
    }
    setError(null)
    setSubmitting(true)
    await onSubmit(answers, message)
    setSubmitting(false)
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-violet-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-5 text-white">
        <div className="text-2xl mb-1">🌟</div>
        <h2 className="text-lg font-bold">Valutazione della giornata</h2>
        <p className="text-violet-200 text-sm mt-0.5">
          Aiutaci a migliorare — rispondi a 10 brevi domande!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6">
        {/* Domande */}
        {QUESTIONS.map((q, i) => (
          <div key={q.id}>
            <p className="text-sm font-medium text-gray-800 mb-2">
              <span className="text-violet-500 font-bold mr-1.5">{i + 1}.</span>
              {q.text}
            </p>
            <StarRating
              value={answers[q.id] ?? 0}
              onChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}
            />
          </div>
        ))}

        {/* Testo libero */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">
            💬 Suggerimenti, idee per migliorare o cosa non ti è piaciuto
            <span className="text-gray-400 font-normal ml-1">(opzionale)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            placeholder="Scrivi qui qualsiasi commento, suggerimento o feedback…"
          />
          <p className="text-xs text-gray-300 text-right mt-0.5">{message.length}/1000</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{answeredCount}/{QUESTIONS.length}</span>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors text-base"
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Invio in corso…</>
          ) : (
            <><Send size={18} /> Invia valutazione</>
          )}
        </button>
      </form>
    </div>
  )
}
