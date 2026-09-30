import fs from 'fs';
let content = fs.readFileSync('src/pages/DashboardPro.tsx', 'utf-8');
content = content.replace('(data?.metrics as any)', '(data?.metrics as { total_revenue: number; unique_students: number; total_bookings: number; total_sessions: number; })');
fs.writeFileSync('src/pages/DashboardPro.tsx', content);
