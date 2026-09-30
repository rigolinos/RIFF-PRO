import glob
import re
import os

for filepath in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    new_content = re.sub(r'catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)', r'catch (\1)', new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
