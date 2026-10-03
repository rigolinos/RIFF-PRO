-- ============================================================
-- REMOVE OS DADOS DE EXEMPLO (criados por demo_seed.sql)
-- ============================================================
-- Apaga tudo que pertence aos perfis de exemplo (id começando com de000000-):
-- atividades, reservas (inclusive de usuários reais em atividades de exemplo),
-- avaliações, resultados, relatórios, locais, organizações e os próprios perfis.
-- Não toca em nenhum outro dado. Rodar antes de abrir para usuários reais.
--
--   npx supabase db query --linked -f supabase/seeds/demo_cleanup.sql
-- ============================================================

DO $$
DECLARE
  v_profiles uuid[] := ARRAY(SELECT id FROM public.profiles WHERE id::text LIKE 'de000000-%');
  v_sessions uuid[];
  v_bookings uuid[];
  v_real_pros uuid[];
BEGIN
  IF cardinality(v_profiles) = 0 THEN
    RAISE NOTICE 'Nenhum dado de exemplo encontrado.';
    RETURN;
  END IF;

  v_sessions := ARRAY(SELECT id FROM public.sessions WHERE professional_id = ANY (v_profiles));
  v_bookings := ARRAY(
    SELECT id FROM public.bookings
    WHERE session_id = ANY (v_sessions) OR student_id = ANY (v_profiles) OR professional_id = ANY (v_profiles)
  );
  -- organizadores reais que receberam avaliação de participante de exemplo (nota é recalculada no fim)
  v_real_pros := ARRAY(
    SELECT DISTINCT professional_id FROM public.reviews
    WHERE reviewer_id = ANY (v_profiles) AND NOT (professional_id = ANY (v_profiles))
  );

  DELETE FROM public.activity_results WHERE session_id = ANY (v_sessions) OR booking_id = ANY (v_bookings);
  DELETE FROM public.reviews
  WHERE booking_id = ANY (v_bookings) OR reviewer_id = ANY (v_profiles) OR professional_id = ANY (v_profiles);
  DELETE FROM public.booking_private_notes WHERE booking_id = ANY (v_bookings) OR professional_id = ANY (v_profiles);
  DELETE FROM public.bookings WHERE id = ANY (v_bookings);
  DELETE FROM public.session_reports WHERE session_id = ANY (v_sessions);
  DELETE FROM public.sessions WHERE id = ANY (v_sessions);
  DELETE FROM public.favorites WHERE student_id = ANY (v_profiles) OR professional_id = ANY (v_profiles);
  DELETE FROM public.venues WHERE created_by = ANY (v_profiles);
  DELETE FROM public.organization_members
  WHERE profile_id = ANY (v_profiles)
     OR organization_id IN (SELECT id FROM public.organizations WHERE created_by = ANY (v_profiles));
  DELETE FROM public.organizations WHERE created_by = ANY (v_profiles);
  DELETE FROM public.legal_acceptances WHERE profile_id = ANY (v_profiles);
  DELETE FROM public.profile_private WHERE profile_id = ANY (v_profiles);
  DELETE FROM public.profiles WHERE id = ANY (v_profiles);

  PERFORM public.calculate_professional_rating(p) FROM unnest(v_real_pros) p;

  RAISE NOTICE 'Dados de exemplo removidos: % perfis, % atividades, % reservas.',
    cardinality(v_profiles), cardinality(v_sessions), cardinality(v_bookings);
END;
$$;
