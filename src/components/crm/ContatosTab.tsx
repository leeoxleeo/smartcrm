"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Flex,
  Grid,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import type { CrmContact, CrmEvent } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  clienteId: string | null;
}

// ─── Event helpers ───────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  product_view:      { icon: "👁", color: "teal",   label: "Produto visto" },
  view_item_list:    { icon: "📋", color: "purple",  label: "Lista de produtos" },
  cart_add:          { icon: "🛒", color: "green",   label: "Adicionou ao carrinho" },
  cart_remove:       { icon: "🗑", color: "red",     label: "Removeu do carrinho" },
  view_cart:         { icon: "🛍", color: "orange",  label: "Viu o carrinho" },
  checkout_start:    { icon: "💳", color: "blue",    label: "Iniciou checkout" },
  checkout_profile:  { icon: "📝", color: "blue",    label: "Perfil no checkout" },
  checkout_payment:  { icon: "💰", color: "blue",    label: "Pagamento" },
  purchase:          { icon: "✅", color: "yellow",  label: "Comprou" },
};

function formatCurrency(value: unknown): string {
  const n = Number(value);
  if (!n) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function eventSummary(tipo: string, payload: Record<string, unknown>): string {
  const items = payload.items as Array<Record<string, unknown>> | undefined;
  const firstItem = items?.[0];

  if (tipo === "purchase") {
    const count = items?.length ?? 0;
    const revenue = payload.revenue ?? payload.value;
    return [
      count > 0 ? `${count} iten${count > 1 ? "s" : ""}` : null,
      revenue ? formatCurrency(revenue) : null,
      payload.transaction_id ? `#${payload.transaction_id}` : null,
    ].filter(Boolean).join(" · ");
  }

  if (tipo === "view_cart") {
    const count = items?.length ?? 0;
    return count > 0 ? `${count} iten${count > 1 ? "s" : ""} no carrinho` : "";
  }

  if (tipo === "checkout_start") {
    return payload.value ? formatCurrency(payload.value) : "";
  }

  if (firstItem) {
    const parts: string[] = [];
    if (firstItem.item_name) parts.push(String(firstItem.item_name));
    if (firstItem.price) parts.push(formatCurrency(firstItem.price));
    if ((items?.length ?? 0) > 1) parts.push(`+${(items!.length - 1)} outros`);
    return parts.join(" · ");
  }

  return "";
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── Journey panel ───────────────────────────────────────────────────────────

function JourneyPanel({ contact }: { contact: CrmContact }) {
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE = 30;

  const loadEvents = useCallback(async (offset: number) => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_events")
      .select("*")
      .eq("contact_id", contact.id)
      .order("criado_em", { ascending: false })
      .range(offset, offset + PAGE - 1);
    const rows = data ?? [];
    setHasMore(rows.length === PAGE);
    setEvents((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setLoading(false);
  }, [contact.id]);

  useEffect(() => {
    setEvents([]);
    setPage(0);
    loadEvents(0);
  }, [loadEvents]);

  const cfg = (tipo: string) =>
    EVENT_CONFIG[tipo] ?? { icon: "⚡", color: "gray", label: tipo };

  return (
    <Flex direction="column" h="full" overflow="hidden">
      {/* Contact header */}
      <Box
        p={4}
        bg="whiteAlpha.50"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        flexShrink={0}
      >
        <Flex align="center" gap={3} mb={1}>
          <Box
            w="36px" h="36px" borderRadius="full" flexShrink={0}
            display="flex" alignItems="center" justifyContent="center"
            style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-600), var(--chakra-colors-blue-600))" }}
            fontSize="sm" fontWeight="bold" color="white"
          >
            {(contact.nome ?? contact.email).charAt(0).toUpperCase()}
          </Box>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="semibold" color="white" truncate>
              {contact.nome ?? contact.email}
            </Text>
            {contact.nome && (
              <Text fontSize="xs" color="teal.400" truncate>{contact.email}</Text>
            )}
          </Box>
        </Flex>
        <Flex gap={2} wrap="wrap" mt={2}>
          <Badge colorPalette={contact.origem === "form" ? "teal" : "blue"} size="sm">
            {contact.origem}
          </Badge>
          {contact.utm_source && (
            <Badge colorPalette="purple" size="sm" variant="subtle">{contact.utm_source}</Badge>
          )}
          <Text fontSize="xs" color="whiteAlpha.400">
            desde {new Date(contact.criado_em).toLocaleDateString("pt-BR")}
          </Text>
        </Flex>
      </Box>

      {/* Events timeline */}
      <Box flex={1} overflowY="auto" p={4}>
        {loading && events.length === 0 ? (
          <Flex justify="center" py={8}><Spinner color="teal.400" size="sm" /></Flex>
        ) : events.length === 0 ? (
          <Flex direction="column" align="center" py={10} gap={2}>
            <Text fontSize="2xl">📭</Text>
            <Text fontSize="sm" color="whiteAlpha.400">Nenhum evento registrado</Text>
            <Text fontSize="xs" color="whiteAlpha.300" textAlign="center">
              Os eventos aparecem quando o script SmartCRM está instalado e o contato navega
            </Text>
          </Flex>
        ) : (
          <VStack gap={0} align="stretch">
            {events.map((ev, i) => {
              const c = cfg(ev.tipo);
              const summary = eventSummary(ev.tipo, ev.payload);
              const isLast = i === events.length - 1;
              return (
                <Flex key={ev.id} gap={3} position="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <Box
                      position="absolute"
                      left="15px"
                      top="32px"
                      bottom={0}
                      w="1px"
                      bg="whiteAlpha.100"
                    />
                  )}

                  {/* Icon dot */}
                  <Flex
                    w="30px" h="30px" borderRadius="full" flexShrink={0}
                    align="center" justify="center"
                    bg={`${c.color}.950`}
                    border="1px solid"
                    borderColor={`${c.color}.800`}
                    fontSize="xs"
                    mt="8px"
                    zIndex={1}
                  >
                    {c.icon}
                  </Flex>

                  {/* Content */}
                  <Box flex={1} pb={4} minW={0}>
                    <Flex align="center" gap={2} mb={0.5} justify="space-between">
                      <Badge colorPalette={c.color} size="sm">{c.label}</Badge>
                      <Text fontSize="xs" color="whiteAlpha.400" flexShrink={0}>
                        {timeAgo(ev.criado_em)}
                      </Text>
                    </Flex>
                    {summary && (
                      <Text fontSize="xs" color="white" fontWeight="medium" truncate mb={0.5}>
                        {summary}
                      </Text>
                    )}
                    {ev.pagina && (
                      <Text fontSize="xs" color="whiteAlpha.400" truncate>
                        {ev.pagina.replace(/^https?:\/\/[^/]+/, "")}
                      </Text>
                    )}
                  </Box>
                </Flex>
              );
            })}

            {hasMore && (
              <Flex justify="center" pt={2}>
                {loading ? (
                  <Spinner color="teal.400" size="sm" />
                ) : (
                  <Text
                    fontSize="xs" color="teal.400" cursor="pointer"
                    _hover={{ color: "teal.200" }}
                    onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      loadEvents(next * PAGE);
                    }}
                  >
                    Carregar mais eventos
                  </Text>
                )}
              </Flex>
            )}
          </VStack>
        )}
      </Box>
    </Flex>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
      <Text color="whiteAlpha.500" fontSize="xs">{label}</Text>
      <Text color="teal.300" fontSize="2xl" fontWeight="bold">{value}</Text>
    </Box>
  );
}

