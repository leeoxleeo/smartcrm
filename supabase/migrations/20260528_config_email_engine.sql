-- Platform configuration + email dispatch engine

-- 1. Platform config (single row, id='main')
CREATE TABLE IF NOT EXISTS config_plataforma (
  id               TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  ia_provedor      TEXT NOT NULL DEFAULT 'claude',   -- 'claude' | 'openai'
  ia_anthropic_key TEXT,
  ia_openai_key    TEXT,
  resend_api_key   TEXT,
  resend_from_email TEXT,
  resend_from_name TEXT NOT NULL DEFAULT 'SmartCRM',
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default row
INSERT INTO config_plataforma (id) VALUES ('main') ON CONFLICT DO NOTHING;

ALTER TABLE config_plataforma ENABLE ROW LEVEL SECURITY;

-- Only admin/owner can view or edit config
DROP POLICY IF EXISTS "config_select" ON config_plataforma;
DROP POLICY IF EXISTS "config_update" ON config_plataforma;
CREATE POLICY "config_select" ON config_plataforma FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')
  ));
CREATE POLICY "config_update" ON config_plataforma FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')
  ));

-- 2. Index to speed up pending-log queries in the email worker
CREATE INDEX IF NOT EXISTS idx_trigger_log_pendente
  ON crm_trigger_log (delay_ate)
  WHERE status = 'pendente';

-- 3. Function: when an event is inserted, schedule emails for matching active rules
CREATE OR REPLACE FUNCTION crm_agendar_emails_para_evento()
RETURNS TRIGGER AS $$
DECLARE
  v_regra crm_trigger_rules%ROWTYPE;
BEGIN
  -- Skip anonymous events (no contact identified yet)
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_regra IN
    SELECT *
    FROM   crm_trigger_rules
    WHERE  cliente_id = NEW.cliente_id
      AND  status     = 'ativo'
      AND  evento_tipo = NEW.tipo
  LOOP
    -- Prevent duplicate scheduling (same rule + contact within 24 h)
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM crm_trigger_log
      WHERE regra_id   = v_regra.id
        AND contact_id = NEW.contact_id
        AND criado_em  > NOW() - INTERVAL '24 hours'
    );

    INSERT INTO crm_trigger_log (regra_id, contact_id, status, delay_ate)
    VALUES (
      v_regra.id,
      NEW.contact_id,
      'pendente',
      NEW.criado_em + (v_regra.delay_minutos || ' minutes')::INTERVAL
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_eventos_agendar_emails ON crm_events;
CREATE TRIGGER crm_eventos_agendar_emails
  AFTER INSERT ON crm_events
  FOR EACH ROW
  EXECUTE FUNCTION crm_agendar_emails_para_evento();

-- 4. pg_cron: call the email worker every 5 minutes
--    Requires pg_cron and pg_net extensions enabled in the Dashboard.
--    Run this block manually after enabling both extensions.
--
-- SELECT cron.schedule(
--   'crm-email-worker',
--   '*/5 * * * *',
--   $$
--     SELECT net.http_post(
--       url     := 'https://wvewvutdgiebupjknfrf.supabase.co/functions/v1/crm-email-worker',
--       headers := '{"Content-Type":"application/json"}'::jsonb,
--       body    := '{}'::jsonb
--     );
--   $$
-- );
