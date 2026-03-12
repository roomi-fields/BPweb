#!/usr/bin/env node
// Debug: show full error messages for a grammar
const fs = require('fs');
const path = require('path');

const grPath = process.argv[2];
if (!grPath) { console.error('Usage: node debug-miss.js <grammar-file>'); process.exit(1); }

const BP3_CTESTS = '/mnt/d/Claude/musicology-phd/scratch/bp3-ctests';
const buildDir = path.join(__dirname, '..', 'build');
process.chdir(buildDir);

const _log = console.log;
console.log = console.warn = console.error = () => {};
const BP3Module = require(path.join(buildDir, 'bp3.js'));

function convertOldSettings(content) {
    const lines = content.split('\n');
    if (lines.length < 12) return null;
    const val = (n) => (lines[n-1] || '').trim();
    const num = (n) => { const v = parseFloat(val(n)); return isNaN(v) ? null : v; };
    const obj = {};
    const add = (key, line) => {
        const v = num(line);
        if (v !== null) obj[key] = {name: key, value: String(v), boolean: "0"};
    };
    add("NoteConvention", 10);
    add("Nature_of_time", 9);
    add("C4key", 65);
    add("A4freq", 66);
    if (!obj.NoteConvention) return null;
    return JSON.stringify(obj);
}

BP3Module().then(bp3 => {
    const init = bp3.cwrap('bp3_init', 'number', []);
    const loadGr = bp3.cwrap('bp3_load_grammar', 'number', ['string']);
    const loadAl = bp3.cwrap('bp3_load_alphabet', 'number', ['string']);
    const loadSe = bp3.cwrap('bp3_load_settings', 'number', ['string']);
    const produce = bp3.cwrap('bp3_produce', 'number', []);
    const getResult = bp3.cwrap('bp3_get_result', 'string', []);
    const getMsg = bp3.cwrap('bp3_get_messages', 'string', []);

    init();

    const gr = fs.readFileSync(grPath, 'utf-8');

    // Load settings
    const seMatch = gr.match(/-se\.(\S+)/);
    let seLoaded = false;
    if (seMatch) {
        const seFile = path.join(BP3_CTESTS, '-se.' + seMatch[1]);
        if (fs.existsSync(seFile)) {
            let seContent = fs.readFileSync(seFile, 'utf-8');
            if (!seContent.trim().startsWith('{')) {
                seContent = convertOldSettings(seContent);
            }
            if (seContent) {
                const r = loadSe(seContent);
                seLoaded = true;
                _log(`Settings: loaded ${seMatch[1]} (result=${r})`);
            }
        } else {
            _log(`Settings: FILE NOT FOUND ${seFile}`);
        }
    }

    // Load alphabet (-al or -ho)
    const alMatch = gr.match(/-al\.(\S+)/);
    const hoMatch = gr.match(/-ho\.(\S+)/);
    const alName = alMatch ? alMatch[1] : (hoMatch ? hoMatch[1] : null);
    if (alName) {
        const alFile = path.join(BP3_CTESTS, '-al.' + alName);
        if (fs.existsSync(alFile)) {
            loadAl(fs.readFileSync(alFile, 'utf-8'));
            _log(`Alphabet: loaded ${alName}`);
        } else {
            _log(`Alphabet: FILE NOT FOUND ${alFile}`);
        }
    }

    loadGr(gr);
    const r = produce();
    const out = getResult().trim();
    const msg = getMsg();

    _log(`Result: ${r}`);
    _log(`Output length: ${out.length}`);
    if (out.length > 0) _log(`Output: ${out.substring(0, 100)}`);
    _log('--- Error lines ---');
    msg.split('\n').filter(l =>
        l.includes('Err') || l.includes("Can't") || l.includes('ABORT') ||
        l.includes('unknown') || l.includes('_keyxpand') || l.includes('Problem') ||
        l.includes('Compilation failed')
    ).slice(0, 10).forEach(l => _log(l.trim()));

    process.exit(0);
}).catch(e => {
    _log('CRASH: ' + e.message);
    process.exit(0);
});
