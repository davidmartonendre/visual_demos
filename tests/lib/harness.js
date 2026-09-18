/* Test harness for Harvest Hero.
 *
 * The game is one HTML file with everything at script scope, so a test just
 * loads it in a headless browser and calls the game's own functions. There is
 * no mock layer and no test build: whatever a spec exercises is the shipping
 * code.
 *
 * Time: specs never sleep. `tick(seconds)` calls the game's own update() in
 * 1/60 steps, so ten simulated seconds cost milliseconds and never depend on
 * how fast the machine is. Anything that only happens in draw() is therefore
 * invisible to a tick -- assert on state, not on pixels.
 */
'use strict';
const path = require('path');
const fs = require('fs');

const GAME = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');

/* Playwright is not vendored -- this repo has no package manager by design.
   Look where a global install puts it, and say so plainly if it is absent. */
function playwright(){
  const tries = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
    '/usr/local/lib/node_modules/playwright',
    path.join(process.env.HOME || '', '.npm-global/lib/node_modules/playwright'),
  ].filter(Boolean);
  for(const t of tries){ try { return require(t); } catch(e){} }
  console.error(
    '\nCannot find Playwright. The game needs no dependencies; the tests need one browser driver:\n' +
    '    npm install -g playwright && npx playwright install chromium\n' +
    'Then re-run, or point PLAYWRIGHT_PATH at an existing install.\n');
  process.exit(2);
}

/* One assertion context per spec. Failures are collected rather than thrown,
   so a spec reports everything wrong in one run; must() is for preconditions
   where carrying on would only produce noise. */
class T {
  constructor(page){ this.page = page; this.checks = []; this.errors = []; }

  run(fn, arg){ return this.page.evaluate(fn, arg); }
  get(fn, arg){ return this.page.evaluate(fn, arg); }

  /* Simulate `s` seconds of game time. */
  tick(s){ return this.page.evaluate(n => {
    const step = 1/60;
    for(let i=0;i<Math.round(n*60);i++) update(step);
  }, s); }

  /* A fresh farm, as if the player had never played. */
  async reset(){
    await this.page.evaluate(()=>{
      try{ localStorage.clear(); }catch(e){}
      closeModal(); resetGame(); buildDecor(); syncHUD();
    });
  }

  /* Walk the player onto a point and let the world run, which is how a real
     player triggers a tray, a pad or the counter. */
  async stand(x, y, seconds){
    await this.page.evaluate(([x,y])=>{ const a=player(); a.x=x; a.y=y; }, [x,y]);
    if(seconds) await this.tick(seconds);
  }

  ok(cond, msg){ this.checks.push({ ok: !!cond, msg }); return !!cond; }
  must(cond, msg){ this.ok(cond, msg); if(!cond) throw new Bail(msg); }
  eq(a, b, msg){ return this.ok(Object.is(a,b) || a === b,
    msg + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
  near(a, b, tol, msg){ return this.ok(Math.abs(a-b) <= tol,
    msg + '  (got ' + a + ', want ' + b + ' +-' + tol + ')'); }
  gt(a, b, msg){ return this.ok(a > b, msg + '  (got ' + a + ', want > ' + b + ')'); }
  gte(a, b, msg){ return this.ok(a >= b, msg + '  (got ' + a + ', want >= ' + b + ')'); }
  lte(a, b, msg){ return this.ok(a <= b, msg + '  (got ' + a + ', want <= ' + b + ')'); }
}
class Bail extends Error {}

async function withPage(browser, fn){
  const page = await browser.newPage({ viewport:{ width:600, height:950 } });
  const t = new T(page);
  page.on('pageerror', e => t.errors.push('uncaught: ' + e.message));
  page.on('console', m => { if(m.type()==='error') t.errors.push('console: ' + m.text()); });
  await page.goto(GAME);
  await page.waitForFunction(()=> typeof G !== 'undefined' && !!G);
  try { await fn(t); }
  catch(e){ if(!(e instanceof Bail)) t.checks.push({ ok:false, msg:'threw: ' + e.message }); }
  await page.close();
  return t;
}

function specs(dir){
  return fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()
           .map(f => ({ file:f, mod: require(path.join(dir, f)) }));
}

module.exports = { playwright, withPage, specs, GAME, Bail };
