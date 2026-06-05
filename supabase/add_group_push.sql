-- Aggiungi group_id a push_subscriptions per notifiche ai gruppi
-- Esegui nel SQL Editor di Supabase

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

-- Unique constraint su endpoint da solo (necessario per upsert gruppi)
ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

-- Indice per query per gruppo
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_group_id
  ON push_subscriptions(group_id)
  WHERE group_id IS NOT NULL;

-- Permetti INSERT senza autenticazione (per i gruppi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Groups can insert own push subscription'
  ) THEN
    CREATE POLICY "Groups can insert own push subscription"
      ON push_subscriptions FOR INSERT
      TO anon
      WITH CHECK (group_id IS NOT NULL AND user_id IS NULL);
  END IF;
END $$;

-- Permetti SELECT anon (per sendPushToGroup che usa anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Public read push subscriptions'
  ) THEN
    CREATE POLICY "Public read push subscriptions"
      ON push_subscriptions FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Permetti DELETE anon (per rimuovere subscriptions scadute)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions'
      AND policyname = 'Anon can delete expired subscriptions'
  ) THEN
    CREATE POLICY "Anon can delete expired subscriptions"
      ON push_subscriptions FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;
