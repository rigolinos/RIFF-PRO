import fs from 'fs';
let content = fs.readFileSync('package.json', 'utf-8');
content = content.replace('"lint": "oxlint src"', '"lint": "oxlint src -D warnings"');
fs.writeFileSync('package.json', content);
