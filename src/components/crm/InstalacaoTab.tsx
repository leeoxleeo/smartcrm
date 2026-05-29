"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { CrmForm } from "@/lib/types";
import { toaster } from "@/lib/toaster";

interface Props {
  forms: CrmForm[];
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  function copy() {
    navigator.clipboard.writeText(code);
    toaster.create({ title: "Copiado!", type: "success" });
  }
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="xs" color="whiteAlpha.500" fontWeight="medium">{label}</Text>
        <Button size="xs" variant="ghost" color="teal.400" onClick={copy}>Copiar</Button>
      </Flex>
      <Box bg="#0d0d0d" border="1px solid" borderColor="whiteAlpha.100" borderRadius="lg" p={4} overflowX="auto">
        <Text as="pre" fontSize="xs" color="teal.200" fontFamily="mono" whiteSpace="pre">{code}</Text>
      </Box>
    </Box>
  );
}

// Script global de sessão + tracker de eventos
function gerarScriptGlobal(supabaseUrl: string) {
  return `<!-- SmartCRM: Script Global (adicionar em todas as páginas, antes de </body>) -->
<script>
(function() {
  var SESSION_KEY = 'smcrm_session';
  var TTL = 30 * 24 * 60 * 60 * 1000;

  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && Date.now() - s.t < TTL) return s.id;
    } catch(e) {}
    var id = 'sess_' + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, t: Date.now() }));
    return id;
  }

  window.SmartCRM = {
    sessionId: getSession(),
    email: null,
    identify: function(email) {
      this.email = email;
      try { localStorage.setItem('smcrm_email', email); } catch(e) {}
    },
    track: function(tipo, payload) {
      if (!this.email) return;
      fetch('${supabaseUrl}/functions/v1/crm-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          email: this.email,
          tipo: tipo,
          payload: payload || {},
          pagina: window.location.href
        })
      }).catch(function(){});
    }
  };

  // Recupera email identificado em sessão anterior
  try {
    var savedEmail = localStorage.getItem('smcrm_email');
    if (savedEmail) window.SmartCRM.email = savedEmail;
  } catch(e) {}
})();
</script>`;
}

// Script de captura passiva: observa submits de formulários existentes na página
function gerarScriptCaptura(form: CrmForm, supabaseUrl: string) {
  const capturarNome = form.campo_nome;
  const capturarTelefone = form.campo_telefone;

  return `<!-- SmartCRM: Captura de Formulário — ${form.nome} (${form.public_token}) -->
<!-- Adicionar em todas as páginas onde existem formulários com email -->
<script>
(function() {
  var FORM_TOKEN = '${form.public_token}';
  var ENDPOINT = '${supabaseUrl}/functions/v1/crm-capture';
  var captured = {};

  function isEmailInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    var type = (el.type || '').toLowerCase();
    var name = (el.name || el.id || '').toLowerCase();
    return type === 'email' || name.includes('email') || name.includes('e-mail');
  }

  ${capturarNome ? `function findNome(form) {
    var selectors = ['input[name*="nome"]','input[name*="name"]','input[id*="nome"]',
      'input[name*="first"]','input[name*="primeiro"]'];
    for (var i = 0; i < selectors.length; i++) {
      var el = form.querySelector(selectors[i]);
      if (el && el.value) return el.value.trim();
    }
    return null;
  }` : ""}

  ${capturarTelefone ? `function findTelefone(form) {
    var selectors = ['input[type="tel"]','input[name*="tel"]','input[name*="phone"]',
      'input[name*="fone"]','input[name*="celular"]','input[id*="tel"]'];
    for (var i = 0; i < selectors.length; i++) {
      var el = form.querySelector(selectors[i]);
      if (el && el.value) return el.value.trim();
    }
    return null;
  }` : ""}

  function sendCapture(email, extraData) {
    if (captured[email]) return;
    captured[email] = true;
    var payload = {
      form_token: FORM_TOKEN,
      email: email,
      pagina: window.location.href,
      session_id: window.SmartCRM ? window.SmartCRM.sessionId : null,
      origem: 'form'
    };
    if (extraData) {
      for (var k in extraData) {
        if (Object.prototype.hasOwnProperty.call(extraData, k)) {
          payload[k] = extraData[k];
        }
      }
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(){});
    if (window.SmartCRM) window.SmartCRM.identify(email);
  }

  // 1. Captura no submit do formulário
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    var inputs = form.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      if (isEmailInput(inputs[i]) && inputs[i].value) {
        var email = inputs[i].value.trim();
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) continue;
        sendCapture(email, {
          ${capturarNome ? `nome: findNome(form),` : ""}
          ${capturarTelefone ? `telefone: findTelefone(form),` : ""}
          origem_detalhe: form.id || form.name || form.action || 'submit'
        });
        break;
      }
    }
  }, true);

  // 2. Pré-identifica ao sair de input de email (blur)
  document.addEventListener('blur', function(e) {
    var el = e.target;
    if (!isEmailInput(el) || !el.value) return;
    var email = el.value.trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return;
    if (window.SmartCRM && !window.SmartCRM.email) {
      window.SmartCRM.identify(email);
    }
  }, true);
})();
</script>`;
}

