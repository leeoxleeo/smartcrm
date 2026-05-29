"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { GradientText } from "@/components/ui/GradientText";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Visão Geral", icon: "◈" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "⬡" },
  { href: "/dashboard/crm", label: "CRM Triggers", icon: "⚡" },
  { href: "/dashboard/usuarios", label: "Usuários", icon: "⬟" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙" },
  { href: "/dashboard/manual", label: "Manual de Uso", icon: "⊙" },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <Box
      w="220px"
      minH="100vh"
      bg="#141414"
      borderRight="1px solid"
      borderColor="whiteAlpha.100"
      py={6}
      px={4}
      flexShrink={0}
      display="flex"
      flexDirection="column"
    >
      <Box mb={8} px={2}>
        <Text fontSize="lg" fontWeight="bold">
          <GradientText>SmartCRM</GradientText>
        </Text>
        <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
          Plataforma CRM
        </Text>
      </Box>

      <VStack gap={1} align="stretch" flex={1}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Flex
              align="center"
              gap={3}
              px={3}
              py={2.5}
              borderRadius="lg"
              cursor="pointer"
              transition="all 0.15s"
              bg={isActive(item.href) ? "whiteAlpha.100" : "transparent"}
              color={isActive(item.href) ? "teal.300" : "whiteAlpha.600"}
              _hover={{ bg: "whiteAlpha.100", color: "white" }}
            >
              <Text fontSize="sm">{item.icon}</Text>
              <Text fontSize="sm" fontWeight={isActive(item.href) ? "semibold" : "normal"}>
                {item.label}
              </Text>
              {isActive(item.href) && (
                <Box
                  ml="auto"
                  w="3px"
                  h="16px"
                  borderRadius="full"
                  style={{
                    background: "linear-gradient(180deg, var(--chakra-colors-teal-400), var(--chakra-colors-blue-500))",
                  }}
                />
              )}
            </Flex>
          </Link>
        ))}
      </VStack>
    </Box>
  );
}
