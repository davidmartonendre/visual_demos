/* Where saves live, and what a save is not allowed to buy.
 *
 * Two jobs here. First, storage: the game keeps save() and load() synchronous
 * and hides the phone's asynchronous store behind STORE, so this spec drives
 * a fake bridge and checks the seam rather than waiting on a device.
 *
 * Second, and the reason the seam exists at all: an APK is a zip, the game is
 * a text file inside it, and the stamp key is on screen at STAMP_KEY. Anyone
 * can forge a save that passes decodeSave(). So a purchase must not be IN a
 * save. These checks forge one that claims to have paid, and insist it buys
 * nothing.
 *
 * The page's own rAF loop keeps running between evaluates and autosaves every
 * five game-seconds, so anything that installs a fake bridge sets it up, uses
 * it and tears it down inside ONE evaluate.
 */
'use strict';

module.exports = {
  name: 'Storage and entitlements',
  async run(t){
    await t.reset();

    /* ---- a browser has no bridge: straight through to localStorage ---- */
    const web = await t.get(()=>{
      G.coins = 77; G.earned = 4000;
      save();
      return { native: STORE.native, cached: STORE.cache,
               stored: STORE.read() === localStorage.getItem(SAVE_KEY),
               reads: !!STORE.read() };
    });
    t.eq(web.native, null, 'no bridge in a browser, so STORE stays on localStorage');
    t.eq(web.cached, null, 'nothing is cached when localStorage is the store');
    t.ok(web.stored, 'what STORE reads is what localStorage holds');

    /* ---- with a bridge, native answers the read and localStorage mirrors it ---- */
    const nat = await t.get(async ()=>{
      const disk = { 'harvest-hero-v1': null };
      const writes = [];
      // the FIRST set() called is the slow one, keyed on call order rather than
      // on writes landed -- otherwise two parallel writes are both slow, fire in
      // registration order, and the race this is here to catch never shows.
      let calls = 0;
      window.HH_NATIVE = {
        get: k => Promise.resolve(disk[k] ?? null),
        set: (k, v) => { const wait = calls++ === 0 ? 40 : 0;
                         return new Promise(r => setTimeout(()=>{
                           disk[k] = v; writes.push(v.length); r(); }, wait)); },
        remove: k => { disk[k] = null; return Promise.resolve(); },
      };
      G.coins = 111; G.earned = 9000;
      const primed = await STORE.prime();

      save();                                   // -> cache + queued native + mirror
      const afterWrite = STORE.read();
      const sawCache = STORE.cache === afterWrite;
      const mirrored = localStorage.getItem('harvest-hero-v1') === afterWrite;

      // a second write hard on the heels of the first: the slow one must land first
      G.coins = 222; save();
      const second = STORE.cache;
      await STORE.flush();
      // and wait past the SLOW one: fired in parallel it lands here, last,
      // quietly putting the older farm back on disk. flush() alone misses it.
      await new Promise(r => setTimeout(r, 90));
      const landedLast = disk['harvest-hero-v1'] === second;

      // native wins the read even when localStorage disagrees
      localStorage.setItem('harvest-hero-v1', 'STALE');
      const prefersNative = STORE.read() === second;

      STORE.native = null; STORE.cache = null; delete window.HH_NATIVE;
      return { primed, sawCache, mirrored, landedLast, prefersNative, writes: writes.length };
    });
    t.ok(nat.primed,         'prime() reports it found a working bridge');
    t.ok(nat.sawCache,       'a write is readable at once, before the bridge has finished');
    t.ok(nat.mirrored,       'every write is mirrored to localStorage as a fallback');
    // two overlapping set() calls can land out of order and leave the OLDER farm
    // on disk, so STORE.push queues them rather than firing both
    t.eq(nat.writes, 2,      'both writes reached the bridge');
    t.ok(nat.landedLast,     'a slow write cannot overtake the one after it');
    t.ok(nat.prefersNative,  'the bridge is the authority on read, not the WebView copy');

    /* ---- a bridge that throws must not cost the player their farm ---- */
    const broken = await t.get(async ()=>{
      window.HH_NATIVE = { get: () => Promise.reject(new Error('no store')) };
      const primed = await STORE.prime();
      G.coins = 404; save();
      const saved = !!localStorage.getItem('harvest-hero-v1');
      STORE.native = null; STORE.cache = null; delete window.HH_NATIVE;
      return { primed, saved, native: STORE.native };
    });
    t.eq(broken.primed, false, 'a bridge that throws is not adopted');
    t.ok(broken.saved,         'and the farm still saves, to localStorage');

    /* ---- entitlements come from the store ---- */
    const ent = await t.get(async ()=>{
      const before = adsOff();
      window.HH_NATIVE = { entitlements: () => Promise.resolve(['noads', 'moon-on-a-stick']) };
      await refreshEntitlements();
      const bought = adsOff(), junk = owns('moon-on-a-stick');
      delete window.HH_NATIVE;
      await refreshEntitlements();              // offline, or a browser
      return { before, bought, junk, after: adsOff() };
    });
    t.eq(ent.before, false, 'nothing is owned before the store has been asked');
    t.ok(ent.bought,        'a purchase the store confirms turns the ads off');
    t.eq(ent.junk, false,   'an id the game does not sell is ignored, whoever offers it');
    t.eq(ent.after, false,  'and with no store to ask, nothing is granted');

    /* ---- THE one that matters: a forged save buys nothing --------------
       STAMP_KEY is in the shipped file, so this forgery is one any player
       can make. It must survive decodeSave() and still grant nothing. */
    const forged = await t.get(async ()=>{
      const claim = Object.assign(saveData(), {
        coins: 1e9, ent: { noads:1 }, ENT: { noads:1 },
        noads: true, entitlements: ['noads'], owns: ['noads'], premium: 1,
      });
      const text = encodeSave(claim);
      const decoded = decodeSave(text);
      const clean = sanitiseSave(decoded.data);

      localStorage.setItem('harvest-hero-v1', text);
      resetGame(); localStorage.setItem('harvest-hero-v1', text); load();

      return {
        accepted: !!decoded.data,                       // the forgery IS well formed
        adsOff: adsOff(), ent: JSON.stringify(ENT),
        leaked: Object.keys(clean).filter(k =>
          /^(ent|ENT|noads|entitlements|owns|premium)$/.test(k)),
        inSave: Object.keys(saveData()).filter(k =>
          /^(ent|ENT|noads|entitlements|owns|premium)$/.test(k)),
        coins: G.coins, earned: G.earned,
      };
    });
    t.ok(forged.accepted,      'the forged save passes the stamp -- the key ships with the game');
    t.eq(forged.adsOff, false, 'and buys nothing: a purchase comes from the store, not a file');
    t.eq(forged.ent, '{}',     'no entitlement is restored from disk, ever');
    t.eq(forged.leaked.length, 0, 'sanitiseSave drops every entitlement key it is offered');
    t.eq(forged.inSave.length, 0, 'and saveData never writes one, so there is nothing to forge');
    // the coin clamp still holds on the same forgery: coins <= earned + START_COINS
    t.lte(forged.coins, forged.earned + 25, 'forged coins are still clamped to what was earned');

    /* sanitiseSave is the guard above, but it is not the only way in: the day
       someone wires a save field through applySave directly, this is what
       stops it reaching a purchase. */
    const direct = await t.get(()=>{
      resetGame();
      applySave(Object.assign(sanitiseSave(saveData()),
                              { ent:{noads:1}, ENT:{noads:1}, noads:true, premium:1 }));
      return { adsOff: adsOff(), ent: JSON.stringify(ENT) };
    });
    t.eq(direct.adsOff, false, 'applySave grants no purchase either, whatever it is handed');
    t.eq(direct.ent, '{}',     'and leaves the entitlement set alone');

    /* ---- two phones, one farm ---- */
    const merge = await t.get(()=>{
      const A = { earned: 900, savedAt: '2026-01-01T00:00:00.000Z', tag:'a' };
      const B = { earned: 100, savedAt: '2026-09-09T00:00:00.000Z', tag:'b' };
      const older = { earned: 500, savedAt: '2026-01-01T00:00:00.000Z', tag:'old' };
      const newer = { earned: 500, savedAt: '2026-06-01T00:00:00.000Z', tag:'new' };
      return {
        bigger:  resolveSave(A, B).tag,
        either:  resolveSave(B, A).tag,
        tie:     resolveSave(older, newer).tag,
        tieBack: resolveSave(newer, older).tag,
        noClock: resolveSave({earned:5, tag:'x'}, {earned:5, tag:'y'}).tag,
        nullA:   resolveSave(null, B).tag,
        nullB:   resolveSave(A, null).tag,
        both:    resolveSave(null, null),
      };
    });
    // `earned` only ever goes up, so it is the one field a merge can trust --
    // a clock can be wrong, and a fixed timezone should not eat an afternoon
    t.eq(merge.bigger, 'a',  'the farm with the bigger lifetime total wins the merge');
    t.eq(merge.either, 'a',  'and wins it from either side');
    t.eq(merge.tie, 'new',   'a tie on earnings falls back to the clock');
    t.eq(merge.tieBack, 'new', 'from either side too');
    t.eq(merge.noClock, 'x', 'with nothing to tell them apart, the farm in hand stays');
    t.eq(merge.nullA, 'b',   'nothing on this device means take the cloud farm');
    t.eq(merge.nullB, 'a',   'nothing in the cloud means keep this one');
    t.eq(merge.both, null,   'two nothings merge to nothing');

    await t.reset();
  }
};
