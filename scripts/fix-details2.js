import fs from 'fs';
let content = fs.readFileSync('src/pages/SessionDetails.tsx', 'utf-8');

if (!content.includes('KINDS[session.kind')) {
    content = content.replace("import { COPY } from '@/lib/copy';", "import { COPY, KINDS, ActivityKind } from '@/lib/copy';");
    content = content.replace("{category?.emoji} {category?.name}", "{category?.emoji} {category?.name}\n            </div>\n            {session.kind && KINDS[session.kind as ActivityKind] && (\n              <div className=\"bg-elevated px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap text-brand border border-brand/30\">\n                {KINDS[session.kind as ActivityKind].chip}\n              </div>\n            )}");
    fs.writeFileSync('src/pages/SessionDetails.tsx', content);
}
