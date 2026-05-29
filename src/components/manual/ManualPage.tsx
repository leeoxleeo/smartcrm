"use client";

import { useState } from "react";
import { Badge, Box, Flex, Separator, Text, VStack } from "@chakra-ui/react";

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Text
      id={id}
      fontSize="xs"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wider"
      color="whiteAlpha.400"
      mb={4}
      pt={2}
    >
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box
      p={5}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
    >
      {children}
    </Box>
  );
}

function FeatureTitle({ emoji, title, badge }: { emoji: string; title: string; badge?: string }) {
  return (
    <Flex align="center" gap={2} mb={2}>
      <Text fontSize="lg" lineHeight="1">{emoji}</Text>
      <Text fontSize="sm" fontWeight="semibold" color="white">{title}</Text>
      {badge && <Badge colorPalette="teal" size="sm" variant="subtle">{badge}</Badge>}
    </Flex>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.8">{children}</Text>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <Box mt={3} p={3} bg="teal.950" borderRadius="lg" borderLeft="3px solid" borderColor="teal.700">
      <Text fontSize="xs" color="teal.300" fontWeight="semibold" mb={0.5}>Dica prática</Text>
      <Text fontSize="xs" color="teal.100" lineHeight="1.7">{children}</Text>
    </Box>
  );
}

function Metric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <Box p={3} bg="whiteAlpha.50" borderRadius="lg">
      <Text fontSize="xs" color="whiteAlpha.400" mb={0.5}>{label}</Text>
      <Text fontSize="sm" fontWeight="bold" color="teal.300" mb={0.5}>{value}</Text>
      <Text fontSize="xs" color="whiteAlpha.500" lineHeight="1.6">{desc}</Text>
    </Box>
  );
}

