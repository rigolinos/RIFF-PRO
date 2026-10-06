-- ============================================================
-- Riff Pro: a "porta" de organizador (mesma conta)
-- ============================================================
-- Decisões do dono do produto (06/10/2026):
-- * Uma conta por pessoa. Toda conta participa; organizar é um poder a mais
--   que a conta ganha completando o cadastro de organizador e aceitando o
--   Termo do Organizador. O organizador continua podendo reservar.
-- * Na porta: nome e sobrenome, CPF ou CNPJ (um por conta), data de
--   nascimento (18 anos ou mais), celular/WhatsApp, Pix, área, cidade e
--   apresentação. CPF/CNPJ e nascimento ficam na parte privada (só o dono lê).
-- * Organizadores que já existem completam os dados ao publicar a próxima
--   atividade: o banco só aceita atividade do Pro de quem passou pela porta.
--   Isso também fecha a brecha de uma conta de participante criar atividade
--   do Pro direto pela API.
-- * Aprovação manual pela equipe Riff fica para o futuro.
-- O papel (profiles.role) segue protegido pelo guard_profile_update: só muda
-- por become_organizer.
-- ============================================================

BEGIN;

-- 1. Dados privados de quem organiza ------------------------------------------
ALTER TABLE public.profile_private
  ADD COLUMN IF NOT EXISTS tax_id      text,
  ADD COLUMN IF NOT EXISTS tax_id_type text CHECK (tax_id_type IN ('cpf', 'cnpj')),
  ADD COLUMN IF NOT EXISTS birth_date  date;
CREATE UNIQUE INDEX IF NOT EXISTS profile_private_tax_id_unique ON public.profile_private (tax_id) WHERE tax_id IS NOT NULL;

