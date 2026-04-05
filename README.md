# BPweb — Bol Processor 3 Web Interface

Interface web pour BP3, utilisant le moteur BP3 compilé en WebAssembly.

## Setup

```bash
git clone --recursive https://github.com/roomi-fields/BPweb.git
cd BPweb

# L'interface fonctionne directement (dist/ contient les binaires WASM)
python3 -m http.server 8080
# Open http://localhost:8080/web/index.html

# Pour recompiler le moteur
cd bp3-engine
source /path/to/emsdk/emsdk_env.sh
./build.sh wasm
cd ..
```

## Structure

- `bp3-engine/` — BP3 WASM engine (submodule [roomi-fields/bp3-engine](https://github.com/roomi-fields/bp3-engine), branche wasm)
- `web/` — Interface web
- `dist/` — Binaires WASM déployés (bp3.js, bp3.wasm, bp3.data)

## Lien avec BPscript

BPweb et [BPscript](https://github.com/roomi-fields/BPscript) partagent le même moteur WASM. `build.sh` dans bp3-engine déploie les binaires dans les deux projets automatiquement.

- **BPweb** : interface web originale de Bernard, grammaires BP3 directes
- **BPscript** : langage de composition + transpiler + dispatcher + tests de non-régression
