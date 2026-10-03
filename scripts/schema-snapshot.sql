-- Retrato do schema public (funções, triggers, políticas, colunas, índices, constraints, RLS).
-- Usado por scripts/check-drift.mjs para comparar o banco real com as migrations.
SELECT 'function' AS kind, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name,
       md5(replace(p.prosrc, chr(13), '')) || ' secdef=' || p.prosecdef::text || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), '') AS detail
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
UNION ALL
SELECT 'trigger', c.relname || '.' || t.tgname, pr.proname || ' enabled=' || t.tgenabled::text
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_proc pr ON pr.oid = t.tgfoid
WHERE n.nspname = 'public' AND NOT t.tgisinternal
UNION ALL
SELECT 'policy', tablename || '.' || policyname, cmd || ' roles=' || array_to_string(roles, ',') || ' using=' || md5(coalesce(qual, '')) || ' check=' || md5(coalesce(with_check, ''))
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'column', table_name || '.' || column_name, data_type || ' null=' || is_nullable || ' default=' || coalesce(column_default, '')
FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL
SELECT 'index', tablename || '.' || indexname, md5(indexdef) FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'constraint', conrelid::regclass::text || '.' || conname, md5(pg_get_constraintdef(oid)) FROM pg_constraint WHERE connamespace = 'public'::regnamespace
UNION ALL
SELECT 'rls', c.relname, 'rls=' || c.relrowsecurity::text FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
ORDER BY 1, 2;
