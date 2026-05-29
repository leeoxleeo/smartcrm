import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  try {
    const body = await req.json();
    const { session_id, email, tipo, payload, pagina } = body;

    if (!tipo) {
      return json({ error: "tipo é obrigatório" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve contact and cliente_id from email
    let cliente_id: string | null = null;
    let contact_id: string | null = null;

    if (email) {
      const emailNorm = String(email).toLowerCase().trim();
      const { data: contact } = await sb
        .from("crm_contacts")
        .select("id, cliente_id")
        .eq("email", emailNorm)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contact) {
        cliente_id = contact.cliente_id;
        contact_id = contact.id;
      }
    }

    // crm_events.cliente_id is NOT NULL — skip if unresolvable
    if (!cliente_id) {
      return json({ ok: true, skipped: true }, 200);
    }

    const { error: insertErr } = await sb.from("crm_events").insert({
      cliente_id,
      contact_id,
      session_id: session_id ?? null,
      tipo,
      payload: payload ?? {},
      pagina: pagina ?? null,
    });

    if (insertErr) {
      console.error("crm-event insert error:", insertErr.message);
      return json({ error: "Erro ao salvar evento" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("crm-event error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
