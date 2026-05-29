"use client";

import { useState } from "react";
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
import type { RfmAnalise, RfmSegmento, RfmSegmentSummary } from "@/lib/types";

interface Props {
  clienteId: string;
  onCriarCampanha?: (segmento: RfmSegmento) => void;
}

// ─── Segment metadata ─────────────────────────────────────────────────────────

const SEG_CONFIG: Record<RfmSegmento, { label: string; desc: string; color: string; emoji: string; health: "great" | "good" | "warn" | "risk" }> = {
  champion:           { label: "Campeões",             desc: "Compraram recentemente, com frequência e alto valor",       color: "teal",   emoji: "🏆", health: "great" },
  loyal:              { label: "Leais",                desc: "Compram com frequência, mas valor ou recência moderados",   color: "blue",   emoji: "💎", health: "great" },
  potential_loyalist: { label: "Potencialmente Leais", desc: "Recentes, mas ainda não compraram muito — grande potencial",color: "cyan",   emoji: "⭐", health: "good"  },
  new_customer:       { label: "Novos Clientes",       desc: "Compraram pela primeira vez recentemente",                  color: "green",  emoji: "🌱", health: "good"  },
  promising:          { label: "Promissores",          desc: "Engajados recentemente, mas sem compra ainda",              color: "purple", emoji: "✨", health: "good"  },
  need_attention:     { label: "Precisam de Atenção",  desc: "Acima da média mas com sinais de esfriamento",             color: "yellow", emoji: "👀", health: "warn"  },
  at_risk:            { label: "Em Risco",             desc: "Costumavam comprar bastante, mas sumiram",                  color: "orange", emoji: "⚠️", health: "risk"  },
  cant_lose:          { label: "Não Pode Perder",      desc: "Clientes valiosos que pararam de comprar — urgente",        color: "red",    emoji: "🚨", health: "risk"  },
  hibernating:        { label: "Hibernando",           desc: "Sem compras recentes e baixa frequência histórica",         color: "gray",   emoji: "😴", health: "risk"  },
  lost:               { label: "Perdidos",             desc: "Compraram pouco há muito tempo — custo de reativação alto", color: "red",    emoji: "💤", health: "risk"  },
};

const HEALTH_ORDER: Record<string, number> = { great: 0, good: 1, warn: 2, risk: 3 };

// ─── Segment card ─────────────────────────────────────────────────────────────

