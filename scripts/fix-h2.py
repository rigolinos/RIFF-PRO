import glob
import re
for filepath in glob.glob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Just aggressively add `type-subtitle` to any h1-h4 that lacks `type-`
    # if it's text-base or text-sm, maybe change to type-body? 
    # The specialist says "25 títulos h1-h4 ainda fora da escala tipográfica."
    
    def replace_h(match):
        classes = match.group(2)
        if 'type-' not in classes:
            # Map based on size
            if 'text-3xl' in classes: classes += ' type-display'
            elif 'text-2xl' in classes: classes += ' type-title'
            elif 'text-xl' in classes or 'text-lg' in classes: classes += ' type-subtitle'
            else: classes += ' type-subtitle' # fallback
            
            # Remove bad classes
            classes = re.sub(r'\b(font-display|font-bold|font-semibold|text-ink|text-brand-ink|leading-tight|text-base|text-sm|text-\w*xl|text-lg)\b', '', classes)
            classes = re.sub(r' +', ' ', classes).strip()
            
            return match.group(1) + classes + match.group(3)
        return match.group(0)

    new_content = re.sub(r'(<h[1-4][^>]*className=[\'"])([^\'"]*)([\'"])', replace_h, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
