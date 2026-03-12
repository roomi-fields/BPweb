#!/usr/bin/env node
// Debug script: run a grammar and capture FULL messages to diagnose ABORT (-4)
// Usage: node scripts/debug-abort.js <grammar-file-path>
const fs = require('fs');
const path = require('path');

const grPath = process.argv[2];
if (!grPath) { console.error('Usage: node debug-abort.js <grammar-file>'); process.exit(1); }

const BP3_CTESTS = '/mnt/d/Claude/musicology-phd/scratch/bp3-ctests';

const buildDir = path.join(__dirname, '..', 'build');
process.chdir(buildDir);

const BP3Module = require(path.join(buildDir, 'bp3.js'));

BP3Module().then(bp3 => {
    const init = bp3.cwrap('bp3_init', 'number', []);
    const loadGr = bp3.cwrap('bp3_load_grammar', 'number', ['string']);
    const loadAl = bp3.cwrap('bp3_load_alphabet', 'number', ['string']);
    const loadSe = bp3.cwrap('bp3_load_settings', 'number', ['string']);
    const produce = bp3.cwrap('bp3_produce', 'number', []);
    const getResult = bp3.cwrap('bp3_get_result', 'string', []);
    const getMsg = bp3.cwrap('bp3_get_messages', 'string', []);

    console.log('=== DEBUG: Initializing BP3 ===');
    const initR = init();
    console.log('init() returned:', initR);

    const gr = fs.readFileSync(grPath, 'utf-8');
    console.log('=== Grammar file:', grPath, '===');
    console.log('First 200 chars:', gr.substring(0, 200));

    // Load settings if referenced
    const seMatch = gr.match(/-se\.(\S+)/);
    if (seMatch) {
        const seFile = path.join(BP3_CTESTS, '-se.' + seMatch[1]);
        console.log('\n=== Loading settings:', seFile, '===');
        if (fs.existsSync(seFile)) {
            const seContent = fs.readFileSync(seFile, 'utf-8');
            console.log('Settings first 200 chars:', seContent.substring(0, 200));
            const seR = loadSe(seContent);
            console.log('loadSettings() returned:', seR);
            const seMsg = getMsg();
            if (seMsg.trim()) console.log('Settings messages:\n' + seMsg);
        } else {
            console.log('WARNING: Settings file not found!');
        }
    }

    // Load alphabet if referenced
    const alMatch = gr.match(/-al\.(\S+)/);
    if (alMatch) {
        const alFile = path.join(BP3_CTESTS, '-al.' + alMatch[1]);
        console.log('\n=== Loading alphabet:', alFile, '===');
        if (fs.existsSync(alFile)) {
            const alR = loadAl(fs.readFileSync(alFile, 'utf-8'));
            console.log('loadAlphabet() returned:', alR);
            const alMsg = getMsg();
            if (alMsg.trim()) console.log('Alphabet messages:\n' + alMsg);
        } else {
            console.log('WARNING: Alphabet file not found!');
        }
    }

    // Load homomorphism if referenced
    const hoMatch = gr.match(/-ho\.(\S+)/);
    if (hoMatch) {
        console.log('\n=== Homomorphism referenced:', hoMatch[1], '(not loaded - no API) ===');
    }

    // Load tonebank if referenced
    const toMatch = gr.match(/-to\.(\S+)/);
    if (toMatch) {
        console.log('\n=== Tonebank referenced:', toMatch[1], '(not loaded - no API) ===');
    }

    // Load csound objects if referenced
    const csMatch = gr.match(/-cs\.(\S+)/);
    if (csMatch) {
        console.log('\n=== Csound objects referenced:', csMatch[1], '(not loaded - no API) ===');
    }

    console.log('\n=== Loading grammar ===');
    const grR = loadGr(gr);
    console.log('loadGrammar() returned:', grR);
    const grMsg = getMsg();
    console.log('Grammar messages (FULL):\n' + grMsg);

    console.log('\n=== Producing ===');
    const prodR = produce();
    console.log('produce() returned:', prodR);

    const prodMsg = getMsg();
    console.log('\nProduction messages (FULL):\n' + prodMsg);

    const result = getResult();
    console.log('\nResult output:', result.substring(0, 500));
    console.log('Result length:', result.length);

    process.exit(0);
}).catch(e => {
    console.error('Module load error:', e.message);
    process.exit(1);
});
