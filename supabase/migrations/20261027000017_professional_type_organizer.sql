-- ============================================================
-- Riff Pro (P6): "Organizador(a)" como área de atuação
-- ============================================================
-- O onboarding do organizador sempre ofereceu "Organizador(a)" (eventos,
-- campeonatos, jogos), mas a regra do banco não aceitava o valor e o
-- cadastro falhava ao salvar. Organizador é o público central do Riff Pro.
-- ============================================================

BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_professional_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_professional_type_check
  CHECK (professional_type IN (
    'personal_trainer', 'physiotherapist', 'instructor',
    'coach', 'nutritionist', 'organizer', 'other'
  ));

COMMIT;
