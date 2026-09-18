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

    /* Fruit has somewhere to go: the jam kitchen takes both kinds and the
       bakery takes apples, and a picker must never be left holding something
       it cannot deliver. */
    await t.run(()=>{ const p = actors[1];
      p.carry = emptyBag(); p.carry.apple = 8; p.state = 'deliver'; p.tray = null;
      p.think = 0; p.stuck = 0; p.lastLoad = -1;
      for(const id of ['jam','bakery']){ const s = station(id);
        s.bin = emptyBag(); s.pend = emptyBag(); s.out = emptyBag(); } });
    await t.tick(60);
    // it will be back among the trees with a fresh load by now, so measure
    // what arrived rather than what it happens to be holding
    const delivered = await t.get(()=>{ const j = station('jam'), b = station('bakery');
      return j.bin.apple + j.pend.apple + j.out.jam * 3 + b.bin.apple + b.pend.apple; });
    t.gte(delivered, 8, 'a picker gets its apples to a kitchen that wants them');

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

    /* With a keeper, the stand takes goods in bulk -- but only when the
       player says so. Standing there used to empty the bag into the stall,
       so walking past cost you the load. */
    await t.run(()=>{ const a = player();
      a.carry = emptyBag(); a.carry.cheese = 40; a.carry.cherrypie = 60;
      a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2; });
    await t.tick(12);
    const idle = await t.get(()=>({ carry: carried(player()), stock: stockTotal() }));
    t.eq(idle.stock, 0, 'standing at the stand stocks nothing by itself');
    t.eq(idle.carry, 100, 'and the load stays in the bag');

    const stocked = await t.get(()=>{ standBag(ITEM_ORDER);
      return { carry: carried(player()), cheese: G.stock.cheese, pie: G.stock.cherrypie }; });
    t.eq(stocked.carry, 0, 'the whole load goes into stock on one press');
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

    /* A served villager walks home the way they came. Leaving northwards
       took them straight through the stand and the stall. */
    const goneHome = await t.get(()=>{
      for(const c of customers){ c.state='walk'; c.slot=-1; c.n=0; c.x=34.3; c.y=30; }
      const c = customers[0];
      c.state='leave'; c.slot=-1; c.x=QUEUE[0].x; c.y=QUEUE[0].y;
      const path = [];
      for(let i=0;i<60*30;i++){
        updateCustomers(1/60);
        path.push({ x:c.x, y:c.y });
        if(c.state!=='leave') break;
      }
      const through = r => path.some(p => p.x>r.x && p.x<r.x+r.w && p.y>r.y && p.y<r.y+r.h);
      return { north: Math.min.apply(null, path.map(p=>p.y)),
               south: Math.max.apply(null, path.map(p=>p.y)),
               stand: through(STAND), stall: through(STALL), left: c.state !== 'leave' };
    });
    t.ok(!goneHome.stand, 'a served villager does not walk through the farm stand');
    t.ok(!goneHome.stall, 'nor through the stall');
    t.gte(goneHome.north, await t.get(()=>QUEUE[0].y - 0.5), 'they never carry on past the front of the queue');
    t.gt(goneHome.south, 50, 'they walk back down the road instead');
    t.ok(goneHome.left, 'and are gone by the end of it');

    /* Stock is capped, so a big backpack cannot overflow it. */
    const capped = await t.get(()=>{ G.stock = emptyBag(); G.stock.wheat = STOCK_CAP - 3;
      const a = player(); a.carry = emptyBag(); a.carry.wheat = 500;
      a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2;
      standBag(['wheat']);
      return { stock: G.stock.wheat, cap: STOCK_CAP, left: a.carry.wheat }; });
    t.eq(capped.stock, capped.cap, 'stock fills exactly to the cap');
    t.gt(capped.left, 0, 'and the rest stays in the bag');
  }
};
