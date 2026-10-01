// Aplica todas as migrations de supabase/migrations num Postgres em memória (PGlite)
// e testa as regras que não podem quebrar. Não conecta em nenhum banco real.
//
//   npm run test:db
//
// O ambiente do Supabase (auth, storage, cron, papéis anon/authenticated) é simulado
// com o mínimo que as migrations usam.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('supabase/migrations');
const db = new PGlite();
const q = (sql, params) => db.query(sql, params);
const ex = (sql) => db.exec(sql);
const count = async (sql, params) => (await q(sql, params)).rows[0].n;

let fails = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) fails++;
};

// Executa como um papel do Supabase, com auth.uid() = uid
async function as(role, uid, sql) {
  await ex(`SELECT set_config('request.jwt.claim.sub', '${uid}', false); SET ROLE ${role}`);
  try {
    await q(sql);
    return null;
  } catch (e) {
    return e.message;
  } finally {
    await ex('RESET ROLE');
  }
}

await ex(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA cron;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TABLE cron.job (jobname text);
  CREATE FUNCTION cron.schedule(text, text, text) RETURNS bigint LANGUAGE sql AS 'SELECT 1::bigint';
  CREATE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE sql AS 'SELECT true';
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
`);

console.log('Migrations:');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = fs
    .readFileSync(path.join(dir, file), 'utf8')
    .replace(/^﻿/, '')
    .replace(/CREATE EXTENSION IF NOT EXISTS pg_cron;/, ''); // simulado acima
  try {
    await ex(sql);
    console.log('  ok    ' + file);
  } catch (e) {
    console.log('  FALHA ' + file + ': ' + e.message);
    process.exit(1);
  }
}

// ── Dados ───────────────────────────────────────────────────────────────
const ORG = 'aaaaaaaa-0000-0000-0000-000000000001';
const PART = 'bbbbbbbb-0000-0000-0000-000000000002';
await q(
  `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
     ($1, 'org@teste.dev', '{"full_name":"Organizador","role":"professional"}'),
     ($2, 'part@teste.dev', '{"full_name":"Participante","role":"student"}')`,
  [ORG, PART],
);
const profileOf = async (uid) => (await q('SELECT id FROM public.profiles WHERE user_id = $1', [uid])).rows[0]?.id;
const pOrg = await profileOf(ORG);
const pPart = await profileOf(PART);

console.log('Cadastro:');
ok(pOrg && pPart, 'cadastro cria o perfil');

await q(
  `UPDATE public.profiles SET bio = 'bio', city = 'São Paulo', public_slug = 'participante', avatar_url = 'x'
   WHERE id = $1`,
  [pPart],
);
const cat = (await q("INSERT INTO public.categories (name, slug) VALUES ('Corrida', 'corrida') RETURNING id")).rows[0].id;
const newSession = async (days) =>
  (
    await q(
      `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot, status)
       VALUES ($1, $2, 'Treino', current_date + $3::int, '07:00', 'Parque', 10, 50, 'active') RETURNING id`,
      [pOrg, cat, days],
    )
  ).rows[0].id;
const newBooking = async (session, status) =>
  (
    await q(
      `INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status)
       VALUES ($1, $2, $3, 50, 50, 'paid', $4) RETURNING id`,
      [session, pPart, pOrg, status],
    )
  ).rows[0].id;
const sPast = await newSession(-3);
const sFuture = await newSession(5);
const bPast = await newBooking(sPast, 'completed');
const bFuture = await newBooking(sFuture, 'confirmed');
await q(
  `INSERT INTO public.reviews (booking_id, session_id, reviewer_id, professional_id, rating, comment)
   VALUES ($1, $2, $3, $4, 5, 'Ótimo treino')`,
  [bPast, sPast, pPart, pOrg],
);
await q("INSERT INTO public.booking_private_notes (booking_id, professional_id, note) VALUES ($1, $2, 'nota')", [bPast, pOrg]);
await q("INSERT INTO public.notifications (user_id, type, title, message) VALUES ($1, 'system', 't', 'm')", [PART]);
await q('INSERT INTO public.favorites (student_id, professional_id) VALUES ($1, $2)', [pPart, pOrg]);

// ── Exclusão de conta: participante ─────────────────────────────────────
console.log('Exclusão de conta (participante):');
let err = await as('authenticated', PART, 'SELECT public.delete_user_account()');
ok(!err, 'delete_user_account roda' + (err ? ` (${err})` : ''));
ok((await count('SELECT count(*)::int n FROM auth.users WHERE id = $1', [PART])) === 0, 'login apagado');
const p = (await q('SELECT * FROM public.profiles WHERE id = $1', [pPart])).rows[0];
ok(
  p && p.user_id === null && p.deleted_at && p.full_name === 'Usuário removido' &&
    !p.bio && !p.city && !p.public_slug && !p.avatar_url,
  'perfil mantido, anonimizado e marcado como excluído',
);
const past = (await q('SELECT status, payment_status, amount_total::text AS amount FROM public.bookings WHERE id = $1', [bPast])).rows[0];
ok(past.status === 'completed' && past.payment_status === 'paid' && past.amount === '50.00', 'reserva paga mantida intacta');
ok((await q('SELECT status FROM public.bookings WHERE id = $1', [bFuture])).rows[0].status === 'cancelled_by_student', 'reserva futura cancelada');
const review = (await q('SELECT rating, comment FROM public.reviews WHERE booking_id = $1', [bPast])).rows[0];
ok(review.rating === 5 && review.comment === null, 'avaliação: nota mantida, texto apagado');
ok((await count('SELECT count(*)::int n FROM public.profile_private WHERE profile_id = $1', [pPart])) === 0, 'profile_private apagado');
ok((await count('SELECT count(*)::int n FROM public.booking_private_notes WHERE booking_id = $1', [bPast])) === 0, 'notas privadas sobre a pessoa apagadas');
ok((await count('SELECT count(*)::int n FROM public.notifications WHERE user_id = $1', [PART])) === 0, 'notificações apagadas');
ok((await count('SELECT count(*)::int n FROM public.favorites WHERE student_id = $1', [pPart])) === 0, 'favoritos apagados');

// ── Exclusão de conta: organizador ──────────────────────────────────────
console.log('Exclusão de conta (organizador):');
err = await as('authenticated', ORG, 'SELECT public.delete_user_account()');
ok(!err, 'delete_user_account roda' + (err ? ` (${err})` : ''));
ok((await q('SELECT status FROM public.sessions WHERE id = $1', [sFuture])).rows[0].status === 'cancelled', 'atividade futura cancelada');
ok((await count('SELECT count(*)::int n FROM public.sessions WHERE id = $1', [sPast])) === 1, 'atividade passada mantida');
ok((await count('SELECT count(*)::int n FROM public.bookings')) === 2, 'nenhuma reserva apagada');

// ── Permissões ──────────────────────────────────────────────────────────
console.log('Permissões:');
err = await as('anon', '', 'SELECT id FROM public.sessions');
ok(!err, 'visitante sem login lê atividades' + (err ? ` (${err})` : ''));
err = await as('anon', '', 'SELECT public.delete_user_account()');
ok(err && /permission denied/.test(err), 'visitante sem login não chama delete_user_account');
const OTHER = 'cccccccc-0000-0000-0000-000000000003';
await q("INSERT INTO auth.users (id, email) VALUES ($1, 'outro@teste.dev')", [OTHER]);
err = await as('authenticated', OTHER, 'UPDATE public.profiles SET deleted_at = now() WHERE user_id = auth.uid()');
ok(err && /forbidden_profile_field/.test(err), 'usuário não preenche deleted_at sozinho');

console.log(fails ? `\n${fails} falha(s)` : '\nTudo ok.');
process.exit(fails ? 1 : 0);
