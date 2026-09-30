import fs from 'fs';
let content = fs.readFileSync('src/hooks/useSessions.ts', 'utf-8');

content = content.replace(/  const getSessionById = \(id: string\) => \{\r?\n    return useQuery\(\{/, 'export function useSessionById(id: string) {\n  return useQuery({');
content = content.replace(/    getSessionById,\r?\n/, '');

fs.writeFileSync('src/hooks/useSessions.ts', content);

let editContent = fs.readFileSync('src/pages/EditSession.tsx', 'utf-8');
editContent = editContent.replace('const { getSessionById, updateSession, isUpdating } = useSessions();', 'const { updateSession, isUpdating } = useSessions();');
editContent = editContent.replace("import { useSessions } from '@/hooks/useSessions';", "import { useSessions, useSessionById } from '@/hooks/useSessions';");
editContent = editContent.replace("const { data: session, isLoading } = getSessionById(id || '');", "const { data: session, isLoading } = useSessionById(id || '');");

fs.writeFileSync('src/pages/EditSession.tsx', editContent);
