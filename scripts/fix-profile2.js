import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');

content = content.replace("const { register, handleSubmit, setValue, reset, control } = useForm({\n  const avatar_url = useWatch({ control, name: 'avatar_url' });\n  const full_name = useWatch({ control, name: 'full_name' });\n  const pix_key_type = useWatch({ control, name: 'pix_key_type' });", "const { register, handleSubmit, setValue, reset, watch } = useForm({");

content = content.replace(/const \{ register, handleSubmit, setValue, reset, watch \} = useForm\(\{([\s\S]*?)\}\);/m, (match, p1) => {
  return "const { register, handleSubmit, setValue, reset, control } = useForm({" + p1 + "});\n" +
  "  const avatar_url = useWatch({ control, name: 'avatar_url' });\n" +
  "  const full_name = useWatch({ control, name: 'full_name' });\n" +
  "  const pix_key_type = useWatch({ control, name: 'pix_key_type' });\n";
});

fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
