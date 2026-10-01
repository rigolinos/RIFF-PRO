-- ============================================================
-- Aceites dos documentos legais (Termos de Uso, Privacidade, Termo do Organizador)
-- ============================================================
-- Cada aceite é um registro imutável: quem, qual documento, qual versão, quando.
-- Serve de prova de que a pessoa leu e concordou com a versão vigente; uma versão
-- nova exige novo aceite (o app compara com as versões em src/legal/versions.ts).
-- Os registros ficam mesmo após a exclusão da conta (perfil anonimizado):
-- guarda para exercício regular de direitos (LGPD art. 7º, VI e art. 16, I).
-- ============================================================

BEGIN;

CREATE TABLE public.legal_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id),
  document    text NOT NULL CHECK (document IN ('terms', 'privacy', 'organizer_terms')),
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent  text,
  UNIQUE (profile_id, document, version)
);
CREATE INDEX legal_acceptances_profile ON public.legal_acceptances (profile_id);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- A pessoa só registra e só lê os próprios aceites; ninguém altera nem apaga.
CREATE POLICY "legal_acceptances_own_insert" ON public.legal_acceptances FOR INSERT
  WITH CHECK (profile_id = public._profile_id());
CREATE POLICY "legal_acceptances_own_read" ON public.legal_acceptances FOR SELECT
  USING (profile_id = public._profile_id());

-- accepted_at vem sempre do servidor, nunca do cliente.
CREATE OR REPLACE FUNCTION public.legal_acceptance_server_time()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
  NEW.accepted_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.legal_acceptance_server_time() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER legal_acceptance_server_time BEFORE INSERT ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.legal_acceptance_server_time();

COMMIT;
