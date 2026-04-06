import os
import re
from pathlib import Path

PROJECT_ROOT = Path(r"C:\Users\Carlos Anaya Ruiz\solis-seo-autopilot")
os.chdir(PROJECT_ROOT)

def resolve_import_path(importing_file, import_statement):
    """Resolve an import statement relative to the importing file."""
    base_dir = Path(importing_file).parent
    
    if import_statement.startswith("@/"):
        target = PROJECT_ROOT / import_statement[2:]
    elif import_statement.startswith("./"):
        target = base_dir / import_statement[2:]
    elif import_statement.startswith("../"):
        target = (base_dir / import_statement).resolve()
    else:
        return None
    
    return target

def check_file_exists(path):
    """Check if file exists with various extensions."""
    path = Path(path)
    
    if path.is_file():
        return True
    
    for ext in ['.ts', '.tsx', '.js', '.jsx']:
        if (path.parent / (path.name + ext)).is_file():
            return True
    
    if path.is_dir():
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            if (path / f'index{ext}').is_file():
                return True
    
    return False

broken = []
total_checked = 0

ts_files = list(Path('.').rglob('*.ts')) + list(Path('.').rglob('*.tsx'))
ts_files = [f for f in ts_files if '.next' not in str(f) and 'node_modules' not in str(f)]

for file_path in ts_files:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                match = re.search(r"from\s+['\"]([^'\"]+)['\"]", line)
                if not match:
                    continue
                
                import_path = match.group(1)
                
                if not (import_path.startswith('@/') or import_path.startswith('./') or import_path.startswith('../')):
                    continue
                
                total_checked += 1
                resolved = resolve_import_path(file_path, import_path)
                
                if resolved and not check_file_exists(resolved):
                    rel_file = file_path.relative_to(PROJECT_ROOT)
                    broken.append({
                        'file': str(rel_file).replace(chr(92), '/'),
                        'line': line_num,
                        'import': import_path,
                        'target': str(resolved.relative_to(PROJECT_ROOT)).replace(chr(92), '/')
                    })
    except Exception as e:
        pass

if broken:
    print(f"BROKEN IMPORTS FOUND: {len(broken)}")
    print()
    for item in sorted(broken, key=lambda x: (x['file'], x['line'])):
        print(f"{item['file']}:{item['line']}")
        print(f"  Import: from '{item['import']}'")
        print(f"  Target not found: {item['target']}")
        print()
else:
    print(f"All {total_checked} local imports verified successfully!")
    print("No broken imports found in the project.")