-- 2. CPF ou CNPJ válido pelos dígitos verificadores: devolve 'cpf', 'cnpj' ou NULL
CREATE OR REPLACE FUNCTION public.tax_id_kind(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v   text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
  d   integer[] := '{}';
  w   integer[];
  s   integer;
  r   integer;
  k   integer;
BEGIN
  FOR k IN 1..length(v) LOOP
    d := d || substr(v, k, 1)::integer;
  END LOOP;

  IF length(v) = 11 THEN
    IF v = repeat(substr(v, 1, 1), 11) THEN RETURN NULL; END IF;
    s := 0; FOR k IN 1..9 LOOP s := s + d[k] * (11 - k); END LOOP;
    r := (s * 10) % 11; IF r = 10 THEN r := 0; END IF;
    IF r <> d[10] THEN RETURN NULL; END IF;
    s := 0; FOR k IN 1..10 LOOP s := s + d[k] * (12 - k); END LOOP;
    r := (s * 10) % 11; IF r = 10 THEN r := 0; END IF;
    IF r <> d[11] THEN RETURN NULL; END IF;
    RETURN 'cpf';
  ELSIF length(v) = 14 THEN
    IF v = repeat(substr(v, 1, 1), 14) THEN RETURN NULL; END IF;
    w := ARRAY[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    s := 0; FOR k IN 1..12 LOOP s := s + d[k] * w[k]; END LOOP;
    r := s % 11; r := CASE WHEN r < 2 THEN 0 ELSE 11 - r END;
    IF r <> d[13] THEN RETURN NULL; END IF;
    w := ARRAY[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    s := 0; FOR k IN 1..13 LOOP s := s + d[k] * w[k]; END LOOP;
    r := s % 11; r := CASE WHEN r < 2 THEN 0 ELSE 11 - r END;
    IF r <> d[14] THEN RETURN NULL; END IF;
    RETURN 'cnpj';
  END IF;
  RETURN NULL;
END;
$$;

-- 3. O que falta para organizar no Pro (lista vazia = pronto) ------------------
CREATE OR REPLACE FUNCTION public.organizer_missing(p_profile uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN p.role IS DISTINCT FROM 'professional' THEN 'role' END,
    CASE WHEN p.professional_type IS NULL THEN 'professional_type' END,
    CASE WHEN array_length(regexp_split_to_array(trim(coalesce(p.full_name, '')), '\s+'), 1) < 2 THEN 'full_name' END,
    CASE WHEN length(trim(coalesce(p.city, ''))) < 2 THEN 'city' END,
    CASE WHEN pp.tax_id IS NULL THEN 'tax_id' END,
    CASE WHEN pp.birth_date IS NULL THEN 'birth_date' END,
    CASE WHEN pp.whatsapp_number IS NULL THEN 'whatsapp' END,
    CASE WHEN pp.pix_key IS NULL THEN 'pix' END,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.legal_acceptances la WHERE la.profile_id = p.id AND la.document = 'organizer_terms')
         THEN 'organizer_terms' END
  ], NULL)
  FROM public.profiles p
  LEFT JOIN public.profile_private pp ON pp.profile_id = p.id
  WHERE p.id = p_profile
$$;
REVOKE ALL ON FUNCTION public.organizer_missing(uuid) FROM PUBLIC, anon, authenticated;

-- Para o app: o que falta para a própria pessoa
CREATE OR REPLACE FUNCTION public.my_organizer_missing()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.organizer_missing(public._profile_id())
$$;
REVOKE ALL ON FUNCTION public.my_organizer_missing() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_organizer_missing() TO authenticated;

-- 4. A porta --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.become_organizer(
  p_full_name         text,
  p_tax_id            text,
  p_birth_date        date,
  p_whatsapp          text,
  p_professional_type text,
  p_credential_type   text,
  p_credential_number text,
  p_city              text,
  p_bio               text,
  p_pix_key_type      text,
  p_pix_key           text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me       uuid := public._profile_id();
  v_role     text;
  v_tax      text := regexp_replace(coalesce(p_tax_id, ''), '[^0-9]', '', 'g');
  v_tax_kind text := public.tax_id_kind(p_tax_id);
  v_phone    text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_me AND deleted_at IS NULL;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.legal_acceptances WHERE profile_id = v_me AND document = 'organizer_terms') THEN
    RAISE EXCEPTION 'organizer_terms_required' USING ERRCODE = '42501';
  END IF;

  IF array_length(regexp_split_to_array(trim(coalesce(p_full_name, '')), '\s+'), 1) < 2 THEN
    RAISE EXCEPTION 'full_name_required';
  END IF;
  IF v_tax_kind IS NULL THEN
    RAISE EXCEPTION 'tax_id_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profile_private WHERE tax_id = v_tax AND profile_id <> v_me) THEN
    RAISE EXCEPTION 'tax_id_in_use';
  END IF;
  IF p_birth_date IS NULL OR p_birth_date < DATE '1900-01-01' THEN
    RAISE EXCEPTION 'birth_date_required';
  END IF;
  IF p_birth_date > (public.now_sp()::date - interval '18 years')::date THEN
    RAISE EXCEPTION 'underage';
  END IF;
  IF length(v_phone) NOT BETWEEN 10 AND 13 THEN
    RAISE EXCEPTION 'whatsapp_required';
  END IF;
  IF length(trim(coalesce(p_city, ''))) < 2 THEN
    RAISE EXCEPTION 'city_required';
  END IF;
  IF length(trim(coalesce(p_bio, ''))) < 10 THEN
    RAISE EXCEPTION 'bio_too_short';
  END IF;
  IF coalesce(p_pix_key_type, '') NOT IN ('cpf', 'phone', 'email', 'random') OR length(trim(coalesce(p_pix_key, ''))) < 5 THEN
    RAISE EXCEPTION 'pix_required';
  END IF;

  -- Dados públicos da vitrine (área e registro validados pelas regras da tabela)
  UPDATE public.profiles
  SET role              = 'professional',
      full_name         = regexp_replace(trim(p_full_name), '\s+', ' ', 'g'),
      professional_type = p_professional_type,
      credential_type   = nullif(trim(coalesce(p_credential_type, '')), ''),
      credential_number = CASE WHEN nullif(trim(coalesce(p_credential_type, '')), '') IS NULL THEN NULL
                               ELSE nullif(trim(coalesce(p_credential_number, '')), '') END,
      city              = trim(p_city),
      bio               = trim(p_bio)
  WHERE id = v_me;

  -- Identificação e recebimento ficam na parte privada (só o dono lê)
  INSERT INTO public.profile_private (profile_id, tax_id, tax_id_type, birth_date, whatsapp_number, pix_key_type, pix_key)
  VALUES (v_me, v_tax, v_tax_kind, p_birth_date, v_phone, p_pix_key_type, trim(p_pix_key))
  ON CONFLICT (profile_id) DO UPDATE
  SET tax_id          = EXCLUDED.tax_id,
      tax_id_type     = EXCLUDED.tax_id_type,
      birth_date      = EXCLUDED.birth_date,
      whatsapp_number = EXCLUDED.whatsapp_number,
      pix_key_type    = EXCLUDED.pix_key_type,
      pix_key         = EXCLUDED.pix_key;

  RETURN jsonb_build_object('success', true, 'was', v_role);
END;
$$;
REVOKE ALL ON FUNCTION public.become_organizer(text, text, date, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_organizer(text, text, date, text, text, text, text, text, text, text, text) TO authenticated;

-- 5. Atividade do Pro só de quem passou pela porta ------------------------------
-- Roda depois de session_product_rules (ordem alfabética dos triggers BEFORE),
-- quando o produto já está definido. Como o guard_profile_update, deixa passar
-- o servidor (seeds, scripts da equipe): só barra chamadas do app.
CREATE OR REPLACE FUNCTION public.session_require_organizer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NEW.product = 'pro'
     AND (NEW.professional_id IS DISTINCT FROM public._profile_id()
          OR coalesce(array_length(public.my_organizer_missing(), 1), 0) > 0) THEN
    RAISE EXCEPTION 'organizer_profile_incomplete' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.session_require_organizer() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS session_require_organizer ON public.sessions;
CREATE TRIGGER session_require_organizer
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.session_require_organizer();

COMMIT;
