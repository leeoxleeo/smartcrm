"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  onNavigate: (clienteId: string, tab: string) => void;
}

interface ClienteComProjetos {
  id: string;
  nome: string;
  plataforma?: string;
  website_url?: string;
  projetos: ProjetoInfo[];
  total_contatos: number;
  total_disparos: number;
  automacoes_ativas: number;
}

interface ProjetoInfo {
  id: string;
  nome: string;
  website_url?: string;
  descricao?: string;
  ativo: boolean;
}

const platformLabels: Record<string, string> = {
  vtex: "VTEX", shopify: "Shopify", woocommerce: "WooCommerce",
  magento: "Magento", wake: "Wake", oracle: "Oracle",
  wordpress: "WordPress", strapi: "Strapi", custom: "Custom",
};

const platformColors: Record<string, string> = {
  vtex: "red", shopify: "green", woocommerce: "purple",
  magento: "orange", wake: "blue", oracle: "yellow",
  wordpress: "blue", strapi: "purple", custom: "gray",
};

function ProjetoMiniCard({ projeto, clienteId, onNavigate }: {
  projeto: ProjetoInfo;
  clienteId: string;
  onNavigate: (clienteId: string, tab: string) => void;
}) {
  return (
    <Flex
      p={3}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="lg"
      align="center"
      gap={3}
      _hover={{ borderColor: "teal.800", bg: "whiteAlpha.100" }}
      transition="all 0.15s"
      cursor="pointer"
      onClick={() => onNavigate(clienteId, "projetos")}
    >
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="white" truncate>
            {projeto.nome}
          </Text>
          {!projeto.ativo && (
            <Badge colorPalette="gray" size="sm">Inativo</Badge>
          )}
        </Flex>
        {projeto.website_url && (
          <Text fontSize="xs" color="teal.500" truncate mt={0.5}>
            {projeto.website_url}
          </Text>
        )}
        {projeto.descricao && (
          <Text fontSize="xs" color="whiteAlpha.400" truncate mt={0.5}>
            {projeto.descricao}
          </Text>
        )}
      </Box>
      <Text fontSize="xs" color="whiteAlpha.300" flexShrink={0}>→</Text>
    </Flex>
  );
}

