import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace('<Route path="/@:slug" element={<ProfessionalProfile />} />', '<Route path="/:handle" element={<ProfessionalProfile />} />');
fs.writeFileSync('src/App.tsx', app);

let p = fs.readFileSync('src/pages/ProfessionalProfile.tsx', 'utf-8');
p = p.replace("import { useParams, useNavigate } from 'react-router-dom';", "import { useParams, useNavigate, Navigate } from 'react-router-dom';");
p = p.replace(
  "const { slug } = useParams<{ slug: string }>();\n  const navigate = useNavigate();\n  const { data, isLoading, error } = usePublicProfile(slug || '');",
  "const { slug, handle } = useParams<{ slug?: string, handle?: string }>();\n  const navigate = useNavigate();\n  \n  const queryParam = slug || (handle?.startsWith('@') ? handle.substring(1) : '');\n  const { data, isLoading, error } = usePublicProfile(queryParam);"
);
p = p.replace(
  "  if (isLoading) {",
  "  if (handle && !handle.startsWith('@')) return <Navigate to=\"/404\" replace />;\n  if (isLoading) {"
);
fs.writeFileSync('src/pages/ProfessionalProfile.tsx', p);
