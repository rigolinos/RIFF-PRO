import fs from 'fs';
let content = fs.readFileSync('tsconfig.app.json', 'utf-8');
content = content.replace(/"baseUrl": "\.",\s*/, "");
fs.writeFileSync('tsconfig.app.json', content);
