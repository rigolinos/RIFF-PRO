import fs from 'fs';
let content = fs.readFileSync('src/pages/OnboardingPro.tsx', 'utf-8');

content = content.replace("const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm", "const { register, handleSubmit, setValue, control, formState: { errors } } = useForm");

if (!content.includes('useWatch')) {
    content = content.replace("import { useForm } from 'react-hook-form';", "import { useForm, useWatch } from 'react-hook-form';");
}

let extraCode = `
  const professionalType = useWatch({ control, name: 'professionalType' });
  const bio = useWatch({ control, name: 'bio' });
`;

content = content.replace(/const \{ register, handleSubmit, setValue, control, formState: \{ errors \} \} = useForm<ProFormValues>\([\s\S]*?\}\);/m, (match) => {
    return match + "\n" + extraCode;
});

content = content.replace(/watch\('professionalType'\)/g, 'professionalType');
content = content.replace(/watch\('bio'\)/g, 'bio');

fs.writeFileSync('src/pages/OnboardingPro.tsx', content);
