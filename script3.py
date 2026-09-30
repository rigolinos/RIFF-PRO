import re
import os

def replace_in_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = re.sub(r'error: any\)', 'error: unknown)', content)
    content = re.sub(r'err: any\)', 'err: unknown)', content)
    content = re.sub(r'e: any\)', 'e: unknown)', content)
    content = content.replace("openAttendanceSheet = (session: any)", "openAttendanceSheet = (session: SessionWithJoins)")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            replace_in_file(os.path.join(root, file))

