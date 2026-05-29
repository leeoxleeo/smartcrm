import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    "html, body": {
      bg: "#101010",
      color: "white",
      colorScheme: "dark",
    },
    "*": {
      borderColor: "whiteAlpha.100",
    },
    "::-webkit-scrollbar": {
      width: "6px",
    },
    "::-webkit-scrollbar-track": {
      bg: "#1a1a1a",
    },
    "::-webkit-scrollbar-thumb": {
      bg: "teal.700",
      borderRadius: "full",
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e6fffa" },
          100: { value: "#b2f5ea" },
          200: { value: "#81e6d9" },
          300: { value: "#4fd1c5" },
          400: { value: "#38b2ac" },
          500: { value: "#319795" },
          600: { value: "#2c7a7b" },
          700: { value: "#285e61" },
          800: { value: "#234e52" },
          900: { value: "#1d4044" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "bg.panel": {
          value: { base: "#1a1a1a", _dark: "#1a1a1a" },
        },
        "bg.subtle": {
          value: { base: "#222222", _dark: "#222222" },
        },
        "border.subtle": {
          value: { base: "rgba(255,255,255,0.08)", _dark: "rgba(255,255,255,0.08)" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
