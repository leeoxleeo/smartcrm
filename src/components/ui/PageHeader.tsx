"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <Flex justify="space-between" align="flex-start" mb={6}>
      <Box>
        <Heading size="lg" color="white" fontWeight="semibold">
          {title}
        </Heading>
        {description && (
          <Text color="whiteAlpha.600" fontSize="sm" mt={1}>
            {description}
          </Text>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Flex>
  );
}
