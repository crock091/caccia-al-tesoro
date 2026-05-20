-- Aggiunge la colonna qr_token alla tabella checkpoints
-- Eseguire nel SQL Editor di Supabase

ALTER TABLE checkpoints
  ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Indice per lookup rapido dalla pagina /scan/[token]
CREATE UNIQUE INDEX IF NOT EXISTS checkpoints_qr_token_idx ON checkpoints (qr_token);
