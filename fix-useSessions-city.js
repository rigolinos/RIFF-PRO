import fs from 'fs';
let f = fs.readFileSync('src/hooks/useSessions.ts', 'utf-8');
f = f.replace("skill_level, category_id, kind,", "skill_level, category_id, kind, city,");
fs.writeFileSync('src/hooks/useSessions.ts', f);
