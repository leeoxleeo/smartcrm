-- Substitui o campo ativo (boolean) por status (rascunho/ativo/desativado)
-- em crm_trigger_rules

ALTER TABLE crm_trigger_rules
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'rascunho';

-- Migra dados existentes
UPDATE crm_trigger_rules
SET status = CASE WHEN ativo THEN 'ativo' ELSE 'desativado' END
WHERE status = 'rascunho';

-- Remove coluna legada (opcional — comente se quiser manter compatibilidade)
ALTER TABLE crm_trigger_rules DROP COLUMN IF EXISTS ativo;
