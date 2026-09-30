import fs from 'fs';
let content = fs.readFileSync('src/pages/ProfileEdit.tsx', 'utf-8');
content = content.replace(/watch\('avatar_url'\)/g, 'avatar_url');
content = content.replace(/watch\('full_name'\)/g, 'full_name');
content = content.replace(/watch\('pix_key_type'\)/g, 'pix_key_type');
fs.writeFileSync('src/pages/ProfileEdit.tsx', content);
