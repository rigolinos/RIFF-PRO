import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');

content = content.replace("import { useForm } from 'react-hook-form';", "import { useForm, useWatch } from 'react-hook-form';");

content = content.replace("const { register, handleSubmit, setValue, reset, watch } = useForm({", 
  "const { register, handleSubmit, setValue, reset, control } = useForm({\n" +
  "  const avatar_url = useWatch({ control, name: 'avatar_url' });\n" +
  "  const full_name = useWatch({ control, name: 'full_name' });\n" +
  "  const pix_key_type = useWatch({ control, name: 'pix_key_type' });");

content = content.replace(/watch\('avatar_url'\)/g, 'avatar_url');
content = content.replace(/watch\('full_name'\)/g, 'full_name');
content = content.replace(/watch\('pix_key_type'\)/g, 'pix_key_type');

fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
