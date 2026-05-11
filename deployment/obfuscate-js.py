#!/usr/bin/env python3
"""
JavaScript Obfuscation Tool

A standalone Python script to obfuscate JavaScript files.
Supports multiple obfuscation backends:
  1. npx javascript-obfuscator (best, requires Node.js)
  2. Pure Python regex-based minification (fallback)

Usage:
    python obfuscate-js.py <source_dir> <output_dir>
    python obfuscate-js.py <source_dir> <output_dir> --watch
    python obfuscate-js.py --help

Examples:
    # Obfuscate runwae JS files
    python obfuscate-js.py ../projects/runwae/runwae/unobfrunwaejs ../projects/runwae/runwae/runwaejs

    # Watch mode for development
    python obfuscate-js.py ../projects/runwae/runwae/unobfrunwaejs ../projects/runwae/runwae/runwaejs --watch
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Tuple

# ANSI colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def check_npx_available() -> bool:
    """Check if npx (Node.js) is available."""
    try:
        result = subprocess.run(
            ['npx', '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def obfuscate_with_npx(source_code: str, filename: str) -> Tuple[bool, str]:
    """
    Obfuscate JavaScript using npx javascript-obfuscator.
    Returns (success, obfuscated_code or error_message).
    """
    # Obfuscator options - balanced for debugging vs protection
    options = {
        'compact': True,
        'controlFlowFlattening': False,
        'deadCodeInjection': False,
        'debugProtection': False,
        'disableConsoleOutput': False,
        'identifierNamesGenerator': 'hexadecimal',
        'renameGlobals': False,  # Preserve Firebase/jQuery globals
        'selfDefending': False,
        'simplify': True,
        'splitStrings': False,
        'stringArray': True,
        'stringArrayEncoding': [],
        'stringArrayThreshold': 0.75,
        'unicodeEscapeSequence': False
    }

    try:
        # Write source to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(source_code)
            temp_input = f.name

        temp_output = temp_input + '.obf.js'

        # Build command
        cmd = [
            'npx', 'javascript-obfuscator',
            temp_input,
            '--output', temp_output,
            '--options-preset', 'low-obfuscation'
        ]

        # Run obfuscator
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0 and os.path.exists(temp_output):
            with open(temp_output, 'r') as f:
                obfuscated = f.read()
            os.unlink(temp_input)
            os.unlink(temp_output)
            return True, obfuscated
        else:
            os.unlink(temp_input)
            if os.path.exists(temp_output):
                os.unlink(temp_output)
            return False, result.stderr or "Unknown error"

    except subprocess.TimeoutExpired:
        return False, "Obfuscation timed out"
    except Exception as e:
        return False, str(e)


def minify_python(source_code: str) -> str:
    """
    Pure Python JavaScript minifier/obfuscator.
    Basic but works without external dependencies.
    """
    code = source_code

    # Remove single-line comments (but not URLs with //)
    code = re.sub(r'(?<!:)//(?!/)[^\n]*', '', code)

    # Remove multi-line comments
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)

    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in code.split('\n')]
    code = '\n'.join(lines)

    # Remove empty lines
    code = re.sub(r'\n\s*\n', '\n', code)

    # Compact whitespace around operators (careful with regex)
    code = re.sub(r'\s*([{}\[\];,:])\s*', r'\1', code)
    code = re.sub(r'\s*([=+\-*/<>!&|]+=?)\s*', r'\1', code)

    # Remove newlines where safe (after ; { } and before { })
    code = re.sub(r';\s*\n\s*', ';', code)
    code = re.sub(r'\{\s*\n\s*', '{', code)
    code = re.sub(r'\n\s*\}', '}', code)

    # Compact function declarations
    code = re.sub(r'function\s+', 'function ', code)

    # Remove remaining unnecessary newlines
    code = re.sub(r'\n+', '\n', code)

    return code.strip()


def obfuscate_file(
    source_path: Path,
    output_path: Path,
    use_npx: bool = True
) -> Tuple[bool, str]:
    """
    Obfuscate a single JavaScript file.
    Returns (success, message).
    """
    try:
        source_code = source_path.read_text(encoding='utf-8')
        source_size = len(source_code.encode('utf-8'))

        if use_npx:
            success, result = obfuscate_with_npx(source_code, source_path.name)
            if not success:
                # Fall back to Python minifier
                print(f"  {Colors.YELLOW}⚠ npx failed, using Python minifier{Colors.RESET}")
                result = minify_python(source_code)
                success = True
        else:
            result = minify_python(source_code)
            success = True

        if success:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(result, encoding='utf-8')
            output_size = len(result.encode('utf-8'))
            ratio = (output_size / source_size * 100) if source_size > 0 else 100

            return True, f"{source_size/1024:.1f}KB → {output_size/1024:.1f}KB ({ratio:.0f}%)"
        else:
            return False, result

    except Exception as e:
        return False, str(e)


def obfuscate_directory(
    source_dir: Path,
    output_dir: Path,
    use_npx: bool = True
) -> Tuple[int, int]:
    """
    Obfuscate all JS files in a directory.
    Returns (success_count, failure_count).
    """
    print(f"\n{Colors.BOLD}📦 Obfuscating JavaScript files...{Colors.RESET}\n")
    print(f"   Source: {source_dir}")
    print(f"   Output: {output_dir}")
    print(f"   Method: {'npx javascript-obfuscator' if use_npx else 'Python minifier'}\n")

    js_files = sorted(source_dir.glob('*.js'))

    if not js_files:
        print(f"   {Colors.YELLOW}No .js files found in source directory{Colors.RESET}")
        return 0, 0

    success_count = 0
    failure_count = 0

    for source_file in js_files:
        output_file = output_dir / source_file.name
        success, message = obfuscate_file(source_file, output_file, use_npx)

        if success:
            print(f"  {Colors.GREEN}✓{Colors.RESET} {source_file.name} ({message})")
            success_count += 1
        else:
            print(f"  {Colors.RED}✗{Colors.RESET} {source_file.name}: {message}")
            failure_count += 1

    print(f"\n{Colors.GREEN}✅ Complete: {success_count} files obfuscated{Colors.RESET}")
    if failure_count > 0:
        print(f"{Colors.RED}⚠️  Failed: {failure_count} files{Colors.RESET}")
    print()

    return success_count, failure_count


def watch_directory(
    source_dir: Path,
    output_dir: Path,
    use_npx: bool = True
):
    """
    Watch source directory for changes and re-obfuscate.
    Uses polling (no external dependencies).
    """
    print(f"\n{Colors.BOLD}👀 Watching for changes in {source_dir.name}/{Colors.RESET}\n")
    print("   Press Ctrl+C to stop\n")

    # Initial build
    obfuscate_directory(source_dir, output_dir, use_npx)

    # Track file modification times
    file_mtimes = {}
    for f in source_dir.glob('*.js'):
        file_mtimes[f.name] = f.stat().st_mtime

    try:
        while True:
            time.sleep(1)  # Poll every second

            current_files = set()
            for f in source_dir.glob('*.js'):
                current_files.add(f.name)
                current_mtime = f.stat().st_mtime

                if f.name not in file_mtimes:
                    # New file
                    print(f"\n{Colors.BLUE}➕ File added: {f.name}{Colors.RESET}")
                    success, msg = obfuscate_file(f, output_dir / f.name, use_npx)
                    if success:
                        print(f"  {Colors.GREEN}✓{Colors.RESET} {f.name} ({msg})")
                    file_mtimes[f.name] = current_mtime

                elif current_mtime > file_mtimes[f.name]:
                    # File modified
                    print(f"\n{Colors.BLUE}🔄 File changed: {f.name}{Colors.RESET}")
                    success, msg = obfuscate_file(f, output_dir / f.name, use_npx)
                    if success:
                        print(f"  {Colors.GREEN}✓{Colors.RESET} {f.name} ({msg})")
                    file_mtimes[f.name] = current_mtime

            # Check for deleted files
            deleted = set(file_mtimes.keys()) - current_files
            for name in deleted:
                print(f"\n{Colors.YELLOW}➖ File removed: {name}{Colors.RESET}")
                output_file = output_dir / name
                if output_file.exists():
                    output_file.unlink()
                    print(f"   Removed from {output_dir.name}/")
                del file_mtimes[name]

    except KeyboardInterrupt:
        print(f"\n\n{Colors.BOLD}Stopped watching.{Colors.RESET}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Obfuscate JavaScript files from source to output directory.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s ./unobfrunwaejs ./runwaejs
  %(prog)s ./src ./dist --watch
  %(prog)s ./src ./dist --no-npx
        """
    )
    parser.add_argument(
        'source_dir',
        type=Path,
        help='Source directory containing .js files'
    )
    parser.add_argument(
        'output_dir',
        type=Path,
        help='Output directory for obfuscated files'
    )
    parser.add_argument(
        '--watch', '-w',
        action='store_true',
        help='Watch for changes and re-obfuscate automatically'
    )
    parser.add_argument(
        '--no-npx',
        action='store_true',
        help='Use Python minifier only (no Node.js required)'
    )

    args = parser.parse_args()

    # Validate source directory
    if not args.source_dir.is_dir():
        print(f"{Colors.RED}Error: Source directory does not exist: {args.source_dir}{Colors.RESET}")
        sys.exit(1)

    # Check if npx is available
    use_npx = not args.no_npx and check_npx_available()
    if not args.no_npx and not use_npx:
        print(f"{Colors.YELLOW}Note: npx not found, using Python minifier (less obfuscation){Colors.RESET}")

    # Run
    if args.watch:
        watch_directory(args.source_dir, args.output_dir, use_npx)
    else:
        success, failed = obfuscate_directory(args.source_dir, args.output_dir, use_npx)
        sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    main()
