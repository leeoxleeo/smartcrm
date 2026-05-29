-- CRM Products Intelligence + session tracking (idempotent)

-- 1. Add session_id to crm_contacts (for event backfill)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_session ON crm_contacts(session_id);

-- 2. Allow null session_id in crm_events
DO $$
BEGIN
  ALTER TABLE crm_events ALTER COLUMN session_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Product intelligence table
CREATE TABLE IF NOT EXISTS crm_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  item_id       TEXT NOT NULL,
  item_name     TEXT NOT NULL DEFAULT '',
  item_category TEXT,
  item_brand    TEXT,
  preco_atual   NUMERIC(10,2),
  imagem_url    TEXT,
  produto_url   TEXT,
  views         INTEGER NOT NULL DEFAULT 0,
  cart_adds     INTEGER NOT NULL DEFAULT 0,
  purchases     INTEGER NOT NULL DEFAULT 0,
  ultima_vista  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cliente_id, item_id)
);

DROP TRIGGER IF EXISTS crm_products_atualizar_timestamp ON crm_products;
CREATE TRIGGER crm_products_atualizar_timestamp
  BEFORE UPDATE ON crm_products
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_products_select" ON crm_products;
DROP POLICY IF EXISTS "crm_products_insert" ON crm_products;
DROP POLICY IF EXISTS "crm_products_update" ON crm_products;
DROP POLICY IF EXISTS "crm_products_delete" ON crm_products;
CREATE POLICY "crm_products_select" ON crm_products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "crm_products_insert" ON crm_products FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "crm_products_update" ON crm_products FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "crm_products_delete" ON crm_products FOR DELETE TO authenticated USING (TRUE);

-- 4. Function + trigger to extract products from events
CREATE OR REPLACE FUNCTION crm_extrair_produtos_do_evento()
RETURNS TRIGGER AS $$
DECLARE
  v_items      JSONB;
  v_item       JSONB;
  v_views_incr INT := 0;
  v_cart_incr  INT := 0;
  v_buy_incr   INT := 0;
BEGIN
  IF NEW.tipo NOT IN ('product_view', 'view_item_list', 'cart_add', 'purchase') THEN
    RETURN NEW;
  END IF;

  v_items := NEW.payload -> 'items';
  IF v_items IS NULL OR jsonb_typeof(v_items) != 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo IN ('product_view', 'view_item_list') THEN
    v_views_incr := 1;
  ELSIF NEW.tipo = 'cart_add' THEN
    v_cart_incr := 1;
  ELSIF NEW.tipo = 'purchase' THEN
    v_buy_incr := 1;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    CONTINUE WHEN v_item->>'item_id' IS NULL OR v_item->>'item_id' = '';

    INSERT INTO crm_products (
      cliente_id, item_id, item_name, preco_atual,
      item_category, item_brand,
      views, cart_adds, purchases, ultima_vista
    ) VALUES (
      NEW.cliente_id,
      v_item->>'item_id',
      COALESCE(NULLIF(v_item->>'item_name', ''), 'Produto ' || (v_item->>'item_id')),
      NULLIF(v_item->>'price', '')::NUMERIC,
      NULLIF(v_item->>'item_category', ''),
      NULLIF(v_item->>'item_brand', ''),
      v_views_incr, v_cart_incr, v_buy_incr,
      NOW()
    )
    ON CONFLICT (cliente_id, item_id) DO UPDATE SET
      item_name     = CASE
                        WHEN EXCLUDED.item_name != '' THEN EXCLUDED.item_name
                        ELSE crm_products.item_name
                      END,
      preco_atual   = COALESCE(EXCLUDED.preco_atual, crm_products.preco_atual),
      item_category = COALESCE(EXCLUDED.item_category, crm_products.item_category),
      item_brand    = COALESCE(EXCLUDED.item_brand, crm_products.item_brand),
      views         = crm_products.views     + v_views_incr,
      cart_adds     = crm_products.cart_adds + v_cart_incr,
      purchases     = crm_products.purchases + v_buy_incr,
      ultima_vista  = NOW(),
      atualizado_em = NOW();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_eventos_extrair_produtos ON crm_events;
CREATE TRIGGER crm_eventos_extrair_produtos
  AFTER INSERT ON crm_events
  FOR EACH ROW
  EXECUTE FUNCTION crm_extrair_produtos_do_evento();
