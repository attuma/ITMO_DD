#!/usr/bin/env python3
"""
Автоматический инкремент версий статических файлов в HTML.
Запускается автоматически при git commit через pre-commit hook.
"""

import re
import sys
from pathlib import Path


def increment_version(html_file):
    """Увеличивает версии ?v=X для app.js и styles.css в HTML файле."""
    content = html_file.read_text(encoding='utf-8')
    original_content = content
    modified = False

    # Паттерны для поиска версий
    patterns = [
        (r'(src="static/app\.js\?v=)(\d+)', 'app.js'),
        (r'(href="static/styles\.css\?v=)(\d+)', 'styles.css'),
    ]

    for pattern, file_type in patterns:
        def replacer(match):
            nonlocal modified
            prefix = match.group(1)
            current_version = int(match.group(2))
            new_version = current_version + 1
            modified = True
            print(f"  {html_file.name}: {file_type} v{current_version} -> v{new_version}")
            return f"{prefix}{new_version}"

        content = re.sub(pattern, replacer, content)

    # Если версии не найдены, добавляем ?v=1
    if not modified:
        # Добавляем версии к файлам без версий
        if 'app.js"' in content and 'app.js?' not in content:
            content = re.sub(
                r'(src="static/app\.js)"',
                r'\1?v=1"',
                content
            )
            print(f"  {html_file.name}: app.js добавлена версия v1")
            modified = True

        if 'styles.css"' in content and 'styles.css?' not in content:
            content = re.sub(
                r'(href="static/styles\.css)"',
                r'\1?v=1"',
                content
            )
            print(f"  {html_file.name}: styles.css добавлена версия v1")
            modified = True

    if modified:
        html_file.write_text(content, encoding='utf-8')
        return True

    return False


def main():
    """Обрабатывает все HTML файлы в проекте."""
    project_root = Path(__file__).parent
    html_files = [
        project_root / 'index.html',
        project_root / 'calendar.html',
        project_root / 'links.html',
    ]

    print("Incrementing versions of static files...")

    any_modified = False
    for html_file in html_files:
        if html_file.exists():
            if increment_version(html_file):
                any_modified = True
        else:
            print(f"Warning: File not found: {html_file}")

    if any_modified:
        print("Versions updated successfully!")
        return 0
    else:
        print("No changes required")
        return 0


if __name__ == '__main__':
    sys.exit(main())
