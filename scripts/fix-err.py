import glob
import re

for filepath in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # Handle error.message -> error instanceof Error ? error.message : "Erro desconhecido"
    # Need to match the exact variable name (e.g. error.message, err.message, e.message)
    new_content = re.sub(r'([a-zA-Z0-9_]+)\.message', r'(\1 instanceof Error ? \1.message : "Erro desconhecido")', new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
