"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Separator, Spinner, Text } from "@chakra-ui/react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { IAConfig } from "@/components/configuracoes/IAConfig";
import { EmailConfig } from "@/components/configuracoes/EmailConfig";
import type { ConfigPlataforma } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

const DEFAULT_CONFIG: ConfigPlataforma = {
  id: "main",
  ia_provedor: "claude",
  resend_from_name: "SmartCRM",
  atualizado_em: "",
};

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState<ConfigPlataforma>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("config_plataforma")
      .select("*")
      .eq("id", "main")
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as ConfigPlataforma);
        setLoading(false);
      });
  }, []);

  function patch(partial: Partial<ConfigPlataforma>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  if (!isAdmin) {
    return <EmptyState title="Acesso restrito a administradores" icon="🔒" />;
  }

  return (
    <Box>
      <PageHeader
        title="Configurações"
        description="Integrações de IA e email para os disparos automáticos"
      />

      {loading ? (
        <Flex justify="center" py={16}><Spinner color="teal.400" /></Flex>
      ) : (
        <Flex direction="column" gap={0} maxW="640px">
          {/* IA */}
          <Box
            p={6}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.100"
            borderRadius="xl"
            mb={4}
          >
            <IAConfig config={config} onChange={patch} />
          </Box>

          {/* Email */}
          <Box
            p={6}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.100"
            borderRadius="xl"
            mb={4}
          >
            <EmailConfig config={config} onChange={patch} />
          </Box>

          {/* How it works */}
          <Box
            p={5}
            bg="#0d0d0d"
            border="1px solid"
            borderColor="whiteAlpha.100"
            borderRadius="xl"
          >
            <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.600" mb={3}>
              Como o disparo funciona
            </Text>
            <Flex direction="column" gap={2}>
              {[
                ["1", "O script SmartCRM capta um evento (ex: product_view) no site do cliente"],
                ["2", "O evento chega na Edge Function crm-event e é salvo no banco"],
                ["3", "Um trigger SQL verifica as regras ativas e agenda o email com o delay configurado"],
                ["4", "A cada 5 minutos, o crm-email-worker processa os emails pendentes"],
                ["5", "Se o evento de cancelamento não ocorreu, gera o HTML via IA e envia pelo Resend"],
                ["6", "O envio é registrado em Relatórios → Disparos com status enviado/aberto/clicado"],
              ].map(([num, text]) => (
                <Flex key={num} gap={3} align="flex-start">
                  <Flex
                    w="20px" h="20px" borderRadius="full" flexShrink={0}
                    bg="whiteAlpha.100" align="center" justify="center"
                  >
                    <Text fontSize="xs" color="teal.400" fontWeight="bold">{num}</Text>
                  </Flex>
                  <Text fontSize="xs" color="whiteAlpha.500">{text}</Text>
                </Flex>
              ))}
            </Flex>

            <Separator borderColor="whiteAlpha.100" my={4} />

            <Text fontSize="xs" color="whiteAlpha.400">
              Para ativar o cron job, execute no SQL Editor do Supabase (após habilitar as extensões
              {" "}<Text as="span" color="teal.300">pg_cron</Text> e{" "}
              <Text as="span" color="teal.300">pg_net</Text> no Dashboard → Extensions):
            </Text>
            <Box
              mt={2} p={3} bg="#000" borderRadius="md"
              border="1px solid" borderColor="whiteAlpha.100"
            >
              <Text
                as="pre" fontSize="xs" color="teal.200" fontFamily="mono"
                whiteSpace="pre-wrap"
              >{`SELECT cron.schedule(
  'crm-email-worker',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://wvewvutdgiebupjknfrf.supabase.co/functions/v1/crm-email-worker',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);`}</Text>
            </Box>
          </Box>
        </Flex>
      )}
    </Box>
  );
}
