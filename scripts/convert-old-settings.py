#!/usr/bin/env python3
"""Convert old-format BP3 settings files to JSON format.

Old format: positional values, one per line, after 2 comment lines.
New format: JSON with {name, value, unit, boolean} per key.

Usage: python3 scripts/convert-old-settings.py [file_or_directory]
  Without args: converts all settings.json in library/
"""

import json
import sys
import os
import glob

# Line mapping: (absolute_line_number, json_key, human_name, is_boolean, unit)
# Line numbers are 1-indexed
LINE_MAP = [
    (3,  None, None, False, None),  # version marker, always 1
    (4,  None, None, False, None),  # Csound orchestra (string, skip)
    (5,  "Quantization", "Quantization", False, "ms"),
    (6,  "Time_res", "Time resolution", False, "ms"),
    (7,  "MIDIsyncDelay", "MIDI sync delay", False, "ms"),
    (8,  "Quantize", "Quantize", True, ""),
    (9,  "Nature_of_time", "Nature of time (1=striated, 0=smooth)", True, ""),
    (10, "NoteConvention", "Note convention", False, "0=English,1=French,2=Indian,3=key#,4=tonal"),
    (11, "Pclock", "P clock (numerator)", False, ""),
    (12, "Qclock", "Q clock (denominator)", False, ""),
    (13, "NameChoice_B#_C", "B# instead of C", True, ""),
    (14, "NameChoice_Db_C#", "Db instead of C#", True, ""),
    (15, "NameChoice_Eb_D#", "Eb instead of D#", True, ""),
    (16, "NameChoice_Fb_E", "Fb instead of E", True, ""),
    (17, "NameChoice_E#_F", "E# instead of F", True, ""),
    (18, "NameChoice_Gb_F#", "Gb instead of F#", True, ""),
    (19, "NameChoice_Ab_G#", "Ab instead of G#", True, ""),
    (20, "NameChoice_Bb_A#", "Bb instead of A#", True, ""),
    (21, "NameChoice_Cb_B", "Cb instead of B", True, ""),
    (22, "TraceMicrotonality", "Trace microtonality", True, ""),
    (23, "DisplayItems", "Display items", True, ""),
    (24, "ShowGraphic", "Show graphic", True, ""),
    (25, "ShowObjectGraph", "Show object graphic", True, ""),
    (26, "ShowPianoRoll", "Show piano roll", True, ""),
    (27, "GraphicScaleP", "Graphic scale P", False, ""),
    (28, "GraphicScaleQ", "Graphic scale Q", False, ""),
    (29, "DisplayProduce", "Display produce", True, ""),
    (30, "SplitTimeObjects", "Split time objects", True, ""),
    (31, "SplitVariables", "Split variables", True, ""),
    (32, "CsoundTrace", "Csound trace", True, ""),
    (33, "Improvize", "Improvize", True, ""),
    # Lines 34-43: various flags
    (44, "DeftBufferSize", "Default buffer size", False, "events"),
    (45, "ComputeWhilePlay", "Compute while playing", True, ""),
    # Line 47: MaxConsoleTime
    (47, "MaxConsoleTime", "Max console time", False, "seconds"),
    # Lines 55-56: MIDI device names (strings, skip)
    (59, "ResetNotes", "Reset notes between items", True, ""),
    (60, "ResetWeights", "Reset rule weights", True, ""),
    (61, "ResetFlags", "Reset flags", True, ""),
    (62, "ResetControllers", "Reset controllers", True, ""),
    (64, "EndFadeOut", "End fade out", False, "seconds"),
    (65, "C4key", "C4 key number", False, "MIDI key"),
    (66, "A4freq", "A4 frequency", False, "Hz"),
    (67, "StrikeAgainDefault", "Strike again default", True, ""),
    (68, "DeftVolume", "Default volume", False, "0-127"),
    (69, "VolumeController", "Volume controller", False, "CC#"),
    (70, "DeftVelocity", "Default velocity", False, "0-127"),
    (71, "DeftPanoramic", "Default panoramic", False, "0-127"),
    (72, "PanoramicController", "Panoramic controller", False, "CC#"),
    (73, "SamplingRate", "Sampling rate", False, "kHz"),
]


def is_old_format(content):
    """Check if content is old-format (not JSON)."""
    stripped = content.strip()
    if stripped.startswith('{'):
        return False
    if stripped.startswith('//'):
        return True
    # Try to parse as JSON
    try:
        json.loads(stripped)
        return False
    except json.JSONDecodeError:
        return True


def is_single_line_format(lines):
    """Check if this is the very old single-line format (BP2.9.4)."""
    non_comment = [l for l in lines if not l.startswith('//')]
    # If there are very few non-comment lines but the content is long
    if len(non_comment) <= 3 and any(len(l) > 200 for l in non_comment):
        return True
    return False


def convert_old_to_json(content, source_name=""):
    """Convert old-format settings to JSON."""
    lines = content.split('\n')

    if is_single_line_format(lines):
        print(f"  SKIP {source_name} (very old single-line format, needs manual conversion)")
        return None

    # Build line map
    result = {}

    # Add header
    comment_lines = [l for l in lines[:3] if l.startswith('//')]
    if comment_lines:
        result["header"] = '\n'.join(comment_lines)

    for line_num, key, name, is_bool, unit in LINE_MAP:
        if key is None:
            continue
        if line_num > len(lines):
            continue

        val = lines[line_num - 1].strip() if line_num <= len(lines) else ""

        # Skip string lines (MIDI devices, Csound orchestra)
        if not val or val.startswith('//') or val.startswith('<'):
            continue

        # Try to parse as number
        try:
            if '.' in val:
                float(val)
            else:
                int(val)
        except ValueError:
            continue  # Skip non-numeric values

        entry = {
            "name": name,
            "value": val,
        }
        if unit:
            entry["unit"] = unit
        entry["boolean"] = "1" if is_bool else "0"

        result[key] = entry

    return result


def convert_file(filepath):
    """Convert a single settings file if it's old format."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    if not is_old_format(content):
        return False  # Already JSON

    result = convert_old_to_json(content, os.path.basename(filepath))
    if result is None:
        return False  # Unconvertible

    # Check we got NoteConvention
    nc = result.get("NoteConvention", {}).get("value", "?")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    return True


def main():
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if os.path.isfile(target):
            if convert_file(target):
                print(f"Converted: {target}")
            else:
                print(f"Skipped (already JSON or unconvertible): {target}")
        elif os.path.isdir(target):
            for f in sorted(glob.glob(os.path.join(target, '**', 'settings.json'), recursive=True)):
                if convert_file(f):
                    nc = json.load(open(f)).get("NoteConvention", {}).get("value", "?")
                    print(f"  CONVERTED {f} (NoteConvention={nc})")
        return

    # Default: convert all settings in library/
    lib_dir = os.path.join(os.path.dirname(__file__), '..', 'library')
    converted = 0
    skipped = 0
    already_json = 0

    for f in sorted(glob.glob(os.path.join(lib_dir, '**', 'settings.json'), recursive=True)):
        with open(f, 'r') as fh:
            content = fh.read()

        if not is_old_format(content):
            already_json += 1
            continue

        if convert_file(f):
            converted += 1
            nc = json.load(open(f)).get("NoteConvention", {}).get("value", "?")
            rel = os.path.relpath(f, lib_dir)
            print(f"  CONVERTED {rel} (NoteConvention={nc})")
        else:
            skipped += 1

    print(f"\nDone: {converted} converted, {already_json} already JSON, {skipped} skipped")


if __name__ == '__main__':
    main()
