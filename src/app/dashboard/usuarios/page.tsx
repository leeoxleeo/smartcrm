"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Spinner, VStack } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { Perfil } from "@/lib/types";
import { UsuarioCard } from "@/components/usuarios/UsuarioCard";
import { ConvidarModal } from "@/components/usuarios/ConvidarModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";

export default function UsuariosPage() {
  const { isAdmin } = useAuth();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("perfis").select("*").order("criado_em");
    setPerfis(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleActive(p: Perfil) {
    const { error } = await supabase
      .from("perfis")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    if (error) {
      toaster.create({ title: "Erro ao atualizar", type: "error" });
    } else {
      load();
    }
  }

  return (
    <Box>
      <PageHeader
        title="Usuários"
        description="Gerencie o acesso à plataforma"
        action={
          isAdmin ? (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))",
                color: "white",
              }}
              _hover={{ opacity: 0.9 }}
            >
              + Convidar Usuário
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <Box py={16} textAlign="center">
          <Spinner color="teal.400" />
        </Box>
      ) : perfis.length === 0 ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Convide alguém para começar"
          icon="⬟"
        />
      ) : (
        <VStack gap={2} align="stretch">
          {perfis.map((p) => (
            <UsuarioCard
              key={p.id}
              perfil={p}
              onEdit={setEditando}
              onToggleActive={handleToggleActive}
            />
          ))}
        </VStack>
      )}

      <ConvidarModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSuccess={load}
      />
    </Box>
  );
}
