#!/usr/bin/env node
/* Run the Harvest Hero regression suite.
 *
 *   node tests/run.js            all specs
 *   node tests/run.js save hand  only specs whose file name matches
 *   node tests/run.js -v         print every check, not just failures
 */
'use strict';
const path = require('path');
const { playwright, withPage, specs } = require('./lib/harness');

(async () => {
  const args = process.argv.slice(2);
  const verbose = args.includes('-v');
  const filters = args.filter(a => a !== '-v');
  const all = specs(path.join(__dirname, 'specs'))
    .filter(s => !filters.length || filters.some(f => s.file.includes(f)));

  if(!all.length){ console.error('No specs matched.'); process.exit(2); }

  const browser = await playwright().chromium.launch();
  let failed = 0, ran = 0, t0 = Date.now();

  for(const { file, mod } of all){
    const start = Date.now();
    const t = await withPage(browser, mod.run);
    const bad = t.checks.filter(c => !c.ok);
    const secs = ((Date.now()-start)/1000).toFixed(1);
    ran += t.checks.length;

    if(bad.length || t.errors.length){
      failed++;
      console.log('\x1b[31mFAIL\x1b[0m ' + (mod.name || file) +
                  '  (' + t.checks.length + ' checks, ' + secs + 's)');
      for(const c of bad) console.log('       ✗ ' + c.msg);
      for(const e of t.errors) console.log('       ⚠ ' + e);
    } else {
      console.log('\x1b[32m ok \x1b[0m ' + (mod.name || file) +
                  '  (' + t.checks.length + ' checks, ' + secs + 's)');
    }
    if(verbose) for(const c of t.checks) if(c.ok) console.log('       ✓ ' + c.msg);
  }

  await browser.close();
  console.log('\n' + all.length + ' specs, ' + ran + ' checks, ' + failed + ' failed, ' +
              ((Date.now()-t0)/1000).toFixed(1) + 's');
  process.exit(failed ? 1 : 0);
})();
