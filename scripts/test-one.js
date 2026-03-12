#!/usr/bin/env node
// Usage: node scripts/test-one.js <grammar-file-path>
const fs = require('fs');
const path = require('path');

const grPath = process.argv[2];
if (!grPath) { process.stderr.write('ERROR|no file\n'); process.exit(0); }

const BP3_CTESTS = '/mnt/d/Claude/musicology-phd/scratch/bp3-ctests';

const buildDir = path.join(__dirname, '..', 'build');
process.chdir(buildDir);

// Convert old-format settings (positional lines) to minimal JSON
function convertOldSettings(content) {
    const lines = content.split('\n');
    if (lines.length < 12) return null; // Too short
    // Old format: lines 1-2 are comments, line 10 = NoteConvention
    // Line mapping (1-indexed): 5=Quantization, 7=MIDIsyncDelay, 9=Nature_of_time,
    // 10=NoteConvention, 47=MaxConsoleTime, 65=C4key, 66=A4freq, 68=DeftVolume
    const val = (n) => (lines[n-1] || '').trim();
    const num = (n) => { const v = parseFloat(val(n)); return isNaN(v) ? null : v; };
    const entry = (name, v, bool) => v !== null ? {name, value: String(v), boolean: bool ? "1" : "0"} : undefined;
    const obj = {};
    const add = (key, name, line, bool) => {
        const v = num(line);
        if (v !== null) obj[key] = entry(name, v, bool);
    };
    add("NoteConvention", "Note convention", 10, false);
    add("Quantization", "Quantization", 5, false);
    add("Time_res", "Time resolution", 6, false);
    add("Nature_of_time", "Nature of time", 9, true);
    add("Improvize", "Improvize", 33, true);
    if (lines.length >= 47) add("MaxConsoleTime", "Max console time", 47, false);
    if (lines.length >= 65) add("C4key", "C4 key number", 65, false);
    if (lines.length >= 66) add("A4freq", "A4 frequency", 66, false);
    if (lines.length >= 68) add("DeftVolume", "Default volume", 68, false);
    // Only return if we got at least NoteConvention
    if (!obj.NoteConvention) return null;
    return JSON.stringify(obj);
}


// Suppress emscripten console output during module load and execution
const _log = console.log;
const _warn = console.warn;
const _error = console.error;
function suppress() { console.log = console.warn = console.error = () => {}; }
function restore() { console.log = _log; console.warn = _warn; console.error = _error; }

suppress();
const BP3Module = require(path.join(buildDir, 'bp3.js'));

BP3Module().then(bp3 => {
    const init = bp3.cwrap('bp3_init', 'number', []);
    const loadGr = bp3.cwrap('bp3_load_grammar', 'number', ['string']);
    const loadAl = bp3.cwrap('bp3_load_alphabet', 'number', ['string']);
    const loadSe = bp3.cwrap('bp3_load_settings', 'number', ['string']);
    const loadTo = bp3.cwrap('bp3_load_tonality', 'number', ['string']);
    const loadCs = bp3.cwrap('bp3_load_csound_resources', 'number', ['string']);
    const produce = bp3.cwrap('bp3_produce', 'number', []);
    const getResult = bp3.cwrap('bp3_get_result', 'string', []);
    const getMsg = bp3.cwrap('bp3_get_messages', 'string', []);

    init();

    const gr = fs.readFileSync(grPath, 'utf-8');

    // Load settings if referenced (must be loaded BEFORE grammar for NoteConvention)
    const seMatch = gr.match(/-se\.(\S+)/);
    if (seMatch) {
        const seFile = path.join(BP3_CTESTS, '-se.' + seMatch[1]);
        if (fs.existsSync(seFile)) {
            let seContent = fs.readFileSync(seFile, 'utf-8');
            // Convert old-format settings to minimal JSON on-the-fly
            if (!seContent.trim().startsWith('{')) {
                seContent = convertOldSettings(seContent);
            }
            if (seContent) loadSe(seContent);
        }
    }

    // Load alphabet if referenced (-al.XXX)
    const alMatch = gr.match(/-al\.(\S+)/);
    if (alMatch) {
        const alFile = path.join(BP3_CTESTS, '-al.' + alMatch[1]);
        if (fs.existsSync(alFile)) {
            loadAl(fs.readFileSync(alFile, 'utf-8'));
        }
    }

    // Load alphabet from home file (-ho.XXX maps to -al.XXX)
    const hoMatch = gr.match(/-ho\.(\S+)/);
    if (hoMatch && !alMatch) {
        const alFile = path.join(BP3_CTESTS, '-al.' + hoMatch[1]);
        if (fs.existsSync(alFile)) {
            loadAl(fs.readFileSync(alFile, 'utf-8'));
        }
    }

    // Load tonality file if referenced (-to.XXX)
    const toMatch = gr.match(/-to\.(\S+)/);
    if (toMatch) {
        const toFile = path.join(BP3_CTESTS, '-to.' + toMatch[1]);
        if (fs.existsSync(toFile)) {
            loadTo(fs.readFileSync(toFile, 'utf-8'));
        }
    }

    // Load Csound scale tables if referenced (-cs.XXX)
    // LoadCsoundInstruments expects a binary serialized format we can't hand-craft.
    // Instead, load scale tables via tonality path (LoadTonality handles _begin tables).
    const csMatch = gr.match(/-cs\.(\S+)/);
    if (csMatch && !toMatch) {
        // No -to file was loaded; try loading a -to file matching the -cs name
        const toFile2 = path.join(BP3_CTESTS, '-to.' + csMatch[1]);
        if (fs.existsSync(toFile2)) {
            loadTo(fs.readFileSync(toFile2, 'utf-8'));
        } else {
            // Fallback: load -cs file via tonality path (same _begin tables format)
            const csFile = path.join(BP3_CTESTS, '-cs.' + csMatch[1]);
            if (fs.existsSync(csFile)) {
                loadTo(fs.readFileSync(csFile, 'utf-8'));
            }
        }
    }

    loadGr(gr);
    const r = produce();
    const out = getResult().trim();
    const msg = getMsg();
    const errMatch = msg.match(/Errors:\s*(\d+)/);
    const errs = errMatch ? errMatch[1] : '?';
    const preview = out.substring(0, 60).replace(/\n/g, ' ');

    restore();
    console.log(r + '|' + errs + '|' + (out.length > 0 ? 'Y' : 'N') + '|' + preview);
    process.exit(0);
}).catch(e => {
    restore();
    console.log('ERROR|' + e.message.substring(0, 80));
    process.exit(0);
});
