"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Grid,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { Cliente, CrmProjeto } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  clienteId: string | null;
}

interface ProjetoComStats extends CrmProjeto {
  total_contatos: number;
  total_disparos: number;
}

const platformLabels: Record<string, string> = {
  vtex: "VTEX", shopify: "Shopify", woocommerce: "WooCommerce",
  magento: "Magento", wake: "Wake", oracle: "Oracle",
  wordpress: "WordPress", strapi: "Strapi", custom: "Custom",
};

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Flex align="center" gap={1.5}>
      <Text fontSize="xs" color={color ?? "teal.300"} fontWeight="bold">{value}</Text>
      <Text fontSize="xs" color="whiteAlpha.400">{label}</Text>
    </Flex>
  );
}

function ProjetoCard({
  projeto,
  cliente,
  onEdit,
}: {
  projeto: ProjetoComStats;
  cliente: Partial<Cliente> | null;
  onEdit: (p: CrmProjeto) => void;
}) {
  const plataforma = cliente?.plataforma;
  const ga4 = cliente?.ga4_measurement_id;

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
      <Flex justify="space-between" align="flex-start" mb={2}>
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={0.5}>
            <Text fontSize="sm" fontWeight="semibold" color="white" truncate>
              {projeto.nome}
            </Text>
            {!projeto.ativo && <Badge colorPalette="gray" size="sm">Inativo</Badge>}
          </Flex>
          {projeto.descricao && (
            <Text fontSize="xs" color="whiteAlpha.500" truncate>{projeto.descricao}</Text>
          )}
        </Box>
        <Button size="xs" variant="ghost" color="whiteAlpha.500" onClick={() => onEdit(projeto)} flexShrink={0}>
          Editar
        </Button>
      </Flex>

      {/* URL do projeto (herdada do cliente se não definida) */}
      {(projeto.website_url || cliente?.website_url) && (
        <Text fontSize="xs" color="teal.500" truncate mb={2}>
          {projeto.website_url || cliente?.website_url}
        </Text>
      )}

      {/* Configurações herdadas do cliente */}
      <Flex gap={2} wrap="wrap" mb={3}>
        {plataforma && (
          <Badge colorPalette="purple" size="sm" variant="subtle">
            {platformLabels[plataforma] ?? plataforma}
          </Badge>
        )}
        {ga4 && (
          <Badge colorPalette="orange" size="sm" variant="subtle">
            GA4 {ga4}
          </Badge>
        )}
        {(cliente?.servicos_ativos ?? []).map((s) => (
          <Badge key={s} colorPalette="blue" size="sm" variant="subtle">{s}</Badge>
        ))}
      </Flex>

      <Flex gap={4} pt={3} borderTop="1px solid" borderColor="whiteAlpha.100">
        <StatPill label="contatos" value={projeto.total_contatos} color="teal.300" />
        <StatPill label="disparos" value={projeto.total_disparos} color="blue.300" />
      </Flex>
    </Box>
  );
}

