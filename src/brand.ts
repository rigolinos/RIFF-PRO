/**
 * @file brand.ts
 * Central source of truth for Riff brand identity.
 * When launching Riff Clubes (or any other vertical), duplicate
 * this file and change only the values here — zero code changes elsewhere.
 */

export const BRAND = {
  /** Full product name, e.g. used in page titles and meta tags */
  name: 'Riff Pro',

  /** Parent company / brand family */
  family: 'Riff Sports',

  /** Short tagline */
  tagline: 'Organize. Participe. Jogue junto.',

  /** Base domain (no trailing slash). Provisório até o domínio próprio (riff.pro ainda não existe);
   *  ao trocar, atualize também og:url e og:image do index.html. */
  domain: 'riff-pro.vercel.app',

  /** Twitter / X handle, without @ */
  twitter: 'riffpro',

  /** Default OG image (1200×630), path under public/ — replace when the designer delivers the final art */
  ogImage: '/brand/og-image.jpg',

  /** Primary brand color (same as --color-brand in index.css dark theme) */
  primaryColor: '#F2CE56',

  /** Background color used in PWA manifest and meta theme-color */
  backgroundColor: '#0F1115',
} as const;

