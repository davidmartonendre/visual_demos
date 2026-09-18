/* The late crew: orchard pickers and the stall keeper.
 *
 * Pickers work the groves and nothing else; the keeper never leaves the stall,
 * takes goods in bulk and sells them to the queue by itself.
 */
'use strict';

/* Runs in the page: a farm with the groves planted and the crew hired. */
function lateFarm(){
  G.coins = 5e6; G.earned = 5e6;
  for(const id of ['windmill','coop','bakery','dairy','cheese','orchard','jam','cherry'])
    { G.up[id] = 1; const s = station(id); if(s) s.unlocked = true; }
  actors.length = 1;
  G.hands = 0; G.handLazy = []; G.pickerLazy = [];
}

module.exports = {
  name: 'Pickers and the stall keeper',
  async run(t){
    await t.reset();
    await t.run(lateFarm);

    /* A picker picks fruit. A field hand cuts wheat. Neither does the
       other's job, or the groves would never be worked. */
    await t.run(()=>{ G.up.pickers = 1;
      actors.push(newActor(21, 34, true, false, 'orchard'));
      actors.push(newActor(22, 12, true, false, 'field')); });
    await t.tick(70);
    const jobs = await t.get(()=>{
      const pick = actors[1], field = actors[2];
      const bag = a => Object.fromEntries(ITEM_ORDER.filter(k=>a.carry[k]>0).map(k=>[k,a.carry[k]]));
      return { picked: bag(pick), cut: bag(field),
               pickedTree: PATCHES.filter(p=>p.kind==='tree').some(p=>p.nodes.some(n=>!n.ripe)),
               pickerJob: pick.job, pickerTarget: pick.target ? pick.target.x : null };
    });
    t.ok(jobs.pickedTree, 'a picker actually picks the groves');
    t.eq(Object.keys(jobs.cut).filter(k=>k!=='wheat').length, 0, 'a field hand still only carries wheat');
    t.eq(Object.keys(jobs.picked).filter(k=>k!=='apple' && k!=='cherry').length, 0,
         'a picker only carries fruit');

    /* Fruit has somewhere to go: the jam kitchen takes both kinds, and a
       picker must never be left holding something it cannot deliver. */
    await t.run(()=>{ const p = actors[1];
      p.carry = emptyBag(); p.carry.apple = 8; p.state = 'deliver'; p.tray = null;
      p.think = 0; p.stuck = 0; p.lastLoad = -1;
      const j = station('jam'); j.bin = emptyBag(); j.pend = emptyBag(); j.out = emptyBag(); });
    await t.tick(60);
    // it will be back among the trees with a fresh load by now, so measure
    // what arrived rather than what it happens to be holding
    const delivered = await t.get(()=>{ const j = station('jam');
      return j.bin.apple + j.pend.apple + j.out.jam * 3; });
    t.gte(delivered, 8, 'a picker gets its apples to the jam kitchen');

    /* The keeper: hired for the stand, and it stays there. */
    await t.run(()=>{ G.up.keeper = 1; G.stock = emptyBag(); G.coins = 0; G.earned = 0;
      actors.push(newActor(20, 20, true, false, 'stall')); });
    await t.tick(30);
    const home = await t.get(()=>{
      const k = actors[actors.length-1], spot = keeperSpot();
      return { dx: Math.abs(k.x-spot.x), dy: Math.abs(k.y-spot.y), lazy: k.lazy };
    });
    t.lte(home.dx, 0.4, 'the keeper walks to the stall');
    t.lte(home.dy, 0.4, 'and stays at it');
    t.eq(home.lazy, false, 'the keeper is never lazy -- you paid enough');

    /* With a keeper, the stand pad takes goods in bulk instead of serving
       one villager at a time. */
    await t.run(()=>{ const a = player();
      a.carry = emptyBag(); a.carry.cheese = 40; a.carry.cherrypie = 60;
      a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2; });
    await t.tick(12);
    const stocked = await t.get(()=>({ carry: carried(player()),
                                       cheese: G.stock.cheese, pie: G.stock.cherrypie }));
    t.eq(stocked.carry, 0, 'the whole load goes into stock');
    t.eq(stocked.cheese, 40, 'every cheese is counted');
    t.eq(stocked.pie, 60, 'and every pie');

    /* ... and the keeper sells it without the player standing there. */
    await t.run(()=>{ const a = player(); a.x = 22; a.y = 20;      // out in the field
      G.coins = 0; G.earned = 0;
      for(const c of customers){ c.state='wait'; c.want='cheese'; c.n=5; } });
    await t.tick(40);
    const sold = await t.get(()=>({ coins: Math.round(G.coins), cheese: G.stock.cheese }));
    t.gt(sold.coins, 0, 'the keeper sells to the queue on its own');
    t.ok(sold.cheese < 40, 'and the stock goes down as it does');
    t.gte(sold.coins, (40 - sold.cheese) * 52, 'paid at least list price for what went');

    /* Nothing is sold that is not in stock. */
    await t.run(()=>{ G.stock = emptyBag(); G.coins = 0;
      for(const c of customers){ c.state='wait'; c.want='pie'; c.n=5; } });
    await t.tick(20);
    const empty = await t.get(()=>({ coins: Math.round(G.coins),
                                     neg: ITEM_ORDER.filter(k=>G.stock[k] < 0) }));
    t.eq(empty.coins, 0, 'an empty stall sells nothing');
    t.eq(empty.neg.length, 0, 'and no stock line goes negative');

    /* Stock is capped, so a thousand-item backpack cannot overflow it. */
    await t.run(()=>{ G.stock = emptyBag(); G.stock.wheat = STOCK_CAP - 3;
      const a = player(); a.carry = emptyBag(); a.carry.wheat = 500;
      a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2; });
    await t.tick(12);
    const capped = await t.get(()=>({ stock: G.stock.wheat, cap: STOCK_CAP, left: player().carry.wheat }));
    t.eq(capped.stock, capped.cap, 'stock fills exactly to the cap');
    t.gt(capped.left, 0, 'and the rest stays in the bag');
  }
};
