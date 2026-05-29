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
    const { form_token, email, nome, telefone, pagina, session_id, origem, origem_detalhe } = body;

    if (!form_token || !email) {
      return json({ error: "form_token e email são obrigatórios" }, 400);
    }

    const emailNorm = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return json({ error: "Email inválido" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the form by public_token
    const { data: form, error: formErr } = await sb
      .from("crm_forms")
      .select("id, cliente_id, projeto_id")
      .eq("public_token", form_token)
      .eq("ativo", true)
      .maybeSingle();

    if (formErr || !form) {
      return json({ error: "Formulário não encontrado" }, 404);
    }

    // Check if contact already exists for this client+email
    const { data: existing } = await sb
      .from("crm_contacts")
      .select("id, nome, telefone")
      .eq("cliente_id", form.cliente_id)
      .eq("email", emailNorm)
      .maybeSingle();

    let contactId: string;

    if (existing) {
      contactId = existing.id;

      // Update nome/telefone only if missing
      const updates: Record<string, string> = {};
      if (!existing.nome && nome) updates.nome = String(nome).trim();
      if (!existing.telefone && telefone) updates.telefone = String(telefone).trim();
      if (Object.keys(updates).length > 0) {
        await sb.from("crm_contacts").update(updates).eq("id", existing.id);
      }
    } else {
      // Insert new contact
      const { data: inserted, error: insertErr } = await sb
        .from("crm_contacts")
        .insert({
          cliente_id: form.cliente_id,
          projeto_id: form.projeto_id ?? null,
          form_id: form.id,
          email: emailNorm,
          nome: nome ? String(nome).trim() : null,
          telefone: telefone ? String(telefone).trim() : null,
          origem: origem ?? "form",
          origem_detalhe: origem_detalhe ?? null,
          pagina: pagina ?? null,
          session_id: session_id ?? null,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error("crm-capture insert error:", insertErr?.message);
        return json({ error: "Erro ao salvar contato" }, 500);
      }

      contactId = inserted.id;

      // Backfill: link any anonymous events from the same session to this contact
      if (session_id) {
        await sb
          .from("crm_events")
          .update({ contact_id: contactId })
          .eq("session_id", session_id)
          .is("contact_id", null);
      }
    }

    return json({ ok: true, contact_id: contactId }, 200);
  } catch (err) {
    console.error("crm-capture error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
