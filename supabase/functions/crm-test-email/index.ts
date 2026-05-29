import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get platform config (API keys)
    const { data: cfg } = await supabase
      .from("config_plataforma")
      .select("resend_api_key, resend_from_email, resend_from_name")
      .eq("id", "main")
      .single();

    if (!cfg?.resend_api_key || !cfg?.resend_from_email) {
      return new Response(
        JSON.stringify({ error: "Resend não configurado. Preencha a API key e o email de envio." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Get requesting user's email from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const toEmail = user?.email;

    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: "Usuário sem email cadastrado." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.resend_from_name} <${cfg.resend_from_email}>`,
        to: [toEmail],
        subject: "SmartCRM — Teste de email",
        html: `<div style="font-family:sans-serif;padding:32px;max-width:500px">
          <h2 style="color:#319795">Funcionou!</h2>
          <p>O envio de emails do SmartCRM está configurado corretamente.</p>
          <p style="color:#718096;font-size:14px">De: ${cfg.resend_from_name} &lt;${cfg.resend_from_email}&gt;</p>
          <p style="color:#718096;font-size:14px">Para: ${toEmail}</p>
        </div>`,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: body.message ?? JSON.stringify(body) }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, to: toEmail }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
