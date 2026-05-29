"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Separator,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AnaliseConversao, ProdutoAnalise, GargaloProduto } from "@/lib/types";

interface Props {
  clienteId: string | null;
}

interface ClienteStats {
  total_contatos: number;
  contatos_hoje: number;
  total_disparos: number;
  disparos_abertos: number;
  total_forms_ativos: number;
  total_automacoes_ativas: number;
}

interface ProjetoRelatorio {
  id: string;
  nome: string;
  website_url?: string;
  total_contatos: number;
  contatos_7d: number;
  total_disparos: number;
  disparos_abertos: number;
  forms_ativos: number;
}

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
    >
      <Text color="whiteAlpha.500" fontSize="xs" mb={1}>{label}</Text>
      <Text
        fontSize="2xl"
        fontWeight="bold"
        style={accent ? {
          background: "linear-gradient(135deg, var(--chakra-colors-teal-400), var(--chakra-colors-blue-400))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        } : { color: "white" }}
      >
        {value}
      </Text>
      {sub && <Text color="whiteAlpha.400" fontSize="xs" mt={0.5}>{sub}</Text>}
    </Box>
  );
}

function TaxaBadge({ value }: { value: number }) {
  const color = value >= 30 ? "teal" : value >= 15 ? "blue" : "gray";
  return <Badge colorPalette={color} size="sm">{value.toFixed(1)}%</Badge>;
}

// ─── Gargalo badge ────────────────────────────────────────────────────────────

const gargaloConfig: Record<GargaloProduto, { label: string; color: string; desc: string }> = {
  interesse: { label: "Página do produto", color: "orange", desc: "Poucas adições ao carrinho — algo bloqueia antes da intenção de compra" },
  intencao:  { label: "Abandono de carrinho", color: "red",    desc: "Adicionaram ao carrinho mas não finalizaram — atrito no checkout" },
  ambos:     { label: "Funil completo", color: "purple",  desc: "Queda nos dois estágios — problema composto" },
};

function GargaloBadge({ gargalo }: { gargalo: GargaloProduto }) {
  const cfg = gargaloConfig[gargalo];
  return <Badge colorPalette={cfg.color} size="sm" title={cfg.desc}>{cfg.label}</Badge>;
}

// ─── Conversion bar ───────────────────────────────────────────────────────────

function ConvBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <Box h="4px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden" w="80px">
      <Box h="full" w={`${pct}%`} bg={color} borderRadius="full" style={{ transition: "width 0.4s" }} />
    </Box>
  );
}

// ─── Product analysis card ────────────────────────────────────────────────────

