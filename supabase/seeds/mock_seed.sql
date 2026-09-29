-- ============================================
-- SCRIPT DE MOCK DATA (RIFF PRO)
-- Substitua os e-mails abaixo pelos que você criou no Supabase Auth!
-- ============================================

DO $$
DECLARE
  v_pro1_id UUID;
  v_pro2_id UUID;
  v_cat_futevolei UUID;
  v_cat_yoga UUID;
  v_session_esgotada UUID;
  v_session_escassez UUID;
  v_session_gratuita UUID;
BEGIN

  -- 1. Buscando as contas criadas (Atualize os emails aqui se necessário)
  SELECT user_id INTO v_pro1_id FROM public.profiles WHERE email = 'felipe@riff.pro';
  SELECT user_id INTO v_pro2_id FROM public.profiles WHERE email = 'amanda@riff.pro';

  -- Se não achar, aborta o script amigavelmente
  IF v_pro1_id IS NULL OR v_pro2_id IS NULL THEN
    RAISE NOTICE 'Usuários não encontrados. Certifique-se de usar os e-mails exatos (felipe@riff.pro e amanda@riff.pro).';
    RETURN;
  END IF;

  -- 2. Atualizando os Perfis para Profissionais e Definindo Dados
  UPDATE public.profiles 
  SET role = 'professional', full_name = 'Felipe Nery', public_slug = 'felipe', city = 'Rio de Janeiro', state = 'RJ', bio = 'Especialista em Futevôlei e Treinamento de Areia.', rating_avg = 4.9, total_reviews = 12
  WHERE user_id = v_pro1_id;

  UPDATE public.profiles 
  SET role = 'professional', full_name = 'Amanda Luz', public_slug = 'amanda', city = 'São Paulo', state = 'SP', bio = 'Instrutora de Yoga focada em Vinyasa e Meditação.', rating_avg = 5.0, total_reviews = 3
  WHERE user_id = v_pro2_id;

  -- 3. Categorias (Garante que existem e pega os IDs)
  INSERT INTO public.categories (name, slug, emoji, sort_order, is_active) 
  VALUES 
    ('Futevôlei', 'futevolei', '🏐', 1, true),
    ('Yoga', 'yoga', '🧘‍♀️', 2, true)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_cat_futevolei FROM public.categories WHERE slug = 'futevolei';
  SELECT id INTO v_cat_yoga FROM public.categories WHERE slug = 'yoga';

  -- 4. Criando as Sessões (Aulas)
  -- 4.1 Aula com Escassez Máxima (Restam 1 vaga - Trigger do Badge Âmbar)
  INSERT INTO public.sessions (professional_id, category_id, title, session_type, date, start_time, duration_minutes, location_name, max_participants, current_participants, price_per_slot, status)
  VALUES (v_pro1_id, v_cat_futevolei, 'Clínica de Saque (Iniciante)', 'group', CURRENT_DATE + INTERVAL '2 days', '08:00', 60, 'Posto 9 - Ipanema', 6, 5, 50.00, 'active')
  RETURNING id INTO v_session_escassez;

  -- 4.2 Aula Lotada (Trigger do Badge Vermelho)
  INSERT INTO public.sessions (professional_id, category_id, title, session_type, date, start_time, duration_minutes, location_name, max_participants, current_participants, price_per_slot, status)
  VALUES (v_pro1_id, v_cat_futevolei, 'Treino de Duplas Avançado', 'group', CURRENT_DATE + INTERVAL '3 days', '09:00', 90, 'Posto 9 - Ipanema', 4, 4, 80.00, 'full')
  RETURNING id INTO v_session_esgotada;

  -- 4.3 Aula Gratuita (Top de Funil)
  INSERT INTO public.sessions (professional_id, category_id, title, session_type, date, start_time, duration_minutes, location_name, max_participants, current_participants, price_per_slot, status)
  VALUES (v_pro2_id, v_cat_yoga, 'Yoga ao Pôr do Sol (Experimental)', 'group', CURRENT_DATE + INTERVAL '1 day', '17:30', 60, 'Parque Ibirapuera', 20, 12, 0.00, 'active')
  RETURNING id INTO v_session_gratuita;

  RAISE NOTICE 'Base Populada com Sucesso!';
END $$;
