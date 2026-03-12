#!/bin/bash
# Build the grammar library from bp3-ctests
# Copies grammars + their alphabet/settings files, generates index.json

SRC="/mnt/d/Claude/musicology-phd/scratch/bp3-ctests"
LIB="/mnt/d/Claude/BPweb/library"

# Grammars that PASS or WARN (compile OK, engine works)
# Categorized manually based on content

declare -A GRAMMARS=(
    # tabla / Indian
    ["tabla/ek-do-tin"]="12345678"
    ["tabla/dhati"]="dhati"
    ["tabla/dhin"]="dhin--"
    ["tabla/nadaka"]="Nadaka"
    ["tabla/mohanam"]="trial.mohanam"

    # western / classical
    ["western/alan-dice"]="Alan"
    ["western/beatrix-dice"]="Beatrix"
    ["western/mozart-dice"]="Mozart"
    ["western/ruwet"]="Ruwet"
    ["western/ames"]="Ames"
    ["western/watch"]="Watch_What_Happens"

    # experimental / algorithmic
    ["experimental/asymmetric"]="asymmetric1"
    ["experimental/look-and-say"]="look-and-say"
    ["experimental/not-reich"]="NotReich"
    ["experimental/shapes-rhythm"]="ShapesInRhythm"
    ["experimental/visser-shapes"]="Visser.Shapes"
    ["experimental/visser-waves"]="Visser.Waves"
    ["experimental/visser3"]="Visser3"
    ["experimental/visser5"]="Visser5"
    ["experimental/acceleration"]="acceleration"
    ["experimental/livecode1"]="livecode1"
    ["experimental/livecode2"]="livecode2"

    # examples / tutorial
    ["examples/negative-context"]="checkNegativeContext"
    ["examples/templates"]="checktemplates"
    ["examples/destru"]="tryDESTRU"
    ["examples/flags"]="tryFlags"
    ["examples/all-items"]="tryAllItems0"
    ["examples/time-patterns"]="tryTimePatterns"
    ["examples/repeat"]="tryrepeat"
    ["examples/drum"]="drum"
    ["examples/transposition"]="transposition3"
    ["examples/scales"]="tryScales"
    ["examples/harmony"]="tryHarmony"
    ["examples/major-minor"]="tryMajorMinor"
    ["examples/one-scale"]="tryOneScale"
    ["examples/tunings"]="tryTunings"
    ["examples/csound"]="tryCsound"
    ["examples/graphics"]="tryGraphics"

    # koto / Japanese
    ["experimental/koto3"]="koto3"
    ["experimental/kss2"]="kss2"

    # vina / Indian string
    ["tabla/vina"]="vina"
    ["tabla/vina2"]="vina2"
    ["tabla/vina3"]="vina3"

    # polyrhythmic
    ["experimental/765432"]="765432"
)

echo "Building grammar library..."

# Collect entries as tab-separated lines for Python
ENTRIES=""

for path in $(echo "${!GRAMMARS[@]}" | tr ' ' '\n' | sort); do
    name="${GRAMMARS[$path]}"
    grfile="$SRC/-gr.$name"

    if [ ! -f "$grfile" ]; then
        echo "  SKIP $name (no grammar file)"
        continue
    fi

    # Create directory
    dir="$LIB/$path"
    mkdir -p "$dir"

    # Copy grammar
    cp "$grfile" "$dir/grammar.gr"

    # Copy associated files
    gr_content=$(cat "$grfile")

    # Settings
    se_name=$(echo "$gr_content" | grep -oP '(?<=-se\.)\S+' | head -1)
    has_settings=false
    if [ -n "$se_name" ] && [ -f "$SRC/-se.$se_name" ]; then
        cp "$SRC/-se.$se_name" "$dir/settings.json"
        has_settings=true
    fi

    # Alphabet
    al_name=$(echo "$gr_content" | grep -oP '(?<=-al\.)\S+' | head -1)
    has_alphabet=false
    if [ -n "$al_name" ] && [ -f "$SRC/-al.$al_name" ]; then
        cp "$SRC/-al.$al_name" "$dir/alphabet.al"
        has_alphabet=true
    fi

    # Glossary
    gl_name=$(echo "$gr_content" | grep -oP '(?<=-gl\.)\S+' | head -1)
    if [ -n "$gl_name" ] && [ -f "$SRC/-gl.$gl_name" ]; then
        cp "$SRC/-gl.$gl_name" "$dir/glossary.gl"
    fi

    # Csound
    cs_name=$(echo "$gr_content" | grep -oP '(?<=-cs\.)\S+' | head -1)
    if [ -n "$cs_name" ] && [ -f "$SRC/-cs.$cs_name" ]; then
        cp "$SRC/-cs.$cs_name" "$dir/csound.cs"
    fi

    # Extract mode from grammar
    mode=$(echo "$gr_content" | grep -oP '^\s*(ORD|RND|SUB1?|LIN)\b' | head -1 | tr -d ' ')
    [ -z "$mode" ] && mode="ORD"

    # Extract description from comments
    desc=$(echo "$gr_content" | grep '^//' | grep -v 'Bol Processor\|Grammar saved\|Date:' | head -1 | sed 's|^// *||')

    # Category
    category=$(echo "$path" | cut -d'/' -f1)

    # Append entry (tab-separated)
    ENTRIES+="${path}	${name}	${category}	${mode}	${has_settings}	${has_alphabet}	${desc}
"

    echo "  OK   $path ($name)"
done

# Generate index.json with Python (avoids bash quoting issues)
python3 -c "
import json, sys

entries = []
for line in sys.stdin.strip().split('\n'):
    if not line.strip():
        continue
    parts = line.split('\t', 6)
    if len(parts) < 6:
        continue
    path, name, category, mode, has_settings, has_alphabet = parts[:6]
    desc = parts[6] if len(parts) > 6 else ''

    entry = {
        'id': path.replace('/', '-'),
        'title': name,
        'path': path,
        'category': category,
        'mode': mode,
        'description': desc,
        'files': {
            'grammar': path + '/grammar.gr'
        }
    }
    if has_settings == 'true':
        entry['files']['settings'] = path + '/settings.json'
    if has_alphabet == 'true':
        entry['files']['alphabet'] = path + '/alphabet.al'
    entries.append(entry)

# Sort by category then title
cat_order = {'tabla': 0, 'western': 1, 'experimental': 2, 'examples': 3}
entries.sort(key=lambda e: (cat_order.get(e['category'], 99), e['title'].lower()))

with open('$LIB/index.json', 'w') as f:
    json.dump(entries, f, indent=2, ensure_ascii=False)
print(f'Library built: {len(entries)} grammars')
" <<< "$ENTRIES"
