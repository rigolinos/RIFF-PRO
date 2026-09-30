import fs from 'fs';
let content = fs.readFileSync('src/hooks/useSessions.ts', 'utf-8');
content = content.replace("price_per_slot, status, session_type, skill_level, category_id,", "price_per_slot, status, session_type, skill_level, category_id, kind,");
fs.writeFileSync('src/hooks/useSessions.ts', content);
