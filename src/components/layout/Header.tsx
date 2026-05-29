"use client";

import { Box, Button, Flex, Menu, Text } from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toaster } from "@/lib/toaster";

interface Props {
  title?: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
  cliente: "Cliente",
};

export function Header({ title }: Props) {
  const { perfil, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    toaster.create({ title: "Até logo!", type: "success" });
    router.push("/login");
  }

  return (
    <Box
      h="60px"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      bg="#101010"
      px={6}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">
        <Text color="whiteAlpha.500" fontSize="sm">
          {title}
        </Text>

        <Flex align="center" gap={3}>
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                color="whiteAlpha.700"
                _hover={{ color: "white", bg: "whiteAlpha.100" }}
              >
                <Flex align="center" gap={2}>
                  <Box
                    w="28px"
                    h="28px"
                    borderRadius="full"
                    style={{
                      background: "linear-gradient(135deg, var(--chakra-colors-teal-600), var(--chakra-colors-blue-600))",
                    }}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                    color="white"
                  >
                    {perfil?.nome?.charAt(0)?.toUpperCase() ?? "?"}
                  </Box>
                  <Text fontSize="sm">{perfil?.nome ?? "Usuário"}</Text>
                  {perfil?.role && (
                    <Text fontSize="xs" color="teal.400">
                      {roleLabels[perfil.role]}
                    </Text>
                  )}
                </Flex>
              </Button>
            </Menu.Trigger>
            <Menu.Content bg="#1a1a1a" border="1px solid" borderColor="whiteAlpha.150" borderRadius="xl" minW="180px">
              <Menu.Item
                value="signout"
                onClick={handleSignOut}
                color="red.400"
                _hover={{ bg: "whiteAlpha.100" }}
              >
                Sair
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
        </Flex>
      </Flex>
    </Box>
  );
}
