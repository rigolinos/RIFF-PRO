import fs from 'fs';

function replaceError(path, varName) {
    let content = fs.readFileSync(path, 'utf-8');
    content = content.replace(new RegExp(`\\b${varName}\\.message\\b`, 'g'), `(${varName} instanceof Error ? ${varName}.message : "Erro desconhecido")`);
    fs.writeFileSync(path, content);
}

replaceError('src/components/forms/SessionForm.tsx', 'error');
replaceError('src/pages/CreateSession.tsx', 'error');
replaceError('src/pages/EditSession.tsx', 'error');
replaceError('src/pages/ForgotPassword.tsx', 'err');
replaceError('src/pages/MySessionsPro.tsx', 'error');
replaceError('src/pages/MySessionsPro.tsx', 'e');
replaceError('src/pages/ProfileEdit.tsx', 'error');
replaceError('src/pages/SessionAttendance.tsx', 'error');
