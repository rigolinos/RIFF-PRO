-- ============================================================
-- Riff Clubes: qualquer membro cria atividade na própria comunidade
-- ============================================================
-- Decisão do dono do produto (05/10/2026): morador ou sócio pode criar jogos e
-- eventos para a comunidade, não só gestor e instrutor. O gestor continua
-- podendo cancelar qualquer atividade (close_community_session) e remover quem
-- abusar (manage_member). Quem não é membro ativo segue bloqueado.
--
-- O Clubes v1 não tem pagamento no app: atividade de comunidade sempre sai com
-- preço zero, mesmo que o cliente mande outro valor.
--
-- Corpo igual ao de 20261027000009, com a checagem de papel trocada por
-- "membro ativo" e o preço zerado.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.session_product_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_kind text;
BEGIN
  SELECT kind INTO v_kind FROM public.organizations WHERE id = NEW.organization_id;

  IF v_kind IN ('condo', 'club') THEN
    NEW.product := 'clubes';
    NEW.price_per_slot := 0;
    -- auth.uid() nulo = operação do servidor (seeds, scripts da equipe)
    IF auth.uid() IS NOT NULL AND NOT public.is_org_member(NEW.organization_id) THEN
      RAISE EXCEPTION 'forbidden_community' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.product <> 'pro' THEN
    RAISE EXCEPTION 'community_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
