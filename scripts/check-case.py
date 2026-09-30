import os
import re

def build_file_map(root_dir):
    file_map = {}
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            full_path = os.path.normpath(os.path.join(dirpath, f))
            # Store lowercased path mapped to actual case path
            file_map[full_path.lower()] = full_path
    return file_map

file_map = build_file_map('src')

for dirpath, _, filenames in os.walk('src'):
    for f in filenames:
        if not f.endswith(('.ts', '.tsx')): continue
        
        path = os.path.join(dirpath, f)
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()
            
        imports = re.findall(r'from\s+["\']([^"\']+)["\']', content)
        for imp in imports:
            if not imp.startswith('.'): continue
            
            # Resolve relative import
            resolved_base = os.path.normpath(os.path.join(dirpath, imp))
            
            # Check with common extensions
            found = False
            for ext in ['', '.ts', '.tsx', '/index.ts', '/index.tsx']:
                test_path = (resolved_base + ext).lower()
                if test_path in file_map:
                    actual = file_map[test_path]
                    if not actual.endswith(resolved_base + ext):
                        print(f"Case mismatch in {path}: imported {imp}, actual {actual}")
                    found = True
                    break

