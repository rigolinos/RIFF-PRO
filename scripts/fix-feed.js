import fs from 'fs';
let content = fs.readFileSync('src/pages/Feed.tsx', 'utf-8');

if (!content.includes('selectedKind')) {
    content = content.replace("import { COPY } from '@/lib/copy';", "import { COPY, KINDS, ActivityKind } from '@/lib/copy';");
    content = content.replace("const [selectedCategory, setSelectedCategory] = useState<string>('all');", "const [selectedCategory, setSelectedCategory] = useState<string>('all');\n  const [selectedKind, setSelectedKind] = useState<ActivityKind | 'all'>('all');");
    
    // Update filter logic
    content = content.replace("if (selectedCategory === 'all') return sessions;", "let result = sessions;\n    if (selectedCategory !== 'all') result = result.filter(s => s.category_id === selectedCategory);\n    if (selectedKind !== 'all') result = result.filter(s => s.kind === selectedKind);\n    return result;");
    content = content.replace("return sessions.filter(session => session.category_id === selectedCategory);", "");
    
    // Add Kind chips to UI above Category chips
    content = content.replace("<div className=\"flex items-center gap-2 overflow-x-auto no-scrollbar pb-2\">", "<div className=\"flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-2\">\n          <Button\n            variant=\"outline\"\n            onClick={() => setSelectedKind('all')}\n            className={`h-8 rounded-full px-4 text-xs ${selectedKind === 'all' ? 'bg-brand text-brand-ink font-bold border-brand' : 'bg-surface border-line text-ink-muted'}`}\n          >\n            Todos\n          </Button>\n          {Object.entries(KINDS).map(([k, meta]) => (\n            <Button\n              key={k}\n              variant=\"outline\"\n              onClick={() => setSelectedKind(k as ActivityKind)}\n              className={`h-8 rounded-full px-4 text-xs ${selectedKind === k ? 'bg-brand text-brand-ink font-bold border-brand' : 'bg-surface border-line text-ink-muted'}`}\n            >\n              {meta.chip}\n            </Button>\n          ))}\n        </div>\n        <div className=\"flex items-center gap-2 overflow-x-auto no-scrollbar pb-2\">");
    
    fs.writeFileSync('src/pages/Feed.tsx', content);
}
