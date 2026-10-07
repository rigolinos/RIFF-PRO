import { Baby, Dumbbell, Footprints, Goal, LayoutGrid, MapPin, PartyPopper, Target, Trophy, Volleyball, Waves, type LucideIcon } from 'lucide-react';

/** Tipos de espaço (venues.space_kind) com nome e ícone */
export const SPACE_KINDS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'tennis', label: 'Quadra de tênis', icon: Target },
  { value: 'beach_tennis', label: 'Beach tennis', icon: Target },
  { value: 'padel', label: 'Padel', icon: Target },
  { value: 'multi_court', label: 'Quadra poliesportiva', icon: LayoutGrid },
  { value: 'soccer', label: 'Campo ou quadra de futebol', icon: Goal },
  { value: 'volleyball', label: 'Vôlei', icon: Volleyball },
  { value: 'basketball', label: 'Basquete', icon: Trophy },
  { value: 'pool', label: 'Piscina', icon: Waves },
  { value: 'gym', label: 'Academia', icon: Dumbbell },
  { value: 'hall', label: 'Salão', icon: PartyPopper },
  { value: 'playground', label: 'Brinquedoteca ou playground', icon: Baby },
  { value: 'track', label: 'Pista de caminhada ou corrida', icon: Footprints },
  { value: 'other', label: 'Outro', icon: MapPin },
];

export const spaceKind = (value: string | null | undefined) => SPACE_KINDS.find((k) => k.value === value) ?? SPACE_KINDS[SPACE_KINDS.length - 1];

// Erros das funções de espaço
const SPACE_ERRORS: Record<string, string> = {
  space_name_invalid: 'O nome do espaço precisa ter de 2 a 60 letras.',
  space_name_taken: 'Já existe um espaço com esse nome.',
  space_not_found: 'Espaço não encontrado.',
  forbidden: 'Só o gestor da comunidade mexe nos espaços.',
};
export const spaceErrorMessage = (error: unknown) => {
  const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
  return SPACE_ERRORS[Object.keys(SPACE_ERRORS).find((k) => msg.includes(k)) ?? ''] ?? 'Não foi possível salvar o espaço.';
};
