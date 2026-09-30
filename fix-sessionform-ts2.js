import fs from 'fs';
let f = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');
f = f.replace(
  "duration_minutes: initialData?.duration_minutes || 60,",
  "duration_minutes: initialData?.duration_minutes || (initialData?.kind ? KINDS[initialData.kind as ActivityKind]?.defaultDuration : 60),"
);
fs.writeFileSync('src/components/forms/SessionForm.tsx', f);
