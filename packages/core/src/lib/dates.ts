import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** "de hoje", "de ontem", "de sábado" (para frases como "Como foi o Vôlei de ontem?") */
export const whenLabel = (date: string) => {
  const d = parseISO(date);
  if (isToday(d)) return 'de hoje';
  if (isYesterday(d)) return 'de ontem';
  return `de ${format(d, 'EEEE', { locale: ptBR })}`;
};
