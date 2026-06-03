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
        <Star size={20} className="text-green-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheda di valutazione</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Gestisci le domande del sondaggio mostrato ai partecipanti al completamento di una tappa.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-5 text-sm text-green-800">
          <strong>Come funziona:</strong> Le domande qui sotto vengono mostrate ai partecipanti quando completano
          una tappa con l&apos;opzione &ldquo;⭐ Sondaggio&rdquo; attiva. Puoi aggiungere, modificare,
          riordinare e disattivare singole domande.
        </div>

        <SurveyQuestionsEditor initialQuestions={(questions ?? []) as SurveyQuestion[]} />
      </div>
    </div>
  )
}
