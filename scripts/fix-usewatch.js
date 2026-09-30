import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');
content = content.replace("import { useForm } from 'react-hook-form';", "import { useForm, useWatch } from 'react-hook-form';");
fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
