import fs from 'fs';
let content = fs.readFileSync('src/components/cards/SessionCard.tsx', 'utf-8');

if (!content.includes('KINDS[session.kind')) {
    content = content.replace("<RatingBadge rating={pro?.rating_avg} count={pro?.total_reviews} />", "<RatingBadge rating={pro?.rating_avg} count={pro?.total_reviews} />\n              {session.kind && KINDS[session.kind as ActivityKind] && (\n                <StatusPill text={KINDS[session.kind as ActivityKind].chip} variant=\"neutral\" className=\"px-2 py-0 h-6\" />\n              )}");
    fs.writeFileSync('src/components/cards/SessionCard.tsx', content);
}
