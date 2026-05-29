export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export interface ProductData {
  item_id: string;
  item_name: string;
  price?: string | number;
  item_category?: string;
  item_brand?: string;
  description?: string;
}

export interface VitrineProductData extends ProductData {
  imageUrl?: string | null;
  productUrl?: string | null;
}

export interface EmailCopy {
  headline: string;
  body: string;
  cta: string;
  bullets: [string, string, string];
  tagline: string;
}

export interface VitrineCopy {
  titulo: string;
  subtitulo: string;
  cta: string;
  bullets: [string, string, string];
  tagline: string;
}

export interface NavigationProfile {
  search_query: string;
  price_min: number | null;
  price_max: number | null;
  summary: string;
}

// ─── VTEX ────────────────────────────────────────────────────────────────────

export async function fetchVtexProduct(
  account: string,
  itemId: string,
  storeUrl?: string | null,
): Promise<{ imageUrl: string | null; productUrl: string | null; description: string | null }> {
  const base = `https://${account}.vtexcommercestable.com.br/api/catalog_system/pub/products/search`;
  const headers = { Accept: "application/json" };

  for (const fq of [`skuId:${itemId}`, `productId:${itemId}`]) {
    try {
      const res = await fetch(`${base}?fq=${fq}&_from=0&_to=0`, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;
      const prod = data[0];
      const skuItem = prod.items?.find((i: Record<string, unknown>) => i.itemId === itemId) ?? prod.items?.[0];
      return {
        imageUrl: skuItem?.images?.[0]?.imageUrl ?? prod.images?.[0]?.imageUrl ?? null,
        productUrl: buildProductUrl(prod.link ?? null, storeUrl),
        description: stripHtml(prod.description ?? prod.metaTagDescription ?? null),
      };
    } catch {
      continue;
    }
  }

  return { imageUrl: null, productUrl: null, description: null };
}

export async function fetchVtexProducts(
  account: string,
  itemIds: string[],
  storeUrl?: string | null,
): Promise<Map<string, { imageUrl: string | null; productUrl: string | null; description: string | null }>> {
  const results = new Map<string, { imageUrl: string | null; productUrl: string | null; description: string | null }>();
  await Promise.all(
    itemIds.map(async (id) => {
      results.set(id, await fetchVtexProduct(account, id, storeUrl));
    }),
  );
  return results;
}

function buildProductUrl(vtexLink: string | null, storeUrl?: string | null): string | null {
  if (!vtexLink) return null;
  if (!storeUrl) return vtexLink;
  try {
    const path = new URL(vtexLink).pathname;
    const base = storeUrl.replace(/\/+$/, "");
    return `${base}${path}`;
  } catch {
    return vtexLink;
  }
}

export function appendUtm(url: string | null, utm: UtmParams): string | null {
  if (!url || url === "#") return url;
  const hasAny = utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content;
  if (!hasAny) return url;
  try {
    const u = new URL(url);
    if (utm.utm_source)   u.searchParams.set("utm_source",   utm.utm_source);
    if (utm.utm_medium)   u.searchParams.set("utm_medium",   utm.utm_medium);
    if (utm.utm_campaign) u.searchParams.set("utm_campaign", utm.utm_campaign);
    if (utm.utm_content)  u.searchParams.set("utm_content",  utm.utm_content);
    return u.toString();
  } catch {
    return url;
  }
}

function stripHtml(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 800);
}

// ─── AI copy generation ───────────────────────────────────────────────────────

