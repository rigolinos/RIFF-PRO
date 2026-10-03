-- ============================================================
-- DADOS DE EXEMPLO (demonstração) — Riff Pro
-- ============================================================
-- Organizadores, participantes, atividades passadas (encerradas, com presença,
-- pagamentos, resultados e avaliações) e atividades futuras. Tudo fictício.
--
-- * Todo registro criado aqui tem id começando com de000000- (perfis, atividades,
--   reservas, avaliações, resultados). Organizações e locais são criados pelos
--   triggers do Lote 3 e ficam ligados aos perfis de exemplo.
-- * Perfis de exemplo NÃO têm login (user_id NULL).
-- * Remover tudo: supabase/seeds/demo_cleanup.sql. OBRIGATÓRIO antes de abrir
--   para usuários reais (avaliações fictícias não podem parecer reais).
-- * Idempotente: se já houver dados de exemplo, não faz nada.
-- * Datas relativas a current_date: rodar de novo depois de limpar atualiza tudo.
--
--   npx supabase db query --linked -f supabase/seeds/demo_seed.sql
-- ============================================================

DO $$
DECLARE
  -- Organizadores: slug, nome, cidade, UF, bio, categoria, tipo profissional, especialidades, anos
  orgs text[][] := ARRAY[
    ['bruno.futevolei', 'Bruno Takeda', 'Porto Alegre', 'RS', 'Futevôlei na orla do Guaíba há 8 anos. Rachas e treinos para todos os níveis.', 'futevolei', 'coach', 'Futevôlei,Vôlei de praia', '8'],
    ['carla.funcional', 'Carla Menezes', 'Porto Alegre', 'RS', 'Treino funcional ao ar livre no Parcão e na Redenção. Turmas pequenas.', 'funcional', 'personal_trainer', 'Funcional,HIIT', '6'],
    ['diego.corre', 'Diego Fontoura', 'Porto Alegre', 'RS', 'Corridas em grupo pela orla. Do primeiro 5 km à meia maratona.', 'corrida', 'coach', 'Corrida,Trilha', '5'],
    ['julia.beachtennis', 'Júlia Prates', 'Rio de Janeiro', 'RJ', 'Aulas e torneios de beach tennis em Copacabana e na Barra.', 'beach-tennis', 'instructor', 'Beach Tennis', '7'],
    ['marina.yoga', 'Marina Kato', 'São Paulo', 'SP', 'Yoga Vinyasa e Hatha no Ibirapuera e no estúdio.', 'yoga', 'instructor', 'Yoga,Meditação', '10'],
    ['rafael.airsoft', 'Rafael Brum', 'Viamão', 'RS', 'Jogos de airsoft em campo tático, com briefing de segurança e equipamento para aluguel.', 'airsoft', 'other', 'Airsoft', '4']
  ];
  -- Locais por organizador (índice 1..6): nome | endereço | tipo (location_type)
  venues text[][] := ARRAY[
    ['Orla do Guaíba - Usina do Gasômetro', 'Av. Presidente João Goulart, Porto Alegre', 'beach'],
    ['Parque Marinha do Brasil - quadras de areia', 'Av. Borges de Medeiros, Porto Alegre', 'park'],
    ['Parcão (Parque Moinhos de Vento)', 'Av. Goethe, Porto Alegre', 'park'],
    ['Redenção - Espelho d''água', 'Parque Farroupilha, Porto Alegre', 'park'],
    ['Orla do Guaíba - Anfiteatro Pôr do Sol', 'Av. Edvaldo Pereira Paiva, Porto Alegre', 'outdoor'],
    ['Parque Germânia', 'Av. Túlio de Rose, Porto Alegre', 'park'],
    ['Praia de Copacabana - Posto 5', 'Av. Atlântica, Rio de Janeiro', 'beach'],
    ['Barra da Tijuca - Posto 4', 'Av. Lúcio Costa, Rio de Janeiro', 'beach'],
    ['Parque Ibirapuera - Praça da Paz', 'Av. Pedro Álvares Cabral, São Paulo', 'park'],
    ['Studio Vila Madalena', 'Rua Harmonia, São Paulo', 'studio'],
    ['Campo Tático Viamão', 'Estrada do Espigão, Viamão', 'outdoor'],
    ['Campo Tático Viamão', 'Estrada do Espigão, Viamão', 'outdoor']
  ];
  -- Atividades por organizador: kind | título | preço | vagas | hora | duração
  templates text[][] := ARRAY[
    ['match', 'Racha de Futevôlei', '25', '8', '07:30', '90'],
    ['class', 'Treino de Fundamentos de Futevôlei', '40', '6', '18:00', '60'],
    ['class', 'Funcional ao Ar Livre', '35', '10', '07:00', '60'],
    ['class', 'HIIT no Parque', '30', '12', '18:30', '45'],
    ['event', 'Corrida em Grupo 5 km', '0', '30', '07:00', '60'],
    ['event', 'Longão de Domingo 12 km', '20', '25', '06:30', '90'],
    ['class', 'Aula de Beach Tennis - Iniciantes', '60', '4', '08:00', '60'],
    ['tournament', 'Torneio Relâmpago de Beach Tennis', '80', '16', '14:00', '240'],
    ['class', 'Vinyasa Flow ao Ar Livre', '45', '15', '08:00', '75'],
    ['class', 'Hatha Yoga - Alinhamento', '50', '10', '19:00', '60'],
    ['match', 'Jogo de Airsoft - Modo Captura', '70', '24', '09:00', '240'],
    ['match', 'Jogo de Airsoft - Eliminação', '70', '20', '14:00', '180']
  ];
  -- Participantes: nome | cidade | UF
  people text[][] := ARRAY[
    ['Ana Lúcia Becker', 'Porto Alegre', 'RS'], ['Pedro Henrique Lopes', 'Porto Alegre', 'RS'],
    ['Camila Rech', 'Porto Alegre', 'RS'], ['Lucas Zanella', 'Porto Alegre', 'RS'],
    ['Fernanda Moraes', 'Porto Alegre', 'RS'], ['Thiago Kunz', 'Porto Alegre', 'RS'],
    ['Bianca Rossetto', 'Porto Alegre', 'RS'], ['Gustavo Pires', 'Porto Alegre', 'RS'],
    ['Letícia Schmitt', 'Porto Alegre', 'RS'], ['Rodrigo Vieira', 'Porto Alegre', 'RS'],
    ['Patrícia Dornelles', 'Porto Alegre', 'RS'], ['Matheus Weber', 'Porto Alegre', 'RS'],
    ['Isabela Cardoso', 'Rio de Janeiro', 'RJ'], ['Felipe Barreto', 'Rio de Janeiro', 'RJ'],
    ['Renata Siqueira', 'Rio de Janeiro', 'RJ'], ['André Coutinho', 'Rio de Janeiro', 'RJ'],
    ['Beatriz Yamada', 'São Paulo', 'SP'], ['Caio Almeida', 'São Paulo', 'SP'],
    ['Juliana Ferraz', 'São Paulo', 'SP'], ['Vinícius Toledo', 'São Paulo', 'SP']
  ];
  comments text[] := ARRAY[
    'Muito bem organizado, começou no horário certinho.',
    'Ótima energia do grupo! Já reservei a próxima.',
    'Explica muito bem, mesmo para quem está começando.',
    'Local ótimo e turma animada.',
    'Valeu cada centavo. Recomendo!',
    'Bom treino, só achei que poderia ter mais aquecimento.',
    'Saí renovado. Vou virar frequentador.',
    'Comunicação clara pelo WhatsApp, tudo combinado antes.',
    'Primeira vez e me senti super acolhido.',
    'Puxado na medida certa. Amanhã vou sentir!',
    'Gostei da atenção individual mesmo com a turma cheia.',
    'Pontual e bem preparado. Material todo à disposição.',
    'Lugar lindo, ainda mais no fim de tarde.',
    'Ambiente leve, ninguém fica de fora.',
    'Melhor programa de domingo de manhã.',
    'Turma um pouco grande hoje, mas deu tudo certo.',
    'Corrigiu minha técnica e já senti diferença.',
    'Fui com uma amiga e as duas amaram.',
    'Organização impecável do começo ao fim.',
    'Preço justo pelo que entrega.',
    'Achei o nível certo para quem está voltando a treinar.',
    'Divertido demais, perdi a noção do tempo.',
    'Recomendo para quem quer começar sem pressão.',
    'Só faltou um lugar para deixar as mochilas.'
  ];

  v_org_ids uuid[] := ARRAY[]::uuid[];
  v_people_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid; v_session uuid; v_booking uuid;
  v_org int; v_tpl int; v_day int; v_n int; v_status text; v_att text;
  v_price numeric; v_cap int; v_pool int[]; v_pick int; v_seq int := 0; v_bseq int := 0; v_rseq int := 0; v_xseq int := 0;
  v_city text; v_cat uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id::text LIKE 'de000000-%') THEN
    RAISE NOTICE 'Dados de exemplo já existem; nada a fazer. Rode demo_cleanup.sql para recriar.';
    RETURN;
  END IF;

  PERFORM setseed(0.42);

  -- Organizadores (o trigger cria a organização solo de cada um)
  FOR i IN 1..array_length(orgs, 1) LOOP
    v_id := ('de000000-0000-4000-8000-1' || lpad(i::text, 11, '0'))::uuid;
    INSERT INTO public.profiles (id, user_id, full_name, role, city, state, bio, public_slug, professional_type, specialties, experience_years)
    VALUES (v_id, NULL, orgs[i][2], 'professional', orgs[i][3], orgs[i][4], orgs[i][5], orgs[i][1], orgs[i][7],
            string_to_array(orgs[i][8], ','), orgs[i][9]::int);
    v_org_ids := v_org_ids || v_id;
  END LOOP;

  -- Participantes
  FOR i IN 1..array_length(people, 1) LOOP
    v_id := ('de000000-0000-4000-8000-2' || lpad(i::text, 11, '0'))::uuid;
    INSERT INTO public.profiles (id, user_id, full_name, role, city, state)
    VALUES (v_id, NULL, people[i][1], 'student', people[i][2], people[i][3]);
    v_people_ids := v_people_ids || v_id;
  END LOOP;

  -- Atividades: 5 passadas e 2 futuras por organizador, alternando os 2 modelos e os 2 locais
  FOR v_org IN 1..array_length(orgs, 1) LOOP
    SELECT id INTO v_cat FROM public.categories WHERE slug = orgs[v_org][6];
    v_city := orgs[v_org][3];
    -- participantes da mesma região (Viamão usa o pessoal de Porto Alegre)
    v_pool := ARRAY(
      SELECT g FROM generate_series(1, array_length(people, 1)) g
      WHERE people[g][2] = CASE WHEN v_city = 'Viamão' THEN 'Porto Alegre' ELSE v_city END
    );

    FOR k IN 1..7 LOOP
      v_seq := v_seq + 1;
      v_tpl := (v_org - 1) * 2 + 1 + (k % 2);
      v_day := CASE WHEN k <= 5 THEN -(k * 7 + (v_org % 3) + 1) ELSE (k - 5) * 5 + (v_org % 4) + 1 END;
      v_price := templates[v_tpl][3]::numeric;
      v_cap := templates[v_tpl][4]::int;
      v_session := ('de000000-0000-4000-8000-3' || lpad(v_seq::text, 11, '0'))::uuid;

      INSERT INTO public.sessions (id, professional_id, category_id, kind, title, description, date, start_time,
                                   duration_minutes, location_name, location_address, location_type, max_participants,
                                   price_per_slot, status, skill_level, city)
      VALUES (v_session, v_org_ids[v_org], v_cat, templates[v_tpl][1], templates[v_tpl][2],
              'Atividade de exemplo do Riff Pro.', current_date + v_day, templates[v_tpl][5]::time,
              templates[v_tpl][6]::int, venues[(v_org - 1) * 2 + 1 + ((k + 1) % 2)][1],
              venues[(v_org - 1) * 2 + 1 + ((k + 1) % 2)][2], venues[(v_org - 1) * 2 + 1 + ((k + 1) % 2)][3],
              v_cap, v_price, CASE WHEN k <= 5 THEN 'completed' ELSE 'active' END, 'all', v_city);

      -- Reservas: passadas quase lotadas; futuras com algumas vagas (a 1ª futura do organizador 1 fica quase cheia)
      v_n := LEAST(array_length(v_pool, 1), v_cap,
                   CASE WHEN k <= 5 THEN 3 + floor(random() * 5)::int
                        WHEN v_org = 1 AND k = 6 THEN v_cap - 1
                        ELSE 1 + floor(random() * 3)::int END);

      FOR v_pick IN SELECT p FROM unnest(v_pool) p ORDER BY random() LIMIT v_n LOOP
        v_bseq := v_bseq + 1;
        v_booking := ('de000000-0000-4000-8000-4' || lpad(v_bseq::text, 11, '0'))::uuid;
        IF k <= 5 THEN
          v_att := CASE WHEN random() < 0.08 THEN 'absent' WHEN random() < 0.12 THEN 'late' ELSE 'present' END;
          v_status := CASE WHEN v_att = 'absent' THEN 'no_show' ELSE 'completed' END;
        ELSE
          v_att := NULL;
          v_status := CASE WHEN random() < 0.6 THEN 'confirmed' ELSE 'pending' END;
        END IF;

        INSERT INTO public.bookings (id, session_id, student_id, professional_id, status, amount_total, professional_payout,
                                     payment_method, payment_status, payment_confirmed_at, checked_in, checked_in_at,
                                     attendance_status, attendance_recorded_at, attendance_recorded_by, created_at)
        VALUES (v_booking, v_session, v_people_ids[v_pick], v_org_ids[v_org], v_status, v_price, v_price,
                CASE WHEN v_price = 0 THEN 'free' ELSE 'pix' END,
                CASE WHEN v_price = 0 THEN 'free'
                     WHEN k <= 5 OR v_status = 'confirmed' THEN 'paid' ELSE 'pending' END,
                CASE WHEN v_price > 0 AND (k <= 5 OR v_status = 'confirmed') THEN (current_date + v_day - 2)::timestamptz END,
                v_att IN ('present', 'late'),
                CASE WHEN v_att IN ('present', 'late') THEN ((current_date + v_day) + templates[v_tpl][5]::time)::timestamptz END,
                v_att,
                CASE WHEN v_att IS NOT NULL THEN (current_date + v_day)::timestamptz + interval '20 hours' END,
                CASE WHEN v_att IS NOT NULL THEN v_org_ids[v_org] END,
                (current_date + v_day - 3 - floor(random() * 5)::int)::timestamptz + interval '12 hours');

        -- Resultados dos jogos
        IF k <= 5 AND templates[v_tpl][1] IN ('match', 'tournament') AND v_att IN ('present', 'late') THEN
          v_xseq := v_xseq + 1;
          INSERT INTO public.activity_results (id, session_id, booking_id, position, score, recorded_by, recorded_at)
          VALUES (('de000000-0000-4000-8000-5' || lpad(v_xseq::text, 11, '0'))::uuid, v_session, v_booking,
                  NULL, (5 + floor(random() * 20))::numeric, v_org_ids[v_org],
                  (current_date + v_day)::timestamptz + interval '20 hours');
        END IF;

        -- Avaliações (cerca de 60% de quem foi)
        IF k <= 5 AND v_att IN ('present', 'late') AND random() < 0.6 THEN
          v_rseq := v_rseq + 1;
          INSERT INTO public.reviews (id, booking_id, session_id, reviewer_id, professional_id, rating, comment, created_at)
          VALUES (('de000000-0000-4000-8000-6' || lpad(v_rseq::text, 11, '0'))::uuid, v_booking, v_session,
                  v_people_ids[v_pick], v_org_ids[v_org],
                  CASE WHEN random() < 0.7 THEN 5 WHEN random() < 0.8 THEN 4 ELSE 3 END,
                  CASE WHEN random() < 0.8 THEN comments[1 + ((v_rseq * 7) % array_length(comments, 1))] END,
                  (current_date + v_day + 1)::timestamptz + interval '10 hours');
        END IF;
      END LOOP;

      -- Vagas ocupadas e relatório de encerramento
      UPDATE public.sessions s
      SET current_participants = (SELECT count(*) FROM public.bookings b
                                  WHERE b.session_id = s.id AND b.status NOT LIKE 'cancelled%')
      WHERE s.id = v_session;
      IF k <= 5 THEN
        INSERT INTO public.session_reports (session_id, happened, closed_at)
        VALUES (v_session, true, (current_date + v_day)::timestamptz + interval '20 hours');
      END IF;
    END LOOP;
  END LOOP;

  -- Posições nos jogos, pela pontuação
  UPDATE public.activity_results r
  SET position = ranked.pos
  FROM (SELECT id, rank() OVER (PARTITION BY session_id ORDER BY score DESC) AS pos
        FROM public.activity_results WHERE id::text LIKE 'de000000-%') ranked
  WHERE r.id = ranked.id;

  -- Números do perfil (o close_session faria isso; aqui os dados entram prontos)
  UPDATE public.profiles p
  SET total_sessions_given = (SELECT count(*) FROM public.sessions s WHERE s.professional_id = p.id AND s.status = 'completed'),
      total_students_served = (SELECT count(DISTINCT b.student_id) FROM public.bookings b
                               WHERE b.professional_id = p.id AND b.status = 'completed')
  WHERE p.id = ANY (v_org_ids);

  RAISE NOTICE 'Dados de exemplo criados: % organizadores, % participantes, % atividades, % reservas, % avaliações, % resultados.',
    array_length(v_org_ids, 1), array_length(v_people_ids, 1), v_seq, v_bseq, v_rseq, v_xseq;
END;
$$;