function SegCard({
  seg,
  receitaTotal,
  onCampanha,
}: {
  seg: RfmSegmentSummary;
  receitaTotal: number;
  onCampanha?: () => void;
}) {
  const cfg = SEG_CONFIG[seg.segmento];
  const pctReceita = receitaTotal > 0 ? (seg.valor_total / receitaTotal) * 100 : 0;

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
      <Flex align="flex-start" justify="space-between" mb={2}>
        <Flex align="center" gap={2}>
          <Text fontSize="lg" lineHeight="1">{cfg.emoji}</Text>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="white">{cfg.label}</Text>
            <Badge colorPalette={cfg.color} size="sm" variant="subtle" mt={0.5}>
              {seg.count} cliente{seg.count !== 1 ? "s" : ""}
            </Badge>
          </Box>
        </Flex>
        {onCampanha && (
          <Button
            size="xs"
            variant="ghost"
            color="whiteAlpha.400"
            _hover={{ color: "teal.300", bg: "whiteAlpha.100" }}
            onClick={onCampanha}
          >
            + Campanha
          </Button>
        )}
      </Flex>

      <Text fontSize="xs" color="whiteAlpha.400" lineHeight="1.5" mb={3}>{cfg.desc}</Text>

      <Grid templateColumns="1fr 1fr" gap={2}>
        <Box p={2} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="sm" fontWeight="bold" color="teal.300">
            {seg.valor_total > 0
              ? `R$ ${seg.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"}
          </Text>
          <Text fontSize="10px" color="whiteAlpha.400">receita total</Text>
        </Box>
        <Box p={2} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="sm" fontWeight="bold" color="blue.300">
            {seg.valor_medio > 0
              ? `R$ ${seg.valor_medio.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : "—"}
          </Text>
          <Text fontSize="10px" color="whiteAlpha.400">ticket médio</Text>
        </Box>
        <Box p={2} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="sm" fontWeight="bold" color="purple.300">
            {seg.frequencia_media.toFixed(1)}x
          </Text>
          <Text fontSize="10px" color="whiteAlpha.400">freq. média</Text>
        </Box>
        <Box p={2} bg="whiteAlpha.50" borderRadius="lg" textAlign="center">
          <Text fontSize="sm" fontWeight="bold" color="orange.300">
            {pctReceita.toFixed(1)}%
          </Text>
          <Text fontSize="10px" color="whiteAlpha.400">da receita</Text>
        </Box>
      </Grid>
    </Box>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function RfmPanel({ clienteId, onCriarCampanha }: Props) {
  const [analise, setAnalise] = useState<RfmAnalise | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function calcular(forcado = false) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crm-rfm`,
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
        toaster.create({ title: "Erro no RFM", description: json.error, type: "error" });
      } else {
        setAnalise(json as RfmAnalise);
        setOpen(true);
      }
    } catch {
      toaster.create({ title: "Falha na conexão com a Edge Function", type: "error" });
    }
    setLoading(false);
  }

  // Sort: great → good → warn → risk, then by count desc within each health
  const segOrdenados = analise
    ? [...analise.segmentos].sort((a, b) => {
        const ha = HEALTH_ORDER[SEG_CONFIG[a.segmento].health] ?? 4;
        const hb = HEALTH_ORDER[SEG_CONFIG[b.segmento].health] ?? 4;
        return ha !== hb ? ha - hb : b.count - a.count;
      })
    : [];

  const atRisk = analise
    ? analise.segmentos
        .filter((s) => SEG_CONFIG[s.segmento].health === "risk")
        .reduce((acc, s) => acc + s.valor_total, 0)
    : 0;

  return (
    <Box>
      <Separator borderColor="whiteAlpha.100" mb={6} />

      {/* Header */}
      <Flex align="center" justify="space-between" mb={open && analise ? 4 : 0} wrap="wrap" gap={3}>
        <Box>
          <Flex align="center" gap={2}>
            <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.500">
              Segmentação RFM
            </Text>
            <Badge
              size="sm"
              variant="subtle"
              style={{ background: "linear-gradient(135deg,rgba(56,178,172,0.15),rgba(99,179,237,0.15))", color: "#81e6d9" }}
            >
              IA
            </Badge>
          </Flex>
          <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
            Recência · Frequência · Monetário — cache de 6h
          </Text>
        </Box>

        <Flex gap={2} align="center">
          {analise && (
            <Text fontSize="xs" color="whiteAlpha.300">
              {analise.from_cache ? `cache · ${analise.cache_age_min ?? 0}min atrás` : "gerado agora"}
            </Text>
          )}
          {analise && (
            <Button
              size="xs"
              variant="ghost"
              color="whiteAlpha.400"
              _hover={{ color: "white", bg: "whiteAlpha.100" }}
              loading={loading}
              onClick={() => calcular(true)}
            >
              Atualizar
            </Button>
          )}
          <Button
            size="sm"
            loading={loading}
            onClick={() => { if (!analise) calcular(false); else setOpen((v) => !v); }}
            style={{ background: "linear-gradient(135deg,rgba(56,178,172,0.8),rgba(99,179,237,0.8))", color: "white" }}
          >
            {!analise ? "Calcular RFM" : open ? "Recolher" : "Ver Segmentos"}
          </Button>
        </Flex>
      </Flex>

      {/* Content */}
      {open && analise && (
        <VStack gap={4} align="stretch">
          {/* Summary bar */}
          <Flex
            gap={4}
            p={4}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="teal.900"
            borderRadius="xl"
            wrap="wrap"
            align="center"
          >
            <Box flex={1} minW="120px">
              <Text fontSize="xs" color="whiteAlpha.400">Compradores analisados</Text>
              <Text fontSize="xl" fontWeight="bold" color="white">{analise.total_compradores}</Text>
            </Box>
            <Box flex={1} minW="140px">
              <Text fontSize="xs" color="whiteAlpha.400">Receita total mapeada</Text>
              <Text fontSize="xl" fontWeight="bold" color="teal.300">
                R${" "}{analise.receita_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
            </Box>
            {atRisk > 0 && (
              <Box flex={1} minW="140px">
                <Text fontSize="xs" color="whiteAlpha.400">Receita em risco</Text>
                <Text fontSize="xl" fontWeight="bold" color="orange.300">
                  R${" "}{atRisk.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
              </Box>
            )}
            <Box flex={1} minW="100px">
              <Text fontSize="xs" color="whiteAlpha.400">Segmentos</Text>
              <Text fontSize="xl" fontWeight="bold" color="blue.300">{analise.segmentos.length}</Text>
            </Box>
          </Flex>

          {/* AI insight */}
          {analise.insight_ia && (
            <Box
              p={4}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="teal.900"
              borderRadius="xl"
              borderLeft="3px solid"
            >
              <Flex align="center" gap={2} mb={2}>
                <Text fontSize="xs" color="teal.400" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                  Insight IA
                </Text>
              </Flex>
              <Text fontSize="sm" color="whiteAlpha.800" lineHeight="1.7">{analise.insight_ia}</Text>
            </Box>
          )}

          {/* Segment grid */}
          <Grid templateColumns="repeat(auto-fill, minmax(260px, 1fr))" gap={3}>
            {segOrdenados.map((seg) => (
              <SegCard
                key={seg.segmento}
                seg={seg}
                receitaTotal={analise.receita_total}
                onCampanha={onCriarCampanha ? () => onCriarCampanha(seg.segmento) : undefined}
              />
            ))}
          </Grid>
        </VStack>
      )}
    </Box>
  );
}
