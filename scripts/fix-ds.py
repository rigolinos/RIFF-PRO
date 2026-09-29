import glob, re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

replacements = [
    (re.compile(r'\btext-\[11px\]'), 'text-xs'),
    (re.compile(r'\btext-\[10px\]'), 'text-xs'),
    (re.compile(r'\btext-\[9px\]'), 'text-xs'),
    (re.compile(r'\btext-black\b'), 'text-ink'),
    (re.compile(r'\btext-white\b'), 'text-bg'),
    (re.compile(r'\bemerald-(\d+)'), r'brand-\1'),
    (re.compile(r'\bbg-\[#(?!(25D366|20bd5a|1DB954|E4E4EC)).*?\]'), 'bg-surface'),
    (re.compile(r'\btext-\[#(?!(25D366|20bd5a|1DB954|E4E4EC)).*?\]'), 'text-ink-muted'),
    (re.compile(r'\b#0B6B4F\b'), 'var(--brand)'),
    (re.compile(r'\b#10B981\b'), 'var(--brand)'),
]

for f in files:
    if 'ui' in f.replace('\\', '/') and 'components/ui' in f.replace('\\', '/'):
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    
    for pattern, rep in replacements:
        content = pattern.sub(rep, content)
    
    if content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
