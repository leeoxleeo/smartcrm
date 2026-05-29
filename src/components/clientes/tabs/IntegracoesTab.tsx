"use client";

import { Box, Field, Input, Text, VStack } from "@chakra-ui/react";
import type { Cliente } from "@/lib/types";

interface Props {
  data: Partial<Cliente>;
  onChange: (field: keyof Cliente, value: unknown) => void;
}

function Inp({ label, id, ...rest }: { label: string; id: string } & React.ComponentProps<typeof Input>) {
  return (
    <Field.Root>
      <Field.Label color="whiteAlpha.700" fontSize="sm">{label}</Field.Label>
      <Input
        id={id}
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor="whiteAlpha.200"
        color="white"
        _placeholder={{ color: "whiteAlpha.400" }}
        _focus={{ borderColor: "teal.400" }}
        fontFamily="mono"
        fontSize="sm"
        {...rest}
      />
    </Field.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text color="teal.400" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" mb={3}>
        {title}
      </Text>
      <VStack gap={3} align="stretch">
        {children}
      </VStack>
    </Box>
  );
}

export function IntegracoesTab({ data, onChange }: Props) {
  const plataforma = data.plataforma;

  return (
    <VStack gap={6} align="stretch">
      {(plataforma === "vtex" || !plataforma) && (
        <Section title="VTEX">
          <Inp
            label="Account Name"
            id="vtex_account_name"
            value={data.vtex_account_name ?? ""}
            onChange={(e) => onChange("vtex_account_name", e.target.value)}
            placeholder="minhaloja"
          />
          <Inp
            label="App Key"
            id="vtex_appkey"
            value={data.vtex_appkey ?? ""}
            onChange={(e) => onChange("vtex_appkey", e.target.value)}
            placeholder="vtexappkey_..."
          />
          <Inp
            label="App Token"
            id="vtex_apptoken"
            value={data.vtex_apptoken ?? ""}
            onChange={(e) => onChange("vtex_apptoken", e.target.value)}
            placeholder="XXXXXXXX..."
            type="password"
          />
        </Section>
      )}

      {(plataforma === "wake" || !plataforma) && (
        <Section title="Wake">
          <Inp
            label="API Token"
            id="wake_api_token"
            value={data.wake_api_token ?? ""}
            onChange={(e) => onChange("wake_api_token", e.target.value)}
            placeholder="Bearer ..."
            type="password"
          />
        </Section>
      )}

      {(plataforma === "shopify" || !plataforma) && (
        <Section title="Shopify">
          <Inp
            label="Store Domain"
            id="shopify_store_domain"
            value={data.shopify_store_domain ?? ""}
            onChange={(e) => onChange("shopify_store_domain", e.target.value)}
            placeholder="minhaloja.myshopify.com"
          />
          <Inp
            label="API Key"
            id="shopify_api_key"
            value={data.shopify_api_key ?? ""}
            onChange={(e) => onChange("shopify_api_key", e.target.value)}
            placeholder="shppa_..."
          />
          <Inp
            label="API Password"
            id="shopify_api_password"
            value={data.shopify_api_password ?? ""}
            onChange={(e) => onChange("shopify_api_password", e.target.value)}
            placeholder="shpss_..."
            type="password"
          />
        </Section>
      )}

      {(plataforma === "wordpress" || !plataforma) && (
        <Section title="WordPress">
          <Inp
            label="API Key"
            id="wordpress_api_key"
            value={data.wordpress_api_key ?? ""}
            onChange={(e) => onChange("wordpress_api_key", e.target.value)}
            placeholder="..."
            type="password"
          />
        </Section>
      )}

      {(plataforma === "strapi" || !plataforma) && (
        <Section title="Strapi">
          <Inp
            label="API Token"
            id="strapi_api_token"
            value={data.strapi_api_token ?? ""}
            onChange={(e) => onChange("strapi_api_token", e.target.value)}
            placeholder="..."
            type="password"
          />
        </Section>
      )}
    </VStack>
  );
}
