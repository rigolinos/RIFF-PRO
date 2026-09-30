import fs from 'fs';
let content = fs.readFileSync('src/components/cards/SessionCard.tsx', 'utf-8');

if (!content.includes('KINDS')) {
    content = content.replace("import { CoverImage, PriceTag, RatingBadge, SpotsMeter, StatusPill } from '../domain';", "import { CoverImage, PriceTag, RatingBadge, SpotsMeter, StatusPill } from '../domain';\nimport { KINDS, ActivityKind } from '@/lib/copy';")
    
    // Replace the first StatusPill insertion
    content = content.replace("<StatusPill status={session.status} />", "<StatusPill status={session.status} />\n          {session.kind && KINDS[session.kind as ActivityKind] && (\n            <StatusPill status={session.status} customText={KINDS[session.kind as ActivityKind].chip} />\n          )}");
    
    fs.writeFileSync('src/components/cards/SessionCard.tsx', content);
}
