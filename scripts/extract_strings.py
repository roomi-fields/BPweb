#!/usr/bin/env python3
"""Extract string arrays from StringLists.h and generate console_strings.json"""

import json
import re
import sys

def extract_arrays(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Map C array names to JSON keys
    array_map = {
        'ScriptCommand_old': 'ScriptCommand',
        'GramProcedure_old': 'GramProcedure',
        'PerformanceControl_old': 'PerformanceControl',
        'HTMLdiacritical_old': 'HTMLdiacritical',
    }

    result = {}

    for c_name, json_key in array_map.items():
        # Find array body: from "c_name[...] = \n{" to closing "};"
        pattern = re.escape(c_name) + r'\[.*?\]\[.*?\]\s*=\s*\n?\{(.*?)\};'
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            print(f"WARNING: Could not find array '{c_name}'", file=sys.stderr)
            continue

        body = match.group(1)
        # Extract all quoted strings
        strings = re.findall(r'"((?:[^"\\]|\\.)*)"', body)
        result[json_key] = strings
        print(f"{json_key}: {len(strings)} strings", file=sys.stderr)

    return result

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else '/mnt/d/Claude/musicology-phd/scratch/bp3-source/source/not_used/StringLists.h'
    out = sys.argv[2] if len(sys.argv) > 2 else '/mnt/d/Claude/BPweb/csrc/wasm/console_strings.json'

    data = extract_arrays(src)
    with open(out, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {out}")

    # Verify
    with open(out) as f:
        verify = json.load(f)
    for k, v in verify.items():
        print(f"  {k}: {len(v)} entries")