// Script de popup/inline/flyout com trigger configurável
function gerarScriptPopup(form: CrmForm, supabaseUrl: string) {
  const triggerCode = form.trigger_tipo === "time"
    ? `setTimeout(showForm, ${form.trigger_valor ?? 5000});`
    : form.trigger_tipo === "scroll"
    ? `window.addEventListener('scroll', function() {\n    if ((window.scrollY / document.body.scrollHeight * 100) >= ${form.trigger_valor ?? 50}) showForm();\n  }, { once: true });`
    : form.trigger_tipo === "exit_intent"
    ? `document.addEventListener('mouseleave', function(e) { if (e.clientY < 0) showForm(); }, { once: true });`
    : `// Tipo manual: chame window.smcrm_${form.public_token}_show() via GTM ou código`;

  const nomeCampo = form.campo_nome
    ? `'<input id="smcrm-nome" type="text" placeholder="Seu nome" style="width:100%;padding:10px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:white;font-size:14px;box-sizing:border-box;margin-bottom:8px" />' +`
    : "";

  const telCampo = form.campo_telefone
    ? `'<input id="smcrm-tel" type="tel" placeholder="Telefone" style="width:100%;padding:10px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:white;font-size:14px;box-sizing:border-box;margin-bottom:8px" />' +`
    : "";

  return `<!-- SmartCRM: ${form.tipo} — ${form.nome} (${form.public_token}) -->
<script>
(function() {
  var shown = false;
  function showForm() {
    if (shown || sessionStorage.getItem('smcrm_${form.public_token}')) return;
    shown = true;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML =
      '<div style="background:#1a1a1a;border-radius:16px;padding:32px;max-width:420px;width:90%;border:1px solid rgba(255,255,255,.1)">' +
      '<h3 style="color:white;margin:0 0 8px;font-size:18px">${form.titulo || ""}</h3>' +
      ${form.subtitulo ? `'<p style="color:rgba(255,255,255,.6);font-size:14px;margin:0 0 16px">${form.subtitulo}</p>' +` : ""}
      ${nomeCampo}
      '<input id="smcrm-email" type="email" placeholder="seu@email.com" required style="width:100%;padding:10px 12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:white;font-size:14px;box-sizing:border-box;margin-bottom:8px" />' +
      ${telCampo}
      '<button onclick="smcrm_${form.public_token}_submit()" style="width:100%;padding:12px;background:linear-gradient(135deg,#319795,#3182ce);color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">${form.cta_texto}</button>' +
      '<button onclick="this.closest(\\'[style*=fixed]\\').remove()" style="display:block;width:100%;margin-top:8px;background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:12px">Fechar</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  window['smcrm_${form.public_token}_show'] = showForm;
  window['smcrm_${form.public_token}_submit'] = function() {
    var email = (document.getElementById('smcrm-email') || {}).value;
    if (!email) return;
    var payload = {
      form_token: '${form.public_token}',
      email: email,
      pagina: window.location.href,
      session_id: window.SmartCRM ? window.SmartCRM.sessionId : null
    };
    ${form.campo_nome ? `var nome = (document.getElementById('smcrm-nome') || {}).value; if (nome) payload.nome = nome;` : ""}
    ${form.campo_telefone ? `var tel = (document.getElementById('smcrm-tel') || {}).value; if (tel) payload.telefone = tel;` : ""}
    fetch('${supabaseUrl}/functions/v1/crm-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(){});
    if (window.SmartCRM) window.SmartCRM.identify(email);
    sessionStorage.setItem('smcrm_${form.public_token}', '1');
    document.querySelector('[style*="fixed"]').remove();
  };

  ${triggerCode}
})();
</script>`;
}

