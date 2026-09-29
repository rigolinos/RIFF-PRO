import sys, glob, re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
pattern = re.compile(r'emerald-\d+|text-black\b|bg-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|text-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|rgba\(11,107,79|rgba\(16,185,129|#0B6B4F|#10B981|text-\[10px\]|amber-\d+|\btext-red-\d+|bg-red-\d+|border-red-\d+|pink-\d+|(?<!focus-)blue-\d+|purple-\d+|slate-950')

errors = []
for f in files:
    with open(f, 'r', encoding='utf-8', errors='replace') as file:
        if pattern.search(file.read()):
            errors.append(f)

if errors:
    print('Hardcoded colors found in:')
    for e in errors:
        print('  ' + e)
    sys.exit(1)
else:
    print('No hardcoded colors found.')
    sys.exit(0)
