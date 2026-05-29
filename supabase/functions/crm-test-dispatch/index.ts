import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchVtexProduct,
  fetchVtexProducts,
  fetchVtexBySearch,
  analyzeNavigation,
  generateCopy,
  generateVitrineCopy,
  generateVitrineCopyInteligente,
  buildEmailHtml,
  buildVitrineEmailHtml,
  appendUtm,
  type ProductData,
  type VitrineProductData,
  type UtmParams,
} from "../_shared/email.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { regra_id } = await req.json();
    if (!regra_id) return err("regra_id obrigatório", 400);

    // Resolve requesting user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user?.email) return err("Usuário sem email.", 401);

    // Load rule + platform config + client config in parallel
    const [{ data: regra }, { data: config }] = await Promise.all([
      sb.from("crm_trigger_rules").select("*").eq("id", regra_id).single(),
      sb.from("config_plataforma").select("*").eq("id", "main").single(),
    ]);

    if (!regra) return err("Automação não encontrada.", 404);
    if (!config?.resend_api_key || !config?.resend_from_email) {
      return err("Resend não configurado. Configure API key e email de envio em Configurações.", 400);
    }

    const { data: cliente } = await sb
      .from("clientes")
      .select("vtex_account_name, website_url, nicho_ecommerce")
      .eq("id", regra.cliente_id)
      .single();

    // Most recent contact for this client — used to pull real event data
    const { data: contact } = await sb
      .from("crm_contacts")
      .select("id, nome, email")
      .eq("cliente_id", regra.cliente_id)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const firstName = (contact?.nome ?? user.email.split("@")[0]).split(" ")[0];

    const utm: UtmParams = {
      utm_source:   regra.utm_source   || "smartcrm",
      utm_medium:   regra.utm_medium   || "email",
      utm_campaign: regra.utm_campaign || slugify(regra.nome ?? "automacao"),
      utm_content:  regra.utm_content  ?? undefined,
    };

    const templateTipo: string = regra.email_template_tipo ?? "produto_visto";
    const isVitrine = templateTipo.startsWith("vitrine_");
    const isIntelligente = templateTipo === "vitrine_inteligente";

    let htmlEmail: string;

    // ── Custom HTML ────────────────────────────────────────────────────────────
    if (templateTipo === "custom" && regra.email_html) {
      htmlEmail = regra.email_html
        .replace(/\{\{nome\}\}/gi, firstName)
        .replace(/\{\{email\}\}/gi, user.email);

    // ── Vitrine inteligente ────────────────────────────────────────────────────
    } else if (isIntelligente) {
      htmlEmail = await buildTestVitrineInteligente(sb, config, regra, contact, cliente, firstName, utm);

    // ── Vitrine (similares / combinações / sugestões) ─────────────────────────
    } else if (isVitrine) {
      htmlEmail = await buildTestVitrine(sb, config, regra, contact, cliente, firstName, utm, templateTipo);

    // ── Produto visto (default) ────────────────────────────────────────────────
    } else {
      htmlEmail = await buildTestProdutoVisto(sb, config, regra, contact, cliente, firstName, utm);
    }

    // Send via Resend (to admin's own email)
    const assunto = `[TESTE] ${regra.email_assunto || regra.nome || "Disparo de teste"}`;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.resend_from_name} <${config.resend_from_email}>`,
        to: [user.email],
        subject: assunto,
        html: htmlEmail,
      }),
    });

    const sendData = await sendRes.json();
    if (!sendRes.ok) return err(sendData.message ?? JSON.stringify(sendData), 400);

    return ok({ to: user.email });
  } catch (e) {
    return err(String(e), 500);
  }
});

// ─── Produto Visto ────────────────────────────────────────────────────────────

async function buildTestProdutoVisto(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown> | null,
  cliente: Record<string, unknown> | null,
  firstName: string,
  utm: UtmParams,
): Promise<string> {
  let product = await getProductFromEvent(sb, contact?.id as string, regra.evento_tipo as string);

  let imageUrl: string | null = null;
  let productUrl: string | null = null;

  if (product && cliente?.vtex_account_name && product.item_id !== "0") {
    const vtex = await fetchVtexProduct(
      cliente.vtex_account_name as string,
      product.item_id,
      cliente.website_url as string | null,
    );
    imageUrl = vtex.imageUrl;
    productUrl = vtex.productUrl;
    if (vtex.description) product = { ...product, description: vtex.description };
  }

  if (!product) {
    product = {
      item_id: "0",
      item_name: "Produto Exemplo (dados de teste)",
      price: "199.90",
      item_category: "Categoria Teste",
      item_brand: "Marca Teste",
    };
  }

  const copy = await generateCopy(config, firstName, product, String(regra.nome ?? ""));
  return buildEmailHtml({
    copy,
    product,
    imageUrl,
    productUrl,
    fromName: String(config.resend_from_name ?? "SmartCRM"),
    utm,
  });
}

// ─── Vitrine (similares / combinações / sugestões) ────────────────────────────

async function buildTestVitrine(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown> | null,
  cliente: Record<string, unknown> | null,
  firstName: string,
  utm: UtmParams,
  tipo: string,
): Promise<string> {
  const clienteId = regra.cliente_id as string;
  const contactId = contact?.id as string | undefined;

  const triggerProduct = await getProductFromEvent(sb, contactId, regra.evento_tipo as string)
    ?? await getAnyProduct(sb, clienteId)
    ?? { item_id: "0", item_name: "Produto Exemplo", price: "199.90", item_category: "Categoria", item_brand: "Marca" };

  const vitrineRaw = await getTestVitrineProducts(sb, clienteId, contactId, triggerProduct, tipo);

  let vitrine: VitrineProductData[] = vitrineRaw;
  if (cliente?.vtex_account_name && vitrineRaw.length > 0) {
    const vtexMap = await fetchVtexProducts(
      cliente.vtex_account_name as string,
      vitrineRaw.map((p) => p.item_id),
      cliente.website_url as string | null,
    );
    vitrine = vitrineRaw.map((p) => ({
      ...p,
      imageUrl:   vtexMap.get(p.item_id)?.imageUrl   ?? null,
      productUrl: vtexMap.get(p.item_id)?.productUrl ?? null,
    }));
  }

  const copy = await generateVitrineCopy(
    config,
    firstName,
    triggerProduct,
    vitrine,
    tipo,
    (cliente?.nicho_ecommerce as string | null) ?? null,
  );

  return buildVitrineEmailHtml({
    copy,
    triggerProduct,
    products: vitrine,
    fromName: String(config.resend_from_name ?? "SmartCRM"),
    utm,
  });
}

// ─── Vitrine Inteligente ──────────────────────────────────────────────────────

async function buildTestVitrineInteligente(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown> | null,
  cliente: Record<string, unknown> | null,
  firstName: string,
  utm: UtmParams,
): Promise<string> {
  const clienteId = regra.cliente_id as string;
  const contactId = contact?.id as string | undefined;

  // Full navigation history for the test contact
  const viewedProducts = contactId ? await getContactNavigation(sb, contactId) : [];

  // Fallback: no VTEX or no navigation
  if (!cliente?.vtex_account_name || viewedProducts.length === 0) {
    const triggerProduct = await getAnyProduct(sb, clienteId)
      ?? { item_id: "0", item_name: "Produto Exemplo", price: "199.90" };
    const vitrineRaw = await getTestVitrineProducts(sb, clienteId, contactId, triggerProduct, "vitrine_sugestoes");
    const copy = await generateVitrineCopy(
      config, firstName, triggerProduct, vitrineRaw, "vitrine_sugestoes",
      (cliente?.nicho_ecommerce as string | null) ?? null,
    );
    return buildVitrineEmailHtml({
      copy,
      triggerProduct,
      products: vitrineRaw,
      fromName: String(config.resend_from_name ?? "SmartCRM"),
      utm,
    });
  }

  // AI extracts navigation pattern
  const profile = await analyzeNavigation(config, viewedProducts);

  // Hit VTEX search with extracted profile
  const viewedIds = new Set(viewedProducts.map((p) => p.item_id));
  let vtexProducts = await fetchVtexBySearch(
    cliente.vtex_account_name as string,
    profile.search_query,
    profile.price_min,
    profile.price_max,
    (cliente.website_url as string | null) ?? null,
    viewedIds,
  );

  // Fallback to crm_products if VTEX returns < 2
  if (vtexProducts.length < 2) {
    const triggerProduct = viewedProducts[0] ?? { item_id: "0", item_name: "Produto" };
    const vitrineRaw = await getTestVitrineProducts(sb, clienteId, contactId, triggerProduct, "vitrine_sugestoes");
    if (vitrineRaw.length > 0) {
      const vtexMap = await fetchVtexProducts(
        cliente.vtex_account_name as string,
        vitrineRaw.map((p) => p.item_id),
        (cliente.website_url as string | null) ?? null,
      );
      vtexProducts = vitrineRaw.map((p) => ({
        ...p,
        imageUrl:   vtexMap.get(p.item_id)?.imageUrl   ?? null,
        productUrl: vtexMap.get(p.item_id)?.productUrl ?? null,
      }));
    }
  }

  const triggerProduct = viewedProducts[0] ?? { item_id: "0", item_name: "Produto" };
  const copy = await generateVitrineCopyInteligente(
    config,
    firstName,
    profile.summary,
    vtexProducts,
    (cliente.nicho_ecommerce as string | null) ?? null,
  );

  return buildVitrineEmailHtml({
    copy,
    triggerProduct,
    products: vtexProducts,
    fromName: String(config.resend_from_name ?? "SmartCRM"),
    utm,
  });
}

// ─── Product helpers ──────────────────────────────────────────────────────────

async function getProductFromEvent(
  sb: ReturnType<typeof createClient>,
  contactId: string | undefined,
  eventTipo: string,
): Promise<ProductData | null> {
  if (!contactId) return null;
  const { data: ev } = await sb
    .from("crm_events")
    .select("payload")
    .eq("contact_id", contactId)
    .eq("tipo", eventTipo)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ev) return null;
  const items = (ev.payload as Record<string, unknown>)?.items as Record<string, unknown>[];
  const item = items?.[0];
  if (!item?.item_id) return null;

  return {
    item_id:       item.item_id as string,
    item_name:     (item.item_name as string) ?? "Produto",
    price:         item.price as string | undefined,
    item_category: item.item_category as string | undefined,
    item_brand:    item.item_brand as string | undefined,
  };
}

async function getAnyProduct(
  sb: ReturnType<typeof createClient>,
  clienteId: string,
): Promise<ProductData | null> {
  const { data } = await sb
    .from("crm_products")
    .select("item_id, item_name, preco_atual, item_category, item_brand")
    .eq("cliente_id", clienteId)
    .order("views", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    item_id:       data.item_id,
    item_name:     data.item_name,
    price:         data.preco_atual ?? undefined,
    item_category: data.item_category ?? undefined,
    item_brand:    data.item_brand ?? undefined,
  };
}

async function getContactNavigation(
  sb: ReturnType<typeof createClient>,
  contactId: string,
): Promise<ProductData[]> {
  const { data: events } = await sb
    .from("crm_events")
    .select("payload")
    .eq("contact_id", contactId)
    .eq("tipo", "product_view")
    .order("criado_em", { ascending: false })
    .limit(30);

  const seen = new Set<string>();
  const products: ProductData[] = [];

  for (const ev of (events ?? [])) {
    const items = (ev.payload as Record<string, unknown>)?.items as Record<string, unknown>[];
    for (const item of (items ?? [])) {
      const id = item.item_id as string;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      products.push({
        item_id:       id,
        item_name:     (item.item_name as string) ?? "Produto",
        price:         item.price as string | number | undefined,
        item_category: item.item_category as string | undefined,
        item_brand:    item.item_brand as string | undefined,
      });
    }
  }

  return products;
}

async function getTestVitrineProducts(
  sb: ReturnType<typeof createClient>,
  clienteId: string,
  contactId: string | undefined,
  triggerProduct: ProductData,
  tipo: string,
): Promise<VitrineProductData[]> {
  const LIMIT = 4;

  if (tipo === "vitrine_similares") {
    if (triggerProduct.item_category) {
      const { data } = await sb
        .from("crm_products")
        .select("item_id, item_name, preco_atual, item_category, item_brand")
        .eq("cliente_id", clienteId)
        .eq("item_category", triggerProduct.item_category)
        .neq("item_id", triggerProduct.item_id)
        .order("views", { ascending: false })
        .limit(LIMIT);
      if ((data ?? []).length >= 2) return dbToVitrine(data!);
    }

    if (triggerProduct.item_brand) {
      const { data } = await sb
        .from("crm_products")
        .select("item_id, item_name, preco_atual, item_category, item_brand")
        .eq("cliente_id", clienteId)
        .eq("item_brand", triggerProduct.item_brand)
        .neq("item_id", triggerProduct.item_id)
        .order("views", { ascending: false })
        .limit(LIMIT);
      if ((data ?? []).length >= 2) return dbToVitrine(data!);
    }
  }

  if (tipo === "vitrine_combinacoes") {
    const queryBase = sb
      .from("crm_products")
      .select("item_id, item_name, preco_atual, item_category, item_brand")
      .eq("cliente_id", clienteId)
      .neq("item_id", triggerProduct.item_id);

    const { data } = triggerProduct.item_category
      ? await queryBase.neq("item_category", triggerProduct.item_category).order("purchases", { ascending: false }).limit(LIMIT)
      : await queryBase.order("purchases", { ascending: false }).limit(LIMIT);

    if ((data ?? []).length >= 2) return dbToVitrine(data!);
  }

  if (tipo === "vitrine_sugestoes" && contactId) {
    const { data: seenEvents } = await sb
      .from("crm_events")
      .select("payload")
      .eq("contact_id", contactId)
      .eq("tipo", "product_view")
      .order("criado_em", { ascending: false })
      .limit(50);

    const seenIds = new Set<string>([triggerProduct.item_id]);
    for (const ev of (seenEvents ?? [])) {
      const items = (ev.payload as Record<string, unknown>)?.items as Record<string, unknown>[];
      for (const item of (items ?? [])) {
        if (item.item_id) seenIds.add(item.item_id as string);
      }
    }

    const { data: topProducts } = await sb
      .from("crm_products")
      .select("item_id, item_name, preco_atual, item_category, item_brand")
      .eq("cliente_id", clienteId)
      .order("views", { ascending: false })
      .limit(30);

    const unseen = (topProducts ?? []).filter((p) => !seenIds.has(p.item_id)).slice(0, LIMIT);
    if (unseen.length >= 2) return dbToVitrine(unseen);
  }

  // Fallback: top viewed products
  const { data } = await sb
    .from("crm_products")
    .select("item_id, item_name, preco_atual, item_category, item_brand")
    .eq("cliente_id", clienteId)
    .neq("item_id", triggerProduct.item_id)
    .order("views", { ascending: false })
    .limit(LIMIT);

  return dbToVitrine(data ?? []);
}

function dbToVitrine(rows: Record<string, unknown>[]): VitrineProductData[] {
  return rows.map((p) => ({
    item_id:       p.item_id as string,
    item_name:     (p.item_name as string) ?? "Produto",
    price:         p.preco_atual as string | number | undefined,
    item_category: p.item_category as string | undefined,
    item_brand:    p.item_brand as string | undefined,
    imageUrl:      null,
    productUrl:    null,
  }));
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function ok(data: unknown) {
  return new Response(JSON.stringify({ ok: true, ...(data as object) }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
