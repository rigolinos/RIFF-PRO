import fs from 'fs';
let content = fs.readFileSync('src/pages/Feed.tsx', 'utf-8');

// Replace dependency array
content = content.replace("}, [sessions, selectedCategory]);", "}, [sessions, selectedCategory, selectedKind]);");

// Add Kind chips to UI above Category chips
content = content.replace("<div className=\"flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6\">", "<div className=\"flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6 mb-2\">\n          <button\n            onClick={() => setSelectedKind('all')}\n            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${\n              selectedKind === 'all' \n                ? 'bg-brand text-brand-ink' \n                : 'bg-surface text-ink-muted border border-line'\n            }`}\n          >\n            Todos os Tipos\n          </button>\n          {Object.entries(KINDS).map(([k, meta]) => (\n            <button\n              key={k}\n              onClick={() => setSelectedKind(k as ActivityKind)}\n              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${\n                selectedKind === k \n                  ? 'bg-brand text-brand-ink' \n                  : 'bg-surface text-ink-muted border border-line'\n              }`}\n            >\n              {meta.chip}\n            </button>\n          ))}\n        </div>\n        <div className=\"flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-6 px-6\">");

fs.writeFileSync('src/pages/Feed.tsx', content);
