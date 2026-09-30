import fs from 'fs';
let content = fs.readFileSync('src/integrations/supabase/types.ts', 'utf-8');

// Add 'kind' to sessions Row, Insert, Update
let replaced = content;
replaced = replaced.replace(/max_participants: number \| null/g, "max_participants: number | null\n          kind: 'class' | 'match' | 'tournament' | 'event' | 'other'");
replaced = replaced.replace(/max_participants\?: number \| null/g, "max_participants?: number | null\n          kind?: 'class' | 'match' | 'tournament' | 'event' | 'other'");

fs.writeFileSync('src/integrations/supabase/types.ts', replaced);
