"use client";

import { useState } from "react";
import {
  Box, Button, Field, Flex, Input, NativeSelect, Text,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { ConfigPlataforma } from "@/lib/types";

interface Props {
  config: ConfigPlataforma;
  onChange: (c: Partial<ConfigPlataforma>) => void;
}

const AI_PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic) — Recomendado" },
  { value: "openai", label: "OpenAI (GPT-4o)" },
];

export function IAConfig({ config, onChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("config_plataforma")
      .update({
        ia_provedor:      config.ia_provedor,
        ia_anthropic_key: config.ia_anthropic_key ?? null,
        ia_openai_key:    config.ia_openai_key ?? null,
      })
      .eq("id", "main");

    if (error) {
      toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
    } else {
      toaster.create({ title: "Configurações de IA salvas!", type: "success" });
    }
    setSaving(false);
  }

  return (
    <Box>
      <Flex align="center" gap={2} mb={1}>
        <Text fontSize="md" fontWeight="semibold" color="white">🤖 Inteligência Artificial</Text>
      </Flex>
      <Text fontSize="xs" color="whiteAlpha.500" mb={4}>
        Usada para gerar o conteúdo dos emails no template "Produto Visto (IA)"
      </Text>

      <Flex direction="column" gap={4}>
        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">Provedor</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={config.ia_provedor}
              onChange={(e) => onChange({ ia_provedor: e.target.value as ConfigPlataforma["ia_provedor"] })}
              bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" color="white"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value} style={{ background: "#1a1a1a" }}>{p.label}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">
            API Key — Anthropic (Claude)
            {config.ia_provedor === "claude" && (
              <Text as="span" color="teal.400" fontSize="xs" ml={2}>● provedor ativo</Text>
            )}
          </Field.Label>
          <Flex gap={2}>
            <Input
              type={showAnthropicKey ? "text" : "password"}
              value={config.ia_anthropic_key ?? ""}
              onChange={(e) => onChange({ ia_anthropic_key: e.target.value })}
              placeholder="sk-ant-..."
              bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
              color="white" _placeholder={{ color: "whiteAlpha.300" }}
              _focus={{ borderColor: "teal.400" }} fontFamily="mono" fontSize="sm"
            />
            <Button
              size="sm" variant="ghost" color="whiteAlpha.400" flexShrink={0}
              onClick={() => setShowAnthropicKey((v) => !v)}
            >
              {showAnthropicKey ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
        </Field.Root>

        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">
            API Key — OpenAI
            {config.ia_provedor === "openai" && (
              <Text as="span" color="teal.400" fontSize="xs" ml={2}>● provedor ativo</Text>
            )}
          </Field.Label>
          <Flex gap={2}>
            <Input
              type={showOpenAIKey ? "text" : "password"}
              value={config.ia_openai_key ?? ""}
              onChange={(e) => onChange({ ia_openai_key: e.target.value })}
              placeholder="sk-..."
              bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
              color="white" _placeholder={{ color: "whiteAlpha.300" }}
              _focus={{ borderColor: "teal.400" }} fontFamily="mono" fontSize="sm"
            />
            <Button
              size="sm" variant="ghost" color="whiteAlpha.400" flexShrink={0}
              onClick={() => setShowOpenAIKey((v) => !v)}
            >
              {showOpenAIKey ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
        </Field.Root>

        <Flex justify="flex-end">
          <Button
            size="sm" loading={saving} onClick={save}
            style={{ background: "linear-gradient(135deg,var(--chakra-colors-teal-500),var(--chakra-colors-blue-500))", color: "white" }}
          >
            Salvar IA
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