function ProdutoAnaliseCard({ produto, mediaConversao }: { produto: ProdutoAnalise; mediaConversao: number }) {
  const convPct = (produto.taxa_conversao * 100).toFixed(2);
  const mediaPct = (mediaConversao * 100).toFixed(2);
  const vcPct = (produto.taxa_view_cart * 100).toFixed(1);
  const cpPct = (produto.taxa_cart_compra * 100).toFixed(1);

  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
      _hover={{ borderColor: "whiteAlpha.200" }}
      transition="all 0.15s"
    >
      <Flex align="flex-start" gap={3} mb={3}>
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={0.5} wrap="wrap">
            <Text fontSize="sm" fontWeight="semibold" color="white" truncate>
              {produto.item_name}
            </Text>
            <GargaloBadge gargalo={produto.gargalo} />
          </Flex>
          <Flex gap={2} wrap="wrap">
            {produto.item_category && (
              <Badge colorPalette="purple" size="sm" variant="subtle">{produto.item_category}</Badge>
            )}
            {produto.item_brand && (
              <Badge colorPalette="blue" size="sm" variant="subtle">{produto.item_brand}</Badge>
            )}
            {produto.preco_atual && (
              <Text fontSize="xs" color="whiteAlpha.400">
                R$ {produto.preco_atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
            )}
          </Flex>
        </Box>
      </Flex>

      {/* Funnel mini-metrics */}
      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={3}>
        <Box p={2.5} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="lg" fontWeight="bold" color="teal.300">{produto.views.toLocaleString("pt-BR")}</Text>
          <Text fontSize="10px" color="whiteAlpha.400">views</Text>
        </Box>
        <Box p={2.5} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="lg" fontWeight="bold" color="blue.300">{produto.cart_adds.toLocaleString("pt-BR")}</Text>
          <Text fontSize="10px" color="whiteAlpha.400">no carrinho</Text>
          <Text fontSize="10px" color="whiteAlpha.300">{vcPct}% view→cart</Text>
        </Box>
        <Box p={2.5} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="lg" fontWeight="bold" color="green.300">{produto.purchases.toLocaleString("pt-BR")}</Text>
          <Text fontSize="10px" color="whiteAlpha.400">compras</Text>
          <Text fontSize="10px" color="whiteAlpha.300">{cpPct}% cart→compra</Text>
        </Box>
      </Grid>

      {/* Conversion vs average */}
      <Flex align="center" gap={3} mb={3} p={2.5} bg="whiteAlpha.50" borderRadius="lg">
        <Box flex={1}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="xs" color="whiteAlpha.500">Conversão deste produto</Text>
            <Text fontSize="xs" fontWeight="bold" color="orange.300">{convPct}%</Text>
          </Flex>
          <ConvBar value={produto.taxa_conversao} max={mediaConversao * 2} color="var(--chakra-colors-orange-500)" />
        </Box>
        <Box flex={1}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="xs" color="whiteAlpha.500">Média da loja</Text>
            <Text fontSize="xs" fontWeight="bold" color="teal.300">{mediaPct}%</Text>
          </Flex>
          <ConvBar value={mediaConversao} max={mediaConversao * 2} color="var(--chakra-colors-teal-500)" />
        </Box>
      </Flex>

      {/* AI insights */}
      <Box p={3} bg="whiteAlpha.50" borderRadius="lg" borderLeft="3px solid" borderColor="orange.700" mb={2}>
        <Text fontSize="xs" color="whiteAlpha.400" fontWeight="semibold" mb={1}>Diagnóstico IA</Text>
        <Text fontSize="sm" color="whiteAlpha.800" lineHeight="1.6">{produto.analise}</Text>
      </Box>
      <Box p={3} bg="teal.950" borderRadius="lg" borderLeft="3px solid" borderColor="teal.700">
        <Text fontSize="xs" color="teal.400" fontWeight="semibold" mb={1}>Sugestão</Text>
        <Text fontSize="sm" color="teal.100" lineHeight="1.6">{produto.sugestao}</Text>
      </Box>
    </Box>
  );
}

// ─── Analysis panel ───────────────────────────────────────────────────────────

