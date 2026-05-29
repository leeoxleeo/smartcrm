import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_TIPO   = "rfm_segmentos";

// ─── Types ────────────────────────────────────────────────────────────────────

type Segmento =
  | "champion" | "loyal" | "potential_loyalist" | "new_customer"
  | "promising" | "need_attention" | "at_risk" | "cant_lose"
  | "hibernating" | "lost";

interface ContactRfm {
  contact_id: string;
  r_days: number;       // days since last purchase (lower = more recent)
  f_count: number;      // purchase count
  m_value: number;      // total purchase value
  ultima_compra: string | null;
  r_score: number;      // 1–5
  f_score: number;      // 1–5
  m_score: number;      // 1–5
  segmento: Segmento;
}

interface SegmentSummary {
  segmento: Segmento;
  count: number;
  valor_total: number;
  valor_medio: number;
  frequencia_media: number;
}

// ─── Segment classification ───────────────────────────────────────────────────

function classify(r: number, f: number, m: number): Segmento {
  if (r >= 4 && f >= 4 && m >= 4) return "champion";
  if (r >= 3 && f >= 4)           return "loyal";
  if (r >= 4 && f >= 2)           return "potential_loyalist";
  if (r >= 4 && f === 1)          return "new_customer";
  if (r >= 3 && f <= 2)           return "promising";
  if (r >= 2 && f >= 2 && m <= 3) return "need_attention";
  if (r <= 2 && f >= 3)           return "at_risk";
  if (r === 1 && f >= 4)          return "cant_lose";
  if (r <= 2 && f <= 2)           return "hibernating";
  return "lost";
}

