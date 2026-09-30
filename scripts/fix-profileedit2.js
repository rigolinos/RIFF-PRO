import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');
content = content.replace("const { register, handleSubmit, setValue, reset, watch } = useForm({", "const { register, handleSubmit, setValue, reset } = useForm({");
content = content.replace("import { useForm, useWatch } from 'react-hook-form';", "import { useForm } from 'react-hook-form';");
fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
