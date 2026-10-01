// Aplica todas as migrations de supabase/migrations num Postgres em memória (PGlite)
// e testa as regras que não podem quebrar. Não conecta em nenhum banco real.
//
//   npm run test:db
//
// O ambiente do Supabase (auth, storage, cron, papéis anon/authenticated) é simulado
// com o mínimo que as migrations usam. Dados "legados" são criados antes da
// migration do Lote 3 para testar o backfill.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('supabase/migrations');
const BACKFILL_FROM = '20261027000004'; // primeira migration testada com dados legados
const db = new PGlite();
const q = (sql, params) => db.query(sql, params);
const ex = (sql) => db.exec(sql);
const one = async (sql, params) => (await q(sql, params)).rows[0];
const count = async (sql, params) => (await one(sql, params)).n;

let fails = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok    ' : '  FALHA ') + msg);
  if (!cond) fails++;
};

// Executa como um papel do Supabase, com auth.uid() = uid. Devolve { rows } ou { err }.
async function as(role, uid, sql, params) {
  await ex(`SELECT set_config('request.jwt.claim.sub', '${uid}', false); SET ROLE ${role}`);
  try {
    return { rows: (await q(sql, params)).rows };
  } catch (e) {
    return { err: e.message };
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

async function apply(file) {
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

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const before = files.filter((f) => f < BACKFILL_FROM);
const after = files.filter((f) => f >= BACKFILL_FROM);

// ── Helpers de dados ────────────────────────────────────────────────────
const newUser = async (id, email, name, role) => {
  await q(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, jsonb_build_object('full_name', $3::text, 'role', $4::text))`, [id, email, name, role]);
  return (await one('SELECT id FROM public.profiles WHERE user_id = $1', [id]))?.id;
};
let category;
const newSession = async (organizer, days, place, address = null, type = 'outdoor', status = 'active') =>
  (
    await one(
      `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, location_name, location_address, location_type, max_participants, price_per_slot, status)
       VALUES ($1, $2, 'Treino', current_date + $3::int, '07:00', $4, $5, $6, 10, 50, $7) RETURNING id`,
      [organizer, category, days, place, address, type, status],
    )
  ).id;
const newBooking = async (session, student, organizer, status, extra = '') =>
  (
    await one(
      `INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status ${extra ? ', checked_in' : ''})
       VALUES ($1, $2, $3, 50, 50, 'paid', $4 ${extra ? ', ' + extra : ''}) RETURNING id`,
      [session, student, organizer, status],
    )
  ).id;

// ── Migrations antes do Lote 3 + dados legados ──────────────────────────
console.log('Migrations:');
for (const f of before) await apply(f);

category = (await one("INSERT INTO public.categories (name, slug) VALUES ('Corrida', 'corrida') RETURNING id")).id;
const LEG = 'eeeeeeee-0000-0000-0000-000000000005';
const LEGP = 'ffffffff-0000-0000-0000-000000000006';
const pLeg = await newUser(LEG, 'legado@teste.dev', 'Organizador legado', 'professional');
const pLegPart = await newUser(LEGP, 'legado-part@teste.dev', 'Participante legado', 'student');
const lsA = await newSession(pLeg, -10, 'Parque Ibirapuera', 'Av. Pedro Álvares Cabral', 'park', 'completed');
const lsB = await newSession(pLeg, -3, ' parque ibirapuera ', 'av. pedro álvares cabral', 'park', 'completed');
const lsC = await newSession(pLeg, -5, 'Studio X', null, 'studio', 'completed');
const lbPresent = await newBooking(lsA, pLegPart, pLeg, 'completed', 'true');
const lbAbsent = await newBooking(lsB, pLegPart, pLeg, 'no_show', 'false');
const legacyUpdatedAt = (await one('SELECT updated_at::text AS t FROM public.sessions WHERE id = $1', [lsA])).t;

for (const f of after) await apply(f);

// ── Backfill ────────────────────────────────────────────────────────────
console.log('Backfill (dados de antes do Lote 3):');
const legOrg = await one("SELECT id FROM public.organizations WHERE kind = 'solo' AND created_by = $1", [pLeg]);
ok(legOrg, 'organizador legado ganhou organização solo');
ok((await one('SELECT role FROM public.organization_members WHERE organization_id = $1 AND profile_id = $2', [legOrg?.id, pLeg]))?.role === 'owner', 'e é dono dela');
const legSessions = (await q('SELECT id, organization_id, venue_id FROM public.sessions WHERE professional_id = $1', [pLeg])).rows;
ok(legSessions.every((s) => s.organization_id === legOrg?.id && s.venue_id), 'todas as atividades legadas ligadas à organização e a um local');
const vA = legSessions.find((s) => s.id === lsA).venue_id;
const vB = legSessions.find((s) => s.id === lsB).venue_id;
ok(vA === vB, 'mesmo local (maiúsculas/espaços diferentes) reaproveita o venue');
ok((await count('SELECT count(*)::int n FROM public.venues WHERE organization_id = $1', [legOrg?.id])) === 2, 'dois locais distintos criados (parque e studio)');
ok((await one('SELECT kind FROM public.venues WHERE id = $1', [vA])).kind === 'park', 'tipo do local vem de location_type');
ok((await one('SELECT attendance_status s FROM public.bookings WHERE id = $1', [lbPresent])).s === 'present', 'check-in legado vira presença "present"');
ok((await one('SELECT attendance_status s FROM public.bookings WHERE id = $1', [lbAbsent])).s === 'absent', 'no_show legado vira "absent"');
ok((await one('SELECT updated_at::text AS t FROM public.sessions WHERE id = $1', [lsA])).t === legacyUpdatedAt, 'backfill não altera updated_at');

// ── Dados novos ─────────────────────────────────────────────────────────
const ORG = 'aaaaaaaa-0000-0000-0000-000000000001';
const PART = 'bbbbbbbb-0000-0000-0000-000000000002';
const PART2 = 'dddddddd-0000-0000-0000-000000000004';
const pOrg = await newUser(ORG, 'org@teste.dev', 'Organizador', 'professional');
const pPart = await newUser(PART, 'part@teste.dev', 'Participante', 'student');
const pPart2 = await newUser(PART2, 'part2@teste.dev', 'Participante 2', 'student');

console.log('Cadastro e atividades novas:');
ok(pOrg && pPart, 'cadastro cria o perfil');
const org = await one("SELECT id FROM public.organizations WHERE kind = 'solo' AND created_by = $1", [pOrg]);
ok(org, 'organizador novo ganha organização solo automaticamente');
ok((await count("SELECT count(*)::int n FROM public.organizations WHERE created_by = $1", [pPart])) === 0, 'participante não ganha organização');

await q("UPDATE public.profiles SET bio = 'bio', city = 'São Paulo', public_slug = 'participante', avatar_url = 'x' WHERE id = $1", [pPart]);
const sPast = await newSession(pOrg, -3, 'Parque');
const sFuture = await newSession(pOrg, 5, 'Parque');
const sClose = await newSession(pOrg, -1, 'Quadra Central', 'Rua A, 10', 'other');
const s1 = await one('SELECT organization_id, venue_id FROM public.sessions WHERE id = $1', [sPast]);
const s2 = await one('SELECT organization_id, venue_id FROM public.sessions WHERE id = $1', [sFuture]);
ok(s1.organization_id === org?.id && s1.venue_id, 'atividade nova recebe organização e local');
ok(s1.venue_id === s2.venue_id, 'atividades no mesmo lugar compartilham o local');
await q("UPDATE public.sessions SET location_name = 'Praia' WHERE id = $1", [sFuture]);
ok((await one('SELECT venue_id FROM public.sessions WHERE id = $1', [sFuture])).venue_id !== s1.venue_id, 'trocar o local da atividade troca o venue');

const bPast = await newBooking(sPast, pPart, pOrg, 'completed');
const bFuture = await newBooking(sFuture, pPart, pOrg, 'confirmed');
const bClose1 = await newBooking(sClose, pPart, pOrg, 'confirmed');
const bClose2 = await newBooking(sClose, pPart2, pOrg, 'confirmed');
await q(
  `INSERT INTO public.reviews (booking_id, session_id, reviewer_id, professional_id, rating, comment)
   VALUES ($1, $2, $3, $4, 5, 'Ótimo treino')`,
  [bPast, sPast, pPart, pOrg],
);
await q("INSERT INTO public.booking_private_notes (booking_id, professional_id, note) VALUES ($1, $2, 'nota')", [bPast, pOrg]);
await q("INSERT INTO public.notifications (user_id, type, title, message) VALUES ($1, 'system', 't', 'm')", [PART]);
await q('INSERT INTO public.favorites (student_id, professional_id) VALUES ($1, $2)', [pPart, pOrg]);

// ── Reserva ─────────────────────────────────────────────────────────────
console.log('Reserva:');
const sRebook = await newSession(pOrg, 4, 'Quadra Norte');
let rb = await as('authenticated', PART2, 'SELECT public.create_booking($1) AS r', [sRebook]);
const firstBooking = rb.rows?.[0]?.r?.booking_id;
ok(rb.rows?.[0]?.r?.success, 'participante reserva');
rb = await as('authenticated', PART2, "UPDATE public.bookings SET status = 'cancelled_by_student', cancelled_at = now() WHERE id = $1", [firstBooking]);
ok(!rb.err, 'participante cancela a própria reserva' + (rb.err ? ` (${rb.err})` : ''));
rb = await as('authenticated', PART2, 'SELECT public.create_booking($1) AS r', [sRebook]);
ok(rb.rows?.[0]?.r?.success && rb.rows[0].r.booking_id === firstBooking, 'reserva de novo depois de cancelar (reativa a mesma reserva)' + (rb.err ? ` (${rb.err})` : ''));
ok((await one('SELECT current_participants n FROM public.sessions WHERE id = $1', [sRebook])).n === 1, 'contagem de vagas volta a 1');
rb = await as('authenticated', PART2, 'SELECT public.create_booking($1) AS r', [sRebook]);
ok(rb.rows?.[0]?.r?.code === 'already_booked', 'reservar duas vezes é bloqueado');

// ── Presença ────────────────────────────────────────────────────────────
console.log('Presença:');
let r = await as('authenticated', ORG, 'SELECT public.close_session($1, $2::jsonb)', [sClose, JSON.stringify([{ booking_id: bClose1, attended: true, paid: true }])]);
ok(!r.err, 'organizador fecha a atividade (close_session)' + (r.err ? ` (${r.err})` : ''));
const a1 = await one('SELECT attendance_status s, attendance_recorded_by by FROM public.bookings WHERE id = $1', [bClose1]);
ok(a1.s === 'present' && a1.by === pOrg, 'quem foi: "present", registrado pelo organizador');
ok((await one('SELECT attendance_status s FROM public.bookings WHERE id = $1', [bClose2])).s === 'absent', 'quem não foi listado: "absent"');
r = await as('authenticated', ORG, "UPDATE public.bookings SET attendance_status = 'late' WHERE id = $1", [bClose2]);
const late = await one('SELECT attendance_status s, checked_in FROM public.bookings WHERE id = $1', [bClose2]);
ok(!r.err && late.s === 'late' && late.checked_in === true, 'organizador marca "late" direto (e o check-in acompanha)');
r = await as('authenticated', PART, "UPDATE public.bookings SET attendance_status = 'excused' WHERE id = $1", [bClose1]);
ok(r.err && /student_forbidden_field/.test(r.err), 'participante não altera a própria presença');

// ── Resultados ──────────────────────────────────────────────────────────
console.log('Resultados:');
r = await as('authenticated', ORG, 'INSERT INTO public.activity_results (session_id, booking_id, position, score) VALUES ($1, $2, 1, 21)', [sClose, bClose1]);
ok(!r.err, 'organizador registra resultado' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', PART, 'SELECT position FROM public.activity_results WHERE booking_id = $1', [bClose1]);
ok(r.rows?.length === 1, 'participante vê o próprio resultado');
r = await as('authenticated', PART2, 'SELECT position FROM public.activity_results WHERE booking_id = $1', [bClose1]);
ok(r.rows?.length === 0, 'outro participante não vê');
r = await as('anon', '', 'SELECT id FROM public.activity_results');
ok(r.rows?.length === 0, 'visitante sem login não vê resultados');
r = await as('authenticated', PART, 'INSERT INTO public.activity_results (session_id, booking_id, position) VALUES ($1, $2, 1)', [sClose, bClose1]);
ok(r.err, 'participante não registra resultado');

// ── Organizações e locais: leitura ──────────────────────────────────────
console.log('Organizações e locais:');
r = await as('anon', '', 'SELECT id FROM public.organizations WHERE id = $1', [org?.id]);
ok(r.rows?.length === 1, 'organização solo é pública');
r = await as('anon', '', 'SELECT id FROM public.venues WHERE id = $1', [s1.venue_id]);
ok(r.rows?.length === 1, 'local público é visível sem login');
await q("UPDATE public.venues SET visibility = 'members' WHERE id = $1", [s1.venue_id]);
r = await as('authenticated', PART, 'SELECT id FROM public.venues WHERE id = $1', [s1.venue_id]);
ok(r.rows?.length === 0, 'local só para membros fica escondido de quem não é membro');
r = await as('authenticated', ORG, 'SELECT id FROM public.venues WHERE id = $1', [s1.venue_id]);
ok(r.rows?.length === 1, 'membro da organização vê o local restrito');
await q("UPDATE public.venues SET visibility = 'public' WHERE id = $1", [s1.venue_id]);
r = await as('authenticated', PART, 'SELECT profile_id FROM public.organization_members');
ok(r.rows?.length === 0, 'participante não lista membros de organizações alheias');

// ── Aceites legais ──────────────────────────────────────────────────────
console.log('Aceites legais:');
r = await as('authenticated', PART, "INSERT INTO public.legal_acceptances (profile_id, document, version, accepted_at) VALUES ($1, 'terms', '2026-10-01', '2000-01-01') RETURNING accepted_at > now() - interval '1 minute' AS server_time", [pPart]);
ok(!r.err && r.rows?.[0]?.server_time, 'participante registra o próprio aceite (data vem do servidor)' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', PART, "INSERT INTO public.legal_acceptances (profile_id, document, version) VALUES ($1, 'terms', '2026-10-01')", [pPart2]);
ok(r.err, 'não registra aceite em nome de outra pessoa');
r = await as('authenticated', PART, "UPDATE public.legal_acceptances SET version = 'x' WHERE profile_id = $1 RETURNING id", [pPart]);
ok(!r.err && r.rows.length === 0, 'aceite não pode ser alterado');
r = await as('authenticated', PART, 'DELETE FROM public.legal_acceptances WHERE profile_id = $1 RETURNING id', [pPart]);
ok(!r.err && r.rows.length === 0, 'aceite não pode ser apagado');
r = await as('authenticated', PART2, 'SELECT id FROM public.legal_acceptances WHERE profile_id = $1', [pPart]);
ok(r.rows?.length === 0, 'ninguém lê os aceites dos outros');

// ── Exclusão de conta: participante ─────────────────────────────────────
console.log('Exclusão de conta (participante):');
r = await as('authenticated', PART, 'SELECT public.delete_user_account()');
ok(!r.err, 'delete_user_account roda' + (r.err ? ` (${r.err})` : ''));
ok((await count('SELECT count(*)::int n FROM auth.users WHERE id = $1', [PART])) === 0, 'login apagado');
const p = await one('SELECT * FROM public.profiles WHERE id = $1', [pPart]);
ok(
  p && p.user_id === null && p.deleted_at && p.full_name === 'Usuário removido' &&
    !p.bio && !p.city && !p.public_slug && !p.avatar_url,
  'perfil mantido, anonimizado e marcado como excluído',
);
const past = await one('SELECT status, payment_status, amount_total::text AS amount FROM public.bookings WHERE id = $1', [bPast]);
ok(past.status === 'completed' && past.payment_status === 'paid' && past.amount === '50.00', 'reserva paga mantida intacta');
ok((await one('SELECT status FROM public.bookings WHERE id = $1', [bFuture])).status === 'cancelled_by_student', 'reserva futura cancelada');
const review = await one('SELECT rating, comment FROM public.reviews WHERE booking_id = $1', [bPast]);
ok(review.rating === 5 && review.comment === null, 'avaliação: nota mantida, texto apagado');
ok((await count('SELECT count(*)::int n FROM public.profile_private WHERE profile_id = $1', [pPart])) === 0, 'profile_private apagado');
ok((await count('SELECT count(*)::int n FROM public.booking_private_notes WHERE booking_id = $1', [bPast])) === 0, 'notas privadas sobre a pessoa apagadas');
ok((await count('SELECT count(*)::int n FROM public.notifications WHERE user_id = $1', [PART])) === 0, 'notificações apagadas');
ok((await count('SELECT count(*)::int n FROM public.favorites WHERE student_id = $1', [pPart])) === 0, 'favoritos apagados');
ok((await one('SELECT attendance_status s FROM public.bookings WHERE id = $1', [bClose1])).s === 'present', 'presença registrada continua guardada');
ok((await count('SELECT count(*)::int n FROM public.legal_acceptances WHERE profile_id = $1', [pPart])) === 1, 'aceites continuam guardados (prova)');

// ── Exclusão de conta: organizador ──────────────────────────────────────
console.log('Exclusão de conta (organizador):');
const bookingsBefore = await count('SELECT count(*)::int n FROM public.bookings');
r = await as('authenticated', ORG, 'SELECT public.delete_user_account()');
ok(!r.err, 'delete_user_account roda' + (r.err ? ` (${r.err})` : ''));
ok((await one('SELECT status FROM public.sessions WHERE id = $1', [sFuture])).status === 'cancelled', 'atividade futura cancelada');
ok((await count('SELECT count(*)::int n FROM public.sessions WHERE id = $1', [sPast])) === 1, 'atividade passada mantida');
ok((await count('SELECT count(*)::int n FROM public.bookings')) === bookingsBefore, 'nenhuma reserva apagada');
ok((await one('SELECT status FROM public.organization_members WHERE profile_id = $1', [pOrg])).status === 'removed', 'sai das organizações');
ok((await count('SELECT count(*)::int n FROM public.activity_results WHERE session_id = $1', [sClose])) === 1, 'resultados continuam guardados');

// ── Permissões ──────────────────────────────────────────────────────────
console.log('Permissões:');
r = await as('anon', '', 'SELECT id FROM public.sessions');
ok(!r.err, 'visitante sem login lê atividades' + (r.err ? ` (${r.err})` : ''));
r = await as('anon', '', 'SELECT public.delete_user_account()');
ok(r.err && /permission denied/.test(r.err), 'visitante sem login não chama delete_user_account');
const OTHER = 'cccccccc-0000-0000-0000-000000000003';
await newUser(OTHER, 'outro@teste.dev', 'Outro', 'student');
r = await as('authenticated', OTHER, 'UPDATE public.profiles SET deleted_at = now() WHERE user_id = auth.uid()');
ok(r.err && /forbidden_profile_field/.test(r.err), 'usuário não preenche deleted_at sozinho');
r = await as('authenticated', OTHER, 'SELECT public.ensure_solo_organization(public._profile_id())');
ok(r.err && /permission denied/.test(r.err), 'usuário não chama funções internas (ensure_solo_organization)');

// ── Dados de exemplo (supabase/seeds) ───────────────────────────────────
console.log('Dados de exemplo:');
const seedsDir = path.resolve('supabase/seeds');
const runSeed = (file) => ex(fs.readFileSync(path.join(seedsDir, file), 'utf8').replace(/^﻿/, ''));
await q(`INSERT INTO public.categories (name, slug) VALUES
  ('Futevôlei', 'futevolei'), ('Funcional', 'funcional'), ('Beach Tennis', 'beach-tennis'),
  ('Yoga', 'yoga'), ('Airsoft', 'airsoft') ON CONFLICT DO NOTHING`);
const realCounts = async () => (await one(`SELECT
  (SELECT count(*) FROM public.profiles WHERE id::text NOT LIKE 'de000000-%')::int AS profiles,
  (SELECT count(*) FROM public.sessions WHERE id::text NOT LIKE 'de000000-%')::int AS sessions,
  (SELECT count(*) FROM public.reviews WHERE id::text NOT LIKE 'de000000-%')::int AS reviews,
  (SELECT count(*) FROM public.organizations)::int AS orgs_all,
  (SELECT count(*) FROM public.venues)::int AS venues_all`));
const realBefore = await realCounts();
const realBookingsBefore = await count(`SELECT count(*)::int n FROM public.bookings WHERE id::text NOT LIKE 'de000000-%'`);
try { await runSeed('demo_seed.sql'); ok(true, 'demo_seed.sql roda'); } catch (e) { ok(false, 'demo_seed.sql roda (' + e.message + ')'); }
const demo = await one(`SELECT
  (SELECT count(*) FROM public.profiles WHERE id::text LIKE 'de000000-%' AND role = 'professional')::int AS orgs,
  (SELECT count(*) FROM public.profiles WHERE id::text LIKE 'de000000-%' AND role = 'student')::int AS people,
  (SELECT count(*) FROM public.profiles WHERE id::text LIKE 'de000000-%' AND user_id IS NOT NULL)::int AS with_login,
  (SELECT count(*) FROM public.sessions WHERE id::text LIKE 'de000000-%' AND status = 'completed')::int AS past,
  (SELECT count(*) FROM public.sessions WHERE id::text LIKE 'de000000-%' AND status = 'active' AND date > current_date)::int AS future,
  (SELECT count(*) FROM public.sessions WHERE id::text LIKE 'de000000-%' AND (venue_id IS NULL OR organization_id IS NULL))::int AS unlinked,
  (SELECT count(*) FROM public.reviews WHERE id::text LIKE 'de000000-%')::int AS reviews,
  (SELECT count(*) FROM public.activity_results WHERE id::text LIKE 'de000000-%' AND position IS NOT NULL)::int AS results,
  (SELECT count(*) FROM public.profiles WHERE id::text LIKE 'de000000-%' AND role = 'professional' AND total_reviews > 0)::int AS rated,
  (SELECT count(*) FROM public.sessions s WHERE id::text LIKE 'de000000-%' AND current_participants <>
     (SELECT count(*) FROM public.bookings b WHERE b.session_id = s.id AND b.status NOT LIKE 'cancelled%'))::int AS bad_counts`);
ok(demo.orgs === 6 && demo.people === 20, `6 organizadores e 20 participantes (${demo.orgs}/${demo.people})`);
ok(demo.with_login === 0, 'nenhum perfil de exemplo tem login');
ok(demo.past === 30 && demo.future === 12, `30 atividades encerradas e 12 futuras (${demo.past}/${demo.future})`);
ok(demo.unlinked === 0, 'todas ligadas a organização e local (triggers do Lote 3)');
ok(demo.reviews > 0 && demo.rated === 6, `avaliações criadas e nota nos 6 organizadores (${demo.reviews} avaliações)`);
ok(demo.results > 0, `resultados com posição nos jogos (${demo.results})`);
ok(demo.bad_counts === 0, 'vagas ocupadas batem com as reservas');
const mid = await realCounts();
ok(mid.profiles === realBefore.profiles && mid.sessions === realBefore.sessions && mid.reviews === realBefore.reviews
  && (await count(`SELECT count(*)::int n FROM public.bookings WHERE id::text NOT LIKE 'de000000-%'`)) === realBookingsBefore,
  'nenhum dado real alterado pelo seed');
await runSeed('demo_seed.sql');
ok((await count(`SELECT count(*)::int n FROM public.profiles WHERE id::text LIKE 'de000000-%'`)) === 26, 'rodar de novo não duplica');
// usuário real reserva uma atividade de exemplo antes da limpeza
const demoFuture = (await one(`SELECT id FROM public.sessions WHERE id::text LIKE 'de000000-%' AND status = 'active' AND current_participants < max_participants ORDER BY date LIMIT 1`)).id;
r = await as('authenticated', OTHER, 'SELECT public.create_booking($1) AS r', [demoFuture]);
ok(r.rows?.[0]?.r?.success, 'usuário real consegue reservar atividade de exemplo' + (r.err ? ` (${r.err})` : ''));
try { await runSeed('demo_cleanup.sql'); ok(true, 'demo_cleanup.sql roda'); } catch (e) { ok(false, 'demo_cleanup.sql roda (' + e.message + ')'); }
const left = await count(`SELECT (
    (SELECT count(*) FROM public.profiles WHERE id::text LIKE 'de000000-%')
  + (SELECT count(*) FROM public.sessions WHERE id::text LIKE 'de000000-%')
  + (SELECT count(*) FROM public.bookings WHERE session_id::text LIKE 'de000000-%')
  + (SELECT count(*) FROM public.reviews WHERE id::text LIKE 'de000000-%')
  + (SELECT count(*) FROM public.activity_results WHERE id::text LIKE 'de000000-%'))::int AS n`);
ok(left === 0, 'limpeza remove tudo, inclusive a reserva real na atividade de exemplo');
const realAfter = await realCounts();
ok(realAfter.profiles === realBefore.profiles && realAfter.sessions === realBefore.sessions && realAfter.reviews === realBefore.reviews
  && realAfter.orgs_all === realBefore.orgs_all && realAfter.venues_all === realBefore.venues_all,
  'limpeza não toca em dados reais (organizações e locais de exemplo também saem)');

console.log(fails ? `\n${fails} falha(s)` : '\nTudo ok.');
process.exit(fails ? 1 : 0);
