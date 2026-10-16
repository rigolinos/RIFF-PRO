-- ============================================================
-- Registro de erros das telas (Riff Pro e Riff Clubes)
-- ============================================================
-- Quando uma tela quebra no celular de alguém, o erro ficava só no aparelho.
-- Agora o app manda o erro para cá, sem serviço externo:
-- * só de quem está logado (nada novo para o visitante sem login);
-- * guarda a mensagem, a pilha, a rota (sem os parâmetros do endereço) e o navegador;
-- * no máximo 20 por hora por pessoa; o que tem mais de 30 dias é apagado;
-- * ninguém lê pelo app: a equipe Riff consulta pelo terminal com admin_client_errors().
-- ============================================================

BEGIN;

CREATE TABLE public.client_errors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  app        text NOT NULL CHECK (app IN ('pro', 'clubes')),
  message    text NOT NULL,
  stack      text,
  route      text,
  user_agent text
);
CREATE INDEX client_errors_created ON public.client_errors (created_at);
CREATE INDEX client_errors_profile ON public.client_errors (profile_id);
-- sem política: ninguém lê nem grava direto; só pela função e pela equipe Riff
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_client_error(p_app text, p_message text, p_stack text DEFAULT NULL,
                                                   p_route text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me uuid := public._profile_id();
BEGIN
  -- nunca devolve erro para o app: registrar um erro não pode causar outro
  IF v_me IS NULL OR p_app NOT IN ('pro', 'clubes') OR coalesce(btrim(p_message), '') = '' THEN
    RETURN;
  END IF;
  IF (SELECT count(*) FROM public.client_errors WHERE profile_id = v_me AND created_at > now() - interval '1 hour') >= 20 THEN
    RETURN;
  END IF;

  DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days';

  INSERT INTO public.client_errors (profile_id, app, message, stack, route, user_agent)
  VALUES (v_me, p_app, left(btrim(p_message), 500), nullif(left(p_stack, 4000), ''),
          -- só o caminho: o que vem depois de ? ou # pode ter dado pessoal
          nullif(left(split_part(split_part(coalesce(p_route, ''), '?', 1), '#', 1), 200), ''),
          nullif(left(p_user_agent, 300), ''));
END;
$$;
REVOKE ALL ON FUNCTION public.log_client_error(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text) TO authenticated;

-- Retrato para a equipe Riff: erros dos últimos dias, agrupados pela mensagem
CREATE OR REPLACE FUNCTION public.admin_client_errors(p_days integer DEFAULT 7)
RETURNS TABLE (app text, message text, times integer, people integer, last_seen timestamptz, routes text[], sample_stack text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.app, e.message, count(*)::integer, count(DISTINCT e.profile_id)::integer, max(e.created_at),
         (array_agg(DISTINCT e.route) FILTER (WHERE e.route IS NOT NULL))[1:5],
         (array_agg(e.stack ORDER BY e.created_at DESC))[1]
  FROM public.client_errors e
  WHERE e.created_at > now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30))
  GROUP BY e.app, e.message
  ORDER BY count(*) DESC, max(e.created_at) DESC
$$;
REVOKE ALL ON FUNCTION public.admin_client_errors(integer) FROM PUBLIC, anon, authenticated;

COMMIT;
