-- RFM scoring table
CREATE TABLE IF NOT EXISTS crm_rfm_scores (
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  r_score       SMALLINT NOT NULL CHECK (r_score BETWEEN 1 AND 5),
  f_score       SMALLINT NOT NULL CHECK (f_score BETWEEN 1 AND 5),
  m_score       SMALLINT NOT NULL CHECK (m_score BETWEEN 1 AND 5),
  rfm_combo     TEXT NOT NULL,         -- '445', '111', etc.
  segmento      TEXT NOT NULL,         -- 'champion', 'at_risk', etc.
  ultima_compra TIMESTAMPTZ,
  frequencia    INT NOT NULL DEFAULT 0,
  valor_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cliente_id, contact_id)
);

ALTER TABLE crm_rfm_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfm_select" ON crm_rfm_scores;
DROP POLICY IF EXISTS "rfm_upsert" ON crm_rfm_scores;
DROP POLICY IF EXISTS "rfm_update" ON crm_rfm_scores;
CREATE POLICY "rfm_select" ON crm_rfm_scores FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "rfm_upsert" ON crm_rfm_scores FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "rfm_update" ON crm_rfm_scores FOR UPDATE TO authenticated USING (TRUE);
