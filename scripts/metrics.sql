-- Critérios de "pronto" por produto (CLAUDE.md, seção 8). Só leitura.
-- Ignora os dados de exemplo (ids de000000-).
--
--   npm run metrics
--
-- Metas propostas para o Riff Pro: 30 organizadores ativos, 300 reservas pagas no mês,
-- 40% de recompra, mais de 60% das reservas vindas pelo link do organizador.
WITH real_sessions AS (
  SELECT * FROM public.sessions WHERE id::text NOT LIKE 'de000000-%'
),
real_bookings AS (
  SELECT * FROM public.bookings
  WHERE id::text NOT LIKE 'de000000-%' AND student_id::text NOT LIKE 'de000000-%' AND status NOT LIKE 'cancelled%'
),
products AS (
  SELECT unnest(ARRAY['pro', 'clubes', 'sports']) AS product
),
active_organizers AS (
  SELECT product, count(DISTINCT professional_id) AS n
  FROM real_sessions
  WHERE date BETWEEN current_date - 30 AND current_date + 30
  GROUP BY product
),
paid_month AS (
  SELECT product, count(*) AS n
  FROM real_bookings
  WHERE payment_status = 'paid'
    AND coalesce(payment_confirmed_at, created_at) >= date_trunc('month', now())
  GROUP BY product
),
per_participant AS (
  SELECT product, student_id, count(*) AS n
  FROM real_bookings
  WHERE created_at >= now() - interval '90 days'
    AND (status IN ('confirmed', 'completed') OR payment_status = 'paid')
  GROUP BY product, student_id
),
repeat_rate AS (
  SELECT product, count(*) FILTER (WHERE n >= 2) AS returning, count(*) AS total
  FROM per_participant GROUP BY product
),
via_link AS (
  SELECT product,
         count(*) FILTER (WHERE source IN ('organizer_link', 'activity_link')) AS via,
         count(*) FILTER (WHERE source IS NOT NULL) AS tracked
  FROM real_bookings
  WHERE created_at >= now() - interval '30 days'
  GROUP BY product
)
SELECT p.product,
       coalesce(a.n, 0) AS organizadores_ativos_30d,
       coalesce(m.n, 0) AS reservas_pagas_no_mes,
       CASE WHEN r.total > 0 THEN round(100.0 * r.returning / r.total) || '%' ELSE '–' END AS recompra_90d,
       CASE WHEN v.tracked > 0 THEN round(100.0 * v.via / v.tracked) || '%' ELSE '–' END AS pelo_link_30d,
       coalesce(v.tracked, 0) AS reservas_com_origem_30d
FROM products p
LEFT JOIN active_organizers a USING (product)
LEFT JOIN paid_month m USING (product)
LEFT JOIN repeat_rate r USING (product)
LEFT JOIN via_link v USING (product)
ORDER BY array_position(ARRAY['pro', 'clubes', 'sports'], p.product);
