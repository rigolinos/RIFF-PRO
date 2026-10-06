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

  /** Domínio base (sem barra no fim). Provisório (Vercel) até o domínio final ser definido;
   *  ao trocar, atualize também as tags og:url e og:image do apps/clubes/index.html. */
  domain: 'riff-pro-clubes.vercel.app',

  /** Imagem de compartilhamento, em public/. Provisória: o ícone do app, até a arte própria do Clubes. */
  ogImage: '/brand/app-icon-512.png',

  /** Link de contato comercial (WhatsApp ou formulário). Vazio até ser definido. */
  salesContactUrl: '' as string,

  /** Cor de ação (mesma do --brand no design system) */
  primaryColor: '#F2CE56',

  /** Fundo usado no manifest e no theme-color */
  backgroundColor: '#0F1115',
} as const;
