// Compara o schema do banco ligado (Supabase) com o que as migrations do repositório produzem.
// Mostra o que existe só no banco, só no repositório ou com definição diferente.
//
//   npm run check:drift      (precisa de `npx supabase link` feito nesta máquina)
//
// Só leitura: no banco real roda apenas um SELECT nos catálogos.
import { PGlite } from '@electric-sql/pglite';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase/migrations');
const snapshotSql = fs.readFileSync(path.resolve('scripts/schema-snapshot.sql'), 'utf8');

// 1. Banco real
const raw = execSync('npx supabase db query --linked -f scripts/schema-snapshot.sql -o json', {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const remoteRows = JSON.parse(raw.slice(raw.indexOf('{'))).rows;

// 2. Repositório: aplica as migrations num Postgres em memória (mesmo ambiente do test:db)
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA cron;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  CREATE TABLE cron.job (jobname text);
  CREATE FUNCTION cron.schedule(text, text, text) RETURNS bigint LANGUAGE sql AS 'SELECT 1::bigint';
  CREATE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE sql AS 'SELECT true';
`);
for (const file of fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(
    fs.readFileSync(path.join(migrationsDir, file), 'utf8').replace(/^﻿/, '').replace(/CREATE EXTENSION IF NOT EXISTS pg_cron;/, ''),
  );
}
const localRows = (await db.query(snapshotSql.replace(/;\s*$/, ''))).rows;

// O Postgres 18 (PGlite) lista NOT NULL como constraint; o do Supabase não. Nulidade já é comparada por coluna.
const relevant = (row) => !(row.kind === 'constraint' && row.name.endsWith('_not_null'));
const toMap = (rows) => new Map(rows.filter(relevant).map((r) => [`${r.kind} ${r.name}`, r.detail]));
const remote = toMap(remoteRows);
const local = toMap(localRows);

const onlyRemote = [...remote.keys()].filter((k) => !local.has(k));
const onlyLocal = [...local.keys()].filter((k) => !remote.has(k));
const different = [...remote.keys()].filter((k) => local.has(k) && remote.get(k) !== local.get(k));

const print = (title, keys) => {
  console.log(`${title} (${keys.length})`);
  for (const k of keys) console.log('  ' + k);
};
print('Só no banco', onlyRemote);
print('Só no repositório', onlyLocal);
print('Diferentes', different);

const drift = onlyRemote.length + onlyLocal.length + different.length;
console.log(drift ? `\n${drift} diferença(s) entre banco e repositório.` : '\nBanco e repositório idênticos.');
process.exit(drift ? 1 : 0);