export async function generateCopy(
  config: Record<string, unknown>,
  firstName: string,
  product: ProductData,
  regraNome: string,
): Promise<EmailCopy> {
  const fallback: EmailCopy = {
    headline: `${firstName}, você viu algo especial!`,
    body: "O produto que você visitou ainda está disponível. Não deixe para depois.",
    cta: "Garantir agora",
    bullets: [
      "Qualidade comprovada pelos nossos clientes",
      "Entrega rápida para todo o Brasil",
      "Compra segura e garantida",
    ],
    tagline: "Feito para quem sabe o que quer.",
  };

  const descBlock = product.description
    ? `Descrição do produto:\n${product.description}\n\n`
    : "";

  const prompt =
    `Você é copywriter de email marketing para e-commerce brasileiro.\n` +
    `Responda SOMENTE com JSON válido, sem texto fora do JSON.\n` +
    `Formato exato:\n` +
    `{\n` +
    `  "headline": "frase curta e impactante (máx 60 chars) com o nome do cliente",\n` +
    `  "body": "1-2 frases persuasivas sobre o produto (máx 120 chars), use urgência ou escassez",\n` +
    `  "cta": "texto do botão de compra (máx 25 chars)",\n` +
    `  "bullets": ["benefício real do produto (máx 55 chars)", "benefício real (máx 55 chars)", "benefício real (máx 55 chars)"],\n` +
    `  "tagline": "frase curta e memorável sobre o produto (máx 60 chars)"\n` +
    `}\n\n` +
    `Regras importantes:\n` +
    `- bullets: extraia benefícios REAIS da descrição do produto, sem inventar, sem superlativos, sem promessas (ex: "não 'o melhor do mercado'", não "garante resultados").\n` +
    `- tagline: algo que gere identificação, não uma promessa vazia.\n` +
    `- tom: direto, humano, sem exagero.\n\n` +
    `Nome: ${firstName}\n` +
    `Produto: ${product.item_name}\n` +
    `Preço: R$ ${product.price ?? "não informado"}\n` +
    `Categoria: ${product.item_category ?? "não informado"}\n` +
    `${descBlock}` +
    `Campanha: ${regraNome}`;

  try {
    let text = "";

    if (config.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.content?.[0]?.text ?? "";
    } else if (config.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 512,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }

    if (text) {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const bullets = Array.isArray(parsed.bullets) && parsed.bullets.length >= 3
        ? parsed.bullets.slice(0, 3) as [string, string, string]
        : fallback.bullets;
      return {
        headline: parsed.headline ?? fallback.headline,
        body: parsed.body ?? fallback.body,
        cta: parsed.cta ?? fallback.cta,
        bullets,
        tagline: parsed.tagline ?? fallback.tagline,
      };
    }
  } catch {
    // fall through to fallback
  }

  return fallback;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildEmailHtml(params: {
  copy: EmailCopy;
  product: ProductData;
  imageUrl: string | null;
  productUrl: string | null;
  fromName: string;
  utm?: UtmParams;
}): string {
  const { copy, product, imageUrl, productUrl, fromName, utm = {} } = params;
  const safeUrl = appendUtm(productUrl, utm) ?? "#";

  const priceFormatted = product.price
    ? `R$ ${Number(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : null;

  const imageRow = imageUrl
    ? `<tr>
        <td style="padding:0;line-height:0;">
          <a href="${safeUrl}" style="display:block;">
            <img src="${imageUrl}" alt="${escHtml(product.item_name)}" width="560"
              style="width:100%;max-width:560px;height:auto;display:block;border:0;" />
          </a>
        </td>
      </tr>`
    : "";

  const categoryRow = product.item_category
    ? `<p style="margin:0 0 6px;font-size:11px;color:#a0aec0;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">${escHtml(product.item_category)}${product.item_brand ? " · " + escHtml(product.item_brand) : ""}</p>`
    : "";

  const priceRow = priceFormatted
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
        <tr>
          <td style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:10px 20px;">
            <p style="margin:0 0 2px;font-size:10px;color:#276749;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Preço</p>
            <p style="margin:0;font-size:26px;color:#276749;font-weight:800;font-family:Arial,Helvetica,sans-serif;">${priceFormatted}</p>
          </td>
        </tr>
      </table>`
    : "";

  const bulletsHtml = copy.bullets
    .map((b) => `
      <tr>
        <td style="padding:5px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="24" style="vertical-align:top;padding-top:1px;">
                <div style="width:18px;height:18px;background:linear-gradient(135deg,#319795,#3182ce);border-radius:50%;text-align:center;line-height:18px;">
                  <span style="color:#ffffff;font-size:11px;font-weight:800;font-family:Arial,Helvetica,sans-serif;">✓</span>
                </div>
              </td>
              <td style="padding-left:10px;">
                <p style="margin:0;font-size:14px;color:#2d3748;font-family:Arial,Helvetica,sans-serif;line-height:1.45;">${escHtml(b)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escHtml(copy.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#319795 0%,#3182ce 100%);padding:20px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(fromName)}
            </p>
          </td>
        </tr>

        <!-- Hook text -->
        <tr>
          <td style="padding:36px 40px 28px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:26px;color:#1a202c;font-weight:800;line-height:1.25;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(copy.headline)}
            </h1>
            <p style="margin:0;font-size:15px;color:#718096;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(copy.body)}
            </p>
          </td>
        </tr>

        <!-- Product card -->
        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              ${imageRow}
              <tr>
                <td style="padding:22px 24px 24px;">
                  ${categoryRow}
                  <h2 style="margin:0;font-size:19px;color:#1a202c;font-weight:700;line-height:1.35;font-family:Arial,Helvetica,sans-serif;">
                    ${escHtml(product.item_name)}
                  </h2>
                  ${priceRow}

                  <!-- Benefits bullets -->
                  <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;width:100%;">
                    <tr>
                      <td style="background:#f7fafc;border-radius:10px;padding:16px 18px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          ${bulletsHtml}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Tagline -->
                  <p style="margin:16px 0 0;font-size:13px;color:#a0aec0;font-style:italic;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                    "${escHtml(copy.tagline)}"
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA button -->
        <tr>
          <td style="padding:0 40px 12px;text-align:center;">
            <a href="${safeUrl}"
              style="display:inline-block;background:linear-gradient(135deg,#319795 0%,#3182ce 100%);color:#ffffff;text-decoration:none;padding:18px 52px;border-radius:10px;font-size:17px;font-weight:800;letter-spacing:0.3px;font-family:Arial,Helvetica,sans-serif;mso-padding-alt:0;text-align:center;">
              <!--[if mso]><i style="letter-spacing:52px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
              <span style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${escHtml(copy.cta)} →</span>
              <!--[if mso]><i style="letter-spacing:52px;mso-font-width:-100%">&nbsp;</i><![endif]-->
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a0aec0;font-family:Arial,Helvetica,sans-serif;">
              Frete grátis disponível &nbsp;·&nbsp; Parcelamento em até 12x
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.8;font-family:Arial,Helvetica,sans-serif;">
              Você recebeu este email porque demonstrou interesse em nossos produtos.<br>
              <a href="{{unsubscribe_url}}" style="color:#a0aec0;text-decoration:underline;">Cancelar inscrição</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Navigation analysis ─────────────────────────────────────────────────────

export async function analyzeNavigation(
  config: Record<string, unknown>,
  viewedProducts: ProductData[],
): Promise<NavigationProfile> {
  const fallback: NavigationProfile = {
    search_query: viewedProducts[0]?.item_category ?? viewedProducts[0]?.item_name ?? "produto",
    price_min: null,
    price_max: null,
    summary:   "Produtos de interesse do cliente",
  };

  const prices = viewedProducts
    .map((p) => (p.price !== undefined && p.price !== null ? Number(p.price) : null))
    .filter((v): v is number => v !== null && v > 0);

  const productList = viewedProducts
    .slice(0, 15)
    .map((p, i) =>
      `${i + 1}. ${p.item_name}` +
      (p.item_category ? ` | categoria: ${p.item_category}` : "") +
      (p.item_brand    ? ` | marca: ${p.item_brand}` : "") +
      (p.price         ? ` | R$ ${p.price}` : "")
    )
    .join("\n");

  const prompt =
    `Você é um sistema de recomendação para e-commerce brasileiro.\n` +
    `Analise os produtos que o usuário visualizou e extraia um perfil de busca.\n` +
    `Responda SOMENTE com JSON válido, sem texto fora do JSON.\n\n` +
    `Formato exato:\n` +
    `{\n` +
    `  "search_query": "1 a 4 palavras-chave em português para buscar produtos similares",\n` +
    `  "price_min": número com 30% abaixo do menor preço visto, ou null,\n` +
    `  "price_max": número com 30% acima do maior preço visto, ou null,\n` +
    `  "summary": "frase de até 100 chars descrevendo o padrão de interesse do usuário"\n` +
    `}\n\n` +
    `Produtos visualizados pelo usuário:\n${productList}\n\n` +
    `Regras:\n` +
    `- search_query: identifique o padrão comum (ex: "camiseta masculina algodão", "tênis running", "notebook gamer")\n` +
    `- price_min/price_max: calcule com base nos preços listados; retorne null se não houver preços\n` +
    `- summary: seja específico sobre o que o usuário demonstrou interesse`;

  try {
    let text = "";

    if (config.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.content?.[0]?.text ?? "";
    } else if (config.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 256,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }

    if (text) {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const rawMin = parsed.price_min ? Number(parsed.price_min) : null;
      const rawMax = parsed.price_max ? Number(parsed.price_max) : null;
      return {
        search_query: parsed.search_query ?? fallback.search_query,
        price_min:    rawMin && rawMin > 0 ? rawMin : (prices.length > 0 ? Math.floor(Math.min(...prices) * 0.7) : null),
        price_max:    rawMax && rawMax > 0 ? rawMax : (prices.length > 0 ? Math.ceil(Math.max(...prices) * 1.3) : null),
        summary:      parsed.summary ?? fallback.summary,
      };
    }
  } catch {
    // fall through
  }

  return {
    ...fallback,
    price_min: prices.length > 0 ? Math.floor(Math.min(...prices) * 0.7) : null,
    price_max: prices.length > 0 ? Math.ceil(Math.max(...prices) * 1.3) : null,
  };
}

// ─── VTEX intelligent search ─────────────────────────────────────────────────

export async function fetchVtexBySearch(
  account: string,
  query: string,
  priceMin: number | null,
  priceMax: number | null,
  storeUrl: string | null,
  excludeIds: Set<string>,
  limit = 4,
): Promise<VitrineProductData[]> {
  const base = `https://${account}.vtexcommercestable.com.br/api/catalog_system/pub/products/search`;
  const headers = { Accept: "application/json" };

  const fetchWithParams = async (extraParams: string): Promise<VitrineProductData[]> => {
    const priceFilter = priceMin && priceMax
      ? `&fq=priceFrom:${priceMin}+TO+${priceMax}`
      : "";
    const url = `${base}?ft=${encodeURIComponent(query)}${priceFilter}${extraParams}&_from=0&_to=${limit + 3}&hideUnavailableItems=true&O=OrderByScoreDESC`;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const results: VitrineProductData[] = [];
      for (const prod of data) {
        const skuItem = prod.items?.[0];
        if (!skuItem) continue;

        const itemId = String(skuItem.itemId ?? prod.productId ?? "");
        if (!itemId || excludeIds.has(itemId)) continue;

        const imageUrl: string | null = skuItem.images?.[0]?.imageUrl ?? null;
        const rawLink: string | null = prod.link ?? null;
        const productUrl = buildProductUrlFromVtex(rawLink, storeUrl);
        const price: number | null = skuItem.sellers?.[0]?.commertialOffer?.Price ?? null;

        results.push({
          item_id:       itemId,
          item_name:     prod.productName ?? prod.items?.[0]?.name ?? "Produto",
          price:         price ?? undefined,
          item_category: prod.categories?.[0]?.replace(/^\/|\/$/g, "").split("/").pop() ?? undefined,
          item_brand:    prod.brand ?? undefined,
          imageUrl,
          productUrl,
        });

        if (results.length >= limit) break;
      }
      return results;
    } catch {
      return [];
    }
  };

  // First attempt: full-text + price filter
  let results = await fetchWithParams("");
  if (results.length >= 2) return results;

  // Second attempt: remove price filter (broader search)
  if (priceMin || priceMax) {
    const url2 = `${base}?ft=${encodeURIComponent(query)}&_from=0&_to=${limit + 3}&hideUnavailableItems=true&O=OrderByScoreDESC`;
    try {
      const res = await fetch(url2, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          results = [];
          for (const prod of data) {
            const skuItem = prod.items?.[0];
            if (!skuItem) continue;
            const itemId = String(skuItem.itemId ?? prod.productId ?? "");
            if (!itemId || excludeIds.has(itemId)) continue;
            const imageUrl: string | null = skuItem.images?.[0]?.imageUrl ?? null;
            const productUrl = buildProductUrlFromVtex(prod.link ?? null, storeUrl);
            const price: number | null = skuItem.sellers?.[0]?.commertialOffer?.Price ?? null;
            results.push({
              item_id:       itemId,
              item_name:     prod.productName ?? skuItem.name ?? "Produto",
              price:         price ?? undefined,
              item_category: prod.categories?.[0]?.replace(/^\/|\/$/g, "").split("/").pop() ?? undefined,
              item_brand:    prod.brand ?? undefined,
              imageUrl,
              productUrl,
            });
            if (results.length >= limit) break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return results;
}

function buildProductUrlFromVtex(link: string | null, storeUrl: string | null): string | null {
  if (!link) return null;
  if (link.startsWith("http")) {
    if (storeUrl) {
      try {
        const path = new URL(link).pathname;
        return `${storeUrl.replace(/\/+$/, "")}${path}`;
      } catch { /* ignore */ }
    }
    return link;
  }
  if (storeUrl) return `${storeUrl.replace(/\/+$/, "")}${link}`;
  return link;
}

// ─── Vitrine copy generation ──────────────────────────────────────────────────

export async function generateVitrineCopy(
  config: Record<string, unknown>,
  firstName: string,
  triggerProduct: ProductData,
  vitrineProducts: ProductData[],
  tipo: string,
  nicho?: string | null,
): Promise<VitrineCopy> {
  const tipoLabel =
    tipo === "vitrine_similares"    ? "produtos similares ao que o cliente viu" :
    tipo === "vitrine_combinacoes"  ? "produtos frequentemente comprados juntos" :
                                      "sugestões personalizadas para o cliente";

  const productList = vitrineProducts
    .slice(0, 4)
    .map((p, i) => `${i + 1}. ${p.item_name}${p.item_category ? ` (${p.item_category})` : ""}${p.price ? ` — R$ ${p.price}` : ""}`)
    .join("\n");

  const fallback: VitrineCopy = {
    titulo: `${firstName}, selecionamos isso para você`,
    subtitulo: tipo === "vitrine_combinacoes"
      ? `Quem comprou ${triggerProduct.item_name} também gostou desses produtos.`
      : tipo === "vitrine_similares"
      ? `Mais opções parecidas com ${triggerProduct.item_name}.`
      : "Produtos selecionados com base no seu interesse.",
    cta: "Ver produto",
    bullets: ["Entrega rápida para todo o Brasil", "Compra 100% segura e garantida", "Troca e devolução sem complicação"],
    tagline: "Explore nossa seleção especial para você.",
  };

  const prompt =
    `Você é copywriter de email marketing para e-commerce brasileiro.\n` +
    `Escreva o texto de introdução de uma vitrine de produtos.\n` +
    `Responda SOMENTE com JSON válido, sem texto fora do JSON.\n` +
    `Formato exato:\n` +
    `{\n` +
    `  "titulo": "título chamativo para a vitrine (máx 60 chars), use o nome do cliente",\n` +
    `  "subtitulo": "1-2 frases contextualizando a seleção (máx 130 chars), tom humano e direto",\n` +
    `  "cta": "texto do botão de cada produto (máx 20 chars)",\n` +
    `  "bullets": ["benefício de comprar nesta loja (máx 55 chars)", "benefício ou garantia (máx 55 chars)", "benefício de confiança ou entrega (máx 55 chars)"],\n` +
    `  "tagline": "frase de encerramento memorável (máx 80 chars)"\n` +
    `}\n\n` +
    `Contexto:\n` +
    `- Nome do cliente: ${firstName}\n` +
    `- Produto que o cliente viu: ${triggerProduct.item_name}\n` +
    `- Tipo de vitrine: ${tipoLabel}\n` +
    `${nicho ? `- Nicho do e-commerce: ${nicho}\n` : ""}` +
    `- Produtos na vitrine:\n${productList}\n\n` +
    `Regras:\n` +
    `- bullets: benefícios reais e genéricos da loja (entrega, segurança, troca), adaptados ao nicho\n` +
    `- tom: direto, humano, sem exagero\n` +
    `- não invente promoções, preços ou garantias específicas\n` +
    `- adapte ao nicho (${nicho ?? "e-commerce geral"})`;

  try {
    let text = "";

    if (config.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.content?.[0]?.text ?? "";
    } else if (config.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 400,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }

    if (text) {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const bullets: [string, string, string] =
        Array.isArray(parsed.bullets) && parsed.bullets.length >= 3
          ? [parsed.bullets[0], parsed.bullets[1], parsed.bullets[2]]
          : fallback.bullets;
      return {
        titulo:    parsed.titulo    ?? fallback.titulo,
        subtitulo: parsed.subtitulo ?? fallback.subtitulo,
        cta:       parsed.cta       ?? fallback.cta,
        bullets,
        tagline:   parsed.tagline   ?? fallback.tagline,
      };
    }
  } catch {
    // fall through to fallback
  }

  return fallback;
}

// ─── Vitrine HTML builder ─────────────────────────────────────────────────────

export function buildVitrineEmailHtml(params: {
  copy: VitrineCopy;
  triggerProduct: ProductData;
  products: VitrineProductData[];
  fromName: string;
  utm?: UtmParams;
}): string {
  const { copy, products, fromName, utm = {} } = params;

  const productCards = products.slice(0, 4).map((p) => {
    const url = appendUtm(p.productUrl ?? null, utm) ?? "#";
    const priceFormatted = p.price
      ? `R$ ${Number(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : null;

    const imgBlock = p.imageUrl
      ? `<a href="${url}" style="display:block;text-decoration:none;">
          <img src="${p.imageUrl}" alt="${escHtml(p.item_name)}" width="240"
            style="width:100%;max-width:240px;height:160px;object-fit:cover;display:block;border:0;" />
        </a>`
      : `<div style="width:100%;height:160px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;">
          <span style="color:#a0aec0;font-size:28px;">📦</span>
        </div>`;

    return `
      <td width="50%" valign="top" style="padding:8px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#ffffff;">
          <tr><td style="padding:0;line-height:0;">${imgBlock}</td></tr>
          <tr>
            <td style="padding:14px 16px 16px;">
              ${p.item_category
                ? `<p style="margin:0 0 4px;font-size:10px;color:#a0aec0;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">${escHtml(p.item_category)}${p.item_brand ? " · " + escHtml(p.item_brand) : ""}</p>`
                : ""}
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a202c;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">
                ${escHtml(p.item_name)}
              </p>
              ${priceFormatted
                ? `<p style="margin:0 0 12px;font-size:16px;font-weight:800;color:#276749;font-family:Arial,Helvetica,sans-serif;">${priceFormatted}</p>`
                : `<p style="margin:0 0 12px;"></p>`}
              <a href="${url}"
                style="display:block;background:linear-gradient(135deg,#319795 0%,#3182ce 100%);color:#ffffff;text-decoration:none;padding:9px 14px;border-radius:7px;font-size:13px;font-weight:700;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                ${escHtml(copy.cta)} →
              </a>
            </td>
          </tr>
        </table>
      </td>`;
  });

  // Pair cards into rows of 2
  const rows: string[] = [];
  for (let i = 0; i < productCards.length; i += 2) {
    const pair = productCards.slice(i, i + 2);
    if (pair.length === 1) pair.push(`<td width="50%" style="padding:8px;"></td>`);
    rows.push(`<tr>${pair.join("")}</tr>`);
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(copy.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:40px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
        style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#319795 0%,#3182ce 100%);padding:20px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(fromName)}
            </p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:32px 40px 16px;text-align:center;">
            <h1 style="margin:0 0 10px;font-size:24px;color:#1a202c;font-weight:800;line-height:1.25;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(copy.titulo)}
            </h1>
            <p style="margin:0;font-size:15px;color:#718096;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              ${escHtml(copy.subtitulo)}
            </p>
          </td>
        </tr>

        <!-- Product grid -->
        <tr>
          <td style="padding:12px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${rows.join("")}
            </table>
          </td>
        </tr>

        <!-- Benefits bullets -->
        <tr>
          <td style="padding:4px 32px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="background:#f7fafc;border-radius:10px;padding:14px 18px;">
              <tr>
                ${copy.bullets.map((b) => `
                <td width="33%" style="vertical-align:top;padding:6px 8px;text-align:center;">
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                    <tr>
                      <td style="vertical-align:top;padding-top:1px;padding-right:6px;">
                        <div style="width:18px;height:18px;background:linear-gradient(135deg,#319795,#3182ce);border-radius:50%;text-align:center;line-height:18px;display:inline-block;">
                          <span style="color:#ffffff;font-size:11px;font-weight:800;font-family:Arial,Helvetica,sans-serif;">✓</span>
                        </div>
                      </td>
                      <td>
                        <p style="margin:0;font-size:12px;color:#2d3748;font-family:Arial,Helvetica,sans-serif;line-height:1.4;text-align:left;">${escHtml(b)}</p>
                      </td>
                    </tr>
                  </table>
                </td>`).join("")}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tagline -->
        <tr>
          <td style="padding:16px 40px 36px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#a0aec0;font-style:italic;font-family:Arial,Helvetica,sans-serif;">
              "${escHtml(copy.tagline)}"
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.8;font-family:Arial,Helvetica,sans-serif;">
              Você recebeu este email porque demonstrou interesse em nossos produtos.<br>
              <a href="{{unsubscribe_url}}" style="color:#a0aec0;text-decoration:underline;">Cancelar inscrição</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Vitrine inteligente copy generation ─────────────────────────────────────

export async function generateVitrineCopyInteligente(
  config: Record<string, unknown>,
  firstName: string,
  navigationSummary: string,
  products: ProductData[],
  nicho: string | null,
): Promise<VitrineCopy> {
  const productList = products
    .slice(0, 4)
    .map((p, i) => `${i + 1}. ${p.item_name}${p.item_category ? ` (${p.item_category})` : ""}${p.price ? ` — R$ ${p.price}` : ""}`)
    .join("\n");

  const fallback: VitrineCopy = {
    titulo:    `${firstName}, encontramos algo para você`,
    subtitulo: `Baseado no que você navegou, selecionamos esses produtos.`,
    cta:       "Ver produto",
    bullets:   ["Entrega rápida para todo o Brasil", "Compra 100% segura e garantida", "Troca e devolução sem complicação"],
    tagline:   "Seleção personalizada com base nos seus interesses.",
  };

  const prompt =
    `Você é copywriter de email marketing para e-commerce brasileiro.\n` +
    `Escreva o texto de uma vitrine de recomendações personalizadas.\n` +
    `Responda SOMENTE com JSON válido.\n\n` +
    `Formato:\n` +
    `{\n` +
    `  "titulo": "título personalizado (máx 60 chars), use o nome do cliente",\n` +
    `  "subtitulo": "1-2 frases conectando o interesse do cliente com os produtos (máx 130 chars)",\n` +
    `  "cta": "texto do botão (máx 20 chars)",\n` +
    `  "bullets": ["benefício de comprar nesta loja (máx 55 chars)", "benefício ou garantia (máx 55 chars)", "benefício de confiança ou entrega (máx 55 chars)"],\n` +
    `  "tagline": "frase de encerramento (máx 80 chars)"\n` +
    `}\n\n` +
    `Contexto:\n` +
    `- Nome do cliente: ${firstName}\n` +
    `- Padrão de navegação identificado: ${navigationSummary}\n` +
    `${nicho ? `- Nicho: ${nicho}\n` : ""}` +
    `- Produtos recomendados:\n${productList}\n\n` +
    `Regras:\n` +
    `- bullets: benefícios reais e genéricos da loja, adaptados ao nicho\n` +
    `- tom humano e direto, sem inventar promoções`;

  try {
    let text = "";
    if (config.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.content?.[0]?.text ?? "";
    } else if (config.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }
    if (text) {
      const p = JSON.parse(text.replace(/```json|```/g, "").trim());
      const bullets: [string, string, string] =
        Array.isArray(p.bullets) && p.bullets.length >= 3
          ? [p.bullets[0], p.bullets[1], p.bullets[2]]
          : fallback.bullets;
      return {
        titulo:    p.titulo    ?? fallback.titulo,
        subtitulo: p.subtitulo ?? fallback.subtitulo,
        cta:       p.cta       ?? fallback.cta,
        bullets,
        tagline:   p.tagline   ?? fallback.tagline,
      };
    }
  } catch { /* fallback */ }

  return fallback;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
