"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";
import { toaster } from "@/lib/toaster";
import { GradientText } from "@/components/ui/GradientText";

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toaster.create({ title: "Erro ao entrar", description: error, type: "error" });
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Box
      bg="whiteAlpha.50"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="2xl"
      p={8}
      w="full"
      maxW="400px"
    >
      <VStack gap={6} align="stretch">
        <VStack gap={1} align="flex-start">
          <Heading size="xl" color="white">
            <GradientText>SmartCRM</GradientText>
          </Heading>
          <Text color="whiteAlpha.600" fontSize="sm">
            Acesse sua conta
          </Text>
        </VStack>

        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label color="whiteAlpha.700" fontSize="sm">Email</Field.Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)" }}
                required
              />
            </Field.Root>

            <Field.Root>
              <Field.Label color="whiteAlpha.700" fontSize="sm">Senha</Field.Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                _placeholder={{ color: "whiteAlpha.400" }}
                _focus={{ borderColor: "teal.400", boxShadow: "0 0 0 1px var(--chakra-colors-teal-400)" }}
                required
              />
            </Field.Root>

            <Button
              type="submit"
              loading={loading}
              loadingText="Entrando..."
              w="full"
              style={{
                background: "linear-gradient(135deg, var(--chakra-colors-teal-500), var(--chakra-colors-blue-500))",
                color: "white",
                fontWeight: "semibold",
              }}
              _hover={{ opacity: 0.9 }}
            >
              Entrar
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}
