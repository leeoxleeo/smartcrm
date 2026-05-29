"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex } from "@chakra-ui/react";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.push("/dashboard");
  }, [session, loading, router]);

  return (
    <Flex minH="100vh" align="center" justify="center" bg="#101010" p={4}>
      <Box
        position="absolute"
        top="30%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="600px"
        h="600px"
        borderRadius="full"
        style={{
          background: "radial-gradient(circle, rgba(49,151,149,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <LoginForm />
    </Flex>
  );
}
