import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content
    
    # Replace all `<h1 className="text-3xl...` with `type-display`
    new_content = re.sub(r'(<h[1-4][^>]*className=[\'"])([^\'"]*)([\'"])', lambda m: m.group(1) + re.sub(r'text-3xl\b', 'type-display', re.sub(r'text-2xl\b', 'type-title', re.sub(r'text-xl\b', 'type-subtitle', re.sub(r'text-lg\b', 'type-subtitle', re.sub(r'font-display\b', '', re.sub(r'font-bold\b', '', re.sub(r'text-brand-ink\b', '', re.sub(r'text-ink\b', '', re.sub(r'leading-tight\b', '', m.group(2)))))))))) + m.group(3), new_content)
    
    # Clean up double spaces created by removing classes
    new_content = re.sub(r' +', ' ', new_content)
    new_content = re.sub(r'=" ', '="', new_content)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
