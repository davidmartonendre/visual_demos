/* Build the app's copy of the game.
 *
 *   node sync.mjs             copy ../index.html to www/, inject the bridge
 *   node sync.mjs --release   the same, run through terser first
 *
 * The repo's index.html stays the source and stays readable -- tests/run.js
 * calls its globals by name. This writes a SEPARATE copy into www/, which is
 * what goes in the APK.
 *
 * About --release: it compresses and drops every comment, so the shipped file
 * no longer explains where the save key is or how the stamp works. Top-level
 * names are deliberately NOT mangled, for one reason: with the names intact
 * the whole test suite runs against the built file
 * (`npm run test:build`), so the build is verified rather than hoped at.
 * That trade is worth more than the extra few minutes mangling would cost an
 * attacker. None of this is security -- the key ships with the game either
 * way. It is friction, and friction is the right size of effort for a cheat
 * that costs a single-player farming game nothing.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '..', 'index.html');
const OUT = resolve(here, 'www', 'index.html');
const release = process.argv.includes('--release');

const BRIDGE = '<script src="hh-native.js"></script>\n';

let html = await readFile(SRC, 'utf8');

/* The game is one bare <script> with everything in it. Anything else means the
   file has changed shape and this script's assumptions with it -- stop rather
   than ship a half-wired app. */
const open = html.match(/<script(\s[^>]*)?>/g) || [];
if(open.length !== 1 || open[0] !== '<script>')
  throw new Error('expected exactly one bare <script> in index.html, found ' +
                  open.length + ': ' + open.join(', ') +
                  '\nsync.mjs injects the bridge before it and needs to know which one.');

if(release){
  let minify;
  try { ({ minify } = await import('terser')); }
  catch { console.warn('! terser is not installed -- shipping the readable file.\n' +
                       '  npm install   in mobile/, then build again.'); }
  if(minify){
    const body = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
    const out = await minify(body, {
      compress: true,
      mangle: { toplevel: false },     // see the note above: the specs need these names
      format: { comments: false },
    });
    if(!out.code) throw new Error('terser returned nothing');
    html = html.slice(0, html.indexOf('<script>') + 8) + out.code +
           html.slice(html.lastIndexOf('</script>'));
    const was = (await readFile(SRC, 'utf8')).length;
    console.log('  minified  ' + (was/1024).toFixed(0) + ' kB -> ' +
                (html.length/1024).toFixed(0) + ' kB');
  }
}

html = html.replace('<script>', BRIDGE + '<script>');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html);
console.log((release ? '  release  ' : '  debug    ') + '-> ' + OUT);
