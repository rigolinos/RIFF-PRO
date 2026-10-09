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
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TABLE cron.job (jobname text);
  CREATE FUNCTION cron.schedule(text, text, text) RETURNS bigint LANGUAGE sql AS 'SELECT 1::bigint';
  CREATE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE sql AS 'SELECT true';
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
  GRANT ALL ON storage.objects TO anon, authenticated; -- como no Supabase (a RLS é que filtra)
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

// ── Origem das reservas ─────────────────────────────────────────────────
console.log('Origem das reservas:');
const sAttr = await newSession(pOrg, 6, 'Quadra Sul');
const sAttr2 = await newSession(pOrg, 7, 'Quadra Sul');
const longRef = 'x'.repeat(500);
rb = await as('authenticated', PART, 'SELECT public.create_booking($1, $2, $3::jsonb) AS r',
  [sAttr, 'organizer_link', JSON.stringify({ utm_source: 'instagram', ref: longRef, senha: 'nao-guardar', landing_path: '/@org' })]);
const attrBooking = rb.rows?.[0]?.r?.booking_id;
const attr = await one('SELECT source, product, attribution FROM public.bookings WHERE id = $1', [attrBooking]);
ok(attr?.source === 'organizer_link' && attr.product === 'pro', 'reserva grava a origem (organizer_link) e o produto (pro)');
ok(attr?.attribution?.utm_source === 'instagram' && !('senha' in (attr?.attribution ?? {})) && attr?.attribution?.ref?.length === 200,
  'atribuição guarda só chaves conhecidas, com no máximo 200 caracteres');
rb = await as('authenticated', PART2, 'SELECT public.create_booking($1, $2) AS r', [sAttr, 'hackeado']);
ok((await one('SELECT source FROM public.bookings WHERE id = $1', [rb.rows?.[0]?.r?.booking_id])).source === 'other', 'canal desconhecido vira other');
rb = await as('authenticated', PART2, 'SELECT public.create_booking($1) AS r', [sAttr2]);
ok(rb.rows?.[0]?.r?.success && (await one('SELECT source FROM public.bookings WHERE id = $1', [rb.rows[0].r.booking_id])).source === null,
  'chamada antiga (só a atividade) continua funcionando');
rb = await as('authenticated', ORG, 'SELECT public.get_professional_insights() AS r');
const ins = rb.rows?.[0]?.r;
ok(ins && ins.tracked_bookings === 2 && ins.via_link === 1, `organizador vê quantas reservas vieram do link dele (${ins?.via_link} de ${ins?.tracked_bookings})`);
rb = await as('anon', '', 'SELECT public.get_professional_insights() AS r');
ok(rb.err, 'visitante sem login não acessa os números');

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
// (migration 0026) local só aparece para o visitante enquanto tiver atividade aberta do Pro
const openVenue = (await one('SELECT venue_id FROM public.sessions WHERE id = $1', [sFuture])).venue_id;
r = await as('anon', '', 'SELECT id FROM public.venues WHERE id = $1', [openVenue]);
ok(r.rows?.length === 1, 'local com atividade aberta é visível sem login');
r = await as('anon', '', 'SELECT id FROM public.venues WHERE id = $1', [s1.venue_id]);
ok(!r.err && r.rows.length === 0, 'local só com atividade passada não aparece para o visitante');
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

// ── Riff Clubes: comunidades fechadas e convites (C2) ───────────────────
console.log('Riff Clubes (comunidades):');
const GA = 'c1000000-0000-4000-8000-000000000001'; // gestor do condomínio A
const MA = 'c1000000-0000-4000-8000-000000000002'; // morador do A
const GB = 'c1000000-0000-4000-8000-000000000003'; // gestor do clube B
const MB = 'c1000000-0000-4000-8000-000000000004'; // morador do B
const IA = 'c1000000-0000-4000-8000-000000000005'; // instrutor convidado para o A
const pGA = await newUser(GA, 'gestor.a@teste.dev', 'Gestor A', 'student');
const pMA = await newUser(MA, 'morador.a@teste.dev', 'Morador A', 'student');
await newUser(GB, 'gestor.b@teste.dev', 'Gestor B', 'student');
const pMB = await newUser(MB, 'morador.b@teste.dev', 'Morador B', 'student');
await newUser(IA, 'instrutor.a@teste.dev', 'Instrutor A', 'professional');

const orgA = (await one("SELECT public.admin_create_community('Residencial Jardins', 'condo', 'Gestor.A@teste.dev') AS id")).id;
const orgB = (await one("SELECT public.admin_create_community('Clube Náutico', 'club', 'gestor.b@teste.dev') AS id")).id;
ok(orgA && orgB, 'equipe Riff cria comunidades pelo terminal (e-mail sem diferença de maiúsculas)');
r = await as('authenticated', GA, "SELECT public.admin_create_community('Pirata', 'condo', 'gestor.a@teste.dev')");
ok(r.err && /permission denied/.test(r.err), 'app não consegue criar comunidade');

// convites
r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
const codeA = r.rows?.[0]?.r?.code;
ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codeA ?? ''), `gestor gera convite legível (${codeA})`);
r = await as('authenticated', MB, 'SELECT public.create_invite($1) AS r', [orgA]);
ok(r.err, 'quem não é gestor não gera convite');
r = await as('authenticated', MA, 'SELECT public.join_organization($1) AS r', [codeA.toLowerCase().replace('-', ' ')]);
ok(r.rows?.[0]?.r?.code === 'joined', 'morador entra com o código (minúsculas e espaço aceitos)');
r = await as('authenticated', MA, 'SELECT public.join_organization($1) AS r', [codeA]);
ok(r.rows?.[0]?.r?.code === 'already_member', 'entrar de novo não duplica');
r = await as('authenticated', MB, "SELECT public.join_organization('ZZZZ-ZZZZ') AS r");
ok(r.rows?.[0]?.r?.code === 'invalid_code', 'código inexistente é recusado');
r = await as('authenticated', GB, 'SELECT public.create_invite($1, $2, $3) AS r', [orgB, 'member', 1]);
const codeB = r.rows[0].r.code;
r = await as('authenticated', MB, 'SELECT public.join_organization($1) AS r', [codeB]);
ok(r.rows?.[0]?.r?.code === 'joined', 'morador do B entra no B');
r = await as('authenticated', MA, 'SELECT public.join_organization($1) AS r', [codeB]);
ok(r.rows?.[0]?.r?.code === 'exhausted', 'convite de uso único não serve para a segunda pessoa');
r = await as('authenticated', GA, 'SELECT public.create_invite($1, $2, NULL, $3) AS r', [orgA, 'instructor', 0]);
const expired = r.rows[0].r.code;
await q("UPDATE public.organization_invites SET expires_at = now() - interval '1 minute' WHERE code = $1", [expired.replace('-', '')]);
r = await as('authenticated', IA, 'SELECT public.join_organization($1) AS r', [expired]);
ok(r.rows?.[0]?.r?.code === 'expired', 'convite vencido é recusado');
r = await as('authenticated', GA, 'SELECT public.create_invite($1, $2) AS r', [orgA, 'instructor']);
r = await as('authenticated', IA, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
ok(r.rows?.[0]?.r?.role === 'instructor', 'instrutor entra como instrutor pelo convite');
r = await as('authenticated', MA, 'SELECT code FROM public.organization_invites');
ok(r.rows?.length === 0, 'morador não lista os convites');

// atividades da comunidade
const clubSession = async (uid, org, title) => as('authenticated', uid,
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot)
   VALUES (public._profile_id(), $1, $2, $3, current_date + 3, '18:00', 'Quadra do condomínio', 10, 0) RETURNING id, product`, [org, category, title]);
r = await clubSession(GA, orgA, 'Vôlei dos moradores');
const sA = r.rows?.[0]?.id;
ok(r.rows?.[0]?.product === 'clubes', 'atividade da comunidade vira product clubes sozinha' + (r.err ? ` (${r.err})` : ''));
r = await clubSession(IA, orgA, 'Funcional com o instrutor');
ok(!r.err, 'instrutor da comunidade cria atividade nela' + (r.err ? ` (${r.err})` : ''));
r = await clubSession(MA, orgA, 'Atividade do morador');
ok(r.rows?.[0]?.product === 'clubes', 'morador cria atividade na própria comunidade' + (r.err ? ` (${r.err})` : ''));
const sMember = r.rows?.[0]?.id;
r = await as('authenticated', MB, 'SELECT public.close_community_session($1, $2::jsonb, false)', [sMember, '[]']);
ok(r.err && /forbidden/.test(r.err), 'quem é de outra comunidade não cancela a atividade do morador');
r = await as('authenticated', GA, 'SELECT public.close_community_session($1, $2::jsonb, false)', [sMember, '[]']);
ok(!r.err && (await one('SELECT status FROM public.sessions WHERE id = $1', [sMember])).status === 'cancelled',
  'gestor cancela a atividade criada por um morador' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', MA,
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot)
   VALUES (public._profile_id(), $1, $2, 'Jogo cobrado', current_date + 3, '18:00', 'Quadra', 10, 50) RETURNING price_per_slot`, [orgA, category]);
ok(Number(r.rows?.[0]?.price_per_slot) === 0, 'atividade de comunidade sai sempre com preço zero (sem pagamento no Clubes)');
r = await clubSession(MB, orgA, 'Invasão');
ok(r.err, 'quem é de outra comunidade não cria atividade nela');
ok((await one('SELECT v.visibility FROM public.sessions s JOIN public.venues v ON v.id = s.venue_id WHERE s.id = $1', [sA])).visibility === 'members',
  'local da comunidade nasce só para membros');

// isolamento
r = await as('authenticated', MA, 'SELECT id FROM public.sessions WHERE id = $1', [sA]);
ok(r.rows?.length === 1, 'morador do A vê a atividade do A');
r = await as('authenticated', MB, 'SELECT id FROM public.sessions WHERE id = $1', [sA]);
ok(r.rows?.length === 0, 'morador do B NÃO vê a atividade do A');
r = await as('anon', '', 'SELECT id FROM public.sessions WHERE id = $1', [sA]);
ok(r.rows?.length === 0, 'visitante sem login não vê a atividade do A');
r = await as('authenticated', MB, 'SELECT id FROM public.organizations WHERE id = $1', [orgA]);
ok(r.rows?.length === 0, 'morador do B não vê a comunidade A');
r = await as('authenticated', MB, 'SELECT v.id FROM public.venues v WHERE v.organization_id = $1', [orgA]);
ok(r.rows?.length === 0, 'morador do B não vê os locais do A');
r = await as('authenticated', MB, 'SELECT profile_id FROM public.organization_members WHERE organization_id = $1', [orgA]);
ok(r.rows?.length === 0, 'morador do B não vê quem mora no A');
r = await as('anon', '', 'SELECT count(*)::int n FROM public.sessions WHERE product = $1', ['pro']);
ok(r.rows?.[0]?.n > 0, 'atividades do Riff Pro continuam públicas');

