## BPweb — Bol Processor 3 Web Interface

Classic BP3 interface running in the browser via WebAssembly.

### Architecture
- `bp3-engine/` — Submodule: BP3 WASM engine ([roomi-fields/bp3-engine](https://github.com/roomi-fields/bp3-engine))
- `web/index.html` — Main web interface
- `dist/` — Deployable version (cyberpunk palette)
- `dist-roomi/` — Deployable version (roomi-fields palette, deployed at roomi-fields.com)
- `scripts/` — Build and test utilities
- `test-data/` — Grammar test files

### Build & Test
```bash
cd bp3-engine
source /mnt/d/Claude/emsdk/emsdk_env.sh
make -f Makefile.emscripten
cd ..
python3 -m http.server 8080
# Open http://localhost:8080/web/index.html
```

### Deployment
- Production: https://roomi-fields.com/bol-processor/ (WordPress iframe → /wp-content/uploads/bpweb/)
- Server: root@72.61.97.213 (Hostinger Docker)
- Deploy via: scp dist-roomi files to server

### Key conventions
- dist-roomi/ paths are relative (./) — self-contained deployable
- web/ paths reference ../bp3-engine/build/ and ../bp3-engine/library/
- Csound loaded dynamically with try/catch (CDN circular dependency fix)

### RTFM — Indexed Knowledge Base

This project has been indexed with RTFM.

For any **exploratory search** (finding which files/modules/classes are relevant
to a topic), use `rtfm_search` instead of Glob, find, ls, or broad Grep.
Then use `rtfm_expand` to read easily most relevant files/sections.
