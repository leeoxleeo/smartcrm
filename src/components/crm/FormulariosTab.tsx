"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Dialog,
  Field,
  Flex,
  Grid,
  Input,
  NativeSelect,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { CrmForm, CrmProjeto } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  clienteId: string | null;
}

function FormCard({ form, onEdit }: { form: CrmForm; onEdit: (f: CrmForm) => void }) {
  const typeColors: Record<string, string> = { popup: "purple", inline: "blue", flyout: "orange", script: "teal" };
  const isScript = form.tipo === "script";
  return (
    <Box p={4} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
      <Flex justify="space-between" align="flex-start" mb={2}>
        <Text fontSize="sm" fontWeight="semibold" color="white">{form.nome}</Text>
        <Flex gap={2}>
          <Badge colorPalette={typeColors[form.tipo]} size="sm">{form.tipo}</Badge>
          {!form.ativo && <Badge colorPalette="gray" size="sm">Inativo</Badge>}
        </Flex>
      </Flex>
      {isScript ? (
        <Text fontSize="xs" color="whiteAlpha.400" mb={2}>Captura passiva de formulários</Text>
      ) : (
        form.titulo && <Text fontSize="xs" color="whiteAlpha.500" mb={2}>{form.titulo}</Text>
      )}
      <Flex justify="space-between" align="center">
        <Text fontSize="xs" color="teal.400" fontFamily="mono">{form.public_token}</Text>
        <Button size="xs" variant="ghost" color="whiteAlpha.500" onClick={() => onEdit(form)}>Editar</Button>
      </Flex>
    </Box>
  );
}

const triggerTipos = [
  { value: "time", label: "Tempo (ms)" },
  { value: "scroll", label: "Scroll (%)" },
  { value: "exit_intent", label: "Exit Intent" },
  { value: "manual", label: "Manual (GTM)" },
];

const formTipos = [
  { value: "popup", label: "Popup" },
  { value: "inline", label: "Inline" },
  { value: "flyout", label: "Flyout" },
  { value: "script", label: "Script" },
];

function gerarToken() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "frm_";
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