function RfmRow({ seg, label, emoji, cond, campanha, health }: {
  seg: string; label: string; emoji: string;
  cond: string; campanha: string;
  health: "great" | "good" | "warn" | "risk";
}) {
  const colors: Record<string, string> = { great: "teal", good: "blue", warn: "orange", risk: "red" };
  return (
    <Box p={3} bg="whiteAlpha.50" borderRadius="lg" borderLeft="3px solid"
      borderColor={`${colors[health]}.700`}>
      <Flex align="center" gap={2} mb={1}>
        <Text fontSize="md" lineHeight="1">{emoji}</Text>
        <Text fontSize="sm" fontWeight="semibold" color="white">{label}</Text>
        <Badge colorPalette={colors[health]} size="sm" variant="subtle" ml="auto">{seg}</Badge>
      </Flex>
      <Text fontSize="xs" color="whiteAlpha.500" mb={1}><b style={{ color: "rgba(255,255,255,0.5)" }}>Condição:</b> {cond}</Text>
      <Text fontSize="xs" color="teal.300"><b style={{ color: "rgba(129,230,217,0.7)" }}>Campanha recomendada:</b> {campanha}</Text>
    </Box>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV = [
  { id: "visao-geral",     label: "Visão Geral" },
  { id: "captura",         label: "Captura de Leads" },
  { id: "automacoes",      label: "Automações de Email" },
  { id: "templates",       label: "Templates de Email" },
  { id: "rfm",             label: "Segmentação RFM" },
  { id: "atribuicao",      label: "Atribuição de Receita" },
  { id: "analise-conv",    label: "Análise de Conversão IA" },
  { id: "relatorios",      label: "Relatórios" },
  { id: "configuracoes",   label: "Configurações" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ManualPage() {
  const [active, setActive] = useState("visao-geral");

  function scrollTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Flex gap={0} minH="100vh" align="flex-start">

      {/* Sidebar nav */}
      <Box
        w="200px"
        flexShrink={0}
        position="sticky"
        top={0}
        h="100vh"
        overflowY="auto"
        borderRight="1px solid"
        borderColor="whiteAlpha.100"
        py={6}
        px={3}
      >
        <Text fontSize="xs" color="whiteAlpha.400" fontWeight="semibold"
          textTransform="uppercase" letterSpacing="wider" mb={4} px={2}>
          Conteúdo
        </Text>
        <VStack gap={0.5} align="stretch">
          {NAV.map((n) => (
            <Box
              key={n.id}
              px={2} py={2}
              borderRadius="lg"
              cursor="pointer"
              bg={active === n.id ? "whiteAlpha.100" : "transparent"}
              color={active === n.id ? "teal.300" : "whiteAlpha.500"}
              _hover={{ bg: "whiteAlpha.100", color: "white" }}
              transition="all 0.15s"
              onClick={() => scrollTo(n.id)}
            >
              <Text fontSize="xs" fontWeight={active === n.id ? "semibold" : "normal"}>
                {n.label}
              </Text>
            </Box>
          ))}
        </VStack>

        {/* Version badge */}
        <Box mt={6} px={2}>
          <Text fontSize="10px" color="whiteAlpha.300">Versão da plataforma</Text>
          <Badge colorPalette="teal" size="sm" variant="subtle" mt={1}>mai/2026</Badge>
        </Box>
      </Box>

      {/* Content */}
      <Box flex={1} px={8} py={6} maxW="760px" overflowY="auto">

        {/* Header */}
        <Box mb={8}>
          <Flex align="center" gap={3} mb={2}>
            <Text fontSize="2xl" fontWeight="bold" color="white">Manual de Uso</Text>
            <Badge colorPalette="teal" size="md" variant="subtle">SmartCRM</Badge>
          </Flex>
          <Text fontSize="sm" color="whiteAlpha.500" lineHeight="1.8">
            Documentação completa da plataforma — funcionalidades, métricas e interpretação de resultados.
            Atualizado a cada nova entrega.
          </Text>
        </Box>

        <VStack gap={10} align="stretch">

          {/* ── VISÃO GERAL ───────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="visao-geral">Visão Geral</SectionTitle>
            <Card>
              <FeatureTitle emoji="◈" title="O que é o SmartCRM" />
              <P>
                O SmartCRM é uma plataforma de CRM comportamental para agências de marketing digital que atendem e-commerces.
                Ele captura eventos de navegação e compra dos visitantes, segmenta os contatos de acordo com seu comportamento
                e dispara emails personalizados com copy gerado por IA — tudo de forma automática.
              </P>
              <Box mt={4} display="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Metric label="Captura" value="Formulários + Eventos" desc="Scripts JS instalados na loja capturam leads e comportamento em tempo real." />
                <Metric label="Automação" value="Trigger Rules" desc="Regras disparam emails com delay configurável quando um evento ocorre." />
                <Metric label="IA" value="Claude Haiku / GPT-4o mini" desc="Gera copy de email, analisa navegação, diagnostica conversão e segmenta clientes." />
                <Metric label="Inteligência" value="RFM + VTEX Search" desc="Segmenta compradores por valor e comportamento. Busca produtos via API VTEX." />
              </Box>
            </Card>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── CAPTURA DE LEADS ──────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="captura">Captura de Leads</SectionTitle>
            <VStack gap={3} align="stretch">
              <Card>
                <FeatureTitle emoji="📋" title="Formulários de Captura" />
                <P>
                  Formulários são criados dentro de um Projeto e podem ser do tipo <b style={{color:"white"}}>Popup</b>,{" "}
                  <b style={{color:"white"}}>Inline</b>, <b style={{color:"white"}}>Flyout</b> ou <b style={{color:"white"}}>Script</b>.
                  Cada formulário tem um token público único. O visitante preenche nome/email e vira um contato no CRM.
                </P>
                <P>
                  Triggers de exibição: <b style={{color:"white"}}>tempo</b> (X segundos na página),{" "}
                  <b style={{color:"white"}}>scroll</b> (% da página rolada) e <b style={{color:"white"}}>exit intent</b> (mouse saindo da janela).
                </P>
                <Tip>Use exit intent para capturar visitantes que estão saindo da página de produto — alta intenção de compra, último momento para converter.</Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="⚡" title="Eventos Rastreados" badge="crm-event" />
                <P>
                  O script instalado na loja envia eventos via <b style={{color:"white"}}>POST /functions/v1/crm-event</b>.
                  Cada evento contém <b style={{color:"white"}}>tipo</b>, <b style={{color:"white"}}>session_id</b>,
                  e um payload com os dados do produto ou transação.
                </P>
                <Box mt={3} display="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    ["product_view",       "Produto visualizado"],
                    ["view_item_list",      "Lista de produtos vista"],
                    ["cart_add",           "Adicionado ao carrinho"],
                    ["view_cart",          "Carrinho visualizado"],
                    ["checkout_start",     "Checkout iniciado"],
                    ["checkout_profile",   "Dados preenchidos"],
                    ["checkout_payment",   "Pagamento iniciado"],
                    ["purchase",           "Compra finalizada"],
                    ["cart_remove",        "Removido do carrinho"],
                  ].map(([tipo, label]) => (
                    <Flex key={tipo} align="center" gap={2} p={2} bg="whiteAlpha.50" borderRadius="md">
                      <Box w="6px" h="6px" borderRadius="full" bg="teal.500" flexShrink={0} />
                      <Box>
                        <Text fontSize="xs" fontFamily="mono" color="teal.300">{tipo}</Text>
                        <Text fontSize="10px" color="whiteAlpha.400">{label}</Text>
                      </Box>
                    </Flex>
                  ))}
                </Box>
                <Tip>
                  Os eventos de <b>product_view</b> e <b>purchase</b> são os mais importantes — eles alimentam o RFM,
                  os templates de vitrine e a análise de conversão.
                </Tip>
              </Card>
            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── AUTOMAÇÕES ────────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="automacoes">Automações de Email</SectionTitle>
            <VStack gap={3} align="stretch">
              <Card>
                <FeatureTitle emoji="🔁" title="Como funcionam os Triggers" />
                <P>
                  Uma <b style={{color:"white"}}>Trigger Rule</b> define: qual evento dispara, quanto tempo aguardar (delay),
                  qual evento cancela o disparo (ex: se o usuário comprou, cancelar o email de abandono) e qual template enviar.
                </P>
                <P>
                  O motor de email roda via <b style={{color:"white"}}>pg_cron a cada 5 minutos</b>, processa os logs pendentes
                  e chama a Edge Function <b style={{color:"white"}}>crm-email-worker</b> que gera e envia o email.
                </P>
                <Box mt={3} p={3} bg="whiteAlpha.50" borderRadius="lg">
                  <Text fontSize="xs" color="whiteAlpha.400" mb={2}>Fluxo completo de um disparo</Text>
                  <Flex gap={2} align="center" flexWrap="wrap">
                    {["Evento chega", "→", "Trigger criado", "→", "Delay aguarda", "→", "Worker processa", "→", "IA gera copy", "→", "Resend envia"].map((s, i) => (
                      <Text key={i} fontSize="xs" color={s === "→" ? "whiteAlpha.300" : "teal.300"} fontWeight={s !== "→" ? "semibold" : "normal"}>{s}</Text>
                    ))}
                  </Flex>
                </Box>
                <Tip>
                  Configure <b>cancelar se: purchase</b> em todas as automações de abandono. Sem isso, o cliente
                  que comprou ainda receberá o email de recuperação — péssima experiência.
                </Tip>
              </Card>
            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── TEMPLATES ─────────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="templates">Templates de Email</SectionTitle>
            <VStack gap={3} align="stretch">

              <Card>
                <FeatureTitle emoji="👁" title="Produto Visto (IA)" />
                <P>
                  Disparado quando o contato visualiza um produto. A IA busca detalhes do produto na API VTEX (imagem, URL,
                  descrição) e gera headline, corpo, CTA, 3 bullets de benefícios e tagline personalizados.
                  Email de produto único com design focado na conversão.
                </P>
                <Tip>Use delay de 30–60 min com cancelar se: purchase. Alta conversão para abandono de página de produto.</Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="🛍" title="Vitrine — Similares (IA)" />
                <P>
                  Grid de até 4 produtos da mesma categoria/marca do produto que o contato visitou, ordenados por views.
                  Ideal para visitantes que estão comparando opções — mostra alternativas dentro do interesse declarado.
                </P>
                <P>
                  Fallback automático: se não houver produtos da mesma categoria, busca pela mesma marca; se não houver,
                  top produtos mais vistos do cliente.
                </P>
              </Card>

              <Card>
                <FeatureTitle emoji="🤝" title="Vitrine — Combinações (IA)" />
                <P>
                  Grid com os produtos mais comprados de <b style={{color:"white"}}>outras categorias</b> — funciona como
                  cross-sell. Quem comprou uma calça também compra cintos, ou quem compra notebook também compra case.
                  Ordenado por número de compras na loja.
                </P>
              </Card>

              <Card>
                <FeatureTitle emoji="✨" title="Vitrine — Sugestões (IA)" />
                <P>
                  Top produtos que o contato <b style={{color:"white"}}>ainda não viu</b>, baseado no histórico de navegação.
                  O sistema mantém uma lista dos produtos vistos pelo contato e filtra para mostrar novidades relevantes.
                  Ótimo para reengajamento de contatos que já navegaram bastante.
                </P>
              </Card>

              <Card>
                <FeatureTitle emoji="🧠" title="Vitrine — Inteligente VTEX (IA)" badge="✦" />
                <P>
                  O template mais avançado. Analisa até <b style={{color:"white"}}>30 produtos visualizados</b> pelo contato,
                  extrai via IA o padrão de interesse (ex: "camisetas masculinas algodão P, R$80–R$120") e faz uma busca
                  direta na <b style={{color:"white"}}>API de Search da VTEX</b> com query + faixa de preço para trazer
                  produtos novos que ainda não foram vistos.
                </P>
                <Box mt={3} p={3} bg="whiteAlpha.50" borderRadius="lg">
                  <Text fontSize="xs" color="whiteAlpha.400" mb={2}>Pipeline da Vitrine Inteligente</Text>
                  <VStack gap={1} align="stretch">
                    {[
                      ["1", "Busca os últimos 30 product_view do contato (deduplicados por produto)"],
                      ["2", "IA extrai: search_query, price_min, price_max, summary do comportamento"],
                      ["3", "VTEX Search: busca por full-text + filtro de preço (fallback sem preço)"],
                      ["4", "Filtra produtos já vistos (excludeIds)"],
                      ["5", "IA gera copy conectando o padrão de navegação com os produtos recomendados"],
                    ].map(([n, desc]) => (
                      <Flex key={n} gap={2} align="flex-start">
                        <Box w="18px" h="18px" borderRadius="full" flexShrink={0} mt="2px"
                          style={{ background: "linear-gradient(135deg,#319795,#3182ce)" }}
                          display="flex" alignItems="center" justifyContent="center">
                          <Text fontSize="10px" color="white" fontWeight="bold">{n}</Text>
                        </Box>
                        <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.6">{desc}</Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
                <Tip>
                  Requer que o cliente tenha <b>vtex_account_name</b> e <b>website_url</b> configurados em Clientes → Integrações.
                  Sem isso, cai automaticamente no fallback de Sugestões.
                </Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="📧" title="Bullets de Benefícios nos Emails de Vitrine" />
                <P>
                  Todos os templates de vitrine incluem uma faixa com <b style={{color:"white"}}>3 bullets de benefícios</b> gerados
                  pela IA, posicionados abaixo do grid de produtos. São adaptados ao nicho do e-commerce (moda, eletrônicos,
                  beleza, etc.) e focam em entrega, segurança e troca — os principais gatilhos de confiança antes da compra.
                </P>
              </Card>

            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── RFM ───────────────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="rfm">Segmentação RFM</SectionTitle>
            <VStack gap={3} align="stretch">

              <Card>
                <FeatureTitle emoji="📊" title="O que é RFM" badge="Relatórios" />
                <P>
                  RFM é um modelo de segmentação de clientes baseado em três dimensões do comportamento de compra:
                </P>
                <Box mt={3} display="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <Box p={3} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
                    <Text fontSize="2xl" fontWeight="black" color="teal.300">R</Text>
                    <Text fontSize="xs" fontWeight="bold" color="white">Recência</Text>
                    <Text fontSize="xs" color="whiteAlpha.400" mt={1}>Há quantos dias o cliente comprou pela última vez. Quanto mais recente, melhor.</Text>
                  </Box>
                  <Box p={3} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
                    <Text fontSize="2xl" fontWeight="black" color="blue.300">F</Text>
                    <Text fontSize="xs" fontWeight="bold" color="white">Frequência</Text>
                    <Text fontSize="xs" color="whiteAlpha.400" mt={1}>Quantas vezes comprou no total. Quanto mais, mais leal.</Text>
                  </Box>
                  <Box p={3} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
                    <Text fontSize="2xl" fontWeight="black" color="purple.300">M</Text>
                    <Text fontSize="xs" fontWeight="bold" color="white">Monetário</Text>
                    <Text fontSize="xs" color="whiteAlpha.400" mt={1}>Valor total gasto. Indica o potencial de receita do cliente.</Text>
                  </Box>
                </Box>
                <P>
                  Cada dimensão recebe um score de <b style={{color:"white"}}>1 a 5</b> baseado em quintil (posição relativa
                  ao conjunto de compradores do cliente). Score 5 = top 20% naquela dimensão.
                </P>
                <Tip>
                  O RFM é calculado sob demanda e tem cache de 6 horas. Use "Atualizar" para forçar o recálculo
                  após campanhas importantes ou picos de compra.
                </Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="🗂" title="Os 10 Segmentos e suas Campanhas" />
                <VStack gap={2} align="stretch" mt={2}>
                  <RfmRow seg="R≥4 F≥4 M≥4" label="🏆 Campeões"             emoji="🏆" health="great"
                    cond="Compra recente, alta frequência e alto valor"
                    campanha="Programa de fidelidade, early access, conteúdo exclusivo" />
                  <RfmRow seg="F≥4"           label="💎 Leais"               emoji="💎" health="great"
                    cond="Alta frequência, mas recência ou valor moderados"
                    campanha="Upsell, produtos premium, convite para clube de benefícios" />
                  <RfmRow seg="R≥4 F≥2"       label="⭐ Potencialmente Leais" emoji="⭐" health="good"
                    cond="Compraram recentemente mais de uma vez — em evolução"
                    campanha="Vitrine Inteligente para acelerar a segunda/terceira compra" />
                  <RfmRow seg="R≥4 F=1"       label="🌱 Novos Clientes"      emoji="🌱" health="good"
                    cond="Primeira compra recente — ainda avaliando a loja"
                    campanha="Email de boas-vindas, tutorial, produto complementar" />
                  <RfmRow seg="R≥3 F≤2"       label="✨ Promissores"         emoji="✨" health="good"
                    cond="Compram com alguma frequência mas valor baixo"
                    campanha="Vitrine de produtos de maior valor, benefícios por volume" />
                  <RfmRow seg="R≥2 F≥2 M≤3"   label="👀 Precisam de Atenção" emoji="👀" health="warn"
                    cond="Bom histórico mas sinais de esfriamento"
                    campanha="Email de reativação com personalização baseada em histórico" />
                  <RfmRow seg="R≤2 F≥3"       label="⚠️ Em Risco"            emoji="⚠️" health="risk"
                    cond="Costumavam comprar frequentemente mas pararam"
                    campanha="Campanha urgente: oferta personalizada com tempo limitado" />
                  <RfmRow seg="R=1 F≥4"       label="🚨 Não Pode Perder"     emoji="🚨" health="risk"
                    cond="Clientes valiosos que sumiram — alto impacto de churn"
                    campanha="Win-back prioritário: contato direto, benefício exclusivo" />
                  <RfmRow seg="R≤2 F≤2"       label="😴 Hibernando"         emoji="😴" health="risk"
                    cond="Sem compras recentes e baixa frequência histórica"
                    campanha="Reativação de baixo custo: vitrine de novidades, breve" />
                  <RfmRow seg="R=1 F=1"       label="💤 Perdidos"            emoji="💤" health="risk"
                    cond="Uma compra antiga, nunca mais voltaram"
                    campanha="Último esforço com oferta direta; se não converter, suprimir" />
                </VStack>
              </Card>

              <Card>
                <FeatureTitle emoji="📈" title="Métricas do Painel RFM" />
                <Box display="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px" }} mt={2}>
                  <Metric label="Compradores analisados" value="N contatos"
                    desc="Total de contatos com pelo menos 1 evento de purchase registrado." />
                  <Metric label="Receita total mapeada" value="R$ X,XX"
                    desc="Soma de todos os valores de compra extraídos dos eventos de purchase." />
                  <Metric label="Receita em risco" value="R$ X,XX"
                    desc="Receita histórica de clientes nos segmentos At Risk, Cant Lose, Hibernating e Lost." />
                  <Metric label="Insight IA" value="Texto gerado"
                    desc="2–3 frases da IA apontando o cenário mais crítico e a ação prioritária." />
                </Box>
              </Card>

            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── ATRIBUIÇÃO ────────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="atribuicao">Atribuição de Receita</SectionTitle>
            <VStack gap={3} align="stretch">

              <Card>
                <FeatureTitle emoji="💰" title="Como funciona a Atribuição" badge="Relatórios" />
                <P>
                  Cada vez que um evento de <b style={{color:"white"}}>purchase</b> é registrado, o sistema verifica se
                  aquele contato recebeu um email da plataforma nos <b style={{color:"white"}}>7 dias anteriores</b>.
                  Se sim, a receita daquela compra é atribuída ao último email enviado antes da compra.
                </P>
                <P>
                  Esse modelo é chamado de <b style={{color:"white"}}>last-touch attribution</b> — 100% da receita
                  é creditada ao último ponto de contato antes da conversão.
                </P>
                <Box mt={3} p={3} bg="whiteAlpha.50" borderRadius="lg">
                  <Text fontSize="xs" color="whiteAlpha.400" mb={2}>Exemplo de atribuição</Text>
                  <VStack gap={1} align="stretch">
                    {[
                      ["Seg 10:00", "Email de Produto Visto enviado para contato X"],
                      ["Seg 10:45", "Contato X abre o email"],
                      ["Seg 14:30", "Contato X compra R$ 289,90 na loja"],
                      ["→ Resultado", "R$ 289,90 atribuído à automação 'Produto Visto'"],
                    ].map(([time, desc]) => (
                      <Flex key={time} gap={3} align="flex-start">
                        <Text fontSize="xs" color="teal.400" fontWeight="semibold" w="100px" flexShrink={0}>{time}</Text>
                        <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.6">{desc}</Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
                <Tip>
                  A janela de 7 dias é conservadora — ela exclui compras que provavelmente ocorreriam sem o email.
                  Plataformas como Klaviyo usam janelas de 5 dias para email, mas 7 dias é padrão no mercado brasileiro.
                </Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="📋" title="Métricas por Automação" />
                <Box display="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px" }} mt={2}>
                  <Metric label="Disparos" value="N emails"
                    desc="Total de emails enviados por essa automação para qualquer contato." />
                  <Metric label="Conversões" value="N compras"
                    desc="Quantas compras foram atribuídas a esta automação na janela de 7 dias." />
                  <Metric label="Receita atribuída" value="R$ X,XX"
                    desc="Soma das compras que ocorreram dentro da janela após um email desta automação." />
                  <Metric label="Receita por email" value="R$ X,XX"
                    desc="Receita atribuída ÷ total de disparos. Métrica-chave para comparar eficiência entre automações." />
                  <Metric label="Taxa de conversão" value="X%"
                    desc="Conversões ÷ disparos. Indica o percentual de emails que resultaram em compra." />
                </Box>
              </Card>

            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── ANÁLISE DE CONVERSÃO ──────────────────────────────────────── */}
          <Box>
            <SectionTitle id="analise-conv">Análise de Conversão IA</SectionTitle>
            <VStack gap={3} align="stretch">

              <Card>
                <FeatureTitle emoji="🔍" title="Produtos com Alto Interesse e Baixa Conversão" badge="IA · cache 3h" />
                <P>
                  A análise identifica produtos que recebem muitas visualizações mas convertem abaixo da média da loja.
                  Esses produtos têm um <b style={{color:"white"}}>gap de conversão</b> — há interesse mas algo impede a compra.
                </P>
                <P>
                  Critérios de seleção: produto com views ≥ threshold da loja AND taxa de conversão {"<"} 50% da média geral.
                  No máximo 8 produtos são analisados por rodada para manter a qualidade dos insights.
                </P>
              </Card>

              <Card>
                <FeatureTitle emoji="🎯" title="Classificação de Gargalo" />
                <P>
                  Para cada produto candidato, o sistema classifica automaticamente onde está o problema no funil:
                </P>
                <VStack gap={2} align="stretch" mt={3}>
                  {[
                    ["orange", "Página do Produto (Interesse)", "taxa view→carrinho < 50% da média da loja", "O visitante vê o produto mas não adiciona ao carrinho. Problema: imagem, descrição, preço ou ausência de prova social."],
                    ["red",    "Abandono de Carrinho (Intenção)", "taxa carrinho→compra < 50% da média E cart_adds > 0", "O visitante adicionou ao carrinho mas não comprou. Problema: frete, prazo, forma de pagamento ou falta de confiança no checkout."],
                    ["purple", "Funil Completo (Ambos)", "queda nos dois estágios simultaneamente", "Problema composto — tanto a página do produto quanto o checkout precisam de atenção."],
                  ].map(([color, label, cond, desc]) => (
                    <Box key={label} p={3} bg="whiteAlpha.50" borderRadius="lg" borderLeft="3px solid" borderColor={`${color}.700`}>
                      <Flex align="center" gap={2} mb={1}>
                        <Badge colorPalette={color} size="sm">{label}</Badge>
                      </Flex>
                      <Text fontSize="xs" color="whiteAlpha.500" mb={1}><b style={{color:"rgba(255,255,255,0.4)"}}>Condição:</b> {cond}</Text>
                      <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.6">{desc}</Text>
                    </Box>
                  ))}
                </VStack>
                <Tip>
                  Use a sugestão da IA para criar automações específicas — ex: gargalo de carrinho → criar trigger
                  de "view_cart" com delay de 1h e cancelar se: purchase.
                </Tip>
              </Card>

            </VStack>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── RELATÓRIOS ────────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="relatorios">Relatórios</SectionTitle>
            <Card>
              <FeatureTitle emoji="📊" title="Métricas Gerais e por Projeto" />
              <Box display="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px" }} mt={2}>
                <Metric label="Total de Contatos" value="N"
                  desc="Todos os leads capturados pelos formulários deste cliente, em todos os projetos." />
                <Metric label="Contatos hoje" value="N"
                  desc="Leads capturados no dia atual — útil para medir pico de tráfego e sazonalidade." />
                <Metric label="Emails Disparados" value="N"
                  desc="Total de emails enviados via Resend por todas as automações do cliente." />
                <Metric label="Taxa de Abertura" value="X%"
                  desc="Emails com status 'aberto' ou 'clicado' ÷ total disparado. Benchmark B2C Brasil: 20–30%." />
                <Metric label="Formulários Ativos" value="N"
                  desc="Formulários com status ativo — scripts que estão capturando leads agora." />
                <Metric label="Automações Ativas" value="N"
                  desc="Trigger rules com status ativo — quantas regras estão monitorando eventos." />
              </Box>
            </Card>
          </Box>

          <Separator borderColor="whiteAlpha.100" />

          {/* ── CONFIGURAÇÕES ─────────────────────────────────────────────── */}
          <Box>
            <SectionTitle id="configuracoes">Configurações da Plataforma</SectionTitle>
            <VStack gap={3} align="stretch">

              <Card>
                <FeatureTitle emoji="🤖" title="Provedor de IA" />
                <P>
                  A plataforma suporta dois provedores: <b style={{color:"white"}}>Anthropic Claude</b> (modelo Haiku 4.5)
                  e <b style={{color:"white"}}>OpenAI GPT-4o mini</b>. Ambos geram copy de email, analisam navegação
                  e produzem diagnósticos de conversão com qualidade similar e custo baixo.
                </P>
                <Tip>Claude Haiku é mais rápido e mais barato. GPT-4o mini é ligeiramente mais longo nas respostas. Ambos são adequados para produção.</Tip>
              </Card>

              <Card>
                <FeatureTitle emoji="📨" title="Email — Resend" />
                <P>
                  Todos os emails são enviados via <b style={{color:"white"}}>Resend</b>. Configure a API Key e o
                  endereço de envio (<b style={{color:"white"}}>from</b>) em Configurações → Email.
                  O domínio de envio precisa estar verificado no painel do Resend para evitar spam.
                </P>
              </Card>

              <Card>
                <FeatureTitle emoji="🔗" title="Integrações por Cliente" />
                <P>
                  Cada cliente pode ter integrações individuais configuradas em <b style={{color:"white"}}>Clientes → [cliente] → Integrações</b>:
                </P>
                <VStack gap={2} align="stretch" mt={3}>
                  {[
                    ["VTEX",      "vtex_account_name + website_url", "Necessário para Vitrine Inteligente, enriquecimento de imagens e URLs nos emails."],
                    ["GA4",       "ga4_property_id + api_secret",    "Integração com Google Analytics 4 para dados de tráfego e conversão."],
                    ["Clarity",   "clarity_project_id + api_token",  "Microsoft Clarity para heatmaps e replay de sessão."],
                    ["Shopify",   "shopify_store_domain + api_key",  "Para lojas na plataforma Shopify."],
                    ["Nicho",     "nicho_ecommerce",                 "Descreve o segmento da loja (moda, eletrônicos, beleza…). Usado pela IA para adaptar o copy ao contexto."],
                  ].map(([plat, campo, desc]) => (
                    <Flex key={plat} gap={3} align="flex-start" p={2} bg="whiteAlpha.50" borderRadius="md">
                      <Text fontSize="xs" color="blue.300" fontWeight="semibold" w="60px" flexShrink={0}>{plat}</Text>
                      <Box>
                        <Text fontSize="xs" fontFamily="mono" color="whiteAlpha.500">{campo}</Text>
                        <Text fontSize="xs" color="whiteAlpha.500" lineHeight="1.6">{desc}</Text>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              </Card>

            </VStack>
          </Box>

          {/* Bottom padding */}
          <Box h={8} />

        </VStack>
      </Box>
    </Flex>
  );
}
