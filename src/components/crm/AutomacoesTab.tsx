"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Input,
  NativeSelect,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { CrmTriggerRule, TriggerRuleStatus } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { PreviewEmailModal } from "@/components/crm/PreviewEmailModal";

interface Props {
  clienteId: string | null;
}

const eventTipos = [
  "view_item_list", "product_view", "cart_add", "view_cart",
  "checkout_start", "checkout_profile", "checkout_payment", "purchase", "cart_remove", "custom",
];

const templateTipos = [
  { value: "produto_visto",        label: "Produto Visto (IA)" },
  { value: "vitrine_similares",    label: "Vitrine — Similares (IA)" },
  { value: "vitrine_combinacoes",  label: "Vitrine — Comprados Juntos (IA)" },
  { value: "vitrine_sugestoes",    label: "Vitrine — Sugestões (IA)" },
  { value: "vitrine_inteligente",  label: "Vitrine — Inteligente VTEX (IA) ✦" },
  { value: "custom",               label: "HTML Customizado" },
];

const statusConfig: Record<TriggerRuleStatus, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "gray" },
  ativo: { label: "Ativo", color: "teal" },
  desativado: { label: "Desativado", color: "red" },
};

function RuleCard({
  rule,
  onEdit,
  onPreview,
  onChangeStatus,
  onTestDispatch,
  testingId,
}: {
  rule: CrmTriggerRule;
  onEdit: (r: CrmTriggerRule) => void;
  onPreview: (r: CrmTriggerRule) => void;
  onChangeStatus: (r: CrmTriggerRule, s: TriggerRuleStatus) => void;
  onTestDispatch: (r: CrmTriggerRule) => void;
  testingId: string | null;
}) {
  const cfg = statusConfig[rule.status];
  return (
    <Flex
      p={4}
      gap={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor={rule.status === "ativo" ? "teal.900" : "whiteAlpha.100"}
      borderRadius="xl"
      align="center"
      _hover={{ borderColor: rule.status === "ativo" ? "teal.700" : "whiteAlpha.200" }}
      transition="all 0.15s"
    >
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2} mb={1}>
          <Text fontSize="sm" fontWeight="semibold" color="white" truncate>
            {rule.nome}
          </Text>
          <Badge colorPalette={cfg.color} size="sm">{cfg.label}</Badge>
        </Flex>
        <Flex gap={3} wrap="wrap">
          <Badge colorPalette="teal" size="sm" variant="subtle">{rule.evento_tipo}</Badge>
          <Text fontSize="xs" color="whiteAlpha.400">delay: {rule.delay_minutos} min</Text>
          {rule.cancelar_se && (
            <Text fontSize="xs" color="orange.400">cancela se: {rule.cancelar_se}</Text>
          )}
          <Text fontSize="xs" color="blue.400">
            {rule.email_template_tipo === "custom"
              ? "HTML custom"
              : templateTipos.find((t) => t.value === rule.email_template_tipo)?.label ?? rule.email_template_tipo}
          </Text>
        </Flex>
      </Box>

      <Flex gap={2} flexShrink={0} align="center">
        <Button
          size="xs"
          variant="ghost"
          color="whiteAlpha.500"
          _hover={{ color: "teal.300", bg: "whiteAlpha.100" }}
          onClick={() => onPreview(rule)}
        >
          Preview
        </Button>
        <Button
          size="xs"
          variant="ghost"
          color="whiteAlpha.500"
          _hover={{ color: "orange.300", bg: "whiteAlpha.100" }}
          onClick={() => onTestDispatch(rule)}
          loading={rule.id === testingId}
          disabled={testingId !== null}
        >
          Disparar teste
        </Button>
        <Button
          size="xs"
          variant="ghost"
          color="whiteAlpha.500"
          _hover={{ color: "white", bg: "whiteAlpha.100" }}
          onClick={() => onEdit(rule)}
        >
          Editar
        </Button>

        <NativeSelect.Root w="130px">
          <NativeSelect.Field
            value={rule.status}
            onChange={(e) => onChangeStatus(rule, e.target.value as TriggerRuleStatus)}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.150"
            color={rule.status === "ativo" ? "teal.300" : rule.status === "desativado" ? "red.300" : "whiteAlpha.500"}
            fontSize="xs"
          >
            <option value="rascunho" style={{ background: "#1a1a1a" }}>Rascunho</option>
            <option value="ativo" style={{ background: "#1a1a1a" }}>Ativo</option>
            <option value="desativado" style={{ background: "#1a1a1a" }}>Desativado</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Flex>
    </Flex>
  );
}

