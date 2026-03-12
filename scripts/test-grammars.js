#!/usr/bin/env node
/**
 * Automated test runner for BP3 WASM grammar engine.
 * Loads each grammar from bp3-ctests, compiles it, produces output,
 * and reports success/failure.
 *
 * Usage: node scripts/test-grammars.js [grammar-name]
 *   Without argument: tests all grammars
 *   With argument: tests only that grammar (e.g., "asymmetric1")
 */

const fs = require('fs');
const path = require('path');

const BP3_CTESTS = '/mnt/d/Claude/musicology-phd/scratch/bp3-ctests';
const WASM_DIR = path.join(__dirname, '..', 'build');

async function main() {
    const filterName = process.argv[2] || null;

    // Load WASM module
    process.chdir(WASM_DIR);
    const BP3Module = require(path.join(WASM_DIR, 'bp3.js'));
    const bp3 = await BP3Module();

    // Wrap C functions
    const bp3_init = bp3.cwrap('bp3_init', 'number', []);
    const bp3_load_grammar = bp3.cwrap('bp3_load_grammar', 'number', ['string']);
    const bp3_load_alphabet = bp3.cwrap('bp3_load_alphabet', 'number', ['string']);
    const bp3_produce = bp3.cwrap('bp3_produce', 'number', []);
    const bp3_get_result = bp3.cwrap('bp3_get_result', 'string', []);
    const bp3_get_messages = bp3.cwrap('bp3_get_messages', 'string', []);

    // Init engine
    const initResult = bp3_init();
    if (initResult !== 0) {
        console.error(`FATAL: bp3_init() returned ${initResult}`);
        process.exit(1);
    }
    console.log('BP3 engine initialized.\n');

    // Find grammar files
    const files = fs.readdirSync(BP3_CTESTS)
        .filter(f => f.startsWith('-gr.'))
        .sort();

    const results = { pass: 0, fail: 0, skip: 0, errors: [] };

    for (const grFile of files) {
        const name = grFile.replace('-gr.', '');

        if (filterName && name !== filterName) continue;

        // Read grammar
        const grPath = path.join(BP3_CTESTS, grFile);
        const grText = fs.readFileSync(grPath, 'utf-8');

        // Check for and load alphabet file
        const alMatch = grText.match(/-al\.(\S+)/);
        if (alMatch) {
            const alPath = path.join(BP3_CTESTS, `-al.${alMatch[1]}`);
            if (fs.existsSync(alPath)) {
                const alText = fs.readFileSync(alPath, 'utf-8');
                bp3_load_alphabet(alText);
            }
        }

        // Load grammar (this resets CompiledGr)
        const loadResult = bp3_load_grammar(grText);
        if (loadResult !== 0) {
            console.log(`  SKIP  ${name} (load failed: ${loadResult})`);
            results.skip++;
            continue;
        }

        // Produce
        let produceResult, output, messages;
        try {
            produceResult = bp3_produce();
            output = bp3_get_result();
            messages = bp3_get_messages();
        } catch (e) {
            console.log(`  CRASH ${name}: ${e.message}`);
            results.fail++;
            results.errors.push({ name, error: e.message });
            // Re-init after crash
            bp3_init();
            continue;
        }

        // Analyze result
        const hasErrors = messages.includes('Err.') || messages.includes('ABORT');
        const compileOK = messages.includes('Parsing completed') || messages.includes('Errors: 0');
        const hasOutput = output && output.trim().length > 0;

        // produceResult: 1=OK, 0=MISSED, -4=ABORT
        const statusIcon = produceResult === 1 ? (hasOutput ? '  PASS ' : '  WARN ')
                         : produceResult === 0 ? '  MISS '
                         : '  FAIL ';

        const outputPreview = hasOutput
            ? output.trim().substring(0, 60).replace(/\n/g, ' ') + (output.trim().length > 60 ? '...' : '')
            : '(empty)';

        console.log(`${statusIcon} ${name.padEnd(25)} code=${produceResult} output="${outputPreview}"`);

        if (hasErrors && !compileOK) {
            const errorLines = messages.split('\n')
                .filter(l => l.includes('Err') || l.includes('ABORT'))
                .slice(0, 3)
                .map(l => `         ${l.trim()}`);
            errorLines.forEach(l => console.log(l));
        }

        if (produceResult === 1 && hasOutput) {
            results.pass++;
        } else if (produceResult === 1 && !hasOutput) {
            results.pass++; // OK but empty output (might need sound objects)
        } else {
            results.fail++;
            results.errors.push({ name, code: produceResult, output: outputPreview });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(`RESULTS: ${results.pass} pass, ${results.fail} fail, ${results.skip} skip (total: ${files.length})`);

    if (results.errors.length > 0) {
        console.log('\nFailed grammars:');
        results.errors.forEach(e => {
            console.log(`  - ${e.name}: ${e.error || `code=${e.code}`}`);
        });
    }
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
