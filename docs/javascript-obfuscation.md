# JavaScript Obfuscation

The Runwae frontend loads JavaScript from `runwaejs/` (obfuscated), not `unobfrunwaejs/` (source).

**After editing any JS files, you must re-obfuscate for changes to take effect.**

---

## Quick Start

```bash
cd ~/mdo3d
python3 scripts/obfuscate-js.py \
    projects/runwae/runwae/unobfrunwaejs \
    projects/runwae/runwae/runwaejs
```

---

## Watch Mode (Development)

Auto-rebuilds when you save changes:

```bash
cd ~/mdo3d
python3 scripts/obfuscate-js.py \
    projects/runwae/runwae/unobfrunwaejs \
    projects/runwae/runwae/runwaejs \
    --watch
```

Press `Ctrl+C` to stop.

---

## Directory Structure

```
runwae/
├── unobfrunwaejs/    ← Edit these (source, readable)
│   ├── accountHQ.js
│   ├── display.js
│   └── ...
│
├── runwaejs/         ← Production (obfuscated, auto-generated)
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

## Script Location

The obfuscation script is shared across projects:

```
~/mdo3d/scripts/obfuscate-js.py
```

Run `python3 ~/mdo3d/scripts/obfuscate-js.py --help` for all options.