export function ContatosTab({ clienteId }: Props) {
  const [contatos, setContatos] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CrmContact | null>(null);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false })
      .limit(500);
    setContatos(data ?? []);
    setSelected(null);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  const hoje = new Date().toDateString();
  const hoje_count = contatos.filter((c) => new Date(c.criado_em).toDateString() === hoje).length;
  const via_form = contatos.filter((c) => c.origem === "form").length;
  const via_script = contatos.filter((c) => c.origem !== "form").length;

  const filtered = search
    ? contatos.filter(
        (c) =>
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          (c.nome ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : contatos;

  if (!clienteId) return <EmptyState title="Selecione um cliente" icon="⬡" />;

  return (
    <Box>
      <Grid templateColumns="repeat(4, 1fr)" gap={3} mb={5}>
        <StatCard label="Total" value={contatos.length} />
        <StatCard label="Hoje" value={hoje_count} />
        <StatCard label="Via Formulário" value={via_form} />
        <StatCard label="Via Script" value={via_script} />
      </Grid>

      <Flex gap={4} align="flex-start" h="calc(100vh - 360px)" minH="400px">
        {/* Left: contact list */}
        <Flex
          direction="column"
          w="340px"
          flexShrink={0}
          h="full"
          bg="whiteAlpha.25"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="xl"
          overflow="hidden"
        >
          <Box p={3} borderBottom="1px solid" borderColor="whiteAlpha.100" flexShrink={0}>
            <Input
              placeholder="Buscar email ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.200"
              color="white"
              _placeholder={{ color: "whiteAlpha.400" }}
              _focus={{ borderColor: "teal.400" }}
            />
          </Box>

          <Box flex={1} overflowY="auto">
            {loading ? (
              <Flex justify="center" py={8}><Spinner color="teal.400" size="sm" /></Flex>
            ) : filtered.length === 0 ? (
              <Flex py={8} justify="center">
                <Text fontSize="xs" color="whiteAlpha.400">
                  {search ? "Nenhum resultado" : "Nenhum contato"}
                </Text>
              </Flex>
            ) : (
              filtered.map((c) => (
                <Box
                  key={c.id}
                  px={3} py={2.5}
                  cursor="pointer"
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.50"
                  bg={selected?.id === c.id ? "teal.900" : "transparent"}
                  borderLeft="3px solid"
                  borderLeftColor={selected?.id === c.id ? "teal.400" : "transparent"}
                  _hover={{ bg: selected?.id === c.id ? "teal.900" : "whiteAlpha.50" }}
                  onClick={() => setSelected(c)}
                  transition="all 0.1s"
                >
                  <Text fontSize="sm" color="white" truncate fontWeight={selected?.id === c.id ? "semibold" : "normal"}>
                    {c.nome ?? c.email}
                  </Text>
                  {c.nome && (
                    <Text fontSize="xs" color="whiteAlpha.500" truncate>{c.email}</Text>
                  )}
                  <Flex align="center" gap={2} mt={0.5}>
                    <Badge colorPalette={c.origem === "form" ? "teal" : "blue"} size="sm" variant="subtle">
                      {c.origem}
                    </Badge>
                    <Text fontSize="xs" color="whiteAlpha.400">
                      {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </Text>
                  </Flex>
                </Box>
              ))
            )}
          </Box>
        </Flex>

        {/* Right: journey panel */}
        <Box
          flex={1}
          h="full"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="xl"
          overflow="hidden"
          bg="#141414"
        >
          {selected ? (
            <JourneyPanel contact={selected} />
          ) : (
            <Flex h="full" align="center" justify="center" direction="column" gap={3}>
              <Text fontSize="3xl">👆</Text>
              <Text fontSize="sm" color="whiteAlpha.400">Selecione um contato para ver a jornada</Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
