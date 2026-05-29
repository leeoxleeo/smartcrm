-- Revenue attribution table: links email dispatches to subsequent purchases
CREATE TABLE IF NOT EXISTS crm_atribuicao_receita (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  disparo_id        UUID NOT NULL REFERENCES crm_email_disparos(id) ON DELETE CASCADE,
  regra_id          UUID REFERENCES crm_trigger_rules(id) ON DELETE SET NULL,
  contact_id        UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  purchase_event_id UUID NOT NULL,
  receita           NUMERIC(12,2) NOT NULL DEFAULT 0,
  janela_horas      SMALLINT NOT NULL DEFAULT 168,  -- 7-day attribution window
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (disparo_id, purchase_event_id)
);

ALTER TABLE crm_atribuicao_receita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atribuicao_select" ON crm_atribuicao_receita;
DROP POLICY IF EXISTS "atribuicao_insert" ON crm_atribuicao_receita;
CREATE POLICY "atribuicao_select" ON crm_atribuicao_receita FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "atribuicao_insert" ON crm_atribuicao_receita FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Function: on each purchase event, find last email sent to that contact
-- within 7 days and create an attribution record (last-touch model)
CREATE OR REPLACE FUNCTION crm_atribuir_receita_ao_email()
RETURNS TRIGGER AS $$
DECLARE
  v_receita NUMERIC := 0;
  v_disparo RECORD;
  v_item    JSONB;
BEGIN
  IF NEW.tipo != 'purchase' OR NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Revenue from payload.value (GA4-style), fallback to sum of items
  v_receita := COALESCE(NULLIF(NEW.payload->>'value', '')::NUMERIC, 0);
  IF v_receita = 0 THEN
    BEGIN
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items') LOOP
        v_receita := v_receita
          + COALESCE(NULLIF(v_item->>'price', '')::NUMERIC, 0)
          * GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::NUMERIC, 1), 1);
      END LOOP;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  IF v_receita <= 0 THEN RETURN NEW; END IF;

  -- Last-touch: most recent email to this contact within 7 days before the purchase
  SELECT id, regra_id INTO v_disparo
  FROM crm_email_disparos
  WHERE contact_id  = NEW.contact_id
    AND cliente_id  = NEW.cliente_id
    AND status      IN ('enviado', 'aberto', 'clicado')
    AND enviado_em  >= NEW.criado_em - INTERVAL '7 days'
    AND enviado_em  <= NEW.criado_em
  ORDER BY enviado_em DESC
  LIMIT 1;

  IF v_disparo.id IS NOT NULL THEN
    INSERT INTO crm_atribuicao_receita (
      cliente_id, disparo_id, regra_id, contact_id, purchase_event_id, receita
    ) VALUES (
      NEW.cliente_id, v_disparo.id, v_disparo.regra_id,
      NEW.contact_id, NEW.id, v_receita
    )
    ON CONFLICT (disparo_id, purchase_event_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_events_atribuir_receita ON crm_events;
CREATE TRIGGER crm_events_atribuir_receita
  AFTER INSERT ON crm_events
  FOR EACH ROW
  EXECUTE FUNCTION crm_atribuir_receita_ao_email();

-- Backfill: attribute revenue for existing purchase events
-- Runs once at migration time; safe to re-run (ON CONFLICT DO NOTHING)
DO $$
DECLARE
  ev    RECORD;
  v_receita NUMERIC;
  v_item    JSONB;
  v_disparo RECORD;
BEGIN
  FOR ev IN
    SELECT id, cliente_id, contact_id, criado_em, payload
    FROM crm_events
    WHERE tipo = 'purchase' AND contact_id IS NOT NULL
    ORDER BY criado_em
  LOOP
    v_receita := COALESCE(NULLIF(ev.payload->>'value', '')::NUMERIC, 0);
    IF v_receita = 0 THEN
      BEGIN
        FOR v_item IN SELECT * FROM jsonb_array_elements(ev.payload->'items') LOOP
          v_receita := v_receita
            + COALESCE(NULLIF(v_item->>'price', '')::NUMERIC, 0)
            * GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::NUMERIC, 1), 1);
        END LOOP;
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;

    CONTINUE WHEN v_receita <= 0;

    SELECT id, regra_id INTO v_disparo
    FROM crm_email_disparos
    WHERE contact_id = ev.contact_id
      AND cliente_id = ev.cliente_id
      AND status     IN ('enviado', 'aberto', 'clicado')
      AND enviado_em >= ev.criado_em - INTERVAL '7 days'
      AND enviado_em <= ev.criado_em
    ORDER BY enviado_em DESC
    LIMIT 1;

    IF v_disparo.id IS NOT NULL THEN
      INSERT INTO crm_atribuicao_receita (
        cliente_id, disparo_id, regra_id, contact_id, purchase_event_id, receita
      ) VALUES (
        ev.cliente_id, v_disparo.id, v_disparo.regra_id,
        ev.contact_id, ev.id, v_receita
      )
      ON CONFLICT (disparo_id, purchase_event_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
