"use client";

import { Box, Badge, Flex, IconButton, Menu, Text } from "@chakra-ui/react";
import type { Perfil } from "@/lib/types";

const roleColors: Record<string, string> = {
  admin: "red",
  owner: "purple",
  editor: "orange",
  viewer: "gray",
  cliente: "blue",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
  cliente: "Cliente",
};

interface Props {
  perfil: Perfil;
  onEdit: (p: Perfil) => void;
  onToggleActive: (p: Perfil) => void;
}

export function UsuarioCard({ perfil, onEdit, onToggleActive }: Props) {
  return (
    <Flex
      align="center"
      gap={4}
      p={4}
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
      _hover={{ borderColor: "whiteAlpha.200" }}
    >
      <Box
        w="36px"
        h="36px"
        borderRadius="full"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="sm"
        fontWeight="bold"
        color="white"
        style={{
          background: "linear-gradient(135deg, var(--chakra-colors-teal-700), var(--chakra-colors-blue-700))",
        }}
      >
        {perfil.nome.charAt(0).toUpperCase()}
      </Box>

      <Box flex={1} minW={0}>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight="medium" color="white" truncate>
            {perfil.nome}
          </Text>
          <Badge colorPalette={roleColors[perfil.role]} size="sm">
            {roleLabels[perfil.role]}
          </Badge>
          {!perfil.ativo && (
            <Badge colorPalette="gray" size="sm" variant="outline">
              Inativo
            </Badge>
          )}
        </Flex>
        <Text fontSize="xs" color="whiteAlpha.500" truncate>
          {perfil.email}
        </Text>
      </Box>

      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Opções"
            variant="ghost"
            size="sm"
            color="whiteAlpha.500"
            _hover={{ color: "white", bg: "whiteAlpha.100" }}
          >
            ···
          </IconButton>
        </Menu.Trigger>
        <Menu.Content bg="#1a1a1a" border="1px solid" borderColor="whiteAlpha.150" borderRadius="xl">
          <Menu.Item value="edit" onClick={() => onEdit(perfil)} _hover={{ bg: "whiteAlpha.100" }} color="white">
            Editar
          </Menu.Item>
          <Menu.Item
            value="toggle"
            onClick={() => onToggleActive(perfil)}
            _hover={{ bg: "whiteAlpha.100" }}
            color={perfil.ativo ? "red.400" : "teal.400"}
          >
            {perfil.ativo ? "Desativar" : "Ativar"}
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </Flex>
  );
}
