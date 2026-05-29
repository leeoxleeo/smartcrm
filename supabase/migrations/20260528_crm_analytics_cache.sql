-- Cache de análises geradas por IA (TTL gerenciado pela Edge Function)
CREATE TABLE IF NOT EXISTS crm_analytics_cache (
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,       -- 'produtos_sem_conversao' | ...
  resultado  JSONB NOT NULL,
  gerado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cliente_id, tipo)
);

ALTER TABLE crm_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_cache_select" ON crm_analytics_cache FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "analytics_cache_upsert" ON crm_analytics_cache FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "analytics_cache_update" ON crm_analytics_cache FOR UPDATE TO authenticated USING (TRUE);
