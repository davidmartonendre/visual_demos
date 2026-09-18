/* Saving, loading, and refusing a save that cannot be trusted.
 *
 * There is one save shape: saveData() writes it, applySave() restores it, and
 * localStorage and the downloadable file carry exactly that. The envelope is
 * tamper EVIDENCE, not security -- the key is in the file. sanitiseSave() is
 * the real defence, and it must stay balance-independent: a check against the
 * cost table was written once, rejected a legitimate farm played across a
 * rebalance, and was removed.
 */
'use strict';

/* Runs in the page: a farm worth losing. */
function richFarm(){
  G.coins = 4267; G.earned = 90000; G.up.bag = 6; G.up.scythe = 3;
  G.up.hand = 2; G.hands = 2; G.handLazy = [true,false];
  G.up.windmill = 1; G.up.coop = 1;
  G.cos.straw = 1; G.wear.hat = 'straw';
  G.stock = emptyBag(); G.stock.pie = 12; G.till = 340;
  G.story.intro = 1; G.journal = ['intro'];
  save();
}

module.exports = {
  name: 'Saves',
  async run(t){
    await t.reset();
    await t.run(richFarm);
    const before = await t.get(()=>JSON.stringify(saveData()));

    /* Round trip through localStorage. */
    await t.run(()=>{ const raw = localStorage.getItem(SAVE_KEY);
                      resetGame(); localStorage.setItem(SAVE_KEY, raw); load(); });
    const after = await t.get(()=>({
      coins: G.coins, earned: G.earned, bag: G.up.bag, hands: G.hands,
      lazy: G.handLazy.join(','), hat: G.wear.hat, pie: G.stock.pie, till: G.till,
      level: G.level, journal: G.journal.join(','),
      handActors: actors.filter(a=>a.job==='field').length }));
    t.eq(after.coins, 4267, 'coins survive a reload');
    t.eq(after.bag, 6, 'upgrades survive a reload');
    t.eq(after.hands, 2, 'farmhands survive a reload');
    t.eq(after.handActors, 2, 'and are actually put back on the farm');
    t.eq(after.lazy, 'true,false', 'so does which of them are lazy');
    t.eq(after.hat, 'straw', 'so does what you are wearing');
    t.eq(after.pie, 12, 'so does the stall stock');
    t.eq(after.till, 340, 'so does the till');
    t.gt(after.level, 1, 'the level is recomputed from lifetime earnings');
    t.ok(before.length > 0, 'the save is not empty');

    /* The file and localStorage carry the same thing -- COPY once produced
       plain JSON while DOWNLOAD produced the envelope, and pasting it back
       was refused. */
    const same = await t.get(()=>{
      const stored = localStorage.getItem(SAVE_KEY);
      const shown = encodeSave(saveData());
      const a = decodeSave(stored), b = decodeSave(shown);
      return { bothDecode: !!a.data && !!b.data,
               sameCoins: a.data && b.data && a.data.coins === b.data.coins };
    });
    t.ok(same.bothDecode, 'the stored save and the offered file both decode');
    t.ok(same.sameCoins, 'and they are the same farm');

    /* An edited file is refused, and refusing must not disturb the farm. */
    const edits = await t.get(()=>{
      const good = encodeSave(saveData());
      const env = JSON.parse(good);
      const out = {};
      const tries = {
        edited:   JSON.stringify(Object.assign({}, env, { d: env.d.slice(0,-4) + 'AAAA' })),
        restamped:JSON.stringify(Object.assign({}, env, { s: 'zzzz' })),
        garbage:  'not json at all',
        wrongshape:'[1,2,3]',
        unrelated: JSON.stringify({ hello:'world' }),
      };
      for(const k in tries){
        const coinsBefore = G.coins;
        out[k] = { msg: importSave(tries[k]), coinsKept: G.coins === coinsBefore };
      }
      out.goodOne = importSave(good);
      return out;
    });
    for(const k of ['edited','restamped','garbage','wrongshape','unrelated']){
      t.ok(!!edits[k].msg, 'a ' + k + ' save is refused');
      t.ok(edits[k].coinsKept, 'and refusing a ' + k + ' save leaves the farm alone');
    }
    t.eq(edits.goodOne, null, 'a real save still imports');

    /* The sanitiser. Every clamp here follows from a game mechanic, never
       from the cost table. */
    const clean = await t.get(()=>sanitiseSave({
      coins: 1e12, earned: 500, up: { bag: 9999, scythe: -4, nonsense: 7 },
      hands: 40, handLazy: 'not an array',
      stock: { pie: 1e9, nope: 5 }, till: -20,
      cos: { straw:1, notathing:1 }, wear: { hat:'crown' },
      story: { intro:1, fake:1 }, journal: ['intro','fake'],
      orders: [{ items:{ wheat:4 }, need:{ wheat:4 }, pay: 999999 },
               { items:{}, need:{} }, { items:{pie:1}, need:{pie:1} }, 'junk'],
      paid: { scythe: 1e9 },
    }));
    t.eq(clean.coins, 500 + await t.get(()=>START_COINS), 'coins are capped at what could have been earned');
    t.lte(clean.up.bag, await t.get(()=>PADS.find(p=>p.id==='bag').max), 'upgrades clamp to their maximum');
    t.eq(clean.up.scythe, 0, 'a negative upgrade becomes zero');
    t.eq(clean.up.nonsense, undefined, 'an invented upgrade is dropped');
    t.eq(clean.hands, clean.up.hand, 'farmhands are derived from the pad, never trusted');
    t.eq(clean.handLazy.length, clean.hands, 'and each gets a trait');
    t.eq(clean.stock.pie, await t.get(()=>STOCK_CAP), 'stock clamps to the stall cap');
    t.eq(clean.stock.nope, undefined, 'an invented good is dropped from stock');
    t.eq(clean.till, 0, 'a negative till becomes zero');
    t.eq(clean.cos.notathing, undefined, 'an invented cosmetic is dropped');
    t.eq(clean.wear.hat, undefined, 'you cannot wear what you do not own');
    t.eq(clean.story.fake, undefined, 'an invented story chapter is dropped');
    t.eq(clean.journal.join(','), 'intro', 'and stripped from the journal');
    t.lte(clean.orders.length, 2, 'never more than two orders');
    t.ok(clean.orders.every(o => o.pay > 0), 'order payouts are recomputed from their goods');
    t.ok(clean.orders[0].pay < 999999, 'a forged payout is thrown away');
    t.eq(clean.paid.scythe, await t.get(()=>Math.max(0, Math.round(PADS.find(p=>p.id==='scythe').cost) - 1)),
         'part-payment cannot exceed the next level');

    /* The removed check, guarded so it cannot come back: a farm whose
       upgrades cost more than it ever earned must still load. Costs are
       retuned often and a real save played across a rebalance looks exactly
       like this. */
    const poor = await t.get(()=>sanitiseSave({ earned: 10, coins: 0,
      up: { bag: 12, scythe: 6, windmill: 1, coop: 1, bakery: 1 } }));
    t.eq(poor.up.bag, 12, 'a farm that looks unaffordable is still loaded');
    t.eq(poor.up.bakery, 1, 'with all its buildings intact');

    /* A legacy plain-JSON save migrates from localStorage but is refused as
       a file, and a stored save that cannot be read is kept aside rather
       than quietly overwritten. */
    const legacy = await t.get(()=>{
      const plain = JSON.stringify({ coins: 500, earned: 9000, up:{ bag:3, hand:1 }, hands:1 });
      localStorage.setItem(SAVE_KEY, plain);
      resetGame(); localStorage.setItem(SAVE_KEY, plain); load();
      const stored = localStorage.getItem(SAVE_KEY);
      return { coins: G.coins, bag: G.up.bag, reStamped: !!(stored && JSON.parse(stored).s),
               asFile: importSave(plain) };
    });
    t.eq(legacy.coins, 500, 'an old plain save still loads from localStorage');
    t.eq(legacy.bag, 3, 'with its upgrades');
    t.ok(legacy.reStamped, 'and is re-stamped on the way in');
    t.ok(!!legacy.asFile, 'but a plain save is refused as a file');

    const rejected = await t.get(()=>{
      localStorage.setItem(SAVE_KEY, '{"game":"harvest-hero","format":3,"d":"AAAA","s":"nope"}');
      saveNotice = null; resetGame();
      localStorage.setItem(SAVE_KEY, '{"game":"harvest-hero","format":3,"d":"AAAA","s":"nope"}');
      load();
      return { notice: saveNotice, kept: !!localStorage.getItem(SAVE_KEY + '-rejected'),
               coins: G.coins };
    });
    t.ok(!!rejected.notice, 'a broken stored save is reported, not ignored');
    t.ok(rejected.kept, 'and kept aside instead of being overwritten');
    t.eq(rejected.coins, await t.get(()=>START_COINS), 'the player starts fresh rather than half-loaded');
  }
};
