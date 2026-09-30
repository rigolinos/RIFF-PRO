import fs from 'fs';
let f = fs.readFileSync('src/hooks/useSessions.ts', 'utf-8');
f = f.replace("export function useSessions() {", "export function useSessions(cityFilter?: string | null) {");
f = f.replace("queryKey: ['sessions', 'feed'],", "queryKey: ['sessions', 'feed', cityFilter],");
f = f.replace(
  "          .gte('date', today)",
  "          .gte('date', today);\n\n        if (cityFilter && cityFilter !== 'all') {\n          query = query.ilike('city', cityFilter);\n        }"
);
f = f.replace(
  "        const { data, error } = await supabase",
  "        let query = supabase"
);
f = f.replace(
  "        if (error) throw error;\n        return data;\n      },",
  "        const { data, error } = await query;\n        if (error) throw error;\n        return data;\n      },"
);
fs.writeFileSync('src/hooks/useSessions.ts', f);
