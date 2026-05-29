"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  Field,
  Flex,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { UserRole } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "cliente", label: "Cliente" },
];

export function ConvidarModal({ open, onClose, onSuccess }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("perfis").insert({
      nome,
      email,
      role,
      ativo: true,
    });

    if (error) {
      toaster.create({ title: "Erro ao convidar usuário", description: error.message, type: "error" });
    } else {
      toaster.create({ title: "Convite enviado!", description: `Um código de acesso será enviado para ${email}`, type: "success" });
      setNome("");
      setEmail("");
      setRole("editor");
      onSuccess();
      onClose();
    }
    setLoading(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose(); }}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="#1a1a1a" border="1px solid" borderColor="whiteAlpha.150" borderRadius="2xl" maxW="420px">
          <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4}>
            <Dialog.Title color="white">Convidar Usuário</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body py={5}>
            <form onSubmit={handleSubmit}>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label color="whiteAlpha.700" fontSize="sm">Nome</Field.Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    color="white"
                    _placeholder={{ color: "whiteAlpha.400" }}
                    _focus={{ borderColor: "teal.400" }}
                    required
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label color="whiteAlpha.700" fontSize="sm">Email</Field.Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@empresa.com"
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    color="white"
                    _placeholder={{ color: "whiteAlpha.400" }}
                    _focus={{ borderColor: "teal.400" }}
                    required
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label color="whiteAlpha.700" fontSize="sm">Função</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      bg="whiteAlpha.100"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      color="white"
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value} style={{ background: "#1a1a1a" }}>
                          {r.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Text fontSize="xs" color="whiteAlpha.400">
                  O usuário receberá um código de acesso no email para entrar na plataforma.
                </Text>

                <Flex justify="flex-end" gap={3} pt={2}>
                  <Button variant="ghost" color="whiteAlpha.600" onClick={onClose} type="button">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    loadingText="Convidando..."
                    style={{
                      background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))",
                      color: "white",
                    }}
                    _hover={{ opacity: 0.9 }}
                  >
                    Convidar
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
