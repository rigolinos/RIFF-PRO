import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('src/**/*.{ts,tsx}');
const pattern = /emerald-\d+|text-black\b|bg-\[#|text-\[#|rgba\(11,107,79|rgba\(16,185,129|#0B6B4F|#10B981|text-\[10px\]|amber-\d+|\btext-red-\d+|bg-red-\d+|border-red-\d+|pink-\d+|(?<!focus-)blue-\d+|purple-\d+|slate-950/g;

let errors = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (pattern.test(content)) {
    errors.push(file);
  }
}

if (errors.length > 0) {
  console.error('Hardcoded colors found in:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
} else {
  console.log('No hardcoded colors found.');
  process.exit(0);
}
