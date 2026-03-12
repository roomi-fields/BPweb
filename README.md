# BPweb — Bol Processor 3 Web Interface

Web interface for BP3, using the BP3 engine compiled to WebAssembly.

## Setup
```bash
git clone --recursive https://github.com/roomi-fields/BPweb.git
cd BPweb/bp3-engine
source /path/to/emsdk/emsdk_env.sh
make -f Makefile.emscripten
cd ..
python3 -m http.server 8080
# Open http://localhost:8080/web/index.html
```

## Structure
- `bp3-engine/` — BP3 WASM engine (submodule)
- `web/` — Web interface
- `dist/` — Deployable cyberpunk version
- `dist-roomi/` — Deployable roomi-fields version
