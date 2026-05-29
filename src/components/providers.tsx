"use client";

import { ChakraProvider } from "@chakra-ui/react";
import {
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastCloseTrigger,
  ToastIndicator,
  Stack,
} from "@chakra-ui/react";
import { system } from "@/theme/system";
import { toaster } from "@/lib/toaster";
import { AuthProvider } from "@/context/AuthContext";
import type { ToastOptions } from "@chakra-ui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <AuthProvider>
        {children}
        <Toaster toaster={toaster}>
          {(toast: ToastOptions) => (
            <ToastRoot
              key={toast.id}
              minW="320px"
              maxW="420px"
              bg="#1e1e1e"
              border="1px solid"
              borderColor="whiteAlpha.150"
              borderRadius="xl"
              px={4}
              py={3}
              boxShadow="0 8px 32px rgba(0,0,0,0.5)"
              gap={3}
            >
              <ToastIndicator />
              <Stack gap="0.5" flex="1">
                {toast.title && (
                  <ToastTitle fontSize="sm" fontWeight="semibold" color="white">
                    {String(toast.title)}
                  </ToastTitle>
                )}
                {toast.description && (
                  <ToastDescription fontSize="xs" color="whiteAlpha.700">
                    {String(toast.description)}
                  </ToastDescription>
                )}
              </Stack>
              <ToastCloseTrigger color="whiteAlpha.500" _hover={{ color: "white" }} />
            </ToastRoot>
          )}
        </Toaster>
      </AuthProvider>
    </ChakraProvider>
  );
}
