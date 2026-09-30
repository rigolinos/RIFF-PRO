import fs from 'fs';
let content = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');

// replace defaultValues: savedDraft || {
// with defaultValues: savedDraft ? { ...savedDraft, kind: savedDraft.kind || initialData?.kind || 'class' } : {
content = content.replace("defaultValues: savedDraft || {", "defaultValues: savedDraft ? { ...savedDraft, kind: savedDraft.kind || initialData?.kind || 'class' } : {");

fs.writeFileSync('src/components/forms/SessionForm.tsx', content);
