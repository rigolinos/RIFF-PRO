import sys, glob, re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
banned_colors_pattern = re.compile(
    r'emerald-\d+|text-black\b|text-white\b|bg-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|text-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|#0B6B4F|#10B981|text-\[9px\]|text-\[10px\]|text-\[11px\]'
)
encoding_pattern = re.compile(r'Ã|ð')

errors = []
for f in files:
    if 'components/ui' in f.replace('\\', '/'):
        continue
    try:
        with open(f, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            for i, line in enumerate(lines):
                if banned_colors_pattern.search(line):
                    errors.append(f"{f}:{i+1} banned token")
                if encoding_pattern.search(line):
                    errors.append(f"{f}:{i+1} encoding mojibake")
    except Exception as e:
        pass

if errors:
    print('DS Violations:')
    for e in errors[:20]:
        print('  ' + e)
    sys.exit(1)
sys.exit(0)
