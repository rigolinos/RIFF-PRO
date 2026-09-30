import fs from 'fs';
let f = fs.readFileSync('src/integrations/supabase/types.ts', 'utf-8');
f = f.replace(/city\?: string \| null\n\s*city\?: string \| null/g, "city?: string | null");
fs.writeFileSync('src/integrations/supabase/types.ts', f);
