import fs from 'fs';
let f = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');
f = f.replace(
  "const activeTemplates = (selectedCategorySlug && formData.kind === 'class') ? TEMPLATES[selectedCategorySlug] : [];",
  "const formDataKind = form.watch('kind');\n  const activeTemplates = (selectedCategorySlug && formDataKind === 'class') ? TEMPLATES[selectedCategorySlug] : [];"
);
// Also revert duration_minutes replacement which used formData before it was defined
f = f.replace(
  "duration_minutes: initialData?.duration_minutes || (formData.kind ? KINDS[formData.kind as ActivityKind]?.defaultDuration : 60),",
  "duration_minutes: initialData?.duration_minutes || 60,"
);
f = f.replace(
  "duration_minutes: formData.duration_minutes || (formData.kind ? KINDS[formData.kind as ActivityKind]?.defaultDuration : 60),",
  "duration_minutes: formData.duration_minutes || 60,"
);
fs.writeFileSync('src/components/forms/SessionForm.tsx', f);
