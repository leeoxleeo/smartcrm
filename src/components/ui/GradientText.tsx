"use client";

import { Text } from "@chakra-ui/react";

interface Props {
  children: React.ReactNode;
  fontSize?: string;
  fontWeight?: string;
}

export function GradientText({ children, fontSize, fontWeight = "bold" }: Props) {
  return (
    <Text
      as="span"
      fontSize={fontSize}
      fontWeight={fontWeight}
      style={{
        background: "linear-gradient(135deg, var(--chakra-colors-teal-400), var(--chakra-colors-blue-400))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </Text>
  );
}
