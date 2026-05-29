import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const TIPO = "produtos_sem_conversao";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProdutoFunil {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  preco_atual?: number;
  views: number;
  cart_adds: number;
  purchases: number;
  taxa_view_cart: number;    // cart_adds / views
  taxa_cart_compra: number;  // purchases / cart_adds (or 0 if cart_adds=0)
  taxa_conversao: number;    // purchases / views
}

interface ProdutoAnalise extends ProdutoFunil {
  analise: string;
  sugestao: string;
  gargalo: "interesse" | "intencao" | "ambos";
}

interface AnaliseResult {
  resumo: string;
  produtos: ProdutoAnalise[];
  oportunidade?: string;
  media_conversao_loja: number;
  total_produtos_analisados: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { cliente_id, forcar_refresh = false } = body as {
      cliente_id: string;
      forcar_refresh?: boolean;
    };

    if (!cliente_id) return json({ error: "cliente_id obrigatório" }, 400);

    // ── 1. Check cache ──────────────────────────────────────────────────────
    if (!forcar_refresh) {
      const { data: cached } = await sb
        .from("crm_analytics_cache")
        .select("resultado, gerado_em")
        .eq("cliente_id", cliente_id)
        .eq("tipo", TIPO)
        .maybeSingle();

      if (cached) {
        const age = Date.now() - new Date(cached.gerado_em).getTime();
        if (age < CACHE_TTL_MS) {
          return json({
            ...cached.resultado,
            gerado_em: cached.gerado_em,
            from_cache: true,
            cache_age_min: Math.floor(age / 60000),
          }, 200);
        }
      }
    }

    // ── 2. Load AI config ───────────────────────────────────────────────────
    const { data: config } = await sb
      .from("config_plataforma")
      .select("ia_provedor, ia_anthropic_key, ia_openai_key")
      .eq("id", "main")
      .single();

    // ── 3. Load products with enough views ──────────────────────────────────
    const { data: rawProducts, error: prodErr } = await sb
      .from("crm_products")
      .select("item_id, item_name, item_category, item_brand, preco_atual, views, cart_adds, purchases")
      .eq("cliente_id", cliente_id)
      .gte("views", 5)
      .order("views", { ascending: false })
      .limit(100);

    if (prodErr || !rawProducts?.length) {
      return json({ error: "Dados insuficientes para análise (mínimo 5 visualizações por produto)" }, 400);
    }

    // ── 4. Compute store-level funnel metrics ───────────────────────────────
    const totalViews     = rawProducts.reduce((s, p) => s + p.views,     0);
    const totalCartAdds  = rawProducts.reduce((s, p) => s + p.cart_adds, 0);
    const totalPurchases = rawProducts.reduce((s, p) => s + p.purchases, 0);

    const mediaViewCart   = totalViews    > 0 ? totalCartAdds  / totalViews    : 0;
    const mediaCartCompra = totalCartAdds > 0 ? totalPurchases / totalCartAdds : 0;
    const mediaConversao  = totalViews    > 0 ? totalPurchases / totalViews    : 0;

    // Build funnel per product
    const funil: ProdutoFunil[] = rawProducts.map((p) => ({
      item_id:          p.item_id,
      item_name:        p.item_name,
      item_category:    p.item_category ?? undefined,
      item_brand:       p.item_brand ?? undefined,
      preco_atual:      p.preco_atual ?? undefined,
      views:            p.views,
      cart_adds:        p.cart_adds,
      purchases:        p.purchases,
      taxa_view_cart:   p.views    > 0 ? p.cart_adds  / p.views    : 0,
      taxa_cart_compra: p.cart_adds > 0 ? p.purchases / p.cart_adds : 0,
      taxa_conversao:   p.views    > 0 ? p.purchases  / p.views    : 0,
    }));

    // ── 5. Identify candidates: high views, conversion < 50% of store avg ──
    const limiarConversao = mediaConversao * 0.5;
    const limiarViews     = Math.max(10, totalViews / rawProducts.length * 0.5);

    const candidatos = funil
      .filter((p) =>
        p.views >= limiarViews &&
        p.taxa_conversao < limiarConversao &&
        // At least some meaningful gap to analyze
        (p.views > p.purchases * 5)
      )
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    if (candidatos.length === 0) {
      const resultado: AnaliseResult = {
        resumo: "Todos os produtos analisados estão com taxa de conversão próxima ou acima da média da loja. Bom trabalho!",
        produtos: [],
        media_conversao_loja: mediaConversao,
        total_produtos_analisados: rawProducts.length,
      };
      await upsertCache(sb, cliente_id, resultado);
      return json({ ...resultado, gerado_em: new Date().toISOString(), from_cache: false }, 200);
    }

    // ── 6. Classify gargalo per product ────────────────────────────────────
    const candidatosComGargalo = candidatos.map((p) => {
      const baixoInteresse = p.taxa_view_cart < mediaViewCart * 0.5;
      const baixaIntencao  = p.cart_adds > 0 && p.taxa_cart_compra < mediaCartCompra * 0.5;
      const gargalo: ProdutoAnalise["gargalo"] =
        baixoInteresse && baixaIntencao ? "ambos" :
        baixoInteresse ? "interesse" : "intencao";

      return { ...p, gargalo, analise: "", sugestao: "" };
    });

