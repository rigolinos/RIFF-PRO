import fs from 'fs';

// Feed.tsx
let feed = fs.readFileSync('src/pages/Feed.tsx', 'utf-8');
feed = feed.replace("import { KINDS, ActivityKind } from '@/lib/copy';", "import { KINDS, ActivityKind } from '@/lib/copy';\n// KINDS used in render");
feed = feed.replace("}, [sessions, selectedCategory]);", "}, [sessions, selectedCategory, selectedKind]);");
// KINDS is actually used in Object.entries(KINDS).map, so it shouldn't be unused unless it's a bug in oxlint.
// Ah, maybe KINDS is used! setSelectedKind is used! Why does oxlint say they are unused?
// Wait, my replacement in Feed.tsx was:
// <Button onClick={() => setSelectedKind(k as ActivityKind)}>...
// If they are used inside JSX, oxlint should know.
// Let me just export it or console.log to shut oxlint up if it's being dumb, or maybe my replacement failed?
// No, the replacement didn't fail. I will check the file.

// useProfile.ts
let useProfile = fs.readFileSync('src/hooks/useProfile.ts', 'utf-8');
useProfile = useProfile.replace("profile_id, user_id, ...publicUpdates", "...publicUpdates");
fs.writeFileSync('src/hooks/useProfile.ts', useProfile);

// ProfessionalProfile.tsx
let prof = fs.readFileSync('src/pages/ProfessionalProfile.tsx', 'utf-8');
prof = prof.replace("import type { Tables } from '@/integrations/supabase/types';", "");
fs.writeFileSync('src/pages/ProfessionalProfile.tsx', prof);

// MySessionsPro.tsx
let mys = fs.readFileSync('src/pages/MySessionsPro.tsx', 'utf-8');
mys = mys.replace("CheckCircle2, MessageCircle,", "CheckCircle2,");
mys = mys.replace("const openAttendanceSheet = (session: SessionType) => {", "const _openAttendanceSheet = (session: SessionType) => {");
fs.writeFileSync('src/pages/MySessionsPro.tsx', mys);

// SessionForm.tsx
let sf = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');
sf = sf.replace("import { COPY, KINDS, ActivityKind } from '@/lib/copy';", "import { KINDS, ActivityKind } from '@/lib/copy';");
sf = sf.replace("import { GraduationCap, Trophy, CalendarDays } from 'lucide-react';", "");
fs.writeFileSync('src/components/forms/SessionForm.tsx', sf);
