/* Every workshop turns its inputs into the right output.
 *
 * Buildings with two recipes (bakery, jam kitchen) toss a coin between the
 * ones they can make. Taken in order the cherry version always won, so the
 * day the grove was planted the bakery stopped making ordinary pies and the
 * apples piled up with nowhere to go.
 */
'use strict';
/* Runs in the page, so it can reference nothing from this file. */
function unlockAll(){
  for(const id of ['windmill','coop','dairy','cheese','bakery','jam']){
    G.up[id] = 1; station(id).unlocked = true;
  }
  G.up.orchard = 1; G.up.cherry = 1;
}

module.exports = {
  name: 'Production chains',
  async run(t){
    await t.reset();
    await t.run(unlockAll);

    const feeds = [
      ['windmill', { wheat:20 },            'flour'],
      ['coop',     { wheat:20 },            'egg'],
      ['dairy',    { wheat:30 },            'milk'],
      ['cheese',   { milk:20 },             'cheese'],
      ['bakery',   { flour:10, egg:10, apple:10 }, 'pie'],
      ['bakery',   { flour:10, cherry:20 }, 'cherrypie'],
      ['jam',      { apple:30 },            'jam'],
      ['jam',      { cherry:30 },           'cherryjam'],
    ];

    for(const [id, feed, out] of feeds){
      await t.run(([id, feed])=>{
        const s = station(id);
        s.bin = emptyBag(); s.out = emptyBag(); s.pend = emptyBag(); s.timer = 0;
        for(const k in feed) s.bin[k] = feed[k];
      }, [id, feed]);
      await t.tick(12);
      const r = await t.get(id=>{
        const s = station(id);
        return { out: Object.fromEntries(ITEM_ORDER.filter(k=>s.out[k]>0).map(k=>[k,s.out[k]])),
                 binLeft: Object.fromEntries(ITEM_ORDER.filter(k=>s.bin[k]>0).map(k=>[k,s.bin[k]])) };
      }, id);
      t.gt(r.out[out] || 0, 0, id + ' makes ' + out);
      t.eq(Object.keys(r.out).join(','), out, id + ' makes only ' + out + ' from that load');
    }

    /* Both recipes ready at once: the oven must make some of each. */
    const stock = ()=>{ const s = station('bakery');
      s.bin = emptyBag(); s.out = emptyBag(); s.pend = emptyBag(); s.timer = 0; s.job = null;
      s.bin.flour = 20; s.bin.egg = 20; s.bin.apple = 20; s.bin.cherry = 40; };
    let pies = 0, cherrypies = 0;
    for(let run=0; run<6; run++){
      await t.run(stock);
      await t.tick(30);
      const r = await t.get(()=>({ p: station('bakery').out.pie, c: station('bakery').out.cherrypie }));
      pies += r.p; cherrypies += r.c;
    }
    t.gt(cherrypies, 0, 'the bakery makes cherry pies when it has cherries');
    t.gt(pies, 0, 'and plain ones too, rather than only ever the fancy kind');

    /* Short of one ingredient it carries on with the other recipe. */
    await t.run(()=>{ const s = station('bakery');
      s.bin = emptyBag(); s.out = emptyBag(); s.pend = emptyBag(); s.timer = 0; s.job = null;
      s.bin.flour = 6; s.bin.egg = 6; s.bin.apple = 6; });
    await t.tick(20);
    t.gt(await t.get(()=>station('bakery').out.pie), 0,
         'with no cherries the bakery falls back to plain pies');

    /* A pie takes an apple as well as an egg, so the pickers' fruit has
       somewhere to go other than the jam pan. */
    await t.run(()=>{ const s = station('bakery');
      s.bin = emptyBag(); s.out = emptyBag(); s.pend = emptyBag(); s.timer = 0; s.job = null;
      s.bin.flour = 9; s.bin.egg = 9; });
    await t.tick(20);
    t.eq(await t.get(()=>station('bakery').out.pie), 0, 'and no apples means no plain pies at all');

    /* An out tray is capped; production must stop rather than overflow. */
    await t.run(()=>{ const s = station('windmill');
      s.bin = emptyBag(); s.out = emptyBag(); s.timer = 0; s.bin.wheat = TRAY_CAP * 4; });
    await t.tick(120);
    const capped = await t.get(()=>({ out: outTotal(station('windmill')), cap: TRAY_CAP,
                                      bin: station('windmill').bin.wheat }));
    t.lte(capped.out, capped.cap, 'a full out tray stops production');
    t.gt(capped.bin, 0, 'and leaves the rest of the input alone');

    /* A locked station must not run at all. */
    await t.run(()=>{ const s = station('cheese'); s.unlocked = false;
                      s.bin = emptyBag(); s.out = emptyBag(); s.bin.milk = 20; s.timer = 0; });
    await t.tick(20);
    t.eq(await t.get(()=>outTotal(station('cheese'))), 0, 'a locked cellar makes nothing');

    /* Artisans raise batch size, which is the whole point of the upgrade. */
    await t.run(()=>{ G.up.crew = 0; const s = station('windmill'); s.unlocked = true;
      s.bin = emptyBag(); s.out = emptyBag(); s.timer = 0; s.bin.wheat = 20; });
    await t.tick(6);
    const plain = await t.get(()=>station('windmill').out.flour);
    await t.run(()=>{ G.up.crew = 4; const s = station('windmill');
      s.bin = emptyBag(); s.out = emptyBag(); s.timer = 0; s.bin.wheat = 20; });
    await t.tick(6);
    const crewed = await t.get(()=>station('windmill').out.flour);
    t.gt(crewed, plain, 'artisans make each batch bigger');
  }
};
