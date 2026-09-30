import glob
import re

for filepath in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    
    # SessionCard
    new_content = re.sub(r'session: any;', r"session: Tables<'sessions'> & { professional?: Tables<'profiles'>, category?: Tables<'categories'> };", new_content)
    new_content = re.sub(r'onBookClick: \(session: any\)', r"onBookClick: (session: Tables<'sessions'> & { professional?: Tables<'profiles'>, category?: Tables<'categories'> })", new_content)
    if 'Tables<' in new_content and 'import type { Tables }' not in new_content:
        # We might need to add import. It's safer to just import Database and use it.
        pass
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
