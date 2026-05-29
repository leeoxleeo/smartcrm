"use client";

import { Field, Input, Text, Textarea, VStack } from "@chakra-ui/react";
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

export function GA4Tab({ data, onChange }: Props) {
  function handleServiceAccount(value: string) {
    try {
      onChange("ga4_service_account_json", value ? JSON.parse(value) : undefined);
    } catch {
      // keep as-is while typing
    }
  }

  return (
    <VStack gap={4} align="stretch">
      <Text color="whiteAlpha.500" fontSize="xs">
        Configure as credenciais do Google Analytics 4 para reports automáticos.
      </Text>

      <Inp
        label="Property ID"
        id="ga4_property_id"
        value={data.ga4_property_id ?? ""}
        onChange={(e) => onChange("ga4_property_id", e.target.value)}
        placeholder="123456789"
      />
      <Inp
        label="Measurement ID"
        id="ga4_measurement_id"
        value={data.ga4_measurement_id ?? ""}
        onChange={(e) => onChange("ga4_measurement_id", e.target.value)}
        placeholder="G-XXXXXXXXXX"
      />
      <Inp
        label="API Secret (Measurement Protocol)"
        id="ga4_api_secret"
        value={data.ga4_api_secret ?? ""}
        onChange={(e) => onChange("ga4_api_secret", e.target.value)}
        placeholder="..."
        type="password"
      />

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">
          Service Account JSON
        </Field.Label>
        <Textarea
          value={data.ga4_service_account_json ? JSON.stringify(data.ga4_service_account_json, null, 2) : ""}
          onChange={(e) => handleServiceAccount(e.target.value)}
          placeholder='{"type": "service_account", ...}'
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: "whiteAlpha.400" }}
          _focus={{ borderColor: "teal.400" }}
          fontFamily="mono"
          fontSize="xs"
          rows={6}
        />
      </Field.Root>
    </VStack>
  );
}
