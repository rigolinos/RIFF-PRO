/**
 * Identidade do Riff Clubes. Mesmo papel do src/brand.ts do Riff Pro: tudo que é
 * da marca deste app (nome, domínio, imagem de compartilhamento) fica aqui.
 */
export const BRAND = {
  /** Nome do produto (títulos e meta tags) */
  name: 'Riff Clubes',

  /** Marca-mãe */
  family: 'Riff Sports',

  /** Frase curta */
  tagline: 'O esporte do seu condomínio ou clube, organizado.',

  /** Domínio base (sem barra no fim). Provisório até o domínio final ser definido. */
  domain: 'riff-clubes.vercel.app',

  /** Imagem de compartilhamento (1200×630), em public/ */
  ogImage: '/brand/og-image.jpg',

  /** Link de contato comercial (WhatsApp ou formulário). Vazio até ser definido. */
  salesContactUrl: '' as string,

  /** Cor de ação (mesma do --brand no design system) */
  primaryColor: '#F2CE56',

  /** Fundo usado no manifest e no theme-color */
  backgroundColor: '#0F1115',
} as const;
