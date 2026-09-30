import fs from 'fs';
const text = fs.readFileSync('src/pages/Login.tsx', 'utf-8');
const lines = text.split('\n');
const newLines = lines.map(line => {
  if (line.includes('toast.success(') && line.includes('Bem-vindo')) {
    return "    toast.success('Bem-vindo de volta!');";
  }
  return line;
});
fs.writeFileSync('src/pages/Login.tsx', newLines.join('\n'));
