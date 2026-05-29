"use client";

import { useState } from "react";
import {
  Box, Button, Field, Flex, Input, Text,
} from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { toaster } from "@/lib/toaster";
import type { ConfigPlataforma } from "@/lib/types";

interface Props {
  config: ConfigPlataforma;
  onChange: (c: Partial<ConfigPlataforma>) => void;
}

export function EmailConfig({ config, onChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("config_plataforma")
      .update({
        resend_api_key:    config.resend_api_key ?? null,
        resend_from_email: config.resend_from_email ?? null,
        resend_from_name:  config.resend_from_name,
      })
      .eq("id", "main");

    if (error) {
      toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
    } else {
      toaster.create({ title: "Configurações de email salvas!", type: "success" });
    }
    setSaving(false);
  }

  async function testEmail() {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crm-test-email`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      const json = await res.json();
      if (res.ok) {
        toaster.create({ title: `Email de teste enviado para ${json.to}`, type: "success" });
      } else {
        toaster.create({ title: "Erro no envio", description: json.error, type: "error" });
      }
    } catch {
      toaster.create({ title: "Falha na conexão com a Edge Function", type: "error" });
    }
    setTesting(false);
  }

  return (
    <Box>
      <Flex align="center" gap={2} mb={1}>
        <Text fontSize="md" fontWeight="semibold" color="white">📧 Envio de Emails (Resend)</Text>
      </Flex>
      <Text fontSize="xs" color="whiteAlpha.500" mb={4}>
        Crie sua conta em{" "}
        <Text as="span" color="teal.400">resend.com</Text>
        {" "}e gere uma API key em API Keys → Create API Key.
      </Text>

      <Flex direction="column" gap={4}>
        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">API Key do Resend</Field.Label>
          <Flex gap={2}>
            <Input
              type={showKey ? "text" : "password"}
              value={config.resend_api_key ?? ""}
              onChange={(e) => onChange({ resend_api_key: e.target.value })}
              placeholder="re_..."
              bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
              color="white" _placeholder={{ color: "whiteAlpha.300" }}
              _focus={{ borderColor: "teal.400" }} fontFamily="mono" fontSize="sm"
            />
            <Button
              size="sm" variant="ghost" color="whiteAlpha.400" flexShrink={0}
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
        </Field.Root>

        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">
            Email de envio
            <Text as="span" color="whiteAlpha.400" fontSize="xs" ml={2}>
              (deve ser um domínio verificado no Resend)
            </Text>
          </Field.Label>
          <Input
            value={config.resend_from_email ?? ""}
            onChange={(e) => onChange({ resend_from_email: e.target.value })}
            placeholder="noreply@seudominio.com"
            bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
            color="white" _placeholder={{ color: "whiteAlpha.300" }}
            _focus={{ borderColor: "teal.400" }}
          />
        </Field.Root>

        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">Nome do remetente</Field.Label>
          <Input
            value={config.resend_from_name}
            onChange={(e) => onChange({ resend_from_name: e.target.value })}
            placeholder="SmartCRM"
            bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
            color="white" _placeholder={{ color: "whiteAlpha.300" }}
            _focus={{ borderColor: "teal.400" }}
          />
        </Field.Root>

        <Flex justify="flex-end" gap={3}>
          <Button
            size="sm" variant="ghost" color="teal.400" loading={testing} onClick={testEmail}
            _hover={{ bg: "whiteAlpha.100" }}
          >
            Enviar email de teste
          </Button>
          <Button
            size="sm" loading={saving} onClick={save}
            style={{ background: "linear-gradient(135deg,var(--chakra-colors-teal-500),var(--chakra-colors-blue-500))", color: "white" }}
          >
            Salvar Email
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
