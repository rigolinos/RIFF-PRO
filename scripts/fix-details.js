import fs from 'fs';
let content = fs.readFileSync('src/pages/SessionDetails.tsx', 'utf-8');

if (!content.includes('KINDS')) {
    content = content.replace("import { COPY } from '@/lib/copy';", "import { COPY, KINDS, ActivityKind } from '@/lib/copy';");
    content = content.replace("<StatusPill status={session.status} />", "<StatusPill status={session.status} />\n            {session.kind && KINDS[session.kind as ActivityKind] && (\n              <StatusPill status={session.status} customText={KINDS[session.kind as ActivityKind].chip} />\n            )}");
    fs.writeFileSync('src/pages/SessionDetails.tsx', content);
}
