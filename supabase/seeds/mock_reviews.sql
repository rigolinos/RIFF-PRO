DO $ $
DECLARE
  v_pro1_id UUID;
  v_student_id UUID;
  v_session_id UUID;
  v_booking_id UUID;
BEGIN
  SELECT id INTO v_pro1_id FROM public.profiles WHERE email = 'felipe@riff.pro';
  SELECT id INTO v_student_id FROM public.profiles WHERE email != 'felipe@riff.pro' AND email != 'amanda@riff.pro' LIMIT 1;
  SELECT id INTO v_session_id FROM public.sessions WHERE professional_id = v_pro1_id LIMIT 1;

  IF v_pro1_id IS NULL OR v_student_id IS NULL OR v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert dummy booking to satisfy FK constraints if possible, but actually reviews just needs UUIDs.
  -- Wait, reviews table requires booking_id. Let's create a booking first.
  INSERT INTO public.bookings (session_id, student_id, professional_id, status, amount_total)
  VALUES (v_session_id, v_student_id, v_pro1_id, 'completed', 50.00)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.reviews (booking_id, session_id, reviewer_id, professional_id, rating, comment, tags)
  VALUES (v_booking_id, v_session_id, v_student_id, v_pro1_id, 5, 'Aula sensacional! O professor tem uma didática incrível e a energia da turma estava lá em cima.', ARRAY['Didática', 'Energia', 'Técnica']);

  INSERT INTO public.bookings (session_id, student_id, professional_id, status, amount_total)
  VALUES (v_session_id, v_student_id, v_pro1_id, 'completed', 50.00)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.reviews (booking_id, session_id, reviewer_id, professional_id, rating, comment, tags)
  VALUES (v_booking_id, v_session_id, v_student_id, v_pro1_id, 4.5, 'Excelente treino, me ajudou muito a corrigir a postura.', ARRAY['Atenção', 'Resultados']);
END $ $;
