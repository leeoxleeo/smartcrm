"use client";

import {
  Box,
  Checkbox,
  Field,
  Flex,
  Input,
  NativeSelect,
  Switch,
  Text,
  Textarea,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import type { Cliente, PlatformType } from "@/lib/types";

const platforms: { value: PlatformType; label: string }[] = [
  { value: "vtex", label: "VTEX" },
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "magento", label: "Magento" },
  { value: "wake", label: "Wake" },
  { value: "oracle", label: "Oracle" },
  { value: "wordpress", label: "WordPress" },
  { value: "strapi", label: "Strapi" },
  { value: "custom", label: "Custom" },
];

const servicosDisponiveis = ["CRO", "SEO", "CRM", "Business"];

interface Props {
  data: Partial<Cliente>;
  onChange: (field: keyof Cliente, value: unknown) => void;
}

function Inp({ label, id, ...rest }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
        {...(rest as React.ComponentProps<typeof Input>)}
      />
    </Field.Root>
  );
}

export function DadosTab({ data, onChange }: Props) {
  function toggleServico(s: string) {
    const atual = data.servicos_ativos ?? [];
    const novo = atual.includes(s) ? atual.filter((x) => x !== s) : [...atual, s];
    onChange("servicos_ativos", novo);
  }

  return (
    <VStack gap={5} align="stretch">
      <Inp
        label="Nome do Cliente *"
        id="nome"
        value={data.nome ?? ""}
        onChange={(e) => onChange("nome", e.target.value)}
        placeholder="Ex: Loja ABC"
        required
      />
      <Inp
        label="Email"
        id="email"
        type="email"
        value={data.email ?? ""}
        onChange={(e) => onChange("email", e.target.value)}
        placeholder="contato@loja.com"
      />
      <Inp
        label="Website"
        id="website_url"
        value={data.website_url ?? ""}
        onChange={(e) => onChange("website_url", e.target.value)}
        placeholder="https://loja.com.br"
      />

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">Plataforma</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={data.plataforma ?? ""}
            onChange={(e) => onChange("plataforma", e.target.value as PlatformType)}
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            color="white"
          >
            <option value="" style={{ background: "#1a1a1a" }}>Selecionar...</option>
            {platforms.map((p) => (
              <option key={p.value} value={p.value} style={{ background: "#1a1a1a" }}>
                {p.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">É e-commerce?</Field.Label>
        <Switch.Root
          checked={data.is_ecommerce ?? false}
          onCheckedChange={(e) => onChange("is_ecommerce", e.checked)}
          colorPalette="teal"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label color="whiteAlpha.600" fontSize="sm">
            {data.is_ecommerce ? "Sim, é e-commerce" : "Não (site institucional)"}
          </Switch.Label>
        </Switch.Root>
      </Field.Root>

      {data.is_ecommerce && (
        <Inp
          label="Nicho do E-commerce"
          id="nicho_ecommerce"
          value={data.nicho_ecommerce ?? ""}
          onChange={(e) => onChange("nicho_ecommerce", e.target.value)}
          placeholder="Ex: moda feminina, eletrônicos..."
        />
      )}

      {!data.is_ecommerce && (
        <Field.Root>
          <Field.Label color="whiteAlpha.700" fontSize="sm">Contexto do Site</Field.Label>
          <Textarea
            value={data.contexto_site ?? ""}
            onChange={(e) => onChange("contexto_site", e.target.value)}
            placeholder="Descreva o objetivo e contexto do site"
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            color="white"
            _placeholder={{ color: "whiteAlpha.400" }}
            _focus={{ borderColor: "teal.400" }}
            rows={3}
          />
        </Field.Root>
      )}

      <Box>
        <Text color="whiteAlpha.700" fontSize="sm" mb={2}>Serviços Ativos</Text>
        <Wrap gap={3}>
          {servicosDisponiveis.map((s) => (
            <Checkbox.Root
              key={s}
              checked={(data.servicos_ativos ?? []).includes(s)}
              onCheckedChange={() => toggleServico(s)}
              colorPalette="teal"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Label color="whiteAlpha.700" fontSize="sm">{s}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </Wrap>
      </Box>

      <Field.Root>
        <Field.Label color="whiteAlpha.700" fontSize="sm">Ativo</Field.Label>
        <Switch.Root
          checked={data.ativo ?? true}
          onCheckedChange={(e) => onChange("ativo", e.checked)}
          colorPalette="teal"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label color="whiteAlpha.600" fontSize="sm">
            {data.ativo ? "Cliente ativo" : "Cliente inativo"}
          </Switch.Label>
        </Switch.Root>
      </Field.Root>
    </VStack>
  );
}
