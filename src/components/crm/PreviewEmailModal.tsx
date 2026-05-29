"use client";

import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { CrmTriggerRule } from "@/lib/types";

interface Props {
  regra: CrmTriggerRule | null;
  open: boolean;
  onClose: () => void;
}

const templateProdutoVisto = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#319795,#3182ce);padding:32px;text-align:center">
    <h2 style="color:white;margin:0;font-size:22px">Você ainda está pensando? 🤔</h2>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">O produto que você viu ainda está disponível</p>
  </div>
  <div style="padding:32px">
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;display:flex;gap:16px;margin-bottom:24px">
      <div style="width:80px;height:80px;background:#f7fafc;border-radius:6px;flex-shrink:0"></div>
      <div>
        <p style="font-weight:600;margin:0 0 4px;color:#1a202c">{{produto_nome}}</p>
        <p style="color:#319795;font-weight:700;font-size:18px;margin:0">{{produto_preco}}</p>
        <p style="color:#718096;font-size:12px;margin:4px 0 0">{{produto_categoria}}</p>
      </div>
    </div>
    <a href="{{produto_url}}" style="display:block;background:linear-gradient(135deg,#319795,#3182ce);color:white;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
      Ver Produto
    </a>
    <p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:16px">
      Esse email foi enviado porque você visitou nosso site.<br>
      <a href="{{unsubscribe_url}}" style="color:#a0aec0">Cancelar inscrição</a>
    </p>
  </div>
</div>
`;

const VITRINE_LABELS: Record<string, string> = {
  vitrine_similares:   "Vitrine — Similares (IA)",
  vitrine_combinacoes: "Vitrine — Comprados Juntos (IA)",
  vitrine_sugestoes:   "Vitrine — Sugestões (IA)",
  vitrine_inteligente: "Vitrine — Inteligente VTEX (IA)",
};

const VITRINE_NOTES: Record<string, string> = {
  vitrine_similares:   "Produtos da mesma categoria/marca do produto que disparou a automação, ordenados por views.",
  vitrine_combinacoes: "Produtos mais comprados de outras categorias — complementares ao que o contato viu.",
  vitrine_sugestoes:   "Top produtos que o contato ainda não viu, baseado no histórico de navegação.",
  vitrine_inteligente: "✦ IA analisa o padrão completo de navegação (até 30 produtos vistos), extrai categoria, faixa de preço e atributos-chave, e busca produtos relevantes direto na API de Search da VTEX.",
};

const templateVitrinePreview = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#319795,#3182ce);padding:20px;text-align:center">
    <p style="color:rgba(255,255,255,0.9);margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase">SmartCRM</p>
  </div>
  <div style="padding:28px 32px 16px;text-align:center">
    <h2 style="color:#1a202c;margin:0 0 8px;font-size:22px">João, selecionamos isso para você</h2>
    <p style="color:#718096;margin:0;font-size:14px">Produtos selecionados com base no seu interesse.</p>
  </div>
  <div style="padding:8px 24px 8px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:8px;vertical-align:top">
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
            <div style="height:120px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:28px">📦</div>
            <div style="padding:12px">
              <p style="font-size:10px;color:#a0aec0;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Categoria</p>
              <p style="font-weight:700;margin:0 0 6px;color:#1a202c;font-size:13px">Nome do Produto</p>
              <p style="color:#276749;font-weight:800;margin:0 0 10px;font-size:15px">R$ 199,90</p>
              <div style="background:linear-gradient(135deg,#319795,#3182ce);color:white;text-align:center;padding:8px;border-radius:7px;font-size:12px;font-weight:700">Ver produto →</div>
            </div>
          </div>
        </td>
        <td width="50%" style="padding:8px;vertical-align:top">
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
            <div style="height:120px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:28px">📦</div>
            <div style="padding:12px">
              <p style="font-size:10px;color:#a0aec0;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Categoria</p>
              <p style="font-weight:700;margin:0 0 6px;color:#1a202c;font-size:13px">Outro Produto</p>
              <p style="color:#276749;font-weight:800;margin:0 0 10px;font-size:15px">R$ 349,90</p>
              <div style="background:linear-gradient(135deg,#319795,#3182ce);color:white;text-align:center;padding:8px;border-radius:7px;font-size:12px;font-weight:700">Ver produto →</div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:12px 32px 28px;text-align:center">
    <p style="color:#a0aec0;font-size:12px;font-style:italic;margin:0">"Explore nossa seleção especial para você."</p>
  </div>
  <div style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="color:#a0aec0;font-size:11px;margin:0">Cancelar inscrição</p>
  </div>
</div>
`;

