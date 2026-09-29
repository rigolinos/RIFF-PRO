import glob

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            file.read()
    except Exception as e:
        print(f"Error reading {f}: {e}")
