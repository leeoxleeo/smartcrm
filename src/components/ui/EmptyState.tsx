"use client";

import { Box, Text, VStack } from "@chakra-ui/react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <VStack
      gap={3}
      py={16}
      px={8}
      bg="whiteAlpha.50"
      borderRadius="xl"
      border="1px dashed"
      borderColor="whiteAlpha.200"
      textAlign="center"
    >
      {icon && (
        <Box color="whiteAlpha.400" fontSize="3xl">
          {icon}
        </Box>
      )}
      <Text color="white" fontWeight="medium">
        {title}
      </Text>
      {description && (
        <Text color="whiteAlpha.500" fontSize="sm">
          {description}
        </Text>
      )}
      {action}
    </VStack>
  );
}
