/* Set the handful of manifest attributes Capacitor does not.
 *
 *   node manifest.mjs
 *
 * `npx cap add android` generates android/ once, and `cap sync` never touches
 * the manifest again -- so anything set here survives, and anything set by
 * hand survives too. This runs on every build anyway, because the folder is
 * regenerated whenever someone starts from a clean clone, and a game that
 * launches sideways on the first run is a poor first impression.
 *
 * Idempotent: running it twice changes nothing. It fails loudly rather than
 * quietly doing nothing if the manifest is not the shape it expects, because
 * a silent no-op here shows up as a bug on a device much later.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(here, 'android/app/src/main/AndroidManifest.xml');

let xml;
try { xml = await readFile(FILE, 'utf8'); }
catch { console.log('  no android/ yet -- run `npx cap add android` first'); process.exit(0); }

/* The game is drawn tall: the HUD runs along the bottom and the camera frames
   a portrait window. Locking it here rather than with a runtime plugin costs
   no dependency and no frame of the app appearing sideways first. */
const WANT = 'android:screenOrientation="portrait"';

if(xml.includes(WANT)){
  console.log('  manifest already portrait');
} else {
  const anchor = '<activity\n';
  if(!xml.includes(anchor))
    throw new Error('AndroidManifest.xml has no <activity> to lock; it is not the shape\n' +
                    'this script expects. Set ' + WANT + ' by hand and check this file.');
  xml = xml.replace(anchor, anchor + '            ' + WANT + '\n');
  await writeFile(FILE, xml);
  console.log('  manifest -> portrait');
}
