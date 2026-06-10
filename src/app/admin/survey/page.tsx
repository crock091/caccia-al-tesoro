import { createClient } from '@/lib/supabase/server'
import { Star } from 'lucide-react'
import type { SurveyQuestion } from '@/lib/types'
import SurveyQuestionsEditor from '@/components/admin/SurveyQuestionsEditor'

export default async function SurveyAdminPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('survey_questions')
    .select('*')
    .order('order_index')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Star size={20} style={{ color: '#b88445' }} />
        <div>
          <h1 className="display text-2xl font-bold text-white drop-shadow">Scheda di valutazione</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Gestisci le domande del sondaggio mostrato ai partecipanti al completamento di una tappa.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-2xl px-5 py-4 mb-5 text-sm" style={{ background: 'rgba(255,250,240,0.93)', color: '#17372d' }}>
          <strong>Come funziona:</strong> Le domande qui sotto vengono mostrate ai partecipanti quando completano
          una tappa con l&apos;opzione &ldquo;⭐ Sondaggio&rdquo; attiva. Puoi aggiungere, modificare,
          riordinare e disattivare singole domande.
        </div>

        <SurveyQuestionsEditor initialQuestions={(questions ?? []) as SurveyQuestion[]} />
      </div>
    </div>
  )
}