    // ── 7. Generate AI insights ─────────────────────────────────────────────
    const produtosList = candidatosComGargalo
      .map((p, i) => {
        const convPct  = (p.taxa_conversao  * 100).toFixed(2);
        const vcPct    = (p.taxa_view_cart   * 100).toFixed(1);
        const cpPct    = (p.taxa_cart_compra * 100).toFixed(1);
        const mediaStr = (mediaConversao * 100).toFixed(2);
        return (
          `${i + 1}. "${p.item_name}"` +
          (p.item_category ? ` [${p.item_category}]` : "") +
          (p.item_brand    ? ` / ${p.item_brand}` : "") +
          (p.preco_atual   ? ` — R$ ${p.preco_atual.toFixed(2)}` : "") +
          `\n   Views: ${p.views} | Add ao carrinho: ${p.cart_adds} | Compras: ${p.purchases}` +
          `\n   View→Carrinho: ${vcPct}% | Carrinho→Compra: ${cpPct}% | Conversão total: ${convPct}% (média loja: ${mediaStr}%)` +
          `\n   Gargalo identificado: ${p.gargalo === "interesse" ? "baixa intenção de compra (poucas adições ao carrinho)" : p.gargalo === "intencao" ? "abandono de carrinho (adicionaram mas não compraram)" : "ambos os estágios do funil"}`
        );
      })
      .join("\n\n");

    const prompt =
      `Você é analista sênior de e-commerce e otimização de conversão, especialista no mercado brasileiro.\n` +
      `Analise os dados de produtos com alto interesse e baixa conversão e forneça insights acionáveis.\n` +
      `Responda SOMENTE com JSON válido.\n\n` +
      `Formato exato:\n` +
      `{\n` +
      `  "resumo": "parágrafo de 2-3 frases resumindo o cenário geral e a principal oportunidade",\n` +
      `  "produtos": [\n` +
      `    {\n` +
      `      "item_id": "id do produto",\n` +
      `      "analise": "diagnóstico em 2-3 frases: por que esse produto não converte? considere o funil, o preço, a categoria e o gargalo identificado",\n` +
      `      "sugestao": "1 ação concreta e específica para aumentar a conversão desse produto"\n` +
      `    }\n` +
      `  ],\n` +
      `  "oportunidade": "estimativa em 1 frase do impacto financeiro potencial se esses produtos chegarem à média da loja (use os dados de preço disponíveis)"\n` +
      `}\n\n` +
      `Contexto da loja:\n` +
      `- Taxa média de conversão: ${(mediaConversao * 100).toFixed(2)}%\n` +
      `- Taxa média view→carrinho: ${(mediaViewCart * 100).toFixed(1)}%\n` +
      `- Taxa média carrinho→compra: ${(mediaCartCompra * 100).toFixed(1)}%\n` +
      `- Total de produtos no catálogo: ${rawProducts.length}\n\n` +
      `Produtos com baixa conversão:\n\n${produtosList}\n\n` +
      `Regras:\n` +
      `- Seja específico: não diga "otimize a descrição", diga o que está errado e por quê\n` +
      `- Considere o gargalo identificado: interesse baixo = problema na página do produto; intenção baixa = problema no checkout/confiança\n` +
      `- Sugestão deve incluir o CRM quando fizer sentido (ex: "criar automação de email 30min após a visita com prova social")\n` +
      `- Não invente dados que não estão nos inputs`;

    let aiRaw = "";

    if (config?.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      aiRaw = data.content?.[0]?.text ?? "";
    } else if (config?.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      aiRaw = data.choices?.[0]?.message?.content ?? "";
    }

    // ── 8. Merge AI output with funnel data ─────────────────────────────────
    let aiJson: { resumo?: string; produtos?: { item_id: string; analise: string; sugestao: string }[]; oportunidade?: string } = {};
    try {
      aiJson = JSON.parse(aiRaw.replace(/```json|```/g, "").trim());
    } catch { /* fall through with empty insights */ }

    const aiByProduct = new Map(
      (aiJson.produtos ?? []).map((p) => [p.item_id, p]),
    );

    const produtosFinais: ProdutoAnalise[] = candidatosComGargalo.map((p) => {
      const ai = aiByProduct.get(p.item_id);
      return {
        ...p,
        analise:  ai?.analise  ?? "Produto com alto volume de visualizações e conversão abaixo da média da loja.",
        sugestao: ai?.sugestao ?? "Revisar a página do produto e criar automação de recuperação por email.",
      };
    });

    const resultado: AnaliseResult = {
      resumo:                    aiJson.resumo ?? `${candidatos.length} produto(s) com potencial de conversão não explorado identificados.`,
      produtos:                  produtosFinais,
      oportunidade:              aiJson.oportunidade,
      media_conversao_loja:      mediaConversao,
      total_produtos_analisados: rawProducts.length,
    };

    // ── 9. Persist cache ────────────────────────────────────────────────────
    await upsertCache(sb, cliente_id, resultado);

    const gerado_em = new Date().toISOString();
    return json({ ...resultado, gerado_em, from_cache: false }, 200);

  } catch (err) {
    console.error("crm-analytics error:", err);
    return json({ error: "Erro interno na análise" }, 500);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertCache(
  sb: ReturnType<typeof createClient>,
  clienteId: string,
  resultado: AnaliseResult,
) {
  await sb
    .from("crm_analytics_cache")
    .upsert(
      { cliente_id: clienteId, tipo: TIPO, resultado, gerado_em: new Date().toISOString() },
      { onConflict: "cliente_id,tipo" },
    );
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
