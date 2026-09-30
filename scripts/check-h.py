import glob
import re

count = 0
for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.findall(r'<h[1-4][^>]*className=["\']([^"\']*)["\']', content)
    for m in matches:
        if 'type-' not in m:
            print(f"File: {filepath} Match: {m}")
            count += 1
print(f"Total non-compliant h1-h4 tags: {count}")
