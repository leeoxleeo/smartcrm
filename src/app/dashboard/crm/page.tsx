"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Flex, NativeSelect, Spinner, Tabs, Text } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import type { CrmForm } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjetosTab } from "@/components/crm/ProjetosTab";
import { FormulariosTab } from "@/components/crm/FormulariosTab";
import { ContatosTab } from "@/components/crm/ContatosTab";
import { AutomacoesTab } from "@/components/crm/AutomacoesTab";
import { InstalacaoTab } from "@/components/crm/InstalacaoTab";
import { RelatoriosTab } from "@/components/crm/RelatoriosTab";
import { ProdutosTab } from "@/components/crm/ProdutosTab";
import { VisaoGeralTab } from "@/components/crm/VisaoGeralTab";
import { useAuth } from "@/context/AuthContext";

interface ClienteOption {
  id: string;
  nome: string;
}

const TABS = [
  { value: "visao_geral", label: "Visão Geral" },
  { value: "relatorios", label: "Relatórios" },
  { value: "projetos", label: "Projetos" },
  { value: "formularios", label: "Formulários" },
  { value: "contatos", label: "Contatos" },
  { value: "produtos", label: "Produtos" },
  { value: "automacoes", label: "Automações" },
  { value: "instalacao", label: "Instalação" },
];

export default function CRMPage() {
  const { isCliente, clienteIds } = useAuth();
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [forms, setForms] = useState<CrmForm[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [activeTab, setActiveTab] = useState("visao_geral");

  function navigateTo(cId: string, tab: string) {
    setClienteId(cId);
    setActiveTab(tab);
  }

  // Use a stable string key to avoid re-running when clienteIds gets a new array
  // reference from auth context re-renders (e.g. on token refresh events)
  const clienteIdsKey = clienteIds.join(",");

  const loadClientes = useCallback(async () => {
    setLoadingClientes(true);
    let query = supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome");
    if (isCliente && clienteIds.length > 0) {
      query = query.in("id", clienteIds);
    }
    const { data } = await query;
    setClientes(data ?? []);
    if (data && data.length > 0) setClienteId(data[0].id);
    setLoadingClientes(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCliente, clienteIdsKey]);

  useEffect(() => { loadClientes(); }, [loadClientes]);

  useEffect(() => {
    if (!clienteId) return;
    supabase.from("crm_forms").select("*").eq("cliente_id", clienteId).then(({ data }) => {
      setForms(data ?? []);
    });
  }, [clienteId]);

  return (
    <Box>
      <PageHeader
        title="CRM Triggers"
        description="Captura de leads, automação de email e rastreamento de jornada"
      />

      {loadingClientes ? (
        <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>
      ) : (
        <>
          {clientes.length > 1 && activeTab !== "visao_geral" && (
            <Flex align="center" gap={3} mb={5}>
              <Text fontSize="sm" color="whiteAlpha.600">Cliente:</Text>
              <NativeSelect.Root maxW="280px">
                <NativeSelect.Field
                  value={clienteId ?? ""}
                  onChange={(e) => setClienteId(e.target.value)}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  color="white"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#1a1a1a" }}>{c.nome}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Flex>
          )}

          <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="line">
            <Tabs.List borderBottom="1px solid" borderColor="whiteAlpha.100" mb={6}>
              {TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  color="whiteAlpha.500"
                  _selected={{ color: "teal.300", borderColor: "teal.400" }}
                  _hover={{ color: "white" }}
                  fontSize="sm"
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="visao_geral">
              <VisaoGeralTab onNavigate={navigateTo} />
            </Tabs.Content>
            <Tabs.Content value="relatorios">
              <RelatoriosTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="projetos">
              <ProjetosTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="formularios">
              <FormulariosTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="contatos">
              <ContatosTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="produtos">
              <ProdutosTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="automacoes">
              <AutomacoesTab clienteId={clienteId} />
            </Tabs.Content>
            <Tabs.Content value="instalacao">
              <InstalacaoTab forms={forms} />
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
    </Box>
  );
}
