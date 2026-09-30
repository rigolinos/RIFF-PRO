import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');

// Replace standard `watch` from useForm with `useWatch`
content = content.replace("const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm", "const { register, handleSubmit, setValue, control, formState: { errors } } = useForm");

// Import useWatch if not present
if (!content.includes('useWatch')) {
    content = content.replace("import { useForm } from 'react-hook-form';", "import { useForm, useWatch } from 'react-hook-form';");
}

let extraCode = `
  const avatar_url = useWatch({ control, name: 'avatar_url' });
  const full_name = useWatch({ control, name: 'full_name' });
  const pix_key_type = useWatch({ control, name: 'pix_key_type' });
`;

// Insert the useWatch hooks right after the useForm destructuring
content = content.replace(/const \{ register, handleSubmit, setValue, control, formState: \{ errors \} \} = useForm<ProfileFormData>\([\s\S]*?\}\);/m, (match) => {
    return match + "\n" + extraCode;
});

// Replace all usages of watch(...)
content = content.replace(/watch\('avatar_url'\)/g, 'avatar_url');
content = content.replace(/watch\('full_name'\)/g, 'full_name');
content = content.replace(/watch\('pix_key_type'\)/g, 'pix_key_type');

fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