function gerarScriptEvento(tipo: string) {
  const scripts: Record<string, string> = {
    view_item_list: `var ecommerce = {{ecommerce}};
var items = ecommerce && ecommerce.items ? ecommerce.items : [];
if (window.SmartCRM) {
  window.SmartCRM.track('view_item_list', {
    item_list_name: ecommerce && ecommerce.item_list_name ? ecommerce.item_list_name : '',
    items: items
  });
}`,
    product_view: `var ecommerce = {{ecommerce}};
var items = ecommerce && ecommerce.items ? ecommerce.items : [];
var item = items[0] || {};
if (window.SmartCRM) {
  window.SmartCRM.track('product_view', {
    item_id: item.item_id || '',
    item_name: item.item_name || '',
    price: item.price || 0,
    items: items
  });
}`,
    cart_add: `var ecommerce = {{ecommerce}};
var items = ecommerce && ecommerce.items ? ecommerce.items : [];
var item = items[0] || {};
if (window.SmartCRM) {
  window.SmartCRM.track('cart_add', {
    item_id: item.item_id || '',
    item_name: item.item_name || '',
    quantity: item.quantity || 1,
    price: item.price || 0,
    items: items
  });
}`,
    cart_remove: `var ecommerce = {{ecommerce}};
var items = ecommerce && ecommerce.items ? ecommerce.items : [];
var item = items[0] || {};
if (window.SmartCRM) {
  window.SmartCRM.track('cart_remove', {
    item_id: item.item_id || '',
    item_name: item.item_name || '',
    quantity: item.quantity || 1,
    items: items
  });
}`,
    view_cart: `var ecommerce = {{ecommerce}};
if (window.SmartCRM) {
  window.SmartCRM.track('view_cart', {
    items: ecommerce && ecommerce.items ? ecommerce.items : []
  });
}`,
    checkout_start: `var ecommerce = {{ecommerce}};
if (window.SmartCRM) {
  window.SmartCRM.track('checkout_start', {
    value: ecommerce && ecommerce.value ? ecommerce.value : 0,
    items: ecommerce && ecommerce.items ? ecommerce.items : []
  });
}`,
    checkout_profile: `if (window.SmartCRM) {
  window.SmartCRM.track('checkout_profile', {});
}`,
    checkout_payment: `if (window.SmartCRM) {
  window.SmartCRM.track('checkout_payment', {});
}`,
    purchase: `var ecommerce = {{ecommerce}};
if (window.SmartCRM) {
  window.SmartCRM.track('purchase', {
    transaction_id: ecommerce && ecommerce.transaction_id ? ecommerce.transaction_id : '',
    revenue: ecommerce && ecommerce.value ? ecommerce.value : 0,
    items: ecommerce && ecommerce.items ? ecommerce.items : []
  });
}`,
    custom: `// Substitua os dados conforme necessário
if (window.SmartCRM) {
  window.SmartCRM.track('custom', {
    /* adicione os dados do evento aqui */
  });
}`,
  };

  const body = scripts[tipo] ?? `if (window.SmartCRM) {\n  window.SmartCRM.track('${tipo}', {});\n}`;
  return `// SmartCRM — GTM Custom HTML: "${tipo}"
// Adicionar como tag Custom HTML no GTM, disparada no evento "${tipo}"
// Requer variável de camada de dados {{ecommerce}} configurada no GTM (quando aplicável)
${body}`;
}

