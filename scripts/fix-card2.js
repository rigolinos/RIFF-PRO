import fs from 'fs';
let content = fs.readFileSync('src/components/cards/SessionCard.tsx', 'utf-8');

if (!content.includes('KINDS[session.kind as ActivityKind]')) {
    content = content.replace("<RatingBadge rating={pro?.rating || 5.0} count={pro?.review_count || 0} />", "<RatingBadge rating={pro?.rating || 5.0} count={pro?.review_count || 0} />\n            {session.kind && KINDS[session.kind as ActivityKind] && (\n              <StatusPill text={KINDS[session.kind as ActivityKind].chip} variant=\"info\" className=\"bg-bg/80 backdrop-blur-md border-white/10\" />\n            )}");
    fs.writeFileSync('src/components/cards/SessionCard.tsx', content);
}
