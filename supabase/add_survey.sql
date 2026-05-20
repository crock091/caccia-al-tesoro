-- Aggiunge il flag has_survey ai checkpoint
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS has_survey BOOLEAN NOT NULL DEFAULT false;

-- Tabella feedback delle valutazioni
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, checkpoint_id)
);
