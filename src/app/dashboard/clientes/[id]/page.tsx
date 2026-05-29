"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  Spinner,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { Cliente } from "@/lib/types";
import { DadosTab } from "@/components/clientes/tabs/DadosTab";
import { IntegracoesTab } from "@/components/clientes/tabs/IntegracoesTab";
import { GA4Tab } from "@/components/clientes/tabs/GA4Tab";
import { ClarityTab } from "@/components/clientes/tabs/ClarityTab";
import Link from "next/link";

export default function ClienteFormPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === "novo";

  const [data, setData] = useState<Partial<Cliente>>({ ativo: true });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    const { data: row } = await supabase.from("clientes").select("*").eq("id", id).single();
    if (row) setData(row);
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  function handleChange(field: keyof Cliente, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!data.nome) {
      toaster.create({ title: "Nome é obrigatório", type: "error" });
      return;
    }
    setSaving(true);

    if (isNew) {
      const { error } = await supabase.from("clientes").insert(data);
      if (error) {
        toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
      } else {
        toaster.create({ title: "Cliente criado!", type: "success" });
        router.push("/dashboard/clientes");
      }
    } else {
      const { error } = await supabase.from("clientes").update(data).eq("id", id);
      if (error) {
        toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
      } else {
        toaster.create({ title: "Cliente atualizado!", type: "success" });
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Flex justify="center" py={16}>
        <Spinner color="teal.400" />
      </Flex>
    );
  }

  return (
    <Box>
      <Flex align="center" gap={3} mb={6}>
        <Link href="/dashboard/clientes">
          <Text color="whiteAlpha.500" fontSize="sm" cursor="pointer" _hover={{ color: "white" }}>
            ← Clientes
          </Text>
        </Link>
        <Text color="whiteAlpha.300">/</Text>
        <Text color="white" fontSize="sm" fontWeight="medium">
          {isNew ? "Novo Cliente" : data.nome}
        </Text>
      </Flex>

      <Tabs.Root defaultValue="dados" variant="line">
        <Tabs.List borderBottom="1px solid" borderColor="whiteAlpha.100" mb={6}>
          {[
            { value: "dados", label: "Dados Básicos" },
            { value: "integracoes", label: "Integrações" },
            { value: "ga4", label: "Google Analytics 4" },
            { value: "clarity", label: "Microsoft Clarity" },
          ].map((tab) => (
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

        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="xl"
          p={6}
          mb={6}
        >
          <Tabs.Content value="dados">
            <DadosTab data={data} onChange={handleChange} />
          </Tabs.Content>
          <Tabs.Content value="integracoes">
            <IntegracoesTab data={data} onChange={handleChange} />
          </Tabs.Content>
          <Tabs.Content value="ga4">
            <GA4Tab data={data} onChange={handleChange} />
          </Tabs.Content>
          <Tabs.Content value="clarity">
            <ClarityTab data={data} onChange={handleChange} />
          </Tabs.Content>
        </Box>

        <Flex justify="flex-end" gap={3}>
          <Link href="/dashboard/clientes">
            <Button variant="ghost" color="whiteAlpha.600">
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            loading={saving}
            loadingText="Salvando..."
            style={{
              background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))",
              color: "white",
            }}
            _hover={{ opacity: 0.9 }}
          >
            {isNew ? "Criar Cliente" : "Salvar Alterações"}
          </Button>
        </Flex>
      </Tabs.Root>
    </Box>
  );
}
