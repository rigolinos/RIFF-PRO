import fs from 'fs';
let content = fs.readFileSync('src/components/forms/SessionForm.tsx', 'utf-8');
content = content.replace("const IconMap: any =", "const IconMap: Record<string, any> ="); // Still has any! Let's use `Record<string, React.FC<any>>` or just import LucideIcon
content = content.replace("const IconMap: any = { GraduationCap, Users, Trophy, CalendarDays, Sparkles };", "const IconMap: Record<string, React.ElementType> = { GraduationCap, Users, Trophy, CalendarDays, Sparkles };");
fs.writeFileSync('src/components/forms/SessionForm.tsx', content);
