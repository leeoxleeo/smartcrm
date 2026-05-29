"use client";

import Link from "next/link";
import { Badge, Box, Flex, Text } from "@chakra-ui/react";
import type { Cliente } from "@/lib/types";

const platformLabels: Record<string, string> = {
  vtex: "VTEX",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  magento: "Magento",
  wake: "Wake",
  oracle: "Oracle",
  wordpress: "WordPress",
  strapi: "Strapi",
  custom: "Custom",
};

interface Props {
  cliente: Cliente;
}

export function ClienteCard({ cliente }: Props) {
  return (
    <Link href={`/dashboard/clientes/${cliente.id}`}>
      <Flex
        gap={4}
        p={4}
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="xl"
        cursor="pointer"
        transition="all 0.15s"
        _hover={{ borderColor: "teal.700", bg: "whiteAlpha.100" }}
        align="center"
      >
        <Box
          w="40px"
          h="40px"
          borderRadius="lg"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="lg"
          fontWeight="bold"
          color="white"
          style={{
            background: "linear-gradient(135deg, var(--chakra-colors-teal-800), var(--chakra-colors-blue-800))",
          }}
        >
          {cliente.nome.charAt(0).toUpperCase()}
        </Box>

        <Box flex={1} minW={0}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" fontWeight="semibold" color="white" truncate>
              {cliente.nome}
            </Text>
            {!cliente.ativo && (
              <Badge colorPalette="gray" size="sm" variant="outline">Inativo</Badge>
            )}
          </Flex>
          <Flex align="center" gap={2} mt={0.5}>
            {cliente.plataforma && (
              <Badge colorPalette="teal" size="sm" variant="subtle">
                {platformLabels[cliente.plataforma] ?? cliente.plataforma}
              </Badge>
            )}
            {cliente.website_url && (
              <Text fontSize="xs" color="whiteAlpha.400" truncate>
                {cliente.website_url}
              </Text>
            )}
          </Flex>
        </Box>

        <Flex gap={2} flexShrink={0}>
          {(cliente.servicos_ativos ?? []).map((s) => (
            <Badge key={s} colorPalette="blue" size="sm" variant="subtle">
              {s}
            </Badge>
          ))}
        </Flex>

        <Text color="whiteAlpha.300" fontSize="lg">›</Text>
      </Flex>
    </Link>
  );
}
