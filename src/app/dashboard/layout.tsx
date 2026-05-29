"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [session, loading, router]);

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="#101010">
        <Spinner color="teal.400" size="xl" />
      </Flex>
    );
  }

  if (!session) return null;

  return (
    <Flex minH="100vh" bg="#101010">
      <Sidebar />
      <Flex flex={1} direction="column" overflow="hidden">
        <Header />
        <Box flex={1} p={6} overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