export function PreviewEmailModal({ regra, open, onClose }: Props) {
  if (!regra) return null;

  const isCustom = regra.email_template_tipo === "custom";
  const isVitrine = regra.email_template_tipo.startsWith("vitrine_");

  const htmlContent = isCustom && regra.email_html
    ? regra.email_html
    : isVitrine
    ? templateVitrinePreview
    : templateProdutoVisto;

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose(); }} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          bg="#141414"
          border="1px solid"
          borderColor="whiteAlpha.150"
          borderRadius="2xl"
          maxW="780px"
          w="95vw"
          maxH="90vh"
          display="flex"
          flexDirection="column"
        >
          <Dialog.Header borderBottom="1px solid" borderColor="whiteAlpha.100" pb={4} flexShrink={0}>
            <Flex justify="space-between" align="center">
              <Box>
                <Dialog.Title color="white" fontSize="md">Preview — {regra.nome}</Dialog.Title>
                <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
                  Visualização do email que será enviado
                </Text>
              </Box>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" size="sm" color="whiteAlpha.500">✕</Button>
              </Dialog.CloseTrigger>
            </Flex>
          </Dialog.Header>

          <Dialog.Body py={5} flex={1} overflow="hidden" display="flex" flexDirection="column" gap={4}>
            {/* Metadados da automação */}
            <Flex gap={3} wrap="wrap">
              <Flex align="center" gap={1.5} px={3} py={1.5} bg="whiteAlpha.50" borderRadius="lg">
                <Text fontSize="xs" color="whiteAlpha.500">Evento:</Text>
                <Badge colorPalette="teal" size="sm">{regra.evento_tipo}</Badge>
              </Flex>
              <Flex align="center" gap={1.5} px={3} py={1.5} bg="whiteAlpha.50" borderRadius="lg">
                <Text fontSize="xs" color="whiteAlpha.500">Delay:</Text>
                <Text fontSize="xs" color="white" fontWeight="medium">{regra.delay_minutos} min</Text>
              </Flex>
              {regra.cancelar_se && (
                <Flex align="center" gap={1.5} px={3} py={1.5} bg="whiteAlpha.50" borderRadius="lg">
                  <Text fontSize="xs" color="whiteAlpha.500">Cancela se:</Text>
                  <Badge colorPalette="orange" size="sm">{regra.cancelar_se}</Badge>
                </Flex>
              )}
              <Flex align="center" gap={1.5} px={3} py={1.5} bg="whiteAlpha.50" borderRadius="lg">
                <Text fontSize="xs" color="whiteAlpha.500">Template:</Text>
                <Text fontSize="xs" color="blue.300" fontWeight="medium">
                  {isCustom
                    ? "HTML customizado"
                    : isVitrine
                    ? VITRINE_LABELS[regra.email_template_tipo] ?? regra.email_template_tipo
                    : "Produto visto (IA)"}
                </Text>
              </Flex>
            </Flex>

            {/* Assunto */}
            {regra.email_assunto && (
              <Box px={4} py={3} bg="whiteAlpha.50" border="1px solid" borderColor="whiteAlpha.100" borderRadius="lg">
                <Text fontSize="xs" color="whiteAlpha.500" mb={0.5}>Assunto do email</Text>
                <Text fontSize="sm" color="white" fontWeight="medium">{regra.email_assunto}</Text>
              </Box>
            )}

            <Separator borderColor="whiteAlpha.100" />

            {/* Preview do HTML */}
            <Box flex={1} overflow="hidden" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.100">
              {/* Barra de browser fake */}
              <Flex
                px={3}
                py={2}
                bg="#0d0d0d"
                borderBottom="1px solid"
                borderColor="whiteAlpha.100"
                align="center"
                gap={2}
                flexShrink={0}
              >
                <Flex gap={1.5}>
                  <Box w="10px" h="10px" borderRadius="full" bg="red.500" opacity={0.6} />
                  <Box w="10px" h="10px" borderRadius="full" bg="yellow.500" opacity={0.6} />
                  <Box w="10px" h="10px" borderRadius="full" bg="green.500" opacity={0.6} />
                </Flex>
                <Text fontSize="xs" color="whiteAlpha.300" ml={2}>
                  preview — email
                </Text>
              </Flex>

              <Box
                bg="white"
                overflowY="auto"
                h="380px"
                p={4}
              >
                {!isCustom && !regra.email_html ? (
                  <Box>
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    <Box mt={3} p={3} bg="#fffbeb" borderRadius="md" border="1px solid #fbbf24">
                      <Text fontSize="xs" color="#92400e">
                        {isVitrine
                          ? `⚠ ${VITRINE_NOTES[regra.email_template_tipo] ?? "Vitrine gerada por IA."} O layout acima é uma prévia estática — o email enviado terá produtos reais com imagens e preços.`
                          : `⚠ Template gerado por IA com base nos dados do produto visitado. As variáveis {{ produto_nome }}, {{ produto_preco }} etc. são preenchidas automaticamente no envio.`}
                      </Text>
                    </Box>
                  </Box>
                ) : regra.email_html ? (
                  <div dangerouslySetInnerHTML={{ __html: regra.email_html }} />
                ) : (
                  <VStack py={10} gap={2}>
                    <Text color="#a0aec0" fontSize="sm">Nenhum HTML definido para este template.</Text>
                    <Text color="#cbd5e0" fontSize="xs">Edite a automação e adicione o HTML do email.</Text>
                  </VStack>
                )}
              </Box>
            </Box>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
