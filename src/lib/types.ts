export type EventStatus = 'draft' | 'active' | 'completed'
export type MediaType = 'image' | 'video'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface Event {
  id: string
  name: string
  description: string | null
  date: string | null
  status: EventStatus
  created_at: string
}

export interface Checkpoint {
  id: string
  event_id: string
  order_index: number
  title: string
  clue: string
  clue_image_url: string | null
  unlock_message: string | null
  latitude: number | null
  longitude: number | null
  requires_media: boolean
  geo_radius_meters: number
  created_at: string
}

export interface Group {
  id: string
  event_id: string
  name: string
  invite_code: string
  current_checkpoint_index: number
  finished: boolean
  finished_at: string | null
  created_at: string
}

export interface GroupProgress {
  id: string
  group_id: string
  checkpoint_id: string
  completed_at: string
}

export interface Submission {
  id: string
  group_id: string
  checkpoint_id: string
  media_url: string
  media_type: MediaType
  status: SubmissionStatus
  admin_note: string | null
  submitted_at: string
  reviewed_at: string | null
}

export interface GroupPosition {
  id: string
  group_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  updated_at: string
}
