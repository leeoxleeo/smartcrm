"use client";

import { Box, Flex, Grid, Text, VStack } from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { GradientText } from "@/components/ui/GradientText";

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
      p={5}
    >
      <Text color="whiteAlpha.500" fontSize="sm">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={color ?? "white"} mt={1}>
        {value}
      </Text>
    </Box>
  );
}

export default function DashboardPage() {
  const { perfil } = useAuth();

  return (
    <VStack gap={8} align="stretch">
      <Box>
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Olá, <GradientText>{perfil?.nome?.split(" ")[0] ?? "usuário"}</GradientText> 👋
        </Text>
        <Text color="whiteAlpha.500" fontSize="sm" mt={1}>
          Bem-vindo ao SmartCRM
        </Text>
      </Box>

      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
        <StatCard label="Clientes Ativos" value="—" color="teal.300" />
        <StatCard label="Contatos CRM" value="—" color="blue.300" />
        <StatCard label="Formulários" value="—" color="purple.300" />
        <StatCard label="Automações" value="—" color="orange.300" />
      </Grid>

      <Box
        bg="whiteAlpha.50"
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="xl"
        p={6}
      >
        <Text color="whiteAlpha.700" fontSize="sm">
          Use o menu lateral para navegar entre as funcionalidades.
        </Text>
      </Box>
    </VStack>
  );
}
