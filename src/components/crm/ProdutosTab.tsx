"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Flex, Grid, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import type { CrmProduct } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  clienteId: string | null;
}

type Tab = "views" | "cart_adds" | "purchases";

const TAB_CONFIG: Record<Tab, { label: string; icon: string; color: string; barColor: string; emptyLabel: string }> = {
  views:     { label: "Mais Vistos",    icon: "👁",  color: "teal",   barColor: "teal.400",   emptyLabel: "visualizações" },
  cart_adds: { label: "Mais no Carrinho", icon: "🛒", color: "green",  barColor: "green.400",  emptyLabel: "adições ao carrinho" },
  purchases: { label: "Mais Comprados", icon: "✅",  color: "yellow", barColor: "yellow.400", emptyLabel: "compras" },
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function fmt(n?: number | null): string {
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function conv(cart: number, buy: number): string {
  if (!cart) return "";
  return `${Math.round((buy / cart) * 100)}% conv.`;
}

// ─── Ranked list ─────────────────────────────────────────────────────────────

function RankedList({
  products,
  tab,
  search,
}: {
  products: CrmProduct[];
  tab: Tab;
  search: string;
}) {
  const cfg = TAB_CONFIG[tab];

  const sorted = [...products].sort((a, b) => b[tab] - a[tab]);

  const filtered = search
    ? sorted.filter(
        (p) =>
          p.item_name.toLowerCase().includes(search) ||
          p.item_id.toLowerCase().includes(search) ||
          (p.item_category ?? "").toLowerCase().includes(search) ||
          (p.item_brand ?? "").toLowerCase().includes(search)
      )
    : sorted;

  const max = filtered[0]?.[tab] ?? 1;

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={search ? "Nenhum produto encontrado" : `Nenhum produto com ${cfg.emptyLabel}`}
        description={search ? "Tente outro termo" : "Os dados aparecem conforme os scripts enviam eventos"}
        icon="📦"
      />
    );
  }

  return (
    <VStack gap={0} align="stretch">
      {filtered.map((p, i) => {
        const value = p[tab];
        const progress = max > 0 ? (value / max) * 100 : 0;

        return (
          <Flex
            key={p.id}
            px={4}
            py={3.5}
            gap={4}
            align="flex-start"
            borderBottom="1px solid"
            borderColor="whiteAlpha.50"
            _hover={{ bg: "whiteAlpha.50" }}
            transition="background 0.1s"
          >
            {/* Rank */}
            <Box w="28px" textAlign="center" flexShrink={0} pt="3px">
              {i < 3 ? (
                <Text fontSize="lg" lineHeight="1">{RANK_ICONS[i]}</Text>
              ) : (
                <Text fontSize="xs" color="whiteAlpha.300" fontWeight="medium">#{i + 1}</Text>
              )}
            </Box>

            {/* Product info + bar */}
            <Box flex={1} minW={0}>
              <Text fontSize="sm" color="white" fontWeight="medium" truncate>
                {p.item_name}
              </Text>

              <Flex gap={1.5} mt={0.5} align="center" flexWrap="wrap">
                <Text fontSize="xs" color="whiteAlpha.400" fontFamily="mono" flexShrink={0}>
                  {p.item_id}
                </Text>
                {p.item_category && (
                  <Badge colorPalette="purple" size="sm" variant="subtle">{p.item_category}</Badge>
                )}
                {p.item_brand && (
                  <Badge colorPalette="blue" size="sm" variant="subtle">{p.item_brand}</Badge>
                )}
                {p.preco_atual && (
                  <Text fontSize="xs" color="whiteAlpha.500">{fmt(p.preco_atual)}</Text>
                )}
              </Flex>

              {/* Progress bar */}
              <Box mt={2} h="3px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
                <Box
                  h="full"
                  w={`${progress}%`}
                  bg={cfg.barColor}
                  borderRadius="full"
                  style={{ transition: "width 0.4s ease" }}
                />
              </Box>

              {/* Secondary stats */}
              <Flex gap={4} mt={1.5}>
                {tab !== "views" && p.views > 0 && (
                  <Text fontSize="xs" color="whiteAlpha.400">👁 {p.views.toLocaleString("pt-BR")}</Text>
                )}
                {tab !== "cart_adds" && p.cart_adds > 0 && (
                  <Text fontSize="xs" color="whiteAlpha.400">🛒 {p.cart_adds.toLocaleString("pt-BR")}</Text>
                )}
                {tab !== "purchases" && p.purchases > 0 && (
                  <Text fontSize="xs" color="whiteAlpha.400">✅ {p.purchases.toLocaleString("pt-BR")}</Text>
                )}
                {p.cart_adds > 0 && (
                  <Text fontSize="xs" color={p.purchases > 0 ? "green.400" : "whiteAlpha.300"}>
                    {conv(p.cart_adds, p.purchases)}
                  </Text>
                )}
                {tab === "purchases" && p.preco_atual && p.purchases > 0 && (
                  <Text fontSize="xs" color="yellow.400">
                    ≈ {fmt(p.preco_atual * p.purchases)}
                  </Text>
                )}
              </Flex>
            </Box>

            {/* Primary metric */}
            <Box textAlign="right" flexShrink={0} minW="60px">
              <Text
                fontSize="2xl"
                fontWeight="bold"
                color={`${cfg.color}.300`}
                lineHeight="1"
              >
                {value.toLocaleString("pt-BR")}
              </Text>
              <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
                {cfg.emptyLabel}
              </Text>
            </Box>
          </Flex>
        );
      })}
    </VStack>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProdutosTab({ clienteId }: Props) {
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("views");

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_products")
      .select("*")
      .eq("cliente_id", clienteId)
      .limit(300);
    setProducts(data ?? []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  const topViewed    = [...products].sort((a, b) => b.views - a.views)[0];
  const topCart      = [...products].sort((a, b) => b.cart_adds - a.cart_adds)[0];
  const topPurchased = [...products].sort((a, b) => b.purchases - a.purchases)[0];

  if (!clienteId) return <EmptyState title="Selecione um cliente" icon="⬡" />;

  return (
    <Box>
      {/* Summary cards */}
      <Grid templateColumns="repeat(4, 1fr)" gap={3} mb={5}>
        <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text color="whiteAlpha.500" fontSize="xs" mb={1}>Produtos rastreados</Text>
          <Text color="teal.300" fontSize="2xl" fontWeight="bold">{products.length}</Text>
        </Box>
        <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text color="whiteAlpha.500" fontSize="xs" mb={1}>👁 Mais visto</Text>
          <Text color="white" fontSize="sm" fontWeight="semibold" truncate>{topViewed?.item_name ?? "—"}</Text>
          {topViewed && <Text color="teal.400" fontSize="xs">{topViewed.views.toLocaleString("pt-BR")} views</Text>}
        </Box>
        <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text color="whiteAlpha.500" fontSize="xs" mb={1}>🛒 Mais no carrinho</Text>
          <Text color="white" fontSize="sm" fontWeight="semibold" truncate>{topCart?.item_name ?? "—"}</Text>
          {topCart && <Text color="green.400" fontSize="xs">{topCart.cart_adds.toLocaleString("pt-BR")} adições</Text>}
        </Box>
        <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text color="whiteAlpha.500" fontSize="xs" mb={1}>✅ Mais comprado</Text>
          <Text color="white" fontSize="sm" fontWeight="semibold" truncate>{topPurchased?.item_name ?? "—"}</Text>
          {topPurchased && <Text color="yellow.400" fontSize="xs">{topPurchased.purchases.toLocaleString("pt-BR")} compras</Text>}
        </Box>
      </Grid>

      {/* Search + pill tabs */}
      <Flex gap={3} mb={4} align="center" flexWrap="wrap">
        <Input
          placeholder="Buscar por nome, SKU, categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          maxW="300px"
          size="sm"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: "whiteAlpha.400" }}
          _focus={{ borderColor: "teal.400" }}
        />

        <Flex gap={2}>
          {(Object.keys(TAB_CONFIG) as Tab[]).map((key) => {
            const cfg = TAB_CONFIG[key];
            const isActive = tab === key;
            const count = products.filter((p) => p[key] > 0).length;
            return (
              <Flex
                key={key}
                align="center"
                gap={1.5}
                px={3}
                py={1.5}
                borderRadius="full"
                cursor="pointer"
                border="1px solid"
                borderColor={isActive ? `${cfg.color}.700` : "whiteAlpha.100"}
                bg={isActive ? `${cfg.color}.950` : "whiteAlpha.50"}
                onClick={() => setTab(key)}
                _hover={{ borderColor: `${cfg.color}.700`, bg: `${cfg.color}.950` }}
                transition="all 0.15s"
              >
                <Text fontSize="sm">{cfg.icon}</Text>
                <Text fontSize="xs" color={isActive ? `${cfg.color}.200` : "whiteAlpha.500"} fontWeight={isActive ? "semibold" : "normal"}>
                  {cfg.label}
                </Text>
                {count > 0 && (
                  <Text fontSize="xs" color={isActive ? `${cfg.color}.400` : "whiteAlpha.300"}>
                    {count}
                  </Text>
                )}
              </Flex>
            );
          })}
        </Flex>
      </Flex>

      {/* List */}
      <Box border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl" overflow="hidden">
        {loading ? (
          <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>
        ) : (
          <RankedList products={products} tab={tab} search={search} />
        )}
      </Box>
    </Box>
  );
}
