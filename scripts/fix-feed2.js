import fs from 'fs';
let content = fs.readFileSync('src/pages/Feed.tsx', 'utf-8');
content = content.replace("import { EmptyState } from '@/components/domain';", "import { EmptyState } from '@/components/domain';\nimport { KINDS, ActivityKind } from '@/lib/copy';");
fs.writeFileSync('src/pages/Feed.tsx', content);