export function InstalacaoTab({ forms }: Props) {
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [selectedEvento, setSelectedEvento] = useState("product_view");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const form = forms.find((f) => f.id === selectedForm);
  const isScript = form?.tipo === "script";

  const formsScript = forms.filter((f) => f.tipo === "script");
  const formsPopup = forms.filter((f) => f.tipo !== "script");

  return (
    <VStack gap={8} align="stretch">
      {/* Script Global */}
      <CodeBlock
        label="1. Script Global — adicionar em todas as páginas, antes de </body>"
        code={gerarScriptGlobal(supabaseUrl)}
      />

      {/* Scripts de Formulários */}
      <Box>
        <Flex align="center" gap={2} mb={3}>
          <Text fontSize="sm" fontWeight="medium" color="white">2. Script de Formulário</Text>
          {formsScript.length > 0 && (
            <Badge colorPalette="blue" size="sm">{formsScript.length} captura passiva</Badge>
          )}
          {formsPopup.length > 0 && (
            <Badge colorPalette="purple" size="sm">{formsPopup.length} popup/inline</Badge>
          )}
        </Flex>

        <NativeSelect.Root mb={4}>
          <NativeSelect.Field
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            color="white"
          >
            <option value="" style={{ background: "#1a1a1a" }}>Selecionar formulário...</option>
            {formsScript.length > 0 && (
              <optgroup label="── Captura Passiva (script)">
                {formsScript.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: "#1a1a1a" }}>
                    {f.nome} ({f.public_token})
                  </option>
                ))}
              </optgroup>
            )}
            {formsPopup.length > 0 && (
              <optgroup label="── Popup / Inline / Flyout">
                {formsPopup.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: "#1a1a1a" }}>
                    [{f.tipo}] {f.nome} ({f.public_token})
                  </option>
                ))}
              </optgroup>
            )}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {form && isScript && (
          <Box mb={4} p={3} bg="blue.900" borderRadius="lg" border="1px solid" borderColor="blue.700">
            <Text fontSize="xs" color="blue.200">
              <strong>Captura passiva:</strong> este script observa todos os formulários da página e captura automaticamente quando um usuário preenche um campo de email e faz submit. Não exibe nenhuma interface visual.
              {form.campo_nome && " Também tenta capturar o nome."}{form.campo_telefone && " Também tenta capturar o telefone."}
            </Text>
          </Box>
        )}

        {form && (
          <CodeBlock
            label={isScript ? `Captura passiva: ${form.nome}` : `${form.tipo}: ${form.nome}`}
            code={isScript ? gerarScriptCaptura(form, supabaseUrl) : gerarScriptPopup(form, supabaseUrl)}
          />
        )}
      </Box>

      {/* Scripts de Eventos */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" color="white" mb={3}>
          3. Rastreamento de Eventos (e-commerce)
        </Text>
        <NativeSelect.Root mb={3}>
          <NativeSelect.Field
            value={selectedEvento}
            onChange={(e) => setSelectedEvento(e.target.value)}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            color="white"
          >
            {["product_view", "cart_add", "view_cart", "checkout_start", "purchase"].map((e) => (
              <option key={e} value={e} style={{ background: "#1a1a1a" }}>{e}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <CodeBlock label={`Evento: ${selectedEvento}`} code={gerarScriptEvento(selectedEvento)} />
      </Box>
    </VStack>
  );
}
