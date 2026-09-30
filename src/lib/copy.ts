/**
 * @file copy.ts
 * Central vocabulary for the Riff.
 * Change terms in one place — every screen picks them up.
 *
 * "activity" is PENDING product decision (Encontro / Atividade / Evento).
 * Until decided, keep "atividade" as placeholder.
 */

export const COPY = {
  organizer:   { singular: 'Organizador', plural: 'Organizadores', alt: 'Anfitrião', altEn: 'Host' },
  participant: { singular: 'Participante', plural: 'Participantes' },
  activity:    { singular: 'atividade', plural: 'atividades' },   // PENDENTE de decisão
  tagline: 'Organize. Participe. Jogue junto.',
} as const;