export function ProjetosTab({ clienteId }: Props) {
  const [projetos, setProjetos] = useState<ProjetoComStats[]>([]);
  const [cliente, setCliente] = useState<Partial<Cliente> | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Partial<CrmProjeto>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);

    const [
      { data: projs },
      { data: clienteData },
      { data: contatos },
      { data: disparos },
    ] = await Promise.all([
      supabase.from("crm_projetos").select("*").eq("cliente_id", clienteId).order("criado_em"),
      supabase.from("clientes").select("nome, website_url, plataforma, ga4_measurement_id, servicos_ativos").eq("id", clienteId).single(),
      supabase.from("crm_contacts").select("projeto_id").eq("cliente_id", clienteId),
      supabase.from("crm_email_disparos").select("projeto_id").eq("cliente_id", clienteId),
    ]);

    setCliente(clienteData ?? null);

    const contatoCount: Record<string, number> = {};
    (contatos ?? []).forEach((c) => {
      if (c.projeto_id) contatoCount[c.projeto_id] = (contatoCount[c.projeto_id] ?? 0) + 1;
    });

    const disparoCount: Record<string, number> = {};
    (disparos ?? []).forEach((d) => {
      if (d.projeto_id) disparoCount[d.projeto_id] = (disparoCount[d.projeto_id] ?? 0) + 1;
    });

    setProjetos(
      (projs ?? []).map((p) => ({
        ...p,
        total_contatos: contatoCount[p.id] ?? 0,
        total_disparos: disparoCount[p.id] ?? 0,
      }))
    );
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    // Pré-preenche com URL do cliente
    setEditando({
      ativo: true,
      website_url: cliente?.website_url ?? "",
    });
    setModalOpen(true);
  }

  function openEdit(p: CrmProjeto) {
    setEditando(p);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !editando.nome) return;
    setSaving(true);

    const payload = { ...editando, cliente_id: clienteId };
    const { error } = editando.id
      ? await supabase.from("crm_projetos").update(payload).eq("id", editando.id)
      : await supabase.from("crm_projetos").insert(payload);

    if (error) {
      toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
    } else {
      toaster.create({ title: editando.id ? "Projeto atualizado!" : "Projeto criado!", type: "success" });
      setModalOpen(false);
      load();
    }
    setSaving(false);
  }

  if (!clienteId) return <EmptyState title="Selecione um cliente para gerenciar projetos" icon="⬡" />;

  return (
    <Box>
      {/* Info do cliente atual */}
      {cliente && (
        <Flex
          align="center"
          gap={3}
          p={3}
          mb={4}
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="xl"
          wrap="wrap"
        >
          <Text fontSize="xs" color="whiteAlpha.500">Cliente:</Text>
          <Text fontSize="xs" color="white" fontWeight="medium">{cliente.nome}</Text>
          {cliente.website_url && (
            <Text fontSize="xs" color="teal.400">{cliente.website_url}</Text>
          )}
          {cliente.plataforma && (
            <Badge colorPalette="purple" size="sm" variant="subtle">
              {platformLabels[cliente.plataforma] ?? cliente.plataforma}
            </Badge>
          )}
          {cliente.ga4_measurement_id && (
            <Badge colorPalette="orange" size="sm" variant="subtle">GA4 ativo</Badge>
          )}
        </Flex>
      )}

      <Flex justify="flex-end" mb={4}>
        <Button
          size="sm"
          onClick={openNew}
          style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))", color: "white" }}
        >
          + Novo Projeto
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>
      ) : projetos.length === 0 ? (
        <EmptyState title="Nenhum projeto criado" description="Crie um projeto para organizar seus formulários" icon="⚡" />
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={3}>
          {projetos.map((p) => (
            <ProjetoCard key={p.id} projeto={p} cliente={cliente} onEdit={openEdit} />
          ))}
        </Grid>
      )}

      <Dialog.Root open={modalOpen} onOpenChange={(e) => { if (!e.open) setModalOpen(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#1a1a1a" border="1px solid" borderColor="whiteAlpha.150" borderRadius="2xl" maxW="440px">
            <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4}>
              <Dialog.Title color="white">{editando.id ? "Editar Projeto" : "Novo Projeto"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py={5}>
              <form onSubmit={handleSave}>
                <VStack gap={4} align="stretch">
                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Nome *</Field.Label>
                    <Input
                      value={editando.nome ?? ""}
                      onChange={(e) => setEditando((p) => ({ ...p, nome: e.target.value }))}
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                      color="white" _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }}
                      required
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Descrição</Field.Label>
                    <Textarea
                      value={editando.descricao ?? ""}
                      onChange={(e) => setEditando((p) => ({ ...p, descricao: e.target.value }))}
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                      color="white" _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }}
                      rows={2}
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">
                      Website URL
                      {cliente?.website_url && (
                        <Text as="span" color="whiteAlpha.400" fontSize="xs" ml={2}>
                          (padrão: {cliente.website_url})
                        </Text>
                      )}
                    </Field.Label>
                    <Input
                      value={editando.website_url ?? ""}
                      onChange={(e) => setEditando((p) => ({ ...p, website_url: e.target.value }))}
                      placeholder={cliente?.website_url ?? "https://..."}
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                      color="white" _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }}
                    />
                  </Field.Root>

                  {/* Resumo das configs herdadas do cliente */}
                  {cliente && (
                    <Box p={3} bg="whiteAlpha.50" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.100">
                      <Text fontSize="xs" color="whiteAlpha.500" mb={2}>Configurações herdadas do cliente</Text>
                      <Flex gap={2} wrap="wrap">
                        {cliente.plataforma && (
                          <Badge colorPalette="purple" size="sm" variant="subtle">
                            {platformLabels[cliente.plataforma] ?? cliente.plataforma}
                          </Badge>
                        )}
                        {cliente.ga4_measurement_id && (
                          <Badge colorPalette="orange" size="sm" variant="subtle">GA4</Badge>
                        )}
                        {cliente.ga4_property_id && (
                          <Badge colorPalette="orange" size="sm" variant="subtle">
                            Property: {cliente.ga4_property_id}
                          </Badge>
                        )}
                        {(cliente.servicos_ativos ?? []).map((s) => (
                          <Badge key={s} colorPalette="blue" size="sm" variant="subtle">{s}</Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  <Flex justify="flex-end" gap={3}>
                    <Button variant="ghost" color="whiteAlpha.600" type="button" onClick={() => setModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      loading={saving}
                      style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))", color: "white" }}
                    >
                      Salvar
                    </Button>
                  </Flex>
                </VStack>
              </form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
