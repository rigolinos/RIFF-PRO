import { createElement } from 'react';
import { sportIcon } from '@riff/core/lib/sportIcons';

/** Ícone de traço da modalidade (categories.slug). */
export function SportIcon({ slug, className }: { slug: string | null | undefined; className?: string }) {
  return createElement(sportIcon(slug), { className, strokeWidth: 1.75, 'aria-hidden': true });
}