// reservas
r = await as('authenticated', MB, 'SELECT public.create_booking($1) AS r', [sA]);
ok(r.rows?.[0]?.r?.code === 'not_member', 'morador do B não reserva atividade do A');
r = await as('authenticated', MA, 'SELECT public.create_booking($1) AS r', [sA]);
ok(r.rows?.[0]?.r?.success, 'morador do A reserva atividade do A');

// removido não volta
await q("UPDATE public.organization_members SET status = 'removed' WHERE organization_id = $1 AND profile_id = $2", [orgA, pMA]);
r = await as('authenticated', MA, 'SELECT id FROM public.sessions WHERE id = $1', [sA]);
ok(r.rows?.length === 0, 'morador removido deixa de ver a atividade');
r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
r = await as('authenticated', MA, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
ok(r.rows?.[0]?.r?.code === 'removed', 'morador removido não volta com um código novo');
ok(pGA && pMB, 'perfis de teste do Clubes criados');

// ── Riff Clubes: ferramentas do gestor (C4) ─────────────────────────────
console.log('Riff Clubes (gestor):');
const M2 = 'c1000000-0000-4000-8000-000000000006'; // novo morador do A
const pM2 = await newUser(M2, 'morador2.a@teste.dev', 'Morador Dois', 'student');
r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
await as('authenticated', M2, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
const pIA = (await one('SELECT id FROM public.profiles WHERE user_id = $1', [IA])).id;
const M3 = 'c1000000-0000-4000-8000-000000000007'; // outro morador do A
await newUser(M3, 'morador3.a@teste.dev', 'Morador Três', 'student');
r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
await as('authenticated', M3, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
await ex("SELECT set_config('request.jwt.claim.sub', '', false)"); // inserts abaixo como servidor

// atividade do instrutor que já aconteceu (ontem), com o morador 2 inscrito
const sI = (await one(
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, $3, 'Funcional de ontem', current_date - 1, '07:00', 'Quadra do condomínio', 10, 0, 'active') RETURNING id`,
  [pIA, orgA, category])).id;
const bI = (await one(
  `INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status)
   VALUES ($1, $2, $3, 0, 0, 'free', 'confirmed') RETURNING id`, [sI, pM2, pIA])).id;

r = await as('authenticated', GA, 'SELECT id FROM public.bookings WHERE session_id = $1', [sI]);
ok(r.rows?.length === 1, 'gestor vê os inscritos da atividade do instrutor' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', IA, 'SELECT id FROM public.bookings WHERE session_id = $1', [sI]);
ok(r.rows?.length === 1, 'instrutor vê os inscritos da própria atividade');
r = await as('authenticated', MB, 'SELECT id FROM public.bookings WHERE session_id = $1', [sI]);
ok(r.rows?.length === 0, 'morador de outra comunidade não vê inscritos');
r = await as('authenticated', M3, 'SELECT id FROM public.bookings WHERE session_id = $1', [sI]);
ok(r.rows?.length === 0, 'morador comum não vê a inscrição dos outros');

// encerrar
r = await as('authenticated', M2, 'SELECT public.close_community_session($1, $2::jsonb)', [sI, JSON.stringify([{ booking_id: bI, status: 'present' }])]);
ok(r.err && /forbidden/.test(r.err), 'morador não encerra atividade');
r = await as('authenticated', GA, 'SELECT public.close_community_session($1, $2::jsonb)', [sI, JSON.stringify([{ booking_id: bI, status: 'late' }])]);
ok(!r.err, 'gestor encerra a atividade do instrutor' + (r.err ? ` (${r.err})` : ''));
const closed = await one('SELECT b.status, b.attendance_status, b.checked_in, s.status AS session_status FROM public.bookings b JOIN public.sessions s ON s.id = b.session_id WHERE b.id = $1', [bI]);
ok(closed.status === 'completed' && closed.attendance_status === 'late' && closed.checked_in && closed.session_status === 'completed',
  'presença "atrasou" gravada e atividade encerrada');
r = await as('authenticated', GA, 'SELECT public.close_community_session($1)', [sI]);
ok(r.err && /already_closed/.test(r.err), 'não encerra duas vezes');
r = await as('authenticated', ORG, 'SELECT public.close_community_session($1)', [sPast]);
ok(r.err && /not_a_community_session/.test(r.err), 'atividade do Riff Pro não é encerrada por aqui');

// gerenciar membros
r = await as('authenticated', M2, 'SELECT public.manage_member($1, $2, $3)', [orgA, pIA, 'remove']);
ok(r.err && /forbidden/.test(r.err), 'morador não gerencia membros');
r = await as('authenticated', GA, 'SELECT public.manage_member($1, $2, $3) AS r', [orgA, pM2, 'make_instructor']);
ok(r.rows?.[0]?.r?.role === 'instructor', 'gestor transforma morador em instrutor');
r = await as('authenticated', GA, 'SELECT public.manage_member($1, $2, $3)', [orgA, pGA, 'make_member']);
ok(r.err && /cannot_change_self/.test(r.err), 'gestor não altera o próprio papel');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
r = await as('authenticated', GA, 'SELECT public.manage_member($1, $2, $3) AS r', [orgA, pM2, 'make_admin']);
r = await as('authenticated', M2, 'SELECT public.manage_member($1, $2, $3)', [orgA, pGA, 'remove']);
ok(r.err && /cannot_change_owner/.test(r.err), 'ninguém remove o dono da comunidade');
const sNext = (await one(
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, $3, 'Vôlei da semana que vem', current_date + 7, '19:00', 'Quadra do condomínio', 10, 0, 'active') RETURNING id`,
  [pIA, orgA, category])).id;
r = await as('authenticated', M2, 'SELECT public.create_booking($1) AS r', [sNext]);
const bNext = r.rows?.[0]?.r?.booking_id;
r = await as('authenticated', GA, 'SELECT public.manage_member($1, $2, $3) AS r', [orgA, pM2, 'remove']);
ok(r.rows?.[0]?.r?.status === 'removed', 'gestor remove membro');
ok((await one('SELECT status FROM public.bookings WHERE id = $1', [bNext])).status === 'cancelled_by_pro', 'inscrições futuras de quem foi removido são canceladas');
ok((await one('SELECT current_participants n FROM public.sessions WHERE id = $1', [sNext])).n === 0, 'vaga liberada');

// ── Riff Clubes: dependentes menores (C5) ───────────────────────────────
console.log('Riff Clubes (dependentes):');
const pM3 = (await one('SELECT id FROM public.profiles WHERE user_id = $1', [M3])).id;
const yearsAgo = (y, extraDays = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(d.getDate() - extraDays);
  return d.toISOString().slice(0, 10);
};
const addDep = (uid, name, birth, consent = '2026-10-03') =>
  as('authenticated', uid, 'SELECT public.add_dependent($1, $2::date, $3, $4) AS id', [name, birth, 'child', consent]);

r = await addDep(M3, 'Filha Dez', yearsAgo(10), '');
ok(r.err && /consent_required/.test(r.err), 'sem aceite do termo não cadastra dependente');
r = await addDep(M3, 'Adulto', yearsAgo(18, 1));
ok(r.err && /not_a_minor/.test(r.err), 'maior de 18 não é dependente');
r = await addDep(M3, 'Futuro', '2999-01-01');
ok(r.err && /invalid_birth_date/.test(r.err), 'data de nascimento no futuro é recusada');
r = await addDep(M3, 'Filha Dez', yearsAgo(10));
const dTen = r.rows?.[0]?.id;
ok(!!dTen, 'responsável cadastra dependente' + (r.err ? ` (${r.err})` : ''));
const dFive = (await addDep(M3, 'Filho Cinco', yearsAgo(5))).rows?.[0]?.id;
ok((await one("SELECT count(*)::int n FROM public.legal_acceptances WHERE profile_id = $1 AND document = 'guardian_consent'", [pM3])).n === 1,
  'aceite do termo do responsável fica registrado');
r = await as('authenticated', M3, "INSERT INTO public.dependents (guardian_id, full_name, birth_date, relationship, consent_version) VALUES ($1, 'Burla', '2020-01-01', 'child', 'x')", [pM3]);
ok(!!r.err, 'dependente não é criado direto na tabela (sem o termo)');

r = await as('authenticated', M3, 'SELECT id FROM public.dependents');
ok(r.rows?.length === 2, 'responsável vê os próprios dependentes');
r = await as('authenticated', GA, 'SELECT id FROM public.dependents');
ok(r.rows?.length === 0, 'gestor não vê dependentes sem inscrição na comunidade');
r = await as('authenticated', MB, 'SELECT id FROM public.dependents');
ok(r.rows?.length === 0, 'outra pessoa não vê dependentes');

await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const kidsSession = async (title, minorsAllowed, minAge) => (await one(
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, location_name, max_participants, price_per_slot, status, minors_allowed, min_age)
   VALUES ($1, $2, $3, $4, current_date + 5, '10:00', 'Piscina', 10, 0, 'active', $5, $6) RETURNING id`,
  [pIA, orgA, category, title, minorsAllowed, minAge])).id;
const sKids = await kidsSession('Natação infantil', true, 8);
const sAdults = await kidsSession('Funcional adulto', false, null);

const depBook = (uid, s, d) => as('authenticated', uid, 'SELECT public.create_dependent_booking($1, $2) AS r', [s, d]);
r = await depBook(M3, sAdults, dTen);
ok(r.rows?.[0]?.r?.code === 'minors_not_allowed', 'atividade sem "aceita menores" recusa dependente');
r = await depBook(M3, sKids, dFive);
ok(r.rows?.[0]?.r?.code === 'below_min_age', 'idade mínima da atividade é respeitada');
r = await depBook(GA, sKids, dTen);
ok(r.rows?.[0]?.r?.code === 'dependent_not_found', 'ninguém inscreve o dependente de outra pessoa');
r = await depBook(M3, sPast, dTen);
ok(r.rows?.[0]?.r?.code === 'session_not_found', 'dependente não entra em atividade do Riff Pro');
r = await depBook(M3, sKids, dTen);
const bDep = r.rows?.[0]?.r?.booking_id;
ok(r.rows?.[0]?.r?.success === true, 'responsável inscreve dependente' + (r.err ? ` (${r.err})` : ''));
r = await depBook(M3, sKids, dTen);
ok(r.rows?.[0]?.r?.code === 'already_booked', 'dependente não é inscrito duas vezes');
r = await as('authenticated', M3, 'SELECT public.create_booking($1) AS r', [sKids]);
ok(r.rows?.[0]?.r?.success === true, 'responsável ainda se inscreve (inscrição do dependente não conta como a dele)');
ok((await one('SELECT current_participants n FROM public.sessions WHERE id = $1', [sKids])).n === 2, 'dependente ocupa vaga');

r = await as('authenticated', IA, 'SELECT d.full_name FROM public.bookings b JOIN public.dependents d ON d.id = b.dependent_id WHERE b.session_id = $1', [sKids]);
ok(r.rows?.[0]?.full_name === 'Filha Dez', 'quem conduz vê o nome do dependente inscrito');
r = await as('authenticated', GA, 'SELECT full_name FROM public.dependents');
ok(r.rows?.length === 1 && r.rows[0].full_name === 'Filha Dez', 'gestor vê só o dependente inscrito na comunidade');

r = await as('authenticated', M3, "UPDATE public.bookings SET status = 'cancelled_by_student', cancelled_at = now() WHERE id = $1", [bDep]);
ok(!r.err && (await one('SELECT current_participants n FROM public.sessions WHERE id = $1', [sKids])).n === 1,
  'responsável cancela a inscrição do dependente e a vaga volta');
r = await depBook(M3, sKids, dTen);
ok(r.rows?.[0]?.r?.booking_id === bDep, 'reinscrição reaproveita a inscrição cancelada');

r = await as('authenticated', GA, 'SELECT public.remove_dependent($1)', [dTen]);
ok(r.err && /not_found/.test(r.err), 'só o responsável remove o dependente');
r = await as('authenticated', M3, 'SELECT public.remove_dependent($1)', [dTen]);
ok(!r.err, 'responsável remove dependente' + (r.err ? ` (${r.err})` : ''));
const gone = await one('SELECT full_name, birth_date, removed_at FROM public.dependents WHERE id = $1', [dTen]);
ok(gone.full_name === null && gone.birth_date === null && gone.removed_at, 'dependente removido fica sem nome e data de nascimento');
ok((await one('SELECT status FROM public.bookings WHERE id = $1', [bDep])).status === 'cancelled_by_student', 'inscrições futuras do dependente removido são canceladas');
r = await depBook(M3, sKids, dTen);
ok(r.rows?.[0]?.r?.code === 'dependent_not_found', 'dependente removido não é mais inscrito');

r = await as('authenticated', M3, "INSERT INTO public.legal_acceptances (profile_id, document, version) VALUES ($1, 'clubes_terms', '2026-10-03')", [pM3]);
ok(!r.err, 'aceite dos termos do Clubes é registrado' + (r.err ? ` (${r.err})` : ''));

// excluir a conta do responsável apaga os dados dos dependentes e o tira das comunidades
r = await depBook(M3, sKids, dFive);  // abaixo da idade: só garante que dFive segue ativo
r = await as('authenticated', M3, 'SELECT public.delete_user_account()');
ok(!r.err, 'responsável exclui a conta' + (r.err ? ` (${r.err})` : ''));
const depAfter = await one('SELECT full_name, birth_date, removed_at FROM public.dependents WHERE id = $1', [dFive]);
ok(depAfter.full_name === null && depAfter.birth_date === null && depAfter.removed_at, 'ao excluir a conta, os dependentes ficam sem nome e data de nascimento');
ok((await one("SELECT count(*)::int n FROM public.organization_members WHERE profile_id = $1 AND status <> 'removed'", [pM3])).n === 0,
  'ao excluir a conta, a pessoa sai das comunidades');

// ── Riff Clubes: "quem vai" (membros da mesma comunidade) ───────────────
console.log('Riff Clubes (quem vai):');
const M4 = 'c1000000-0000-4000-8000-000000000008'; // morador do A
await newUser(M4, 'morador4.a@teste.dev', 'Marina Souza Lima', 'student');
r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
await as('authenticated', M4, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
const dM4 = (await as('authenticated', M4, 'SELECT public.add_dependent($1, $2::date, $3, $4) AS id', ['Pedro Lima', yearsAgo(9), 'child', '2026-10-03'])).rows?.[0]?.id;
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const sWho = await kidsSession('Vôlei com as crianças', true, null);
await as('authenticated', M4, 'SELECT public.create_booking($1)', [sWho]);
await as('authenticated', GA, 'SELECT public.create_booking($1)', [sWho]);
await as('authenticated', M4, 'SELECT public.create_dependent_booking($1, $2)', [sWho, dM4]);

const who = (uid, ids, limit = null) =>
  as('authenticated', uid, 'SELECT * FROM public.activity_participants($1::uuid[], $2)', [ids, limit]);
r = await who(M4, [sWho]);
const row = r.rows?.[0];
ok(row?.people_count === 2 && row?.dependents === 1, 'membro vê quantos adultos vão e quantas crianças' + (r.err ? ` (${r.err})` : ''));
ok(JSON.stringify(row?.people.map((p) => p.name)) === JSON.stringify(['Marina L.', 'Gestor A.']), 'nome curto: primeiro nome e inicial do sobrenome, na ordem de inscrição');
ok(!JSON.stringify(row ?? {}).includes('Pedro'), 'nome de menor nunca aparece na lista');
r = await who(M4, [sWho], 1);
ok(r.rows?.[0]?.people.length === 1 && r.rows?.[0]?.people_count === 2, 'prévia limitada mantém a contagem total');
r = await who(MB, [sWho]);
ok(r.rows?.length === 0, 'quem é de outra comunidade não vê quem vai');
r = await who(M4, [sPast]);
ok(r.rows?.length === 0, 'eventos do Riff Pro não entram');
r = await as('anon', '', 'SELECT * FROM public.activity_participants($1::uuid[])', [[sWho]]);
ok(!!r.err, 'visitante sem login não chama a função');
await as('authenticated', GA, "UPDATE public.bookings SET status = 'cancelled_by_student', cancelled_at = now() WHERE session_id = $1 AND student_id = public._profile_id()", [sWho]);
r = await who(M4, [sWho]);
ok(r.rows?.[0]?.people_count === 1, 'quem cancelou sai da lista');

// ── Riff Clubes: lado esportista (G1) ───────────────────────────────────
console.log('Riff Clubes (esportista):');
const M5 = 'c1000000-0000-4000-8000-000000000009'; // morador do A, vai usar o modo reservado
const M6 = 'c1000000-0000-4000-8000-000000000010'; // morador do A, falta ao jogo
const pM5 = await newUser(M5, 'morador5.a@teste.dev', 'Bruno Reis', 'student');
const pM6 = await newUser(M6, 'morador6.a@teste.dev', 'Carla Dias', 'student');
for (const uid of [M5, M6]) {
  r = await as('authenticated', GA, 'SELECT public.create_invite($1) AS r', [orgA]);
  await as('authenticated', uid, 'SELECT public.join_organization($1) AS r', [r.rows[0].r.code]);
}
const pM4 = (await one('SELECT id FROM public.profiles WHERE user_id = $1', [M4])).id;
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
// jogo de anteontem, conduzido pelo instrutor, na Quadra do condomínio
const sGame = (await one(
  `INSERT INTO public.sessions (professional_id, organization_id, category_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, $3, 'Racha de anteontem', current_date - 2, '10:00', 60, 'Quadra do condomínio', 10, 0, 'active') RETURNING id`,
  [pIA, orgA, category])).id;
const sNextGame = await kidsSession('Racha da semana que vem', false, null);
for (const pid of [pGA, pM4, pM5, pM6]) {
  await q(`INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status, product)
           VALUES ($1, $2, $3, 0, 0, 'free', 'confirmed', 'clubes')`, [sGame, pid, pIA]);
}
await q("UPDATE public.bookings SET attendance_status = 'absent', status = 'no_show' WHERE session_id = $1 AND student_id = $2", [sGame, pM6]);
r = await as('authenticated', M5, 'UPDATE public.profiles SET sports_hidden = true WHERE id = public._profile_id()');
ok(!r.err, 'a própria pessoa liga o modo reservado' + (r.err ? ` (${r.err})` : ''));

// pendências de avaliação
r = await as('authenticated', M4, 'SELECT * FROM public.pending_game_reviews()');
const pend = r.rows?.find((x) => x.session_id === sGame);
ok(!!pend, 'quem jogou vê o jogo para avaliar' + (r.err ? ` (${r.err})` : ''));
const names = (pend?.players ?? []).map((p) => p.name).sort();
ok(JSON.stringify(names) === JSON.stringify(['Gestor A.', 'Instrutor A.']),
  'para elogiar: quem jogou e quem organizou; sem a própria pessoa, sem quem faltou, sem modo reservado');
r = await as('authenticated', M6, 'SELECT * FROM public.pending_game_reviews()');
ok(!r.rows?.some((x) => x.session_id === sGame), 'quem faltou não recebe o jogo para avaliar');

// enviar avaliação
const gameReview = (uid, s, vibe, kudos = []) =>
  as('authenticated', uid, 'SELECT public.submit_game_review($1, $2::smallint, $3::jsonb) AS r', [s, vibe, JSON.stringify(kudos)]);
r = await gameReview(M6, sGame, 3);
ok(r.err && /not_a_player/.test(r.err), 'quem faltou não avalia');
r = await gameReview(MB, sGame, 3);
ok(r.err && /not_a_player/.test(r.err), 'quem é de outra comunidade não avalia');
r = await gameReview(M4, sNextGame, 3);
ok(r.err && /not_ended|not_a_player/.test(r.err), 'jogo que ainda não aconteceu não é avaliado');
r = await gameReview(M4, sGame, 3, [{ receiver: pM4, tag: 'craque' }]);
ok(r.err && /invalid_kudos/.test(r.err), 'ninguém elogia a si mesmo');
r = await gameReview(M4, sGame, 3, [{ receiver: pM5, tag: 'craque' }]);
ok(r.err && /invalid_kudos/.test(r.err), 'quem está no modo reservado não recebe elogio');
r = await gameReview(M4, sGame, 3, [{ receiver: pM6, tag: 'craque' }]);
ok(r.err && /invalid_kudos/.test(r.err), 'quem faltou não recebe elogio');
r = await gameReview(M4, sGame, 3, [{ receiver: pGA, tag: 'mala' }]);
ok(r.err && /invalid_kudos/.test(r.err), 'só elogios da lista (nada negativo)');
ok((await one('SELECT count(*)::int n FROM public.game_reviews WHERE session_id = $1', [sGame])).n === 0, 'avaliação recusada não grava nada');
r = await gameReview(M4, sGame, 3, [{ receiver: pGA, tag: 'craque' }, { receiver: pGA, tag: 'fair_play' }]);
ok(r.rows?.[0]?.r?.status === 'ok', 'quem jogou avalia e elogia' + (r.err ? ` (${r.err})` : ''));
r = await gameReview(M4, sGame, 2);
ok(r.err && /already_reviewed/.test(r.err), 'cada pessoa avalia o jogo uma vez');
r = await gameReview(GA, sGame, 3, ['craque', 'pontual', 'animou', 'fair_play'].map((tag) => ({ receiver: pIA, tag })));
ok(r.rows?.[0]?.r?.status === 'ok', 'gestor que jogou também avalia');
r = await as('authenticated', M4, 'SELECT * FROM public.pending_game_reviews()');
ok(!r.rows?.some((x) => x.session_id === sGame), 'depois de avaliar, o jogo sai das pendências');

// quem lê o quê
r = await as('authenticated', GA, 'SELECT * FROM public.game_kudos');
ok(r.rows?.length === 0, 'ninguém lê os elogios direto (quem deu fica em segredo)');
r = await as('authenticated', IA, 'SELECT vibe FROM public.game_reviews WHERE session_id = $1', [sGame]);
ok(r.rows?.length === 2, 'quem organizou vê o "como foi" do jogo');
r = await as('authenticated', M5, 'SELECT vibe FROM public.game_reviews WHERE session_id = $1', [sGame]);
ok(r.rows?.length === 0, 'outros membros não veem o "como foi" alheio');

// ranking do mês (jogo de anteontem pode cair no mês anterior: pede o mês do jogo)
const month = (await one("SELECT to_char(current_date - 2, 'YYYY-MM-01') AS m")).m;
r = await as('authenticated', M4, 'SELECT * FROM public.community_ranking($1, $2::date)', [orgA, month]);
const pts = Object.fromEntries((r.rows ?? []).map((x) => [x.short_name, x.points]));
ok(pts['Instrutor A.'] === 24, 'organizou com 3+ presentes (15) + elogios com teto de 3 por jogo (9)' + (r.err ? ` (${r.err})` : ` [${JSON.stringify(pts)}]`));
ok(pts['Gestor A.'] === 18, 'gestor: presença (10) + 2 elogios (6) + avaliou (2)');
ok(pts['Marina L.'] === 12, 'morador: presença (10) + avaliou (2)');
ok(!('Bruno R.' in pts) && !('Carla D.' in pts), 'modo reservado fica fora do ranking; quem faltou não pontua');
ok(r.rows?.[0]?.short_name === 'Instrutor A.' && r.rows?.[0]?.rank === 1, 'ranking ordenado por pontos');
r = await as('authenticated', MB, 'SELECT * FROM public.community_ranking($1, $2::date)', [orgA, month]);
ok(r.rows?.length === 0, 'quem é de outra comunidade não vê o ranking');

// perfil esportista
r = await as('authenticated', M4, 'SELECT public.player_profile($1, $2) AS p', [pGA, orgA]);
const pg = r.rows?.[0]?.p;
ok(pg?.games === 1 && pg?.kudos?.craque === 1 && pg?.kudos?.fair_play === 1, 'perfil do vizinho: jogos e elogios recebidos' + (r.err ? ` (${r.err})` : ''));
ok(pg?.name === 'Gestor A.', 'perfil do vizinho mostra só o nome curto');
const dono = pg?.achievements?.find((a) => a.key === 'dono_da_quadra');
ok(dono?.current === 1 && dono?.target === 5 && dono?.detail === 'Quadra do condomínio', 'conquista "Dono da quadra" com progresso e local');
r = await as('authenticated', MB, 'SELECT public.player_profile($1, $2) AS p', [pGA, orgA]);
ok(r.rows?.[0]?.p === null, 'quem é de outra comunidade não abre o perfil');
r = await as('authenticated', M4, 'SELECT public.player_profile($1, $2) AS p', [pM5, orgA]);
ok(r.rows?.[0]?.p === null, 'perfil no modo reservado não abre para os outros');
r = await as('authenticated', M5, 'SELECT public.player_profile(public._profile_id()) AS p');
ok(r.rows?.[0]?.p?.games === 1 && r.rows?.[0]?.p?.hidden === true, 'no modo reservado a pessoa ainda vê os próprios números');
r = await as('authenticated', M4, 'SELECT public.player_profile($1) AS p', [pGA]);
ok(r.rows?.[0]?.p === null, 'sem comunidade em comum informada, não abre perfil alheio');
r = await as('authenticated', M6, 'SELECT public.player_profile(public._profile_id(), $1) AS p', [orgA]);
ok(r.rows?.[0]?.p?.games === 0 && r.rows?.[0]?.p?.attendance === 0, 'falta conta na frequência');

// "quem vai" com modo reservado
r = await as('authenticated', M4, 'SELECT * FROM public.activity_participants($1::uuid[])', [[sGame]]);
const hiddenEntry = r.rows?.[0]?.people?.find((p) => p.name === 'Membro');
ok(hiddenEntry && hiddenEntry.id === null && hiddenEntry.avatar_url === null, 'modo reservado aparece como "Membro", sem id e sem foto');
r = await as('authenticated', M5, 'SELECT * FROM public.activity_participants($1::uuid[])', [[sGame]]);
ok(r.rows?.[0]?.people?.some((p) => p.name === 'Bruno R.'), 'a própria pessoa se vê pelo nome mesmo no modo reservado');

// ── Riff Pro: quem vai, avaliação e perfil esportista (P5) ───────────────
console.log('Riff Pro (P5):');
const PO = 'd5000000-0000-4000-8000-000000000001'; // organizador
const PA = 'd5000000-0000-4000-8000-000000000002'; // participante que pagou
const PB = 'd5000000-0000-4000-8000-000000000003'; // participante com Pix pendente
const PC = 'd5000000-0000-4000-8000-000000000004'; // não reservou
const pPO = await newUser(PO, 'org.p5@teste.dev', 'Organizador Cinco', 'professional');
const pPA = await newUser(PA, 'ana.p5@teste.dev', 'Ana Paula Souza', 'student');
const pPB = await newUser(PB, 'beto.p5@teste.dev', 'Beto Lima', 'student');
await newUser(PC, 'caio.p5@teste.dev', 'Caio Reis', 'student');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const proSession = async (title, dayOffset) => (await one(
  `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, $3, current_date + $4::int, '07:00', 60, 'Parque da Orla', 10, 30, 'active') RETURNING id`,
  [pPO, category, title, dayOffset])).id;
const sDone = await proSession('Treino de ontem', -1);
const sNext5 = await proSession('Treino de amanhã', 1);
const proBook = async (s, pid, payment) => (await one(
  `INSERT INTO public.bookings (session_id, student_id, professional_id, amount_total, professional_payout, payment_status, status, product)
   VALUES ($1, $2, $3, 30, 30, $4, 'confirmed', 'pro') RETURNING id`, [s, pid, pPO, payment])).id;
const bA = await proBook(sDone, pPA, 'paid');
const bB = await proBook(sDone, pPB, 'pending');
const bAnext = await proBook(sNext5, pPA, 'paid');

// quem vai
const pw = (role, uid, s) => as(role, uid, 'SELECT public.pro_session_participants($1) AS r', [s]);
r = await pw('authenticated', PA, sDone);
ok(r.rows?.[0]?.r?.count === 2 && JSON.stringify(r.rows[0].r.people.map((p) => p.name)) === JSON.stringify(['Ana S.', 'Beto L.']),
  'quem reservou vê foto e nome curto de quem vai' + (r.err ? ` (${r.err})` : ''));
r = await pw('authenticated', PO, sDone);
ok(r.rows?.[0]?.r?.people?.length === 2, 'quem organiza vê quem vai');
r = await pw('authenticated', PC, sDone);
ok(r.rows?.[0]?.r?.count === 2 && r.rows[0].r.people === null, 'quem não reservou vê só a contagem');
r = await pw('anon', '', sDone);
ok(r.rows?.[0]?.r?.count === 2 && r.rows[0].r.people === null, 'visitante sem login vê só a contagem');
await q('UPDATE public.profiles SET sports_hidden = true WHERE id = $1', [pPB]);
r = await pw('authenticated', PA, sDone);
const hiddenP = r.rows?.[0]?.r?.people?.find((p) => p.name === 'Participante');
ok(hiddenP && hiddenP.id === null && hiddenP.avatar_url === null, 'modo reservado aparece como "Participante", sem id e sem foto');
await q('UPDATE public.profiles SET sports_hidden = false WHERE id = $1', [pPB]);
r = await pw('authenticated', PA, sA);
ok(r.rows?.[0]?.r === null, 'atividade do Clubes não passa por esta função');

// avaliar o organizador
const proReview = (uid, b, s, pro, rating = 5) => as('authenticated', uid,
  'INSERT INTO public.reviews (booking_id, session_id, professional_id, reviewer_id, rating, comment) VALUES ($1, $2, $3, public._profile_id(), $4, null)', [b, s, pro, rating]);
r = await proReview(PA, bA, sDone, pPO);
ok(!r.err, 'quem pagou e foi pode avaliar sem o organizador encerrar a atividade' + (r.err ? ` (${r.err})` : ''));
r = await proReview(PB, bB, sDone, pPO);
ok(!!r.err, 'com Pix pendente ainda não avalia');
r = await proReview(PA, bAnext, sNext5, pPO);
ok(!!r.err, 'atividade que não aconteceu não é avaliada');
await q("UPDATE public.bookings SET attendance_status = 'absent' WHERE id = $1", [bB]);
await q("UPDATE public.bookings SET payment_status = 'paid' WHERE id = $1", [bB]);
r = await proReview(PB, bB, sDone, pPO);
ok(!!r.err, 'quem foi marcado como ausente não avalia');

// perfil esportista pessoal
r = await as('authenticated', PA, 'SELECT public.my_pro_sports_profile() AS p');
const sp = r.rows?.[0]?.p;
ok(sp?.games === 1 && sp?.sports?.length === 1 && sp?.reviews_given === 1, 'perfil esportista pessoal: jogos, esportes e avaliações dadas' + (r.err ? ` (${r.err})` : ''));
const fiel = sp?.achievements?.find((a) => a.key === 'fiel');
ok(fiel?.current === 1 && fiel?.detail === 'Organizador C.', 'conquista "Fiel" conta atividades com o mesmo organizador');
r = await as('authenticated', PB, 'SELECT public.my_pro_sports_profile() AS p');
ok(r.rows?.[0]?.p?.games === 0 && r.rows[0].p.attendance === 0, 'ausência não conta como jogo e pesa na frequência');
r = await as('anon', '', 'SELECT public.my_pro_sports_profile() AS p');
ok(!!r.err, 'visitante sem login não chama o perfil esportista');

// painel conta só o Pro
r = await as('authenticated', IA, 'SELECT public.get_professional_dashboard() AS d');
ok(r.rows?.[0]?.d?.total_sessions === 0, 'painel do organizador não soma atividades do Clubes' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', PO, 'SELECT public.get_professional_dashboard() AS d');
ok(r.rows?.[0]?.d?.total_sessions === 2 && Number(r.rows[0].d.total_revenue) === 90, 'painel do organizador conta as atividades e a receita do Pro');

// ── Script de métricas do dono do produto ──────────────────────────────
console.log('Métricas:');
try {
  const rows = (await q(fs.readFileSync(path.resolve('scripts/metrics.sql'), 'utf8').replace(/;\s*$/, ''))).rows;
  ok(rows.length === 3 && rows[0].product === 'pro', 'scripts/metrics.sql roda e traz pro, clubes e sports');
} catch (e) {
  ok(false, 'scripts/metrics.sql roda (' + e.message + ')');
}

// ── Riff Pro (P6): área de atuação "organizador" ────────────────────────
console.log('Riff Pro (P6):');
r = await as('authenticated', PO, "UPDATE public.profiles SET professional_type = 'organizer' WHERE user_id = auth.uid() RETURNING professional_type");
ok(r.rows?.[0]?.professional_type === 'organizer', 'organizador salva "Organizador(a)" como área de atuação' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', PO, "UPDATE public.profiles SET professional_type = 'astronauta' WHERE user_id = auth.uid()");
ok(!!r.err, 'área de atuação fora da lista continua barrada');

// ── Horário das atividades no fuso de Brasília (migration 0018) ─────────
console.log('Horário de Brasília:');
await ex("SET timezone = 'UTC'"); // como no Supabase
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
// atividade do Pro que começa daqui a N horas, no horário de Brasília
const spSession = async (title, hours, status = 'active') => (await one(
  `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, $3, (public.now_sp() + make_interval(hours => $4))::date, (public.now_sp() + make_interval(hours => $4))::time, 60,
           'Parque da Orla', 10, 0, $5) RETURNING id`,
  [pPO, category, title, hours, status])).id;
const book = async (uid, s) => (await as('authenticated', uid, 'SELECT public.create_booking($1) AS r', [s])).rows?.[0]?.r;
r = await book(PC, await spSession('Começa em 1 hora', 1));
ok(r?.success === true, 'inscrição aberta até a hora do início (começa em 1 hora)' + (r?.success ? '' : ` (${r?.code})`));
r = await book(PC, await spSession('Começou há 1 hora', -1));
ok(r?.code === 'session_started', 'atividade que já começou não aceita inscrição');
r = await book(PC, await spSession('Cancelada', 5, 'cancelled'));
ok(r?.code === 'session_unavailable', 'atividade cancelada não aceita inscrição');
r = await book(PC, await spSession('Concluída', -30, 'completed'));
ok(r?.code === 'session_unavailable', 'atividade concluída não aceita inscrição');
const s5h = await spSession('Começa em 5 horas', 5);
r = await book(PC, s5h);
r = await as('authenticated', PC, "UPDATE public.bookings SET status = 'cancelled_by_student', cancelled_at = now() WHERE id = $1", [r?.booking_id]);
ok(!r.err, 'cancelar com 5 horas de antecedência é permitido' + (r.err ? ` (${r.err})` : ''));
const s3h = await spSession('Começa em 3 horas', 3);
const b3h = (await book(PC, s3h))?.booking_id;
r = await as('authenticated', PC, "UPDATE public.bookings SET status = 'cancelled_by_student', cancelled_at = now() WHERE id = $1", [b3h]);
ok(!!r.err && /late_cancellation/.test(r.err), 'a menos de 4 horas o cancelamento é barrado');
await ex('RESET timezone');

// ── Porta de organizador (migration 0019) ────────────────────────────────
console.log('Virar organizador:');
const become = (uid, over = {}) => {
  const a = { name: 'Caio Reis', tax: '529.982.247-25', birth: '1990-05-10', whats: '(51) 99999-0000', type: 'organizer', cred: null, credNum: null,
    city: 'Porto Alegre', bio: 'Organizo vôlei de praia aos sábados.', pixType: 'email', pix: 'caio@teste.dev', ...over };
  return as('authenticated', uid, 'SELECT public.become_organizer($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) AS r',
    [a.name, a.tax, a.birth, a.whats, a.type, a.cred, a.credNum, a.city, a.bio, a.pixType, a.pix]);
};
const insertPro = (uid, pid) => as('authenticated', uid,
  `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
   VALUES ($1, $2, 'Treino novo', current_date + 3, '08:00', 60, 'Parque da Orla', 10, 30, 'active') RETURNING id`, [pid, category]);
const pPC = (await one('SELECT id FROM public.profiles WHERE user_id = $1', [PC])).id;
const okCode = (res, code) => !!res.err && res.err.includes(code);

r = await as('authenticated', PC, "UPDATE public.profiles SET role = 'professional' WHERE user_id = auth.uid()");
ok(!!r.err, 'participante não muda o próprio papel direto na tabela');
r = await insertPro(PC, pPC);
ok(okCode(r, 'organizer_profile_incomplete'), 'participante não cria atividade do Pro direto pela API');
r = await become(PC);
ok(okCode(r, 'organizer_terms_required'), 'sem aceitar o Termo do Organizador não vira organizador');
r = await as('authenticated', PC, "INSERT INTO public.legal_acceptances (profile_id, document, version) VALUES ($1, 'organizer_terms', 'teste')", [pPC]);
ok(!r.err, 'participante registra o aceite do Termo do Organizador' + (r.err ? ` (${r.err})` : ''));
r = await become(PC, { name: 'Caio' });
ok(okCode(r, 'full_name_required'), 'sem sobrenome não vira organizador');
r = await become(PC, { tax: '123.456.789-00' });
ok(okCode(r, 'tax_id_invalid'), 'CPF com dígito verificador errado é recusado');
r = await become(PC, { tax: '111.111.111-11' });
ok(okCode(r, 'tax_id_invalid'), 'CPF de números repetidos é recusado');
r = await as('authenticated', PC, "SELECT public.become_organizer('Caio Reis', '529.982.247-25', (public.now_sp()::date - interval '17 years')::date, '51999990000', 'organizer', null, null, 'Porto Alegre', 'Organizo vôlei de praia aos sábados.', 'email', 'caio@teste.dev') AS r");
ok(okCode(r, 'underage'), 'menor de 18 anos não vira organizador');
r = await become(PC, { whats: '123' });
ok(okCode(r, 'whatsapp_required'), 'sem celular válido não vira organizador');
r = await become(PC, { pix: '' });
ok(okCode(r, 'pix_required'), 'sem chave Pix não vira organizador');
r = await become(PC, { bio: 'oi' });
ok(okCode(r, 'bio_too_short'), 'sem apresentação não vira organizador');
r = await become(PC, { type: 'astronauta' });
ok(!!r.err, 'área de atuação fora da lista é barrada');
r = await become(PC, { cred: 'CREF', credNum: '123456-G/RS' });
const pcRow = await one(`SELECT p.role, p.full_name, p.credential_number, pp.tax_id, pp.tax_id_type, pp.birth_date, pp.whatsapp_number, pp.pix_key
  FROM public.profiles p JOIN public.profile_private pp ON pp.profile_id = p.id WHERE p.id = $1`, [pPC]);
ok(r.rows?.[0]?.r?.success === true && pcRow.role === 'professional' && pcRow.tax_id === '52998224725' && pcRow.tax_id_type === 'cpf'
  && pcRow.whatsapp_number === '51999990000' && pcRow.pix_key === 'caio@teste.dev', 'com termo e cadastro completo a conta vira organizadora' + (r.err ? ` (${r.err})` : ''));
ok(pcRow.credential_number === '123456-G/RS', 'registro profissional vai para a vitrine pública');
r = await as('authenticated', PB, 'SELECT tax_id, birth_date FROM public.profile_private WHERE profile_id = $1', [pPC]);
ok(!r.err && r.rows.length === 0, 'CPF e nascimento não são lidos por outra conta');
r = await insertPro(PC, pPC);
ok(!r.err, 'organizador completo publica atividade do Pro' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', PC, 'SELECT public.my_organizer_missing() AS m');
ok(Array.isArray(r.rows?.[0]?.m) && r.rows[0].m.length === 0, 'app vê que não falta nada');
r = await as('authenticated', PC, 'SELECT public.create_booking($1) AS r', [await spSession('Jogo de outro organizador', 6)]);
ok(r.rows?.[0]?.r?.success === true, 'organizador continua podendo reservar atividades de outros');

// CPF de outra conta e CNPJ
await q("INSERT INTO public.legal_acceptances (profile_id, document, version) VALUES ($1, 'organizer_terms', 'teste')", [pPB]);
r = await become(PB, { name: 'Beto Lima' });
ok(okCode(r, 'tax_id_in_use'), 'o mesmo CPF não serve para duas contas');
r = await become(PB, { name: 'Beto Lima', tax: '11.222.333/0001-81' });
ok(r.rows?.[0]?.r?.success === true && (await one('SELECT tax_id_type FROM public.profile_private WHERE profile_id = $1', [pPB])).tax_id_type === 'cnpj',
  'CNPJ válido também é aceito' + (r.err ? ` (${r.err})` : ''));

// organizador antigo completa ao publicar
r = await as('authenticated', PO, 'SELECT public.my_organizer_missing() AS m');
const poMissing = r.rows?.[0]?.m ?? [];
ok(poMissing.includes('tax_id') && poMissing.includes('birth_date'), 'organizador antigo vê o que falta (' + poMissing.join(', ') + ')');
r = await insertPro(PO, pPO);
ok(okCode(r, 'organizer_profile_incomplete'), 'organizador antigo sem os dados novos não publica');
r = await as('anon', '', "SELECT public.become_organizer('A B', '52998224725', '1990-01-01', '51999990000', 'organizer', null, null, 'X', 'xxxxxxxxxxxx', 'email', 'a@b.cd') AS r");
ok(!!r.err, 'visitante sem login não chama a função');

// ── Coordenadas dos locais (migration 0020) ─────────────────────────────
console.log('Coordenadas dos locais:');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const geoSession = async (name, address, lat, lng, extra = {}) => one(
  `INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, duration_minutes, location_name, location_address,
     latitude, longitude, meeting_point, max_participants, price_per_slot, status)
   VALUES ($1, $2, 'Treino', current_date + 2, '07:00', 60, $3, $4, $5, $6, $7, 10, 0, 'active') RETURNING id, venue_id, latitude, longitude`,
  [pPO, category, name, address, lat, lng, extra.meeting ?? null]);
const g1 = await geoSession('Parque Farroupilha', 'Av. José Bonifácio, Porto Alegre', -30.03703, -51.21559, { meeting: 'Perto do chafariz' });
const v1 = await one('SELECT latitude, longitude FROM public.venues WHERE id = $1', [g1.venue_id]);
ok(Number(v1.latitude) === -30.03703 && Number(v1.longitude) === -51.21559, 'local novo guarda a coordenada escolhida');
const g2 = await geoSession('Parque Farroupilha', 'Av. José Bonifácio, Porto Alegre', null, null);
ok(g2.venue_id === g1.venue_id && Number(g2.latitude) === -30.03703, 'atividade no mesmo local herda a coordenada');
const g3 = await geoSession('Praça da Encol', 'Rua Bagé, Porto Alegre', null, null);
ok(g3.latitude === null, 'local sem coordenada continua sem (o texto segue valendo)');
const g4 = await geoSession('Praça da Encol', 'Rua Bagé, Porto Alegre', -30.0248, -51.1846);
ok(Number((await one('SELECT latitude FROM public.venues WHERE id = $1', [g3.venue_id])).latitude) === -30.0248 && g4.venue_id === g3.venue_id,
  'local antigo sem coordenada aproveita a primeira que chegar');
ok((await one('SELECT meeting_point FROM public.sessions WHERE id = $1', [g1.id])).meeting_point === 'Perto do chafariz', 'ponto de encontro fica na atividade');
let geoErr = null;
try { await geoSession('Lugar estranho', 'X', 200, 10); } catch (e) { geoErr = e.message; }
ok(!!geoErr && geoErr.includes('coordinates_valid'), 'coordenada impossível é recusada');
geoErr = null;
try { await geoSession('Meio ponto', 'Y', -30, null); } catch (e) { geoErr = e.message; }
ok(!!geoErr, 'latitude sem longitude é recusada');

// ── Localização da comunidade (migration 0021) ──────────────────────────
console.log('Sede da comunidade:');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const sedeA = (await one("SELECT public.admin_set_community_location($1, 'Rua das Flores, 100', 'Porto Alegre', 'rs', -30.05, -51.2) AS id", [orgA])).id;
const sedeRow = await one('SELECT v.visibility, v.kind, v.state, v.latitude, o.main_venue_id FROM public.venues v JOIN public.organizations o ON o.id = v.organization_id WHERE v.id = $1', [sedeA]);
ok(sedeRow.main_venue_id === sedeA && sedeRow.visibility === 'members' && sedeRow.kind === 'condo' && sedeRow.state === 'RS',
  'equipe Riff grava a sede do condomínio (visível só para membros)');
await one("SELECT public.admin_set_community_location($1, 'Rua das Flores, 120', 'Porto Alegre', 'RS', -30.051, -51.201) AS id", [orgA]);
ok((await count('SELECT count(*)::int AS n FROM public.venues WHERE organization_id = $1 AND name = $2', [orgA, 'Residencial Jardins'])) === 1,
  'corrigir o endereço atualiza a mesma sede, sem duplicar');
r = await as('authenticated', GA, 'SELECT id, address FROM public.venues WHERE id = $1', [sedeA]);
ok(r.rows?.length === 1 && r.rows[0].address === 'Rua das Flores, 120', 'membro da comunidade vê a sede');
r = await as('authenticated', MB, 'SELECT id FROM public.venues WHERE id = $1', [sedeA]);
ok(!r.err && r.rows.length === 0, 'quem é de outra comunidade não vê a sede');
r = await as('authenticated', PO, 'SELECT id FROM public.venues WHERE id = $1', [sedeA]);
ok(!r.err && r.rows.length === 0, 'organizador do Pro não vê a sede');
r = await as('anon', '', 'SELECT id FROM public.venues WHERE id = $1', [sedeA]);
ok(!r.err && r.rows.length === 0, 'visitante sem login não vê a sede');
r = await as('authenticated', GA, "SELECT public.admin_set_community_location($1, 'X', 'Y', 'RS', 1, 1)", [orgA]);
ok(r.err && /permission denied/.test(r.err), 'app não grava a localização da comunidade');
const orgC = (await one(`SELECT public.admin_create_community('Condomínio Bela Vista', 'condo', 'gestor.a@teste.dev',
  'Av. Ipiranga, 5000', 'Porto Alegre', 'RS', -30.06, -51.17) AS id`)).id;
ok(!!(await one('SELECT main_venue_id FROM public.organizations WHERE id = $1', [orgC])).main_venue_id, 'comunidade nova já nasce com a sede');
let sedeErr = null;
try { await one("SELECT public.admin_set_community_location($1, 'Rua A', 'POA', 'RS', -30, NULL)", [orgC]); } catch (e) { sedeErr = e.message; }
ok(!!sedeErr, 'latitude sem longitude é recusada');
// condomínio C: um jogo que já aconteceu, com 2 dependentes que jogaram
const sPastC = (await one(`INSERT INTO public.sessions (professional_id, category_id, organization_id, title, date, start_time, duration_minutes,
  location_name, max_participants, price_per_slot, status, minors_allowed) VALUES ($1, $2, $3, 'Natação kids', current_date - 3, '09:00', 60, 'Piscina', 10, 0, 'active', true) RETURNING id`,
  [pGA, category, orgC])).id;
for (const nome of ['Ana Kids', 'Bia Kids']) {
  const dep = (await one(`INSERT INTO public.dependents (guardian_id, full_name, birth_date, relationship, consent_version) VALUES ($1, $2, current_date - 3000, 'child', 'teste') RETURNING id`, [pGA, nome])).id;
  await q(`INSERT INTO public.bookings (session_id, student_id, dependent_id, professional_id, amount_total, professional_payout, payment_status, status, attendance_status, product)
    VALUES ($1, $2, $3, $2, 0, 0, 'free', 'confirmed', 'present', 'clubes')`, [sPastC, pGA, dep]);
}
const commIns = (await q('SELECT * FROM public.admin_community_insights(3650)')).rows;
const insA = commIns.find((x) => x.organization_id === orgA);
ok(insA && insA.city === 'Porto Alegre' && Number(insA.members) >= 1 && Array.isArray(insA.sports), 'retrato da comunidade: cidade, membros e esportes');
ok(commIns.find((x) => x.organization_id === orgC)?.dependents === 'menos de 5', 'com 2 dependentes que jogaram, o retrato mostra só "menos de 5"');
ok(commIns.length > 0 && commIns.every((x) => x.dependents === '0' || x.dependents === 'menos de 5' || Number(x.dependents) >= 5), 'dependentes só aparecem em faixa (nunca 1 a 4)');
r = await as('authenticated', GA, 'SELECT * FROM public.admin_community_insights()');
ok(r.err && /permission denied/.test(r.err), 'retrato é só da equipe Riff (o app não acessa)');

// ── Espaços da comunidade (migration 0022) ──────────────────────────────
console.log('Espaços da comunidade:');
const MS = 'c6000000-0000-4000-8000-000000000001'; // morador ativo do condomínio A
const pMS = await newUser(MS, 'morador.espacos@teste.dev', 'Morador Espaços', 'student');
await q("INSERT INTO public.organization_members (organization_id, profile_id, role) VALUES ($1, $2, 'member')", [orgA, pMS]);
const saveSpace = (uid, org, space, name, kind = 'tennis', rules = null) =>
  as('authenticated', uid, 'SELECT public.save_community_space($1, $2, $3, $4, $5) AS id', [org, space, name, kind, rules]);
r = await saveSpace(GA, orgA, null, 'Quadra de tênis 1', 'tennis', 'Tênis só com sapato de quadra');
const quadra1 = r.rows?.[0]?.id;
ok(!!quadra1 && (await one('SELECT official, visibility FROM public.venues WHERE id = $1', [quadra1])).visibility === 'members', 'gestor cria espaço oficial (visível só para membros)' + (r.err ? ` (${r.err})` : ''));
r = await saveSpace(MS, orgA, null, 'Piscina', 'pool');
ok(r.err && /forbidden/.test(r.err), 'morador não cria espaço');
r = await saveSpace(GB, orgA, null, 'Piscina', 'pool');
ok(r.err && /forbidden/.test(r.err), 'gestor de outra comunidade não cria espaço');
r = await saveSpace(GA, orgA, null, 'quadra de TÊNIS 1');
ok(r.err && /space_name_taken/.test(r.err), 'não repete o nome de um espaço');
// local digitado à mão antes vira o espaço oficial (o histórico fica)
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const sOld = (await one(`INSERT INTO public.sessions (professional_id, category_id, organization_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
  VALUES ($1, $2, $3, 'Natação antiga', current_date - 10, '08:00', 60, 'Piscina', 10, 0, 'active') RETURNING venue_id`, [pGA, category, orgA])).venue_id;
r = await saveSpace(GA, orgA, null, 'piscina', 'pool');
ok(r.rows?.[0]?.id === sOld, 'local já usado com o mesmo nome vira o espaço oficial');
// conflito de horário
const inSpace = (title, date, time, minutes) => one(`INSERT INTO public.sessions (professional_id, category_id, organization_id, venue_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
  VALUES ($1, $2, $3, $4, $5, current_date + $6::int, $7, $8, 'Quadra de tênis 1', 10, 0, 'active') RETURNING id`, [pGA, category, orgA, quadra1, title, date, time, minutes]);
const tA = (await inSpace('Aula de tênis', 5, '08:00', 60)).id;
const conf = (uid, time, minutes, exclude = null) => as('authenticated', uid, 'SELECT * FROM public.space_conflicts($1, current_date + 5, $2, $3, $4)', [quadra1, time, minutes, exclude]);
r = await conf(MS, '08:30', 60);
ok(r.rows?.length === 1 && r.rows[0].title === 'Aula de tênis', 'avisa conflito no mesmo espaço e horário');
r = await conf(GA, '09:00', 60);
ok(!r.err && r.rows.length === 0, 'começar quando o outro termina não é conflito');
r = await conf(GA, '07:00', 60);
ok(!r.err && r.rows.length === 0, 'terminar quando o outro começa não é conflito');
r = await conf(GA, '08:00', 60, tA);
ok(!r.err && r.rows.length === 0, 'editando a própria atividade não acusa conflito com ela mesma');
await q("UPDATE public.sessions SET status = 'cancelled' WHERE id = $1", [tA]);
r = await conf(GA, '08:30', 60);
ok(!r.err && r.rows.length === 0, 'atividade cancelada não ocupa o espaço');
r = await conf(MB, '08:30', 60);
ok(r.err && /forbidden/.test(r.err), 'quem é de outra comunidade não consulta o espaço');
// espaço de outra comunidade não pode ser usado
let crossErr = null;
try {
  await one(`INSERT INTO public.sessions (professional_id, category_id, organization_id, venue_id, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
    VALUES ($1, $2, $3, $4, 'Invasão', current_date + 6, '10:00', 60, 'Quadra', 10, 0, 'active')`, [pGA, category, orgB, quadra1]);
} catch (e) { crossErr = e.message; }
ok(!!crossErr && crossErr.includes('venue_other_organization'), 'atividade não usa espaço de outra comunidade');
// arquivar
r = await as('authenticated', GA, 'SELECT public.archive_community_space($1)', [quadra1]);
ok(!r.err && (await one('SELECT archived_at FROM public.venues WHERE id = $1', [quadra1])).archived_at !== null, 'gestor arquiva espaço' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', MS, 'SELECT public.archive_community_space($1, false)', [quadra1]);
ok(r.err && /forbidden/.test(r.err), 'morador não arquiva espaço');
r = await saveSpace(GA, orgA, null, 'Quadra de tênis 1');
ok(r.rows?.[0]?.id === quadra1 && (await one('SELECT archived_at FROM public.venues WHERE id = $1', [quadra1])).archived_at === null, 'recriar com o mesmo nome traz o espaço arquivado de volta');

// ── Pedido de comunidade (migration 0023) ───────────────────────────────
console.log('Pedido de comunidade:');
const R1 = 'c7000000-0000-4000-8000-000000000001';
const R2 = 'c7000000-0000-4000-8000-000000000002';
const pR1 = await newUser(R1, 'morador.pede@teste.dev', 'Rita Pede', 'student');
await newUser(R2, 'vizinho.quer@teste.dev', 'Vito Quer', 'student');
const near = (uid, lat, lng) => as('authenticated', uid, 'SELECT * FROM public.communities_near($1, $2)', [lat, lng]);
const submit = (uid, lat, lng, over = {}) => as('authenticated', uid,
  'SELECT public.submit_community_request($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11) AS id',
  [over.name ?? 'Residencial Aurora', 'condo', 'Rua Teste, 10', 'Porto Alegre', 'rs', lat, lng,
   JSON.stringify(over.infra ?? { tennis: 2, pool: 1, bogus: 5, gym: 30 }), 120, over.role ?? 'morador', over.contact ?? 'Síndico João (51) 99999-0000']);

// comunidade que já existe por perto (sede do condomínio A em -30.051, -51.201)
r = await near(R1, -30.0513, -51.2012);
ok(r.rows?.[0]?.type === 'community' && r.rows[0].id === orgA && r.rows[0].distance_m < 150, 'acha a comunidade que já existe a menos de 150 m');
r = await near(R1, -30.06, -51.25);
ok(!r.err && r.rows.length === 0, 'longe de tudo, não acha nada');
r = await submit(R1, -30.0513, -51.2012);
ok(r.err && /community_exists/.test(r.err), 'não cria pedido onde já existe comunidade');
r = await as('authenticated', R1, 'SELECT public.request_to_join($1)', [orgA]);
ok(!r.err, 'pede para entrar na comunidade que já existe' + (r.err ? ` (${r.err})` : ''));
r = await near(R1, -30.0513, -51.2012);
ok(r.rows?.[0]?.requested === true, 'o app sabe que o pedido para entrar já foi feito');
const jr = await as('authenticated', GA, "SELECT id FROM public.community_join_requests WHERE organization_id = $1 AND status = 'pending'", [orgA]);
ok(jr.rows?.length === 1, 'gestor vê o pedido para entrar');
r = await as('authenticated', MS, "SELECT id FROM public.community_join_requests WHERE organization_id = $1", [orgA]);
ok(!r.err && r.rows.length === 0, 'morador comum não vê pedidos para entrar');
r = await as('authenticated', MS, 'SELECT public.answer_join_request($1, true)', [jr.rows[0].id]);
ok(r.err && /forbidden/.test(r.err), 'morador comum não aceita pedido');
r = await as('authenticated', GA, 'SELECT public.answer_join_request($1, true)', [jr.rows[0].id]);
ok(!r.err && (await one('SELECT status, role FROM public.organization_members WHERE organization_id = $1 AND profile_id = $2', [orgA, pR1])).status === 'active',
  'gestor aceita e a pessoa vira membro' + (r.err ? ` (${r.err})` : ''));

// pedido novo
r = await submit(R1, -30.10, -51.25);
const reqId = r.rows?.[0]?.id;
const reqRow = reqId ? await one('SELECT infrastructure, state, status FROM public.community_requests WHERE id = $1', [reqId]) : null;
ok(reqRow?.status === 'pending' && JSON.stringify(reqRow.infrastructure) === JSON.stringify({ pool: 1, tennis: 2 }) && reqRow.state === 'RS',
  'pedido guarda só a infraestrutura válida (tipos conhecidos, de 1 a 20)' + (r.err ? ` (${r.err})` : ''));
r = await near(R2, -30.1003, -51.2501);
ok(r.rows?.[0]?.type === 'request' && r.rows[0].id === reqId, 'vizinho vê que o condomínio já foi pedido');
r = await submit(R2, -30.1003, -51.2501);
ok(r.err && /request_exists/.test(r.err), 'não cria pedido repetido no mesmo lugar');
r = await as('authenticated', R2, 'SELECT public.support_community_request($1)', [reqId]);
ok(!r.err, 'vizinho registra que também quer' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', R2, 'SELECT id, sindico_contact FROM public.community_requests WHERE id = $1', [reqId]);
ok(!r.err && r.rows.length === 0, 'vizinho não lê o pedido de outra pessoa (nem o contato do síndico)');
r = await as('anon', '', 'SELECT * FROM public.communities_near(-30.1, -51.25)');
ok(!!r.err, 'visitante sem login não consulta comunidades por perto');
r = await submit(R1, -30.20, -51.30, { name: 'Outro 1' });
r = await submit(R1, -30.30, -51.35, { name: 'Outro 2' });
const lastReq = r.rows?.[0]?.id;
r = await submit(R1, -30.40, -51.40, { name: 'Outro 3' });
ok(r.err && /too_many_requests/.test(r.err), 'no máximo 3 pedidos pendentes por pessoa');
r = await as('authenticated', R1, 'SELECT public.cancel_community_request($1)', [lastReq]);
ok(!r.err && (await one('SELECT status FROM public.community_requests WHERE id = $1', [lastReq])).status === 'cancelled', 'quem pediu pode desistir');

// equipe Riff
const listed = (await q('SELECT * FROM public.admin_list_community_requests()')).rows.find((x) => x.id === reqId);
ok(listed?.interested === 1 && listed.requester_email === 'morador.pede@teste.dev', 'equipe lista os pedidos com quem pediu e quantos também querem');
r = await as('authenticated', GA, 'SELECT public.admin_approve_community_request($1)', [reqId]);
ok(r.err && /permission denied/.test(r.err), 'o app não aprova pedido');
const newOrg = (await one('SELECT public.admin_approve_community_request($1) AS id', [reqId])).id;
const spacesNew = (await q('SELECT name FROM public.venues WHERE organization_id = $1 AND official ORDER BY name', [newOrg])).rows.map((x) => x.name);
ok(JSON.stringify(spacesNew) === JSON.stringify(['Piscina', 'Quadra de tênis 1', 'Quadra de tênis 2']), 'aprovação cria os espaços a partir da infraestrutura (' + spacesNew.join(', ') + ')');
const newOrgRow = await one('SELECT o.main_venue_id, m.role FROM public.organizations o JOIN public.organization_members m ON m.organization_id = o.id AND m.profile_id = $2 WHERE o.id = $1', [newOrg, pR1]);
ok(!!newOrgRow.main_venue_id && newOrgRow.role === 'owner', 'comunidade nasce com a sede, e quem pediu vira responsável (sem outro e-mail)');
ok((await one('SELECT status, organization_id FROM public.community_requests WHERE id = $1', [reqId])).organization_id === newOrg, 'pedido fica aprovado e ligado à comunidade');
let apprErr = null;
try { await one('SELECT public.admin_approve_community_request($1)', [reqId]); } catch (e) { apprErr = e.message; }
ok(!!apprErr, 'pedido aprovado não é aprovado de novo');

// ── Esportes: lista e "não achei" (migration 0024) ──────────────────────
console.log('Esportes:');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
ok((await count("SELECT count(*)::int AS n FROM public.categories WHERE slug IN ('volei-quadra', 'tenis-mesa', 'pickleball', 'escalada', 'capoeira', 'ultimate')")) === 6,
  'esportes que faltavam entram na lista oficial');
const outros = (await one("SELECT id FROM public.categories WHERE slug = 'outros'")).id;
const otherSport = (name) => one(`INSERT INTO public.sessions (professional_id, category_id, sport_other, title, date, start_time, duration_minutes, location_name, max_participants, price_per_slot, status)
  VALUES ($1, $2, $3, 'Treino livre', current_date + 4, '19:00', 60, 'Ginásio', 10, 0, 'active') RETURNING id`, [pPO, outros, name]);
const h1 = (await otherSport('Hóquei')).id;
const h2 = (await otherSport('  hoquei ')).id;
await otherSport('Tennis');
let spErr = null;
try { await otherSport('x'); } catch (e) { spErr = e.message; }
ok(!!spErr, 'nome de esporte com menos de 2 letras é recusado');
const sugg = (await q('SELECT * FROM public.admin_sport_suggestions()')).rows;
const hoquei = sugg.find((x) => x.name.trim().toLowerCase().startsWith('h'));
ok(hoquei?.activities === 2 && hoquei.organizers === 1, 'sugestões juntam o mesmo nome com e sem acento ("Hóquei" e "hoquei")');
const moved = (await one("SELECT public.admin_promote_sport('hoquei', 'hoquei', 'Hóquei') AS n")).n;
const hq = await one("SELECT id, name FROM public.categories WHERE slug = 'hoquei'");
const movedRows = (await q('SELECT category_id, sport_other FROM public.sessions WHERE id IN ($1, $2)', [h1, h2])).rows;
ok(moved === 2 && hq?.name === 'Hóquei' && movedRows.every((x) => x.category_id === hq.id && x.sport_other === null),
  'promover cria o esporte oficial e move as atividades que usaram o nome');
// em produção o Tênis já existe (veio da base inicial); aqui criamos para o teste
await q("INSERT INTO public.categories (name, slug, sort_order) VALUES ('Tênis', 'tenis', 17) ON CONFLICT DO NOTHING");
const tenisCount = await count("SELECT count(*)::int AS n FROM public.categories WHERE slug = 'tenis'");
ok((await one("SELECT public.admin_promote_sport('Tennis', 'tenis') AS n")).n === 1 && tenisCount === 1
  && (await count("SELECT count(*)::int AS n FROM public.categories WHERE slug = 'tenis'")) === 1,
  'nome escrito de outro jeito ("Tennis") é juntado ao esporte que já existe (Tênis), sem duplicar');
let slugErr = null;
try { await one("SELECT public.admin_promote_sport('Algo', 'Slug Ruim')"); } catch (e) { slugErr = e.message; }
ok(!!slugErr, 'slug inválido é recusado');
r = await as('authenticated', PO, 'SELECT * FROM public.admin_sport_suggestions()');
ok(r.err && /permission denied/.test(r.err), 'o app não lê as sugestões nem promove esportes');

// ── Segurança: perfis e avaliações (migration 0025) ─────────────────────
console.log('Segurança: perfis e avaliações:');
const XS = 'c8000000-0000-4000-8000-000000000001'; // conta sem nenhuma relação
const pXS = await newUser(XS, 'estranho@teste.dev', 'Estranho Qualquer', 'student');
const VIT = 'id, full_name, avatar_url, public_slug, rating_avg';
const seeProfile = (role, uid, pid, cols = VIT) => as(role, uid, `SELECT ${cols} FROM public.profiles WHERE id = $1`, [pid]);
r = await seeProfile('anon', '', pPA);
ok(!r.err && r.rows.length === 0, 'visitante não vê perfil de participante');
r = await seeProfile('anon', '', pPO);
ok(r.rows?.length === 1, 'visitante vê a vitrine do organizador');
r = await seeProfile('anon', '', pPO, 'user_id');
ok(!!r.err && /permission denied/.test(r.err), 'visitante não lê o id de login do organizador');
r = await as('anon', '', 'SELECT * FROM public.profiles LIMIT 1');
ok(!!r.err, 'visitante não consegue "SELECT *" em perfis (só colunas da vitrine)');
r = await as('anon', '', 'SELECT deleted_at, sports_hidden FROM public.profiles LIMIT 1');
ok(!!r.err, 'visitante não lê exclusão nem modo reservado');
r = await as('anon', '', "SELECT count(*)::int AS n FROM public.profiles WHERE role = 'student'");
ok(r.rows?.[0]?.n === 0, 'visitante não lista participantes');
r = await seeProfile('authenticated', XS, pPA);
ok(!r.err && r.rows.length === 0, 'conta sem relação não vê perfil de participante');
r = await seeProfile('authenticated', XS, pPO);
ok(r.rows?.length === 1, 'conta logada vê a vitrine do organizador');
r = await seeProfile('authenticated', XS, pXS, 'id, user_id, sports_hidden');
ok(r.rows?.length === 1, 'a pessoa vê o próprio perfil completo');
r = await seeProfile('authenticated', PO, pPA);
ok(r.rows?.length === 1, 'organizador vê quem reservou com ele');
r = await as('authenticated', PO, 'SELECT b.id, s.full_name FROM public.bookings b JOIN public.profiles s ON s.id = b.student_id WHERE b.professional_id = $1', [pPO]);
ok(r.rows?.length >= 1 && r.rows.every((x) => x.full_name), 'lista de inscritos do organizador continua com os nomes');
r = await seeProfile('authenticated', MS, pGA);
ok(r.rows?.length === 1, 'membro vê quem é da mesma comunidade');
r = await seeProfile('authenticated', MB, pMS);
ok(!r.err && r.rows.length === 0, 'quem é de outra comunidade não vê o perfil');
r = await as('authenticated', XS, 'SELECT public.request_to_join($1)', [orgA]);
r = await seeProfile('authenticated', GA, pXS);
ok(r.rows?.length === 1, 'gestor vê quem pediu para entrar na comunidade');
r = await as('anon', '', 'SELECT public.can_see_profile($1) AS v', [pPA]);
ok(r.rows?.[0]?.v === false, 'para o visitante, a regra de visibilidade sempre responde "não"');

// avaliações
r = await as('anon', '', 'SELECT * FROM public.reviews');
ok(!r.err && r.rows.length === 0, 'visitante não lê a tabela de avaliações (quem avaliou e qual reserva)');
r = await as('authenticated', XS, 'SELECT * FROM public.reviews');
ok(!r.err && r.rows.length === 0, 'conta sem relação não lê avaliações dos outros');
r = await as('authenticated', PA, 'SELECT id FROM public.reviews WHERE reviewer_id = $1', [pPA]);
ok(r.rows?.length >= 1, 'quem avaliou vê a própria avaliação');
r = await as('authenticated', PO, 'SELECT id FROM public.reviews WHERE professional_id = $1', [pPO]);
ok(r.rows?.length >= 1, 'organizador vê as avaliações que recebeu');
r = await as('anon', '', 'SELECT * FROM public.public_reviews($1)', [pPO]);
const pubRev = r.rows?.[0];
ok(pubRev && pubRev.reviewer_name === 'Ana S.' && !('reviewer_id' in pubRev) && !('booking_id' in pubRev),
  'vitrine pública mostra a avaliação com primeiro nome e inicial, sem quem avaliou nem a reserva' + (r.err ? ` (${r.err})` : ''));
await q('UPDATE public.profiles SET sports_hidden = true WHERE id = $1', [pPA]);
r = await as('anon', '', 'SELECT reviewer_name, reviewer_avatar FROM public.public_reviews($1)', [pPO]);
ok(r.rows?.[0]?.reviewer_name === 'Participante' && r.rows[0].reviewer_avatar === null, 'modo reservado aparece como "Participante", sem foto, na vitrine');
await q('UPDATE public.profiles SET sports_hidden = false WHERE id = $1', [pPA]);
r = await as('anon', '', 'SELECT * FROM public.public_reviews($1)', [pPA]);
ok(!r.err && r.rows.length === 0, 'avaliações só saem para perfil de organizador');

// ── Segurança: locais e fotos (migration 0026) ──────────────────────────
console.log('Segurança: locais e fotos:');
await ex("SELECT set_config('request.jwt.claim.sub', '', false)");
const oldVenue = (await one(`INSERT INTO public.sessions (professional_id, category_id, title, date, start_time, duration_minutes, location_name, location_address, max_participants, price_per_slot, status)
  VALUES ($1, $2, 'Treino antigo', current_date - 20, '07:00', 60, 'Estúdio Privado', 'Rua Secreta, 1', 10, 0, 'active') RETURNING venue_id`, [pPC, category])).venue_id;
r = await as('authenticated', PC, 'SELECT id FROM public.venues WHERE id = $1', [oldVenue]);
ok(r.rows?.length === 1, 'quem cadastrou o local continua vendo, mesmo sem atividade aberta');
r = await as('authenticated', XS, 'SELECT id FROM public.venues WHERE id = $1', [oldVenue]);
ok(!r.err && r.rows.length === 0, 'conta sem relação não vê local antigo de outra pessoa');
r = await as('anon', '', 'SELECT id FROM public.venues WHERE id = $1', [oldVenue]);
ok(!r.err && r.rows.length === 0, 'visitante não vê endereço de local sem atividade aberta');
const bucket = await one("SELECT file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'avatars'");
ok(Number(bucket.file_size_limit) === 5242880 && bucket.allowed_mime_types.includes('image/jpeg') && !bucket.allowed_mime_types.includes('image/svg+xml'),
  'fotos: só imagens (sem SVG), até 5 MB');
r = await as('authenticated', XS, "INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('avatars', $1, $2) RETURNING id", [`${pXS}-foto.jpg`, XS]);
ok(!r.err, 'a pessoa envia a própria foto' + (r.err ? ` (${r.err})` : ''));
r = await as('authenticated', XS, "INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('avatars', 'de-outro.jpg', $1)", [PA]);
ok(!!r.err, 'ninguém envia foto em nome de outra pessoa');
r = await as('authenticated', XS, "SELECT name FROM storage.objects WHERE bucket_id = 'avatars'");
ok(r.rows?.length === 1, 'a pessoa lista só os próprios arquivos (para excluir a conta)');
r = await as('authenticated', PA, "SELECT name FROM storage.objects WHERE bucket_id = 'avatars'");
ok(!r.err && r.rows.length === 0, 'outra conta não lista as fotos dos outros');
r = await as('anon', '', "SELECT name FROM storage.objects WHERE bucket_id = 'avatars'");
ok(!r.err && r.rows.length === 0, 'visitante não lista os arquivos de fotos');
r = await as('authenticated', PA, "DELETE FROM storage.objects WHERE bucket_id = 'avatars' RETURNING id");
ok(!r.err && r.rows.length === 0, 'ninguém apaga a foto de outra pessoa');

// ── Higiene de segurança (verificador do Supabase) ─────────────────────
console.log('Higiene de segurança:');
const noPath = (await q(`SELECT p.proname FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')`)).rows.map((x) => x.proname);
ok(noPath.length === 0, 'toda função em public tem search_path fixo' + (noPath.length ? ` (faltam: ${noPath.join(', ')})` : ''));
const slowPolicies = (await q(`SELECT tablename || '.' || policyname AS p FROM pg_policies WHERE schemaname = 'public'
  AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '(^|[^(]\s*)auth\.uid\(\)' AND (coalesce(qual, '') || coalesce(with_check, '')) !~ 'SELECT auth\.uid\(\)'`)).rows.map((x) => x.p);
ok(slowPolicies.length === 0, 'políticas chamam auth.uid() uma vez por consulta' + (slowPolicies.length ? ` (${slowPolicies.join(', ')})` : ''));

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