export function AutomacoesTab({ clienteId }: Props) {
  const [regras, setRegras] = useState<CrmTriggerRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewRegra, setPreviewRegra] = useState<CrmTriggerRule | null>(null);
  const [editando, setEditando] = useState<Partial<CrmTriggerRule>>({});
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [utmOpen, setUtmOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_trigger_rules")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("criado_em");
    setRegras(data ?? []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditando({
      status: "rascunho",
      delay_minutos: 30,
      evento_tipo: "product_view",
      email_template_tipo: "produto_visto",
    });
    setUtmOpen(false);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId || !editando.nome) return;
    setSaving(true);
    const payload = { ...editando, cliente_id: clienteId };
    const { error } = editando.id
      ? await supabase.from("crm_trigger_rules").update(payload).eq("id", editando.id)
      : await supabase.from("crm_trigger_rules").insert(payload);
    if (error) {
      toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
    } else {
      toaster.create({ title: "Automação salva!", type: "success" });
      setModalOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleTestDispatch(rule: CrmTriggerRule) {
    setTestingId(rule.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crm-test-dispatch`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ regra_id: rule.id }),
        },
      );
      const json = await res.json();
      if (res.ok) {
        toaster.create({ title: `Email de teste enviado para ${json.to}`, type: "success" });
      } else {
        toaster.create({ title: "Erro no disparo", description: json.error, type: "error" });
      }
    } catch {
      toaster.create({ title: "Falha na conexão com a Edge Function", type: "error" });
    }
    setTestingId(null);
  }

  async function handleChangeStatus(rule: CrmTriggerRule, status: TriggerRuleStatus) {
    const { error } = await supabase
      .from("crm_trigger_rules")
      .update({ status })
      .eq("id", rule.id);
    if (error) {
      toaster.create({ title: "Erro ao atualizar status", type: "error" });
    } else {
      setRegras((prev) => prev.map((r) => r.id === rule.id ? { ...r, status } : r));
    }
  }

  if (!clienteId) return <EmptyState title="Selecione um cliente" icon="⬡" />;

  const ativas = regras.filter((r) => r.status === "ativo").length;
  const rascunhos = regras.filter((r) => r.status === "rascunho").length;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Flex gap={2}>
          {ativas > 0 && <Badge colorPalette="teal" size="sm">{ativas} ativa{ativas > 1 ? "s" : ""}</Badge>}
          {rascunhos > 0 && <Badge colorPalette="gray" size="sm">{rascunhos} rascunho{rascunhos > 1 ? "s" : ""}</Badge>}
        </Flex>
        <Button
          size="sm"
          onClick={openNew}
          style={{ background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))", color: "white" }}
        >
          + Nova Automação
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" py={10}><Spinner color="teal.400" /></Flex>
      ) : regras.length === 0 ? (
        <EmptyState title="Nenhuma automação configurada" description="Crie regras de trigger para email automático" icon="⚡" />
      ) : (
        <VStack gap={2} align="stretch">
          {regras.map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              onEdit={(r) => {
                setEditando(r);
                setUtmOpen(!!(r.utm_source || r.utm_medium || r.utm_campaign || r.utm_content));
                setModalOpen(true);
              }}
              onPreview={setPreviewRegra}
              onChangeStatus={handleChangeStatus}
              onTestDispatch={handleTestDispatch}
              testingId={testingId}
            />
          ))}
        </VStack>
      )}

      {/* Modal de edição */}
      <Dialog.Root open={modalOpen} onOpenChange={(e) => { if (!e.open) setModalOpen(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="#1a1a1a"
            border="1px solid"
            borderColor="whiteAlpha.150"
            borderRadius="2xl"
            maxW="520px"
            maxH="85vh"
            overflowY="auto"
          >
            <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4} position="sticky" top={0} bg="#1a1a1a" zIndex={1}>
              <Dialog.Title color="white">
                {editando.id ? "Editar Automação" : "Nova Automação"}
              </Dialog.Title>
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
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Status</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editando.status ?? "rascunho"}
                        onChange={(e) => setEditando((p) => ({ ...p, status: e.target.value as TriggerRuleStatus }))}
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                      >
                        <option value="rascunho" style={{ background: "#1a1a1a" }}>Rascunho</option>
                        <option value="ativo" style={{ background: "#1a1a1a" }}>Ativo</option>
                        <option value="desativado" style={{ background: "#1a1a1a" }}>Desativado</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Evento Gatilho</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editando.evento_tipo ?? "product_view"}
                        onChange={(e) => setEditando((p) => ({ ...p, evento_tipo: e.target.value }))}
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                      >
                        {eventTipos.map((t) => (
                          <option key={t} value={t} style={{ background: "#1a1a1a" }}>{t}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Delay (minutos)</Field.Label>
                    <Input
                      type="number"
                      value={editando.delay_minutos ?? 30}
                      onChange={(e) => setEditando((p) => ({ ...p, delay_minutos: Number(e.target.value) }))}
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                      color="white" _focus={{ borderColor: "teal.400" }} min={1}
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Cancelar se evento</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editando.cancelar_se ?? ""}
                        onChange={(e) => setEditando((p) => ({ ...p, cancelar_se: e.target.value || undefined }))}
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                      >
                        <option value="" style={{ background: "#1a1a1a" }}>Não cancelar</option>
                        {eventTipos.map((t) => (
                          <option key={t} value={t} style={{ background: "#1a1a1a" }}>{t}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Template de Email</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editando.email_template_tipo ?? "produto_visto"}
                        onChange={(e) => setEditando((p) => ({ ...p, email_template_tipo: e.target.value }))}
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
                      >
                        {templateTipos.map((t) => (
                          <option key={t.value} value={t.value} style={{ background: "#1a1a1a" }}>{t.label}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label color="whiteAlpha.700" fontSize="sm">Assunto do Email</Field.Label>
                    <Input
                      value={editando.email_assunto ?? ""}
                      onChange={(e) => setEditando((p) => ({ ...p, email_assunto: e.target.value }))}
                      placeholder="Ex: Você viu esse produto..."
                      bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                      color="white" _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }}
                    />
                  </Field.Root>

                  {editando.email_template_tipo === "custom" && (
                    <Field.Root>
                      <Field.Label color="whiteAlpha.700" fontSize="sm">HTML do Email</Field.Label>
                      <Textarea
                        value={editando.email_html ?? ""}
                        onChange={(e) => setEditando((p) => ({ ...p, email_html: e.target.value }))}
                        placeholder="<div>Seu HTML aqui...</div>"
                        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                        color="white" _placeholder={{ color: "whiteAlpha.400" }} _focus={{ borderColor: "teal.400" }}
                        fontFamily="mono" fontSize="xs"
                        rows={6}
                      />
                    </Field.Root>
                  )}

                  {/* UTM Parameters */}
                  <Box
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    borderRadius="lg"
                    overflow="hidden"
                  >
                    <Flex
                      px={3} py={2.5}
                      align="center"
                      justify="space-between"
                      cursor="pointer"
                      bg="whiteAlpha.50"
                      onClick={() => setUtmOpen((v) => !v)}
                      _hover={{ bg: "whiteAlpha.100" }}
                      transition="background 0.15s"
                    >
                      <Flex align="center" gap={2}>
                        <Text fontSize="xs" color="whiteAlpha.600">Parâmetros UTM</Text>
                        {(editando.utm_source || editando.utm_campaign || editando.utm_medium || editando.utm_content) && (
                          <Badge colorPalette="teal" size="sm">configurado</Badge>
                        )}
                      </Flex>
                      <Text fontSize="xs" color="whiteAlpha.400">{utmOpen ? "▲" : "▼"}</Text>
                    </Flex>

                    {utmOpen && (
                      <VStack gap={3} align="stretch" p={3}>
                        <Text fontSize="xs" color="whiteAlpha.400">
                          Quando preenchidos, os parâmetros são adicionados em todos os links do email automaticamente.
                        </Text>
                        {[
                          { key: "utm_source",   label: "utm_source",   placeholder: "ex: smartcrm" },
                          { key: "utm_medium",   label: "utm_medium",   placeholder: "ex: email" },
                          { key: "utm_campaign", label: "utm_campaign", placeholder: "ex: abandono-carrinho" },
                          { key: "utm_content",  label: "utm_content",  placeholder: "ex: produto-visto" },
                        ].map(({ key, label, placeholder }) => (
                          <Field.Root key={key}>
                            <Field.Label color="whiteAlpha.600" fontSize="xs" fontFamily="mono">{label}</Field.Label>
                            <Input
                              size="sm"
                              value={(editando as Record<string, string>)[key] ?? ""}
                              onChange={(e) => setEditando((p) => ({ ...p, [key]: e.target.value || undefined }))}
                              placeholder={placeholder}
                              bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.150"
                              color="white" _placeholder={{ color: "whiteAlpha.300" }}
                              _focus={{ borderColor: "teal.400" }}
                              fontFamily="mono" fontSize="xs"
                            />
                          </Field.Root>
                        ))}
                      </VStack>
                    )}
                  </Box>

                  <Flex justify="flex-end" gap={3} pt={2}>
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

      {/* Modal de preview */}
      <PreviewEmailModal
        regra={previewRegra}
        open={!!previewRegra}
        onClose={() => setPreviewRegra(null)}
      />
    </Box>
  );
}