export function FormulariosTab({ clienteId }: Props) {
  const [forms, setForms] = useState<CrmForm[]>([]);
  const [projetos, setProjetos] = useState<CrmProjeto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Partial<CrmForm>>({});
  const [saving, setSaving] = useState(false);

  const isScript = editando.tipo === "script";

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("crm_forms").select("*").eq("cliente_id", clienteId).order("criado_em"),
      supabase.from("crm_projetos").select("*").eq("cliente_id", clienteId).eq("ativo", true),
    ]);
    setForms(f ?? []);
    setProjetos(p ?? []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditando({
      tipo: "popup",
      trigger_tipo: "time",
      trigger_valor: 5000,
      campo_nome: false,
      campo_telefone: false,
      email_ativo: false,
      email_template_tipo: "custom",
      ativo: true,
      public_token: gerarToken(),
      cta_texto: "Quero receber",
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !editando.nome) return;
    setSaving(true);
    const payload = { ...editando, cliente_id: clienteId };
    const { error } = editando.id
      ? await supabase.from("crm_forms").update(payload).eq("id", editando.id)
      : await supabase.from("crm_forms").insert(payload);
    if (error) {
      toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
    } else {
      toaster.create({ title: "Formulário salvo!", type: "success" });
      setModalOpen(false);
      load();
    }
    setSaving(false);
  }

  if (!clienteId) return <EmptyState title="Selecione um cliente" icon="⬡" />;

  return (
    <Box>
      <Flex justify="flex-end" mb={4}>
        <Button size="sm" onClick={openNew} style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))", color: "white" }}>
          + Novo Formulário
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>
      ) : forms.length === 0 ? (
        <EmptyState title="Nenhum formulário criado" description="Crie formulários de captura de leads" icon="⚡" />
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={3}>
          {forms.map((f) => <FormCard key={f.id} form={f} onEdit={(f) => { setEditando(f); setModalOpen(true); }} />)}
        </Grid>
      )}

      <Dialog.Root open={modalOpen} onOpenChange={(e) => { if (!e.open) setModalOpen(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#1a1a1a" border="1px solid" borderColor="whiteAlpha.150" borderRadius="2xl" maxW="520px" maxH="80vh" overflowY="auto">
            <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4} position="sticky" top={0} bg="#1a1a1a" zIndex={1}>
              <Dialog.Title color="white">{editando.id ? "Editar Formulário" : "Novo Formulário"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body py={5}>
              <form onSubmit={handleSave}>
                <VStack gap={4} align="stretch">
                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Nome *</Field.Label>
                    <Input value={editando.nome ?? ""} onChange={(e) => setEditando(p => ({ ...p, nome: e.target.value }))}
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                      _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }} required />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Projeto</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={editando.projeto_id ?? ""} onChange={(e) => setEditando(p => ({ ...p, projeto_id: e.target.value }))}
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white">
                        <option value="" style={{ background: "#1a1a1a" }}>Sem projeto</option>
                        {projetos.map(p => <option key={p.id} value={p.id} style={{ background: "#1a1a1a" }}>{p.nome}</option>)}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Grid templateColumns={isScript ? "1fr" : "1fr 1fr"} gap={3}>
                    <Field.Root>
                      <Field.Label color="whiteAlpha.700" fontSize="sm">Tipo</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={editando.tipo ?? "popup"} onChange={(e) => setEditando(p => ({ ...p, tipo: e.target.value as CrmForm["tipo"] }))}
                          bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white">
                          {formTipos.map(t => <option key={t.value} value={t.value} style={{ background: "#1a1a1a" }}>{t.label}</option>)}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    {!isScript && (
                      <Field.Root>
                        <Field.Label color="whiteAlpha.700" fontSize="sm">Trigger</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field value={editando.trigger_tipo ?? "time"} onChange={(e) => setEditando(p => ({ ...p, trigger_tipo: e.target.value as CrmForm["trigger_tipo"] }))}
                            bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white">
                            {triggerTipos.map(t => <option key={t.value} value={t.value} style={{ background: "#1a1a1a" }}>{t.label}</option>)}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>
                    )}
                  </Grid>

                  {isScript && (
                    <Box p={3} bg="teal.900" borderRadius="lg" border="1px solid" borderColor="teal.700">
                      <Text fontSize="xs" color="teal.200">
                        <strong>Captura passiva:</strong> o script observa todos os formulários da sua página e captura o email automaticamente quando o usuário faz submit. Nenhuma interface visual é criada — o formulário existente na página é usado.
                        {editando.campo_nome && " O script também tentará capturar o campo nome."}{editando.campo_telefone && " O script também tentará capturar o campo telefone."}
                      </Text>
                    </Box>
                  )}

                  {!isScript && (
                    <>
                      <Field.Root>
                        <Field.Label color="whiteAlpha.700" fontSize="sm">Título do Formulário</Field.Label>
                        <Input value={editando.titulo ?? ""} onChange={(e) => setEditando(p => ({ ...p, titulo: e.target.value }))}
                          bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                          _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }} />
                      </Field.Root>

                      <Field.Root>
                        <Field.Label color="whiteAlpha.700" fontSize="sm">Texto do CTA</Field.Label>
                        <Input value={editando.cta_texto ?? ""} onChange={(e) => setEditando(p => ({ ...p, cta_texto: e.target.value }))}
                          bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                          _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }} />
                      </Field.Root>
                    </>
                  )}

                  <Box>
                    <Text color="whiteAlpha.700" fontSize="sm" mb={2}>
                      {isScript ? "Campos a tentar capturar" : "Campos Opcionais"}
                    </Text>
                    <Flex gap={4}>
                      <Checkbox.Root checked={editando.campo_nome ?? false} onCheckedChange={(e) => setEditando(p => ({ ...p, campo_nome: !!e.checked }))} colorPalette="teal">
                        <Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                        <Checkbox.Label color="whiteAlpha.600" fontSize="sm">Nome</Checkbox.Label>
                      </Checkbox.Root>
                      <Checkbox.Root checked={editando.campo_telefone ?? false} onCheckedChange={(e) => setEditando(p => ({ ...p, campo_telefone: !!e.checked }))} colorPalette="teal">
                        <Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                        <Checkbox.Label color="whiteAlpha.600" fontSize="sm">Telefone</Checkbox.Label>
                      </Checkbox.Root>
                    </Flex>
                  </Box>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Token Público</Field.Label>
                    <Input value={editando.public_token ?? ""} readOnly
                      bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100"
                      color="teal.300" fontFamily="mono" fontSize="sm" />
                  </Field.Root>

                  <Flex justify="flex-end" gap={3} pt={2}>
                    <Button variant="ghost" color="whiteAlpha.600" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" loading={saving} style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))", color: "white" }}>
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
