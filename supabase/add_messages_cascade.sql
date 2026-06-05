-- Aggiungi ON DELETE CASCADE alla tabella messages
-- Esegui nel SQL Editor di Supabase

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_group_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT messages_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
