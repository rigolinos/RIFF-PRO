import fs from 'fs';
let content = fs.readFileSync('src/pages/ForgotPassword.tsx', 'utf-8');
content = content.replace("err.errors[0].message", "(err as { errors: { message: string }[] }).errors[0].message");
fs.writeFileSync('src/pages/ForgotPassword.tsx', content);
