import fs from 'fs';
let content = fs.readFileSync('src/pages/SessionDetails.tsx', 'utf-8');

content = content.replace("{category?.emoji} {category?.name}\n            </div>\n            {session.kind && KINDS[session.kind as ActivityKind] && (\n              <div className=\"bg-elevated px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap text-brand border border-brand/30\">\n                {KINDS[session.kind as ActivityKind].chip}\n              </div>\n            )}\n            </div>", "{category?.emoji} {category?.name}\n            </div>\n            {session.kind && KINDS[session.kind as ActivityKind] && (\n              <div className=\"bg-elevated px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap text-brand border border-brand/30\">\n                {KINDS[session.kind as ActivityKind].chip}\n              </div>\n            )}");
fs.writeFileSync('src/pages/SessionDetails.tsx', content);
