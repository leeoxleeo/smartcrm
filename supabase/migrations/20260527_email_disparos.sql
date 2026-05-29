-- Tabela de disparos de email do CRM
-- Registra cada email enviado pelas automações

CREATE TABLE IF NOT EXISTS crm_email_disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES crm_projetos(id) ON DELETE SET NULL,
  regra_id UUID REFERENCES crm_trigger_rules(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  email_destino TEXT NOT NULL,
  assunto TEXT,
  status TEXT NOT NULL DEFAULT 'enviado', -- enviado | falhou | aberto | clicado
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aberto_em TIMESTAMPTZ,
  clicado_em TIMESTAMPTZ
);

CREATE INDEX idx_crm_disparos_cliente ON crm_email_disparos(cliente_id);
CREATE INDEX idx_crm_disparos_projeto ON crm_email_disparos(projeto_id);
CREATE INDEX idx_crm_disparos_enviado_em ON crm_email_disparos(enviado_em DESC);

ALTER TABLE crm_email_disparos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_email_disparos_select" ON crm_email_disparos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "crm_email_disparos_insert" ON crm_email_disparos FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "crm_email_disparos_update" ON crm_email_disparos FOR UPDATE TO authenticated USING (TRUE);
