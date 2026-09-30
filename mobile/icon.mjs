/* Draw the app icon out of the game's own art.
 *
 *   node icon.mjs
 *
 * The wheat on the icon is the same wheat the game puts in your bag: this
 * loads index.html in a headless browser and calls drawItem() at a large
 * scale, the way itemIcon() paints the HUD pills. Nothing is drawn twice by
 * hand, so the icon cannot drift away from the game the way ITEMS' emoji
 * column once drifted away from drawItem().
 *
 * Writes what @capacitor/assets expects:
 *   assets/icon-only.png         1024  the whole icon, for the Play listing
 *   assets/icon-foreground.png   1024  the sheaf alone, inside the safe zone
 *   assets/icon-background.png   1024  the field behind it
 *   assets/splash.png            2732  and splash-dark.png beside it
 *
 * Then:  npx @capacitor/assets generate --android
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GAME = 'file://' + resolve(here, '..', 'index.html');
const OUT  = resolve(here, 'assets');

function playwright(){
  for(const t of [process.env.PLAYWRIGHT_PATH, 'playwright',
                  '/opt/node22/lib/node_modules/playwright',
                  '/usr/lib/node_modules/playwright',
                  '/usr/local/lib/node_modules/playwright'].filter(Boolean)){
    try { return require_(t); } catch(e){}
  }
  console.error('\nCannot find Playwright. It is the one tool the tests need too:\n' +
                '    npm install -g playwright && npx playwright install chromium\n');
  process.exit(2);
}
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

const { chromium } = playwright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(GAME);
await page.waitForFunction(() => window.BOOTED === true);

/* Runs in the page, where drawItem and the palette live. `ctx` is the game's
   own drawing context and is deliberately a `let` so itemIcon() can borrow
   it; we borrow it the same way and always give it back. */
const shots = await page.evaluate(() => {
  const FIELD = '#1b2a14';          // the same green as <body> and the app window
  const GLOW  = '#31491f';

  /* drawItem('wheat') is drawn around an origin, not centred on one: the ears
     reach 15.4 units above it and the stalks 8.2 below. Scaling from the
     origin therefore runs the sheaf off the top of the tile, which is exactly
     what the first attempt did. Size from the bounding box, and shift the
     origin down by half the difference so the art sits in the middle. */
  const ABOVE = 15.4, BELOW = 8.2, TALL = ABOVE + BELOW;

  function paint(size, { bg, sheaf, fill }){
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const real = ctx;
    ctx = off.getContext('2d');
    try {
      if(bg){
        ctx.fillStyle = FIELD;
        ctx.fillRect(0, 0, size, size);
        const g = ctx.createRadialGradient(size/2, size*0.42, size*0.05,
                                           size/2, size*0.42, size*0.62);
        g.addColorStop(0, GLOW);
        g.addColorStop(1, FIELD);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      if(sheaf){
        const unit = size * fill / TALL;            // one drawItem unit, in pixels
        ctx.translate(size/2, size/2 + (ABOVE - BELOW)/2 * unit);
        drawItem('wheat', 0, 0, unit);
      }
    } finally { ctx = real; }
    return off.toDataURL('image/png');
  }

  /* `fill` is how much of the tile's height the sheaf takes. The foreground
     layer is smaller than the flat icon on purpose: Android masks an adaptive
     icon to a shape inside the middle 66%, and anything outside that circle
     can be cut off on somebody's launcher. */
  return {
    icon:       paint(1024, { bg:true,  sheaf:true, fill:0.56 }),
    foreground: paint(1024, { bg:false, sheaf:true, fill:0.44 }),
    background: paint(1024, { bg:true,  sheaf:false }),
    splash:     paint(2732, { bg:true,  sheaf:true, fill:0.20 }),
  };
});
await browser.close();

await mkdir(OUT, { recursive: true });
const write = (name, dataUrl) =>
  writeFile(resolve(OUT, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

await write('icon-only.png',       shots.icon);
await write('icon-foreground.png', shots.foreground);
await write('icon-background.png', shots.background);
await write('splash.png',          shots.splash);
await write('splash-dark.png',     shots.splash);   // the game has one palette
console.log('  icons -> ' + OUT);
