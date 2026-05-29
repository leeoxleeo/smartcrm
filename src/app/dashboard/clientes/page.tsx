"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Spinner, VStack } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import type { Cliente } from "@/lib/types";
import { ClienteCard } from "@/components/clientes/ClienteCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";

export default function ClientesPage() {
  const { isEditor } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("nome");
    setClientes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e integrações"
        action={
          isEditor ? (
            <Link href="/dashboard/clientes/novo">
              <Button
                size="sm"
                style={{
                  background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))",
                  color: "white",
                }}
                _hover={{ opacity: 0.9 }}
              >
                + Novo Cliente
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <Box py={16} textAlign="center">
          <Spinner color="teal.400" />
        </Box>
      ) : clientes.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastre seu primeiro cliente para começar"
          icon="⬡"
          action={
            isEditor ? (
              <Link href="/dashboard/clientes/novo">
                <Button size="sm" colorPalette="teal" variant="subtle">
                  Cadastrar cliente
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <VStack gap={2} align="stretch">
          {clientes.map((c) => (
            <ClienteCard key={c.id} cliente={c} />
          ))}
        </VStack>
      )}
    </Box>
  );
}
