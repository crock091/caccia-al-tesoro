-- Aggiunge il campo requires_qr alla tabella checkpoints
-- Default true per non rompere le tappe esistenti
alter table checkpoints
  add column if not exists requires_qr boolean not null default true;
