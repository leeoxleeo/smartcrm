"use client";

import { Field, Input, Text, VStack } from "@chakra-ui/react";
import type { Cliente } from "@/lib/types";

interface Props {
  data: Partial<Cliente>;
  onChange: (field: keyof Cliente, value: unknown) => void;
}

export function ClarityTab({ data, onChange }: Props) {
  return (
    <VStack gap={4} align="stretch">
      <Text color="whiteAlpha.500" fontSize="xs">
        Configure o Microsoft Clarity para análise de heatmaps e gravações.
      </Text>

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">Project ID</Field.Label>
        <Input
          value={data.clarity_project_id ?? ""}
          onChange={(e) => onChange("clarity_project_id", e.target.value)}
          placeholder="xxxxxxxxxx"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: "whiteAlpha.400" }}
          _focus={{ borderColor: "teal.400" }}
          fontFamily="mono"
          fontSize="sm"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">API Token</Field.Label>
        <Input
          value={data.clarity_api_token ?? ""}
          onChange={(e) => onChange("clarity_api_token", e.target.value)}
          placeholder="..."
          type="password"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: "whiteAlpha.400" }}
          _focus={{ borderColor: "teal.400" }}
          fontFamily="mono"
          fontSize="sm"
        />
      </Field.Root>
    </VStack>
  );
}
