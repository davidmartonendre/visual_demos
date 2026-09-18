/* Static invariants of the data tables.
 *
 * AGENTS.md has one rule that has been broken more than any other: never
 * hard-code a list of goods. Four places once listed only wheat/egg/pie and
 * the market's fell through to wheat, which paid wheat rates for cheese and
 * drove the count negative. These checks are the cheap half of that guard --
 * they fail the moment a good is added without a price, an icon, a drawing
 * or a way to make it.
 */
'use strict';
module.exports = {
  name: 'Data tables are complete',
  async run(t){
    const d = await t.get(()=>({
      order: ITEM_ORDER,
      items: ITEMS,
      bagKeys: Object.keys(emptyBag()),
      stations: STATIONS.map(s=>({ id:s.id, kind:s.kind,
        recipes: (s.recipes||[]).map(r=>({ in:r.in, out:r.out, time:r.time })),
        trays: s.trays.map(tr=>({ mode:tr.mode, item:tr.item })) })),
      pads: PADS.map(p=>({ id:p.id, cost:p.cost, mul:p.mul, max:p.max })),
      upgradeIds: UPGRADE_IDS,
      upKeys: Object.keys(G.up),
      patches: PATCHES.map(p=>({ id:p.id, item:p.item, kind:p.kind, gate:p.gate })),
      stock: Object.keys(G.stock),
    }));

    t.must(d.order.length > 0, 'ITEM_ORDER is not empty');

    for(const k of d.order){
      const it = d.items[k];
      t.ok(it && typeof it.price === 'number' && it.price > 0, k + ' has a price');
      t.ok(it && !!it.label, k + ' has a label');
    }
    t.eq(d.bagKeys.join(','), d.order.join(','), 'emptyBag() covers exactly ITEM_ORDER');
    t.eq(d.stock.join(','), d.order.join(','), 'the stall stock covers exactly ITEM_ORDER');

    /* Every good must actually be drawable. A missing case in drawItem is
       silent -- the item just does not appear -- so paint each one and count
       pixels rather than trusting that the switch is complete. */
    const painted = await t.get(order => {
      const out = {};
      for(const k of order){
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,80,80);
        ctx.translate(40,40);
        try { drawItem(k, 0, 0, 2); } catch(e){ out[k] = 'threw: ' + e.message; ctx.restore(); continue; }
        const px = ctx.getImageData(0,0,80,80).data;
        let n = 0; for(let i=3;i<px.length;i+=4) if(px[i] > 8) n++;
        out[k] = n;
        ctx.restore();
      }
      return out;
    }, d.order);
    for(const k of d.order) t.gt(painted[k], 20, 'drawItem() actually draws ' + k);

    /* That drawing is the good's only picture: the HUD pills and the bag
       panel are painted from it. An emoji column alongside it drifted -- a
       honey pot for cherry jam, a tub of ice cream for cherry pie. */
    const icons = await t.get(order => {
      const out = {};
      for(const k of order){
        const src = itemIcon(k);
        out[k] = typeof src === 'string' && src.startsWith('data:image/png') && src.length > 400;
      }
      out.__pill = order.some(k => !!ITEMS[k].pill);
      out.__hud = order.every(k => !!el('p-'+k).querySelector('img'));
      return out;
    }, d.order);
    for(const k of d.order) t.ok(icons[k], k + ' has a HUD icon painted from that drawing');
    t.ok(!icons.__pill, 'and no emoji column left to drift out of step with it');
    t.ok(icons.__hud, 'every pill shows one');

    /* Nothing unobtainable: every good is grown in a patch or made by a recipe. */
    const made = new Set(d.patches.map(p=>p.item));
    for(const s of d.stations) for(const r of s.recipes) made.add(r.out);
    for(const k of d.order) t.ok(made.has(k), k + ' is produced by a patch or a recipe');

    /* ... and nothing is made out of thin air. */
    for(const s of d.stations) for(const r of s.recipes){
      t.ok(d.order.includes(r.out), s.id + ' produces a known good: ' + r.out);
      for(const k of Object.keys(r.in))
        t.ok(d.order.includes(k), s.id + ' consumes a known good: ' + k);
      t.gt(r.time, 0, s.id + ' recipe for ' + r.out + ' takes time');
    }

    /* A station the player can never unlock is dead weight; a pad with no
       station unlocks nothing. Both have bitten before. */
    const padIds = d.pads.map(p=>p.id);
    for(const s of d.stations){
      if(s.id === 'market') continue;
      t.ok(padIds.includes(s.id), s.id + ' has a pad that unlocks it');
    }
    for(const p of d.pads){
      t.gt(p.cost, 0, p.id + ' costs something');
      t.gte(p.max, 1, p.id + ' can be bought at least once');
      t.gte(p.mul, 1, p.id + ' never gets cheaper with each level');
    }
    t.eq(d.upKeys.sort().join(','), d.upgradeIds.slice().sort().join(','),
         'a fresh game has an entry for every upgrade');

    /* Each in-tray must take something a recipe wants, or the player can
       feed a building that will never use it. */
    for(const s of d.stations){
      if(s.kind !== 'make') continue;
      const wants = new Set();
      for(const r of s.recipes) for(const k of Object.keys(r.in)) wants.add(k);
      for(const tr of s.trays)
        if(tr.mode === 'in') t.ok(wants.has(tr.item), s.id + ' uses what its ' + tr.item + ' tray takes');
      t.ok(s.trays.some(tr=>tr.mode==='out'), s.id + ' has somewhere to put its output');
    }

    /* Gated patches need the pad that opens them. */
    for(const p of d.patches)
      if(p.gate) t.ok(padIds.includes(p.gate), p.id + ' is opened by a real pad: ' + p.gate);
  }
};
