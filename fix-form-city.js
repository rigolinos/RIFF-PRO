import fs from 'fs';
let f = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');
f = f.replace(
  "const onFinalSubmit = async (data: TablesInsert<'sessions'>) => {\n    await onSubmit(data);\n  };",
  "const onFinalSubmit = async (data: TablesInsert<'sessions'>) => {\n    if (!isEditMode && profile?.city) {\n      data.city = profile.city;\n    }\n    await onSubmit(data);\n  };"
);
fs.writeFileSync('src/components/forms/SessionForm.tsx', f);
