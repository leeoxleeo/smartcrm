export type UserRole = "admin" | "owner" | "editor" | "viewer" | "cliente";

export type PlatformType =
  | "vtex"
  | "shopify"
  | "woocommerce"
  | "magento"
  | "wake"
  | "oracle"
  | "wordpress"
  | "strapi"
  | "custom";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  cliente_id?: string;
  cliente_ids?: string[];
  telas_permitidas?: string[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  plataforma?: PlatformType;
  website_url?: string;
  vtex_account_name?: string;
  vtex_appkey?: string;
  vtex_apptoken?: string;
  wake_api_token?: string;
  shopify_store_domain?: string;
  shopify_api_key?: string;
  shopify_api_password?: string;
  wordpress_api_key?: string;
  strapi_api_token?: string;
  ga4_property_id?: string;
  ga4_measurement_id?: string;
  ga4_api_secret?: string;
  ga4_service_account_json?: Record<string, unknown>;
  clarity_project_id?: string;
  clarity_api_token?: string;
  is_ecommerce?: boolean;
  nicho_ecommerce?: string;
  contexto_site?: string;
  sobre_marca?: string;
  beneficios_compra?: string;
  eventos_conversao?: Array<{ nome: string; evento_ga4: string }>;
  servicos_ativos?: string[];
  design_system?: {
    corPrimaria?: string;
    corSecundaria?: string;
    corFundo?: string;
    corTexto?: string;
  };
  logo_url?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CrmProjeto {
  id: string;
  cliente_id: string;
  nome: string;
  descricao?: string;
  website_url?: string;
  ativo: boolean;
  criado_em: string;
}

export interface CrmForm {
  id: string;
  projeto_id: string;
  cliente_id: string;
  public_token: string;
  nome: string;
  tipo: "popup" | "inline" | "flyout" | "script";
  trigger_tipo: "time" | "scroll" | "exit_intent" | "manual";
  trigger_valor: number;
  titulo: string;
  subtitulo?: string;
  cta_texto: string;
  campo_nome: boolean;
  campo_telefone: boolean;
  cor_primaria?: string;
  email_ativo: boolean;
  email_template_tipo: "custom" | "produto_visto";
  email_assunto?: string;
  email_html?: string;
  ativo: boolean;
  criado_em: string;
}

export interface CrmContact {
  id: string;
  cliente_id: string;
  projeto_id?: string;
  form_id?: string;
  email: string;
  nome?: string;
  telefone?: string;
  origem: string;
  origem_detalhe?: string;
  pagina?: string;
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  criado_em: string;
}

export type TriggerRuleStatus = "rascunho" | "ativo" | "desativado";

export interface CrmTriggerRule {
  id: string;
  cliente_id: string;
  form_id?: string;
  nome: string;
  evento_tipo: string;
  delay_minutos: number;
  cancelar_se?: string;
  email_assunto?: string;
  email_template_tipo: string;
  email_html?: string;
  status: TriggerRuleStatus;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  criado_em: string;
}

export interface CrmEvent {
  id: string;
  cliente_id: string;
  contact_id?: string;
  session_id: string;
  tipo: string;
  payload: Record<string, unknown>;
  pagina?: string;
  criado_em: string;
}

export interface CrmEmailDisparo {
  id: string;
  cliente_id: string;
  projeto_id?: string;
  regra_id?: string;
  contact_id?: string;
  email_destino: string;
  assunto?: string;
  status: "enviado" | "falhou" | "aberto" | "clicado";
  enviado_em: string;
  aberto_em?: string;
  clicado_em?: string;
}

export interface ConfigPlataforma {
  id: "main";
  ia_provedor: "claude" | "openai";
  ia_anthropic_key?: string;
  ia_openai_key?: string;
  resend_api_key?: string;
  resend_from_email?: string;
  resend_from_name: string;
  atualizado_em: string;
}

export interface CrmProduct {
  id: string;
  cliente_id: string;
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  preco_atual?: number;
  imagem_url?: string;
  produto_url?: string;
  views: number;
  cart_adds: number;
  purchases: number;
  ultima_vista?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ProjetoStats {
  projeto_id: string;
  nome: string;
  total_contatos: number;
  total_disparos: number;
  disparos_abertos: number;
}

// ─── RFM ─────────────────────────────────────────────────────────────────────

export type RfmSegmento =
  | "champion" | "loyal" | "potential_loyalist" | "new_customer"
  | "promising" | "need_attention" | "at_risk" | "cant_lose"
  | "hibernating" | "lost";

export interface RfmSegmentSummary {
  segmento: RfmSegmento;
  count: number;
  valor_total: number;
  valor_medio: number;
  frequencia_media: number;
}

export interface RfmAnalise {
  segmentos: RfmSegmentSummary[];
  total_compradores: number;
  receita_total: number;
  insight_ia?: string;
  calculado_em: string;
  from_cache: boolean;
  cache_age_min?: number;
}

// ─── Atribuição de receita ────────────────────────────────────────────────────

export interface AtribuicaoRegra {
  regra_id: string;
  regra_nome: string;
  template_tipo: string;
  total_disparos: number;
  conversoes: number;
  receita_atribuida: number;
  taxa_conversao: number;
  receita_por_email: number;
}

export interface AtribuicaoResumo {
  regras: AtribuicaoRegra[];
  receita_total: number;
  conversoes_total: number;
}

// ─── Análise de conversão ─────────────────────────────────────────────────────

export type GargaloProduto = "interesse" | "intencao" | "ambos";

export interface ProdutoAnalise {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  preco_atual?: number;
  views: number;
  cart_adds: number;
  purchases: number;
  taxa_view_cart: number;
  taxa_cart_compra: number;
  taxa_conversao: number;
  gargalo: GargaloProduto;
  analise: string;
  sugestao: string;
}

export interface AnaliseConversao {
  resumo: string;
  produtos: ProdutoAnalise[];
  oportunidade?: string;
  media_conversao_loja: number;
  total_produtos_analisados: number;
  gerado_em: string;
  from_cache: boolean;
  cache_age_min?: number;
}
