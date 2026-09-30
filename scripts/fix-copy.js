import fs from 'fs';
let content = fs.readFileSync('src/lib/copy.ts', 'utf-8');
content = content.replace('"activity" is PENDING product decision (Encontro / Atividade / Evento).\r?\n \\* Until decided, keep "atividade" as placeholder.', '"activity" is the definitive product decision.');
content = content.replace('// PENDENTE de decis.*', '');
fs.writeFileSync('src/lib/copy.ts', content);