function AnaliseConversaoPanel({ clienteId }: { clienteId: string }) {
  const [analise, setAnalise] = useState<AnaliseConversao | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function carregar(forcado = false) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crm-analytics`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cliente_id: clienteId, forcar_refresh: forcado }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toaster.create({ title: "Erro na análise", description: json.error, type: "error" });
      } else {
        setAnalise(json as AnaliseConversao);
        setOpen(true);
      }
    } catch {
      toaster.create({ title: "Falha na conexão com a Edge Function", type: "error" });
    }
    setLoading(false);
  }

  return (
    <Box>
      <Separator borderColor="whiteAlpha.100" mb={6} />

      {/* Header panel */}
      <Flex align="center" justify="space-between" mb={open && analise ? 4 : 0} wrap="wrap" gap={3}>
        <Box>
          <Flex align="center" gap={2}>
            <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.500">
              Análise de Conversão
            </Text>
            <Badge
              colorPalette="orange"
              size="sm"
              variant="subtle"
              style={{ background: "linear-gradient(135deg, rgba(237,137,54,0.15), rgba(159,122,234,0.15))", color: "#fbd38d" }}
            >
              IA
            </Badge>
          </Flex>
          <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
            Produtos com alto interesse e baixa conversão — cache de 3h
          </Text>
        </Box>

        <Flex gap={2} align="center">
          {analise && (
            <Text fontSize="xs" color="whiteAlpha.300">
              {analise.from_cache
                ? `cache · ${analise.cache_age_min ?? 0}min atrás`
                : `gerado agora`}
            </Text>
          )}
          {analise && (
            <Button
              size="xs"
              variant="ghost"
              color="whiteAlpha.400"
              _hover={{ color: "white", bg: "whiteAlpha.100" }}
              loading={loading}
              onClick={() => carregar(true)}
            >
              Atualizar
            </Button>
          )}
          <Button
            size="sm"
            loading={loading}
            onClick={() => {
              if (!analise) {
                carregar(false);
              } else {
                setOpen((v) => !v);
              }
            }}
            style={{
              background: "linear-gradient(135deg, rgba(237,137,54,0.8), rgba(159,122,234,0.8))",
              color: "white",
            }}
          >
            {!analise ? "Gerar Análise IA" : open ? "Recolher" : "Ver Análise"}
          </Button>
        </Flex>
      </Flex>

      {/* Panel content */}
      {open && analise && (
        <VStack gap={4} align="stretch">
          {/* Resumo */}
          <Box
            p={4}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="orange.900"
            borderRadius="xl"
          >
            <Flex gap={3} align="flex-start">
              <Text fontSize="lg">🔍</Text>
              <Box flex={1}>
                <Text fontSize="sm" color="white" lineHeight="1.7">{analise.resumo}</Text>
                {analise.oportunidade && (
                  <Text fontSize="xs" color="teal.300" mt={2} fontStyle="italic">{analise.oportunidade}</Text>
                )}
                <Flex gap={4} mt={3} wrap="wrap">
                  <Text fontSize="xs" color="whiteAlpha.400">
                    {analise.total_produtos_analisados} produtos analisados
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.400">
                    Média de conversão da loja: {(analise.media_conversao_loja * 100).toFixed(2)}%
                  </Text>
                  <Text fontSize="xs" color="orange.400">
                    {analise.produtos.length} produto{analise.produtos.length !== 1 ? "s" : ""} abaixo da média
                  </Text>
                </Flex>
              </Box>
            </Flex>
          </Box>

          {analise.produtos.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text fontSize="sm" color="whiteAlpha.500">
                Nenhum produto com gap de conversão significativo identificado.
              </Text>
            </Box>
          ) : (
            analise.produtos.map((p) => (
              <ProdutoAnaliseCard
                key={p.item_id}
                produto={p}
                mediaConversao={analise.media_conversao_loja}
              />
            ))
          )}
        </VStack>
      )}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RelatoriosTab({ clienteId }: Props) {
  const [stats, setStats] = useState<ClienteStats | null>(null);
  const [projetos, setProjetos] = useState<ProjetoRelatorio[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);

    const hoje = new Date().toDateString();
    const sete_dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: projs },
      { data: contatos },
      { data: disparos },
      { data: forms },
      { data: automacoes },
    ] = await Promise.all([
      supabase.from("crm_projetos").select("id, nome, website_url").eq("cliente_id", clienteId).eq("ativo", true),
      supabase.from("crm_contacts").select("projeto_id, criado_em").eq("cliente_id", clienteId),
      supabase.from("crm_email_disparos").select("projeto_id, status").eq("cliente_id", clienteId),
      supabase.from("crm_forms").select("projeto_id").eq("cliente_id", clienteId).eq("ativo", true),
      supabase.from("crm_trigger_rules").select("id").eq("cliente_id", clienteId).eq("ativo", true),
    ]);

    const allContatos = contatos ?? [];
    const allDisparos = disparos ?? [];

    // Stats globais do cliente
    setStats({
      total_contatos: allContatos.length,
      contatos_hoje: allContatos.filter((c) => new Date(c.criado_em).toDateString() === hoje).length,
      total_disparos: allDisparos.length,
      disparos_abertos: allDisparos.filter((d) => d.status === "aberto" || d.status === "clicado").length,
      total_forms_ativos: (forms ?? []).length,
      total_automacoes_ativas: (automacoes ?? []).length,
    });

    // Stats por projeto
    const contatosPorProjeto: Record<string, { total: number; recentes: number }> = {};
    allContatos.forEach((c) => {
      const pid = c.projeto_id ?? "__sem_projeto__";
      if (!contatosPorProjeto[pid]) contatosPorProjeto[pid] = { total: 0, recentes: 0 };
      contatosPorProjeto[pid].total++;
      if (c.criado_em >= sete_dias) contatosPorProjeto[pid].recentes++;
    });

    const disparosPorProjeto: Record<string, { total: number; abertos: number }> = {};
    allDisparos.forEach((d) => {
      const pid = d.projeto_id ?? "__sem_projeto__";
      if (!disparosPorProjeto[pid]) disparosPorProjeto[pid] = { total: 0, abertos: 0 };
      disparosPorProjeto[pid].total++;
      if (d.status === "aberto" || d.status === "clicado") disparosPorProjeto[pid].abertos++;
    });

    const formsPorProjeto: Record<string, number> = {};
    (forms ?? []).forEach((f) => {
      const pid = f.projeto_id ?? "__sem_projeto__";
      formsPorProjeto[pid] = (formsPorProjeto[pid] ?? 0) + 1;
    });

    setProjetos(
      (projs ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        website_url: p.website_url,
        total_contatos: contatosPorProjeto[p.id]?.total ?? 0,
        contatos_7d: contatosPorProjeto[p.id]?.recentes ?? 0,
        total_disparos: disparosPorProjeto[p.id]?.total ?? 0,
        disparos_abertos: disparosPorProjeto[p.id]?.abertos ?? 0,
        forms_ativos: formsPorProjeto[p.id] ?? 0,
      }))
    );

    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  if (!clienteId) return <EmptyState title="Selecione um cliente para ver os relatórios" icon="⬡" />;

  if (loading) return <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>;

  const taxaAbertura = stats && stats.total_disparos > 0
    ? (stats.disparos_abertos / stats.total_disparos) * 100
    : 0;

  return (
    <VStack gap={8} align="stretch">
      {/* Resumo do cliente */}
      <Box>
        <Text color="whiteAlpha.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" mb={3}>
          Resumo do Cliente
        </Text>
        <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={3}>
          <StatCard label="Total Contatos" value={stats?.total_contatos ?? 0} sub={`${stats?.contatos_hoje ?? 0} hoje`} accent />
          <StatCard label="Emails Disparados" value={stats?.total_disparos ?? 0} />
          <StatCard label="Taxa de Abertura" value={`${taxaAbertura.toFixed(1)}%`} sub={`${stats?.disparos_abertos ?? 0} abertos`} />
          <StatCard label="Formulários Ativos" value={stats?.total_forms_ativos ?? 0} />
          <StatCard label="Automações Ativas" value={stats?.total_automacoes_ativas ?? 0} />
        </Grid>
      </Box>

      <Separator borderColor="whiteAlpha.100" />

      {/* Relatório por projeto */}
      <Box>
        <Text color="whiteAlpha.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" mb={3}>
          Por Projeto
        </Text>

        {projetos.length === 0 ? (
          <EmptyState title="Nenhum projeto ativo" icon="⚡" />
        ) : (
          <VStack gap={2} align="stretch">
            {/* Header */}
            <Flex px={4} py={2} gap={4}>
              <Text fontSize="xs" color="whiteAlpha.400" flex={2}>Projeto</Text>
              <Text fontSize="xs" color="whiteAlpha.400" w="90px" textAlign="right">Contatos</Text>
              <Text fontSize="xs" color="whiteAlpha.400" w="80px" textAlign="right">Últ. 7 dias</Text>
              <Text fontSize="xs" color="whiteAlpha.400" w="90px" textAlign="right">Disparos</Text>
              <Text fontSize="xs" color="whiteAlpha.400" w="90px" textAlign="right">Abertura</Text>
              <Text fontSize="xs" color="whiteAlpha.400" w="60px" textAlign="right">Forms</Text>
            </Flex>

            {projetos.map((p) => {
              const taxa = p.total_disparos > 0 ? (p.disparos_abertos / p.total_disparos) * 100 : 0;
              return (
                <Flex
                  key={p.id}
                  px={4}
                  py={3}
                  gap={4}
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                  borderRadius="xl"
                  align="center"
                  _hover={{ borderColor: "whiteAlpha.200" }}
                >
                  <Box flex={2} minW={0}>
                    <Text fontSize="sm" fontWeight="medium" color="white" truncate>{p.nome}</Text>
                    {p.website_url && (
                      <Text fontSize="xs" color="whiteAlpha.400" truncate>{p.website_url}</Text>
                    )}
                  </Box>
                  <Text w="90px" fontSize="sm" color="teal.300" fontWeight="bold" textAlign="right">
                    {p.total_contatos}
                  </Text>
                  <Text w="80px" fontSize="sm" color={p.contatos_7d > 0 ? "green.400" : "whiteAlpha.400"} textAlign="right">
                    +{p.contatos_7d}
                  </Text>
                  <Text w="90px" fontSize="sm" color="blue.300" textAlign="right">
                    {p.total_disparos}
                  </Text>
                  <Box w="90px" textAlign="right">
                    {p.total_disparos > 0 ? <TaxaBadge value={taxa} /> : <Text fontSize="xs" color="whiteAlpha.300">—</Text>}
                  </Box>
                  <Text w="60px" fontSize="sm" color="whiteAlpha.600" textAlign="right">
                    {p.forms_ativos}
                  </Text>
                </Flex>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* AI Conversion Analysis */}
      <AnaliseConversaoPanel clienteId={clienteId} />
    </VStack>
  );
}
