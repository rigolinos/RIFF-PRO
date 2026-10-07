// Equipe Riff: acha a coordenada do endereço de um condomínio ou clube (Geoapify)
// e imprime o comando SQL para criar a comunidade com a sede ou gravar a sede de
// uma que já existe. O script não grava nada: confira e rode o comando impresso.
//
//   node scripts/community-location.mjs "Endereço completo"
//   node scripts/community-location.mjs "Endereço" --criar "Nome" condo email-do-gestor
//   node scripts/community-location.mjs "Endereço" --sede id-da-comunidade
import fs from 'fs';

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const key = process.env.VITE_GEOAPIFY_KEY || env.match(/^VITE_GEOAPIFY_KEY=(.+)$/m)?.[1]?.trim();
const [address, mode, ...rest] = process.argv.slice(2);

if (!key) {
  console.error('Falta VITE_GEOAPIFY_KEY no .env.local.');
  process.exit(1);
}
if (!address) {
  console.error('Uso: node scripts/community-location.mjs "Endereço completo" [--criar "Nome" condo|club email | --sede id]');
  process.exit(1);
}

const params = new URLSearchParams({ text: address, filter: 'countrycode:br', lang: 'pt', limit: '3', format: 'json', apiKey: key });
const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
if (!res.ok) {
  console.error(`Geoapify respondeu ${res.status}.`);
  process.exit(1);
}
const { results = [] } = await res.json();
if (!results.length) {
  console.error('Endereço não encontrado. Tente com rua, número, bairro e cidade.');
  process.exit(1);
}

const sql = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const best = results[0];
console.log('Encontrado:');
results.forEach((r, i) => console.log(`  ${i === 0 ? '→' : ' '} ${r.formatted}  (${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}, confiança ${r.rank?.confidence ?? '?'})`));

const addr = best.address_line1 ? `${best.address_line1}${best.suburb ? `, ${best.suburb}` : ''}` : best.formatted;
const city = best.city || best.town || best.village || null;
const state = best.state_code || null;
const lat = best.lat.toFixed(7);
const lng = best.lon.toFixed(7);

let call;
if (mode === '--criar') {
  const [name, kind, email] = rest;
  call = `SELECT public.admin_create_community(${sql(name)}, ${sql(kind)}, ${sql(email)}, ${sql(addr)}, ${sql(city)}, ${sql(state)}, ${lat}, ${lng})`;
} else if (mode === '--sede') {
  call = `SELECT public.admin_set_community_location(${sql(rest[0])}, ${sql(addr)}, ${sql(city)}, ${sql(state)}, ${lat}, ${lng})`;
}

console.log('\nConfira o endereço acima no Google Maps antes de gravar.');
if (call) {
  console.log('\nComando (banco de produção, depois do OK do dono do produto):');
  console.log(`npx supabase db query --linked "${call.replace(/"/g, '\\"')}"`);
} else {
  console.log(`\nendereço: ${addr}\ncidade: ${city}\nestado: ${state}\nlatitude: ${lat}\nlongitude: ${lng}`);
}
