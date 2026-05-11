# JavaScript Obfuscation

The Runwae frontend loads JavaScript from `runwaejs/` (obfuscated), not `unobfrunwaejs/` (source).

**After editing any JS files, you must re-obfuscate for changes to take effect.**

---

## Quick Start

From the runwae project root:

```bash
python3 deployment/obfuscate-js.py unobfrunwaejs runwaejs
```

---

## Watch Mode (Development)

Auto-rebuilds when you save changes:

```bash
python3 deployment/obfuscate-js.py unobfrunwaejs runwaejs --watch
```

Press `Ctrl+C` to stop.

---

## Directory Structure

```
runwae/
├── deployment/
│   └── obfuscate-js.py   ← Obfuscation script
│
├── unobfrunwaejs/        ← Edit these (source, readable)
│   ├── accountHQ.js
│   ├── display.js
│   └── ...
│
├── runwaejs/             ← Production (obfuscated, auto-generated)
│   ├── accountHQ.js
│   ├── display.js
│   └── ...
```

---

## Requirements

- Python 3.6+
- Node.js (optional, improves obfuscation quality)

The script uses `npx javascript-obfuscator` if Node.js is available, otherwise falls back to Python-based minification.

---

## Options

```bash
python3 deployment/obfuscate-js.py --help
```

| Flag | Description |
|------|-------------|
| `--watch`, `-w` | Watch for changes and auto-rebuild |
| `--no-npx` | Use Python minifier only (no Node.js) |
