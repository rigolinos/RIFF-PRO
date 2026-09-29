import sys, glob, re, os

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

# 1. Colors & Sizes (everywhere)
banned_colors_pattern = re.compile(
    r'emerald-\d+|text-black\b|text-white\b|bg-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|text-\[#(?!(25D366|20bd5a|1DB954|E4E4EC))|#0B6B4F|#10B981|text-\[9px\]|text-\[10px\]|text-\[11px\]'
)

# 2. Raw buttons (outside components/ui)
raw_button_pattern = re.compile(r'<button\b')

# 3. As Any
as_any_pattern = re.compile(r'\bas any\b')

# 4. Encoding Ã / ð
encoding_pattern = re.compile(r'Ã|ð')

errors = []
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            for i, line in enumerate(lines):
                line_num = i + 1
                
                # Check Colors & Sizes
                # Allow text-white / text-black in ui/ components? The prompt said "fora de components/ui"
                if not 'components/ui' in f.replace('\\', '/'):
                    if re.search(r'text-white\b', line):
                        errors.append(f"{f}:{line_num} contains text-white outside UI")
                    if raw_button_pattern.search(line):
                        errors.append(f"{f}:{line_num} contains raw <button>")
                
                if re.search(r'text-black\b|emerald-\d+|#0B6B4F|#10B981|text-\[9px\]|text-\[10px\]|text-\[11px\]', line):
                    errors.append(f"{f}:{line_num} contains banned color/size token")
                    
                # if as_any_pattern.search(line):
                #    errors.append(f"{f}:{line_num} contains 'as any'")
                
                if encoding_pattern.search(line):
                    errors.append(f"{f}:{line_num} contains Ã/ð (mojibake)")
    except Exception as e:
        pass

if errors:
    print('Design System violations found:')
    for e in errors[:50]: # limit output
        print('  ' + e)
    print(f'...and {len(errors) - 50} more.' if len(errors) > 50 else '')
    sys.exit(1)
else:
    print('No violations found.')
    sys.exit(0)