// NTILE(5): assign score 1–5 based on ascending rank
// higherIsBetter=true → highest value gets score 5
function ntile5(values: number[], higherIsBetter: boolean): number[] {
  if (values.length === 0) return [];
  const indexed = values.map((v, i) => ({ v, i }));
  const sorted = [...indexed].sort((a, b) => a.v - b.v);
  const scores = new Array(values.length).fill(0);
  sorted.forEach(({ i }, rank) => {
    const tile = Math.ceil(((rank + 1) / values.length) * 5);
    scores[i] = higherIsBetter ? tile : 6 - tile;
  });
  return scores;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

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

    // ── 1. Cache check ──────────────────────────────────────────────────────
    if (!forcar_refresh) {
      const { data: cached } = await sb
        .from("crm_analytics_cache")
        .select("resultado, gerado_em")
        .eq("cliente_id", cliente_id)
        .eq("tipo", CACHE_TIPO)
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

    // ── 3. Load purchase aggregates per contact ─────────────────────────────
    // We aggregate in JS since Supabase JS client doesn't support GROUP BY directly
    const { data: events } = await sb
      .from("crm_events")
      .select("contact_id, criado_em, payload")
      .eq("cliente_id", cliente_id)
      .eq("tipo", "purchase")
      .not("contact_id", "is", null)
      .order("criado_em", { ascending: false });

    if (!events?.length) {
      return json({ error: "Nenhuma compra registrada para análise RFM" }, 400);
    }

    // Aggregate per contact
    const now = Date.now();
    const map = new Map<string, { lastDate: number; count: number; value: number }>();

    for (const ev of events) {
      const cid = ev.contact_id as string;
      const date = new Date(ev.criado_em as string).getTime();
      const value = extractValue(ev.payload as Record<string, unknown>);

      const existing = map.get(cid);
      if (!existing) {
        map.set(cid, { lastDate: date, count: 1, value });
      } else {
        map.set(cid, {
          lastDate: Math.max(existing.lastDate, date),
          count:    existing.count + 1,
          value:    existing.value + value,
        });
      }
    }

    if (map.size < 2) {
      return json({ error: "São necessários ao menos 2 compradores para análise RFM" }, 400);
    }

    const contactIds = [...map.keys()];
    const rDays  = contactIds.map((id) => Math.floor((now - map.get(id)!.lastDate) / 86400000));
    const fCounts = contactIds.map((id) => map.get(id)!.count);
    const mValues = contactIds.map((id) => map.get(id)!.value);

    // ── 4. Score 1–5 via NTILE ──────────────────────────────────────────────
    const rScores = ntile5(rDays,   false); // lower days = more recent = better
    const fScores = ntile5(fCounts, true);
    const mScores = ntile5(mValues, true);

    // ── 5. Classify & build records ─────────────────────────────────────────
    const contacts: ContactRfm[] = contactIds.map((cid, i) => ({
      contact_id:    cid,
      r_days:        rDays[i],
      f_count:       fCounts[i],
      m_value:       mValues[i],
      ultima_compra: new Date(map.get(cid)!.lastDate).toISOString(),
      r_score:       rScores[i],
      f_score:       fScores[i],
      m_score:       mScores[i],
      segmento:      classify(rScores[i], fScores[i], mScores[i]),
    }));

    // ── 6. Upsert to crm_rfm_scores ─────────────────────────────────────────
    const upsertRows = contacts.map((c) => ({
      cliente_id:    cliente_id,
      contact_id:    c.contact_id,
      r_score:       c.r_score,
      f_score:       c.f_score,
      m_score:       c.m_score,
      rfm_combo:     `${c.r_score}${c.f_score}${c.m_score}`,
      segmento:      c.segmento,
      ultima_compra: c.ultima_compra,
      frequencia:    c.f_count,
      valor_total:   c.m_value,
      calculado_em:  new Date().toISOString(),
    }));

    // Batch upsert in chunks of 500
    for (let i = 0; i < upsertRows.length; i += 500) {
      await sb
        .from("crm_rfm_scores")
        .upsert(upsertRows.slice(i, i + 500), { onConflict: "cliente_id,contact_id" });
    }

    // ── 7. Build segment summary ─────────────────────────────────────────────
    const segMap = new Map<Segmento, { count: number; value: number; freq: number }>();
    for (const c of contacts) {
      const s = segMap.get(c.segmento) ?? { count: 0, value: 0, freq: 0 };
      segMap.set(c.segmento, {
        count: s.count + 1,
        value: s.value + c.m_value,
        freq:  s.freq  + c.f_count,
      });
    }

    const segmentos: SegmentSummary[] = [...segMap.entries()]
      .map(([segmento, s]) => ({
        segmento,
        count:            s.count,
        valor_total:      s.value,
        valor_medio:      s.count > 0 ? s.value / s.count : 0,
        frequencia_media: s.count > 0 ? s.freq  / s.count : 0,
      }))
      .sort((a, b) => b.valor_total - a.valor_total);

    const receita_total      = contacts.reduce((s, c) => s + c.m_value, 0);
    const total_compradores  = contacts.length;

    // ── 8. AI insight ───────────────────────────────────────────────────────
    const insight_ia = await generateRfmInsight(config, segmentos, total_compradores, receita_total);

    // ── 9. Cache & return ───────────────────────────────────────────────────
    const resultado = { segmentos, total_compradores, receita_total, insight_ia };

    await sb
      .from("crm_analytics_cache")
      .upsert(
        { cliente_id, tipo: CACHE_TIPO, resultado, gerado_em: new Date().toISOString() },
        { onConflict: "cliente_id,tipo" },
      );

    return json({ ...resultado, gerado_em: new Date().toISOString(), from_cache: false }, 200);

  } catch (err) {
    console.error("crm-rfm error:", err);
    return json({ error: "Erro interno no cálculo RFM" }, 500);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractValue(payload: Record<string, unknown>): number {
  const direct = Number(payload?.value ?? 0);
  if (direct > 0) return direct;

  let total = 0;
  const items = payload?.items as Record<string, unknown>[] | undefined;
  if (Array.isArray(items)) {
    for (const item of items) {
      const price = Number(item?.price ?? 0);
      const qty   = Math.max(Number(item?.quantity ?? 1), 1);
      total += price * qty;
    }
  }
  return total;
}

async function generateRfmInsight(
  config: Record<string, unknown> | null,
  segmentos: SegmentSummary[],
  totalCompradores: number,
  receitaTotal: number,
): Promise<string> {
  const segLabel: Record<Segmento, string> = {
    champion:           "Campeões",
    loyal:              "Leais",
    potential_loyalist: "Potencialmente Leais",
    new_customer:       "Novos Clientes",
    promising:          "Promissores",
    need_attention:     "Precisam de Atenção",
    at_risk:            "Em Risco",
    cant_lose:          "Não Podem Perder",
    hibernating:        "Hibernando",
    lost:               "Perdidos",
  };

  const top3 = segmentos.slice(0, 5)
    .map((s) => `${segLabel[s.segmento]}: ${s.count} clientes, R$${s.valor_total.toFixed(0)} de receita, média ${s.frequencia_media.toFixed(1)} compras`)
    .join("\n");

  const prompt =
    `Você é analista sênior de CRM para e-commerce brasileiro.\n` +
    `Analise a distribuição RFM abaixo e gere 2-3 frases de insight acionável.\n\n` +
    `Total de compradores: ${totalCompradores}\n` +
    `Receita total: R$ ${receitaTotal.toFixed(2)}\n\n` +
    `Top segmentos por receita:\n${top3}\n\n` +
    `Regras:\n` +
    `- Foco em oportunidades concretas (ex: "X% da receita está em risco — campanha de reativação prioritária")\n` +
    `- Inclua 1 ação específica para o segmento mais crítico\n` +
    `- Máximo 3 frases, linguagem direta`;

  try {
    if (config?.ia_provedor === "claude" && config.ia_anthropic_key) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-api-key":       config.ia_anthropic_key as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 200,
          messages:   [{ role: "user", content: prompt }],
        }),
      });
      const d = await res.json();
      return d.content?.[0]?.text?.trim() ?? "";
    } else if (config?.ia_provedor === "openai" && config.ia_openai_key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${config.ia_openai_key as string}`,
        },
        body: JSON.stringify({
          model:      "gpt-4o-mini",
          max_tokens: 200,
          messages:   [{ role: "user", content: prompt }],
        }),
      });
      const d = await res.json();
      return d.choices?.[0]?.message?.content?.trim() ?? "";
    }
  } catch { /* fallback */ }

  return "";
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
