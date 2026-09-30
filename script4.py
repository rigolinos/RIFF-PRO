import re

files = [
    'src/pages/CreateSession.tsx',
    'src/pages/EditSession.tsx',
    'src/pages/Explore.tsx',
    'src/pages/ForgotPassword.tsx',
    'src/pages/MySessionsPro.tsx',
    'src/pages/OnboardingPro.tsx',
    'src/pages/OnboardingStudent.tsx',
    'src/pages/ProfileEdit.tsx',
    'src/pages/SessionAttendance.tsx',
    'src/hooks/useProfile.ts',
    'src/components/forms/SessionForm.tsx'
]

for path in files:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        content = re.sub(r'error: any\)', 'error: unknown)', content)
        content = re.sub(r'err: any\)', 'err: unknown)', content)
        content = re.sub(r'e: any\)', 'e: unknown)', content)
        content = content.replace("openAttendanceSheet = (session: any)", "openAttendanceSheet = (session: SessionWithJoins)")
        content = content.replace("const initial: any =", "const initial: Record<string, { present: boolean; paid: boolean; notes: string }> =")
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(path, e)
