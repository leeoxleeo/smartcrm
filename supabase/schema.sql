-- SmartCRM Database Schema
-- Run in Supabase SQL Editor

-- ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'owner', 'editor', 'viewer', 'cliente');
CREATE TYPE platform_type AS ENUM ('vtex', 'shopify', 'woocommerce', 'magento', 'wake', 'oracle', 'wordpress', 'strapi', 'custom');

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Perfis (estende auth.users)
CREATE TABLE perfis (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  cliente_id UUID,
  cliente_ids UUID[] DEFAULT '{}',
  telas_permitidas TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER perfis_atualizar_timestamp
  BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- Cria perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION criar_perfil_novo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER criar_perfil_ao_registrar
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_perfil_novo_usuario();

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  plataforma platform_type,
  website_url TEXT,
  -- Integrações de plataforma
  vtex_account_name TEXT,
  vtex_appkey TEXT,
  vtex_apptoken TEXT,
  wake_api_token TEXT,
  shopify_store_domain TEXT,
  shopify_api_key TEXT,
  shopify_api_password TEXT,
  wordpress_api_key TEXT,
  strapi_api_token TEXT,
  -- Google Analytics 4
  ga4_property_id TEXT,
  ga4_measurement_id TEXT,
  ga4_api_secret TEXT,
  ga4_service_account_json JSONB,
  -- Microsoft Clarity
  clarity_project_id TEXT,
  clarity_api_token TEXT,
  -- Contexto
  is_ecommerce BOOLEAN DEFAULT FALSE,
  nicho_ecommerce TEXT,
  contexto_site TEXT,
  sobre_marca TEXT,
  beneficios_compra TEXT,
  eventos_conversao JSONB[] DEFAULT '{}',
  servicos_ativos TEXT[] DEFAULT '{}',
  design_system JSONB,
  logo_url TEXT,
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clientes_atualizar_timestamp
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- CRM: Projetos
CREATE TABLE crm_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  website_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM: Formulários
CREATE TABLE crm_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID REFERENCES crm_projetos(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'popup',
  trigger_tipo TEXT NOT NULL DEFAULT 'time',
  trigger_valor INTEGER DEFAULT 5000,
  titulo TEXT NOT NULL DEFAULT '',
  subtitulo TEXT,
  cta_texto TEXT NOT NULL DEFAULT 'Quero receber',
  campo_nome BOOLEAN NOT NULL DEFAULT FALSE,
  campo_telefone BOOLEAN NOT NULL DEFAULT FALSE,
  cor_primaria TEXT,
  email_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  email_template_tipo TEXT NOT NULL DEFAULT 'custom',
  email_assunto TEXT,
  email_html TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM: Contatos
CREATE TABLE crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES crm_projetos(id) ON DELETE SET NULL,
  form_id UUID REFERENCES crm_forms(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  nome TEXT,
  telefone TEXT,
  origem TEXT NOT NULL DEFAULT 'form',
  origem_detalhe TEXT,
  pagina TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_contacts_cliente_email ON crm_contacts(cliente_id, email);
CREATE INDEX idx_crm_contacts_criado_em ON crm_contacts(criado_em DESC);

-- CRM: Eventos
CREATE TABLE crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  pagina TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_events_contact ON crm_events(contact_id);
CREATE INDEX idx_crm_events_session ON crm_events(session_id);

-- CRM: Regras de Trigger
CREATE TABLE crm_trigger_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  form_id UUID REFERENCES crm_forms(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  evento_tipo TEXT NOT NULL,
  delay_minutos INTEGER NOT NULL DEFAULT 30,
  cancelar_se TEXT,
  email_assunto TEXT,
  email_template_tipo TEXT NOT NULL DEFAULT 'produto_visto',
  email_html TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM: Log de triggers processados
CREATE TABLE crm_trigger_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID NOT NULL REFERENCES crm_trigger_rules(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente',
  delay_ate TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ
);

-- RLS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_trigger_log ENABLE ROW LEVEL SECURITY;

-- Políticas: perfis
CREATE POLICY "perfis_select" ON perfis FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "perfis_insert" ON perfis FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );
CREATE POLICY "perfis_update" ON perfis FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- Políticas: clientes
CREATE POLICY "clientes_select" ON clientes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis p WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'owner', 'editor', 'viewer')
        OR (p.role = 'cliente' AND id = ANY(p.cliente_ids))
        OR (p.role = 'cliente' AND p.cliente_id = id)
      )
    )
  );
CREATE POLICY "clientes_insert" ON clientes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'editor'))
  );
CREATE POLICY "clientes_update" ON clientes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'editor'))
  );

-- Políticas: CRM (simplificado — mesmo padrão para todos)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['crm_projetos', 'crm_forms', 'crm_contacts', 'crm_events', 'crm_trigger_rules', 'crm_trigger_log'] LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT TO authenticated USING (TRUE)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT TO authenticated WITH CHECK (TRUE)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE TO authenticated USING (TRUE)', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %s FOR DELETE TO authenticated USING (TRUE)', tbl, tbl);
  END LOOP;
END $$;
