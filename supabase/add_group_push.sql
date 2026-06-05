-- Aggiungi group_id a push_subscriptions per notifiche ai gruppi
-- Esegui nel SQL Editor di Supabase

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

-- Indice per query per gruppo
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_group_id
  ON push_subscriptions(group_id)
  WHERE group_id IS NOT NULL;

-- Permetti INSERT senza autenticazione (per i gruppi)
-- La policy esistente di SELECT era già pubblica
-- Aggiungiamo INSERT public per group_id NOT NULL
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

-- Permetti DELETE per le subscriptions scadute (da server-side via service_role)
-- Già gestito dalla logica server con anon key nelle notifiche