function ClienteSection({ cliente, onNavigate }: {
  cliente: ClienteComProjetos;
  onNavigate: (clienteId: string, tab: string) => void;
}) {
  const plat = cliente.plataforma;

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="2xl"
      overflow="hidden"
    >
      {/* Cliente header */}
      <Flex
        px={5}
        py={4}
        bg="whiteAlpha.50"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={0.5}>
            <Text fontSize="sm" fontWeight="bold" color="white">
              {cliente.nome}
            </Text>
            {plat && (
              <Badge colorPalette={platformColors[plat] ?? "gray"} size="sm" variant="subtle">
                {platformLabels[plat] ?? plat}
              </Badge>
            )}
          </Flex>
          {cliente.website_url && (
            <Text fontSize="xs" color="whiteAlpha.400" truncate>
              {cliente.website_url}
            </Text>
          )}
        </Box>

        {/* Stats rápidos */}
        <Flex gap={4} align="center" flexShrink={0}>
          {cliente.total_contatos > 0 && (
            <Flex direction="column" align="center">
              <Text fontSize="sm" fontWeight="bold" color="teal.300">{cliente.total_contatos}</Text>
              <Text fontSize="10px" color="whiteAlpha.400">contatos</Text>
            </Flex>
          )}
          {cliente.total_disparos > 0 && (
            <Flex direction="column" align="center">
              <Text fontSize="sm" fontWeight="bold" color="blue.300">{cliente.total_disparos}</Text>
              <Text fontSize="10px" color="whiteAlpha.400">disparos</Text>
            </Flex>
          )}
          {cliente.automacoes_ativas > 0 && (
            <Badge colorPalette="teal" size="sm">
              {cliente.automacoes_ativas} automação{cliente.automacoes_ativas > 1 ? "ões" : ""}
            </Badge>
          )}
        </Flex>

        <Button
          size="xs"
          variant="ghost"
          color="teal.400"
          borderColor="teal.900"
          border="1px solid"
          _hover={{ bg: "teal.950" }}
          onClick={() => onNavigate(cliente.id, "relatorios")}
          flexShrink={0}
        >
          Abrir CRM →
        </Button>
      </Flex>

      {/* Projetos */}
      <Box p={4}>
        {cliente.projetos.length === 0 ? (
          <Flex
            py={4}
            align="center"
            justify="center"
            gap={2}
            cursor="pointer"
            onClick={() => onNavigate(cliente.id, "projetos")}
            _hover={{ color: "teal.400" }}
            transition="color 0.15s"
          >
            <Text fontSize="xs" color="whiteAlpha.300">Nenhum projeto criado</Text>
            <Text fontSize="xs" color="whiteAlpha.300">— Criar projeto →</Text>
          </Flex>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(260px, 1fr))" gap={2}>
            {cliente.projetos.map((p) => (
              <ProjetoMiniCard
                key={p.id}
                projeto={p}
                clienteId={cliente.id}
                onNavigate={onNavigate}
              />
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export function VisaoGeralTab({ onNavigate }: Props) {
  const [clientes, setClientes] = useState<ClienteComProjetos[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      { data: clientesData },
      { data: projetosData },
      { data: contatosData },
      { data: disparosData },
      { data: automacoesData },
    ] = await Promise.all([
      supabase.from("clientes").select("id, nome, plataforma, website_url").eq("ativo", true).order("nome"),
      supabase.from("crm_projetos").select("id, cliente_id, nome, website_url, descricao, ativo").eq("ativo", true).order("criado_em"),
      supabase.from("crm_contacts").select("cliente_id").limit(5000),
      supabase.from("crm_email_disparos").select("cliente_id").limit(5000),
      supabase.from("crm_trigger_rules").select("cliente_id").eq("status", "ativo"),
    ]);

    // Group projetos by cliente
    const projetosByCliente: Record<string, ProjetoInfo[]> = {};
    for (const p of (projetosData ?? [])) {
      if (!projetosByCliente[p.cliente_id]) projetosByCliente[p.cliente_id] = [];
      projetosByCliente[p.cliente_id].push(p);
    }

    // Count stats by cliente
    const contatoCount: Record<string, number> = {};
    for (const c of (contatosData ?? [])) {
      contatoCount[c.cliente_id] = (contatoCount[c.cliente_id] ?? 0) + 1;
    }

    const disparoCount: Record<string, number> = {};
    for (const d of (disparosData ?? [])) {
      disparoCount[d.cliente_id] = (disparoCount[d.cliente_id] ?? 0) + 1;
    }

    const automacaoCount: Record<string, number> = {};
    for (const a of (automacoesData ?? [])) {
      automacaoCount[a.cliente_id] = (automacaoCount[a.cliente_id] ?? 0) + 1;
    }

    setClientes(
      (clientesData ?? []).map((c) => ({
        id:               c.id,
        nome:             c.nome,
        plataforma:       c.plataforma ?? undefined,
        website_url:      c.website_url ?? undefined,
        projetos:         projetosByCliente[c.id] ?? [],
        total_contatos:   contatoCount[c.id] ?? 0,
        total_disparos:   disparoCount[c.id] ?? 0,
        automacoes_ativas: automacaoCount[c.id] ?? 0,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>;

  if (clientes.length === 0) {
    return <EmptyState title="Nenhum cliente cadastrado" description="Cadastre clientes na seção Clientes para começar" icon="⬡" />;
  }

  const totalProjetos = clientes.reduce((acc, c) => acc + c.projetos.length, 0);
  const totalContatos = clientes.reduce((acc, c) => acc + c.total_contatos, 0);
  const totalDisparos = clientes.reduce((acc, c) => acc + c.total_disparos, 0);

  return (
    <Box>
      {/* Summary bar */}
      <Flex gap={4} mb={5} wrap="wrap">
        <Flex align="center" gap={2} px={4} py={2.5} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="lg" fontWeight="bold" color="white">{clientes.length}</Text>
          <Text fontSize="xs" color="whiteAlpha.500">cliente{clientes.length !== 1 ? "s" : ""}</Text>
        </Flex>
        <Flex align="center" gap={2} px={4} py={2.5} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
          <Text fontSize="lg" fontWeight="bold" color="teal.300">{totalProjetos}</Text>
          <Text fontSize="xs" color="whiteAlpha.500">projeto{totalProjetos !== 1 ? "s" : ""}</Text>
        </Flex>
        {totalContatos > 0 && (
          <Flex align="center" gap={2} px={4} py={2.5} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
            <Text fontSize="lg" fontWeight="bold" color="blue.300">{totalContatos.toLocaleString("pt-BR")}</Text>
            <Text fontSize="xs" color="whiteAlpha.500">contatos</Text>
          </Flex>
        )}
        {totalDisparos > 0 && (
          <Flex align="center" gap={2} px={4} py={2.5} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
            <Text fontSize="lg" fontWeight="bold" color="purple.300">{totalDisparos.toLocaleString("pt-BR")}</Text>
            <Text fontSize="xs" color="whiteAlpha.500">emails disparados</Text>
          </Flex>
        )}
      </Flex>

      {/* Clients + their projects */}
      <VStack gap={4} align="stretch">
        {clientes.map((c) => (
          <ClienteSection key={c.id} cliente={c} onNavigate={onNavigate} />
        ))}
      </VStack>
    </Box>
  );
}
