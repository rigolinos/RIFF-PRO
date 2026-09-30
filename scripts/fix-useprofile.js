import fs from 'fs';
let content = fs.readFileSync('src/hooks/useProfile.ts', 'utf-8');
content = content.replace("const { email, phone, whatsapp_number, pix_key, pix_key_type, credential_number, ...publicUpdates }", "const { email, phone, whatsapp_number, pix_key, pix_key_type, credential_number, profile_id: _profile_id, user_id: _user_id, ...publicUpdates }");
fs.writeFileSync('src/hooks/useProfile.ts', content);
