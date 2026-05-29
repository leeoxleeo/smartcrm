import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchVtexProduct,
  fetchVtexProducts,
  fetchVtexBySearch,
  generateCopy,
  generateVitrineCopy,
  generateVitrineCopyInteligente,
  analyzeNavigation,
  buildEmailHtml,
  buildVitrineEmailHtml,
  appendUtm,
  type ProductData,
  type VitrineProductData,
  type UtmParams,
} from "../_shared/email.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: config } = await sb
      .from("config_plataforma")
      .select("*")
      .eq("id", "main")
      .single();

    if (!config?.resend_api_key) {
      return json({ error: "Resend API key não configurada" }, 400);
    }

    const { data: logs } = await sb
      .from("crm_trigger_log")
      .select(`
        id, regra_id, contact_id, criado_em,
        regra:crm_trigger_rules (
          id, cliente_id, nome, evento_tipo, cancelar_se,
          email_assunto, email_template_tipo, email_html,
          utm_source, utm_medium, utm_campaign, utm_content
        ),
        contact:crm_contacts (
          id, cliente_id, email, nome, projeto_id
        )
      `)
      .eq("status", "pendente")
      .lte("delay_ate", new Date().toISOString())
      .limit(20);

    const results: Record<string, string> = {};

    for (const log of (logs ?? [])) {
      const regra = log.regra as Record<string, unknown>;
      const contact = log.contact as Record<string, unknown>;

      if (!regra || !contact) {
        await markLog(sb, log.id, "falhou");
        continue;
      }

      // ── 1. Cancellation check ────────────────────────────────────────────
      if (regra.cancelar_se) {
        const { data: cancelEvent } = await sb
          .from("crm_events")
          .select("id")
          .eq("contact_id", log.contact_id)
          .eq("tipo", regra.cancelar_se as string)
          .gt("criado_em", log.criado_em)
          .limit(1)
          .maybeSingle();

        if (cancelEvent) {
          await markLog(sb, log.id, "cancelado");
          results[log.id] = "cancelado";
          continue;
        }
      }

      const utm: UtmParams = {
        utm_source:   (regra.utm_source   as string | undefined) || "smartcrm",
        utm_medium:   (regra.utm_medium   as string | undefined) || "email",
        utm_campaign: (regra.utm_campaign as string | undefined) || slugify(regra.nome as string ?? "automacao"),
        utm_content:  regra.utm_content  as string | undefined,
      };

      const templateTipo = regra.email_template_tipo as string;
      const isVitrine = templateTipo.startsWith("vitrine_");
      const isIntelligente = templateTipo === "vitrine_inteligente";

      // ── 2. Build email ───────────────────────────────────────────────────
      let htmlEmail: string;

      if (templateTipo === "custom" && regra.email_html) {
        // Custom HTML with variable substitution
        htmlEmail = (regra.email_html as string)
          .replace(/\{\{nome\}\}/gi, String(contact.nome ?? ""))
          .replace(/\{\{email\}\}/gi, String(contact.email ?? ""))
          .replace(/href="(https?:\/\/[^"]+)"/gi, (_: string, url: string) => {
            const withUtm = appendUtm(url, utm);
            return `href="${withUtm ?? url}"`;
          });

      } else if (isIntelligente) {
        htmlEmail = await buildVitrineInteligente(sb, config, regra, contact, utm);

      } else if (isVitrine) {
        htmlEmail = await buildVitrineEmail(sb, config, regra, contact, log, utm, templateTipo);

      } else {
        // Default: produto_visto with AI copy
        htmlEmail = await buildProdutoVistoEmail(sb, config, regra, contact, utm);
      }

      // ── 3. Send via Resend ───────────────────────────────────────────────
      const firstName = contact.nome
        ? String(contact.nome).split(" ")[0]
        : String(contact.email).split("@")[0];

      const assunto = (regra.email_assunto as string) ||
        `Olá${firstName ? ", " + firstName : ""}! Uma mensagem especial`;

      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${config.resend_from_name} <${config.resend_from_email}>`,
          to: [contact.email as string],
          subject: assunto,
          html: htmlEmail,
        }),
      });

      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        console.error("Resend error:", sendData);
        await markLog(sb, log.id, "falhou");
        results[log.id] = "resend-error";
        continue;
      }

      // ── 4. Record in crm_email_disparos ──────────────────────────────────
      await sb.from("crm_email_disparos").insert({
        cliente_id:    regra.cliente_id,
        projeto_id:    contact.projeto_id ?? null,
        regra_id:      log.regra_id,
        contact_id:    log.contact_id,
        email_destino: contact.email,
        assunto,
        status:        "enviado",
        enviado_em:    new Date().toISOString(),
      });

      await markLog(sb, log.id, "enviado");
      results[log.id] = "enviado";
    }

    return json({ ok: true, processados: Object.keys(results).length, results }, 200);
  } catch (err) {
    console.error("crm-email-worker error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});

// ─── Produto visto (single product + AI copy) ────────────────────────────────

async function buildProdutoVistoEmail(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown>,
  utm: UtmParams,
): Promise<string> {
  let product = await getProductFromEvent(sb, contact.id as string, regra.evento_tipo as string);

  let imageUrl: string | null = null;
  let productUrl: string | null = null;

  if (product) {
    const { data: cliente } = await sb
      .from("clientes")
      .select("vtex_account_name, website_url")
      .eq("id", regra.cliente_id as string)
      .single();

    if (cliente?.vtex_account_name) {
      const vtex = await fetchVtexProduct(cliente.vtex_account_name, product.item_id, cliente.website_url);
      imageUrl = vtex.imageUrl;
      productUrl = vtex.productUrl;
      if (vtex.description) {
        product = { ...product, description: vtex.description };
      }
    }
  }

  const firstName = contact.nome
    ? String(contact.nome).split(" ")[0]
    : String(contact.email as string).split("@")[0];

  const copy = await generateCopy(
    config,
    firstName,
    product ?? { item_id: "0", item_name: "produto" },
    String(regra.nome ?? ""),
  );

  return buildEmailHtml({
    copy,
    product: product ?? { item_id: "0", item_name: "produto" },
    imageUrl,
    productUrl,
    fromName: (config.resend_from_name as string) ?? "SmartCRM",
    utm,
  });
}

// ─── Vitrine (multi-product showcase) ────────────────────────────────────────

async function buildVitrineEmail(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown>,
  log: Record<string, unknown>,
  utm: UtmParams,
  tipo: string,
): Promise<string> {
  const clienteId = regra.cliente_id as string;
  const contactId = contact.id as string;

  // Get the trigger product from the event
  const triggerProduct = await getProductFromEvent(sb, contactId, regra.evento_tipo as string)
    ?? { item_id: "0", item_name: "produto" };

  // Get the cliente for context (VTEX + nicho)
  const { data: cliente } = await sb
    .from("clientes")
    .select("vtex_account_name, website_url, nicho_ecommerce, resend_from_name")
    .eq("id", clienteId)
    .single();

  // Select vitrine products based on strategy
  const vitrineRaw = await getVitrineProducts(sb, clienteId, contactId, triggerProduct, tipo);

  // Enrich with VTEX if configured
  let vitrine: VitrineProductData[] = vitrineRaw;
  if (cliente?.vtex_account_name && vitrineRaw.length > 0) {
    const vtexMap = await fetchVtexProducts(
      cliente.vtex_account_name,
      vitrineRaw.map((p) => p.item_id),
      cliente.website_url,
    );
    vitrine = vitrineRaw.map((p) => ({
      ...p,
      imageUrl:   vtexMap.get(p.item_id)?.imageUrl   ?? null,
      productUrl: vtexMap.get(p.item_id)?.productUrl ?? null,
    }));
  }

  const firstName = contact.nome
    ? String(contact.nome).split(" ")[0]
    : String(contact.email as string).split("@")[0];

  const copy = await generateVitrineCopy(
    config,
    firstName,
    triggerProduct,
    vitrine,
    tipo,
    cliente?.nicho_ecommerce ?? null,
  );

  return buildVitrineEmailHtml({
    copy,
    triggerProduct,
    products: vitrine,
    fromName: (config.resend_from_name as string) ?? "SmartCRM",
    utm,
  });
}

// ─── Vitrine inteligente (full navigation → VTEX search) ─────────────────────

async function buildVitrineInteligente(
  sb: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  regra: Record<string, unknown>,
  contact: Record<string, unknown>,
  utm: UtmParams,
): Promise<string> {
  const clienteId = regra.cliente_id as string;
  const contactId = contact.id as string;

  const firstName = contact.nome
    ? String(contact.nome).split(" ")[0]
    : String(contact.email as string).split("@")[0];

  // 1. Full navigation history (up to 30 product_views)
  const viewedProducts = await getContactNavigation(sb, contactId);

  // 2. Client config
  const { data: cliente } = await sb
    .from("clientes")
    .select("vtex_account_name, website_url, nicho_ecommerce")
    .eq("id", clienteId)
    .single();

  // Fallback when no VTEX or no navigation data
  if (!cliente?.vtex_account_name || viewedProducts.length === 0) {
    const triggerProduct = await getProductFromEvent(sb, contactId, regra.evento_tipo as string)
      ?? { item_id: "0", item_name: "produto" };
    const vitrineRaw = await getVitrineProducts(sb, clienteId, contactId, triggerProduct, "vitrine_sugestoes");
    const copy = await generateVitrineCopy(
      config, firstName, triggerProduct, vitrineRaw, "vitrine_sugestoes", cliente?.nicho_ecommerce ?? null,
    );
    return buildVitrineEmailHtml({
      copy,
      triggerProduct,
      products: vitrineRaw,
      fromName: (config.resend_from_name as string) ?? "SmartCRM",
      utm,
    });
  }

  // 3. AI extracts navigation pattern (search_query + price range)
  const profile = await analyzeNavigation(config, viewedProducts);

  // 4. Hit VTEX search with the extracted profile
  const viewedIds = new Set(viewedProducts.map((p) => p.item_id));
  let vtexProducts = await fetchVtexBySearch(
    cliente.vtex_account_name,
    profile.search_query,
    profile.price_min,
    profile.price_max,
    cliente.website_url ?? null,
    viewedIds,
  );

  // 5. If VTEX returns less than 2 products, fall back to crm_products sugestoes
  if (vtexProducts.length < 2) {
    const triggerProduct = viewedProducts[0] ?? { item_id: "0", item_name: "produto" };
    const vitrineRaw = await getVitrineProducts(sb, clienteId, contactId, triggerProduct, "vitrine_sugestoes");
    let enriched: VitrineProductData[] = vitrineRaw;
    if (vitrineRaw.length > 0) {
      const vtexMap = await fetchVtexProducts(
        cliente.vtex_account_name,
        vitrineRaw.map((p) => p.item_id),
        cliente.website_url ?? null,
      );
      enriched = vitrineRaw.map((p) => ({
        ...p,
        imageUrl:   vtexMap.get(p.item_id)?.imageUrl   ?? null,
        productUrl: vtexMap.get(p.item_id)?.productUrl ?? null,
      }));
    }
    vtexProducts = enriched;
  }

  // 6. Generate personalized copy that explains the recommendation
  const triggerProduct = viewedProducts[0] ?? { item_id: "0", item_name: "produto" };
  const copy = await generateVitrineCopyInteligente(
    config,
    firstName,
    profile.summary,
    vtexProducts,
    cliente.nicho_ecommerce ?? null,
  );

  return buildVitrineEmailHtml({
    copy,
    triggerProduct,
    products: vtexProducts,
    fromName: (config.resend_from_name as string) ?? "SmartCRM",
    utm,
  });
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

// ─── Vitrine product selection strategies ────────────────────────────────────

async function getVitrineProducts(
  sb: ReturnType<typeof createClient>,
  clienteId: string,
  contactId: string,
  triggerProduct: ProductData,
  tipo: string,
): Promise<ProductData[]> {
  const LIMIT = 4;

  if (tipo === "vitrine_similares") {
    // 1st choice: same category
    if (triggerProduct.item_category) {
      const { data } = await sb
        .from("crm_products")
        .select("item_id, item_name, preco_atual, item_category, item_brand")
        .eq("cliente_id", clienteId)
        .eq("item_category", triggerProduct.item_category)
        .neq("item_id", triggerProduct.item_id)
        .order("views", { ascending: false })
        .limit(LIMIT);
      if ((data ?? []).length >= 2) return dbProductsToData(data!);
    }

    // 2nd choice: same brand
    if (triggerProduct.item_brand) {
      const { data } = await sb
        .from("crm_products")
        .select("item_id, item_name, preco_atual, item_category, item_brand")
        .eq("cliente_id", clienteId)
        .eq("item_brand", triggerProduct.item_brand)
        .neq("item_id", triggerProduct.item_id)
        .order("views", { ascending: false })
        .limit(LIMIT);
      if ((data ?? []).length >= 2) return dbProductsToData(data!);
    }

    // Fallback: top viewed overall
    return await topViewedProducts(sb, clienteId, triggerProduct.item_id, LIMIT);
  }

  if (tipo === "vitrine_combinacoes") {
    // Products most added to cart / purchased in the store, from DIFFERENT category
    // Proxy for "goes together": top by (cart_adds + purchases) excluding same category
    const queryBase = sb
      .from("crm_products")
      .select("item_id, item_name, preco_atual, item_category, item_brand, cart_adds, purchases")
      .eq("cliente_id", clienteId)
      .neq("item_id", triggerProduct.item_id);

    // Prefer different category to avoid duplicating similares
    const { data: diffCat } = triggerProduct.item_category
      ? await queryBase.neq("item_category", triggerProduct.item_category).order("purchases", { ascending: false }).limit(LIMIT)
      : await queryBase.order("purchases", { ascending: false }).limit(LIMIT);

    if ((diffCat ?? []).length >= 2) return dbProductsToData(diffCat!);

    // Fallback: top purchased regardless of category
    const { data } = await sb
      .from("crm_products")
      .select("item_id, item_name, preco_atual, item_category, item_brand")
      .eq("cliente_id", clienteId)
      .neq("item_id", triggerProduct.item_id)
      .order("purchases", { ascending: false })
      .limit(LIMIT);
    return dbProductsToData(data ?? []);
  }

  if (tipo === "vitrine_sugestoes") {
    // Top products the contact hasn't seen
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
    if (unseen.length >= 2) return dbProductsToData(unseen);

    // Fallback: top viewed ignoring seen filter
    return await topViewedProducts(sb, clienteId, triggerProduct.item_id, LIMIT);
  }

  return await topViewedProducts(sb, clienteId, triggerProduct.item_id, LIMIT);
}

async function topViewedProducts(
  sb: ReturnType<typeof createClient>,
  clienteId: string,
  excludeId: string,
  limit: number,
): Promise<ProductData[]> {
  const { data } = await sb
    .from("crm_products")
    .select("item_id, item_name, preco_atual, item_category, item_brand")
    .eq("cliente_id", clienteId)
    .neq("item_id", excludeId)
    .order("views", { ascending: false })
    .limit(limit);
  return dbProductsToData(data ?? []);
}

function dbProductsToData(rows: Record<string, unknown>[]): ProductData[] {
  return rows.map((p) => ({
    item_id:       p.item_id as string,
    item_name:     (p.item_name as string) ?? "Produto",
    price:         p.preco_atual as string | number | undefined,
    item_category: p.item_category as string | undefined,
    item_brand:    p.item_brand as string | undefined,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function markLog(sb: ReturnType<typeof createClient>, logId: string, status: string) {
  await sb
    .from("crm_trigger_log")
    .update({ status, processado_em: new Date().toISOString() })
    .eq("id", logId);
}

async function getProductFromEvent(
  sb: ReturnType<typeof createClient>,
  contactId: string,
  eventTipo: string,
): Promise<ProductData | null> {
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

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")       // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "")           // trim leading/trailing hyphens
    .slice(0, 60);
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
