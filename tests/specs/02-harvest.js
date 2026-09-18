/* Cutting wheat, filling the bag, and selling at the market.
 *
 * The market regression is the important one here. It used to pick the item
 * to sell from a hard-coded list and fall through to 'wheat' for anything
 * unlisted, so selling cheese subtracted from an empty wheat stack, paid
 * wheat rates, and left the count negative -- which is what the player saw
 * as "wheat numbers disappear then reappear".
 */
'use strict';
const SELL = { x:11.2, y:5.5 };          // the market's sell tray

module.exports = {
  name: 'Harvest and sell',
  async run(t){
    await t.reset();

    /* Walking through ripe wheat fills the bag. */
    await t.stand(22, 12);
    await t.tick(6);
    const cut = await t.get(()=>({ carry: carried(player()), cap: actorCap(player()),
                                   ripe: PATCHES[0].nodes.filter(n=>n.ripe).length,
                                   total: PATCHES[0].nodes.length }));
    t.gt(cut.carry, 0, 'standing in the field harvests wheat');
    t.lte(cut.carry, cut.cap, 'the bag never goes over capacity');
    t.ok(cut.ripe < cut.total, 'cut tiles stop being ripe');

    /* ... and they grow back. */
    await t.tick(30);
    const regrown = await t.get(()=>PATCHES[0].nodes.filter(n=>n.ripe).length);
    t.eq(regrown, cut.total, 'every cut tile regrows');

    /* Capacity is a hard cap, not a suggestion. */
    await t.run(()=>{ G.up.bag = 0; player().carry = emptyBag(); });
    await t.stand(22, 12);
    await t.tick(25);
    const full = await t.get(()=>({ carry: carried(player()), cap: actorCap(player()) }));
    t.eq(full.carry, full.cap, 'harvesting stops exactly at the bag limit');

    /* Selling: list price, nothing left behind, nothing negative. */
    await t.run(()=>{ G.coins = 0; G.earned = 0; G.till = 0;
                      const a = player(); a.carry = emptyBag(); a.carry.wheat = 20; });
    await t.stand(SELL.x, SELL.y);
    await t.tick(8);
    const sold = await t.get(()=>({ coins: Math.round(G.coins), carry: carried(player()),
                                    neg: ITEM_ORDER.filter(k=>player().carry[k] < 0) }));
    t.eq(sold.carry, 0, 'the whole load is sold');
    t.eq(sold.coins, 20 * 3, '20 wheat pays list price');
    t.eq(sold.neg.length, 0, 'no stack goes negative');

    /* A mixed load: every good must fetch its own price, and the priciest
       goes first. This is the check the old hard-coded list failed. */
    const want = await t.get(()=>{
      const a = player(); a.carry = emptyBag();
      a.carry.cheese = 4; a.carry.flour = 5; a.carry.cherrypie = 2;
      G.coins = 0; G.earned = 0;
      return 4*ITEMS.cheese.price + 5*ITEMS.flour.price + 2*ITEMS.cherrypie.price;
    });
    await t.stand(SELL.x, SELL.y);
    await t.tick(10);
    const mixed = await t.get(()=>({ coins: Math.round(G.coins), carry: carried(player()),
                                     neg: ITEM_ORDER.filter(k=>player().carry[k] < 0) }));
    t.eq(mixed.coins, want, 'a mixed load pays each good its own price');
    t.eq(mixed.carry, 0, 'a mixed load sells out completely');
    t.eq(mixed.neg.length, 0, 'selling cheese never drives wheat negative');

    /* A late-game backpack holds over a thousand items. Parcels are sized
       from a constant, never from what is left, or the tail of the stack
       decays geometrically and the last items never arrive. */
    await t.run(()=>{ G.up.bag = 20; G.coins = 0; G.earned = 0;
                      const a = player(); a.carry = emptyBag(); a.carry.wheat = capacity(); });
    const big = await t.get(()=>capacity());
    await t.stand(SELL.x, SELL.y);
    await t.tick(60);
    const drained = await t.get(()=>({ carry: carried(player()), coins: Math.round(G.coins) }));
    t.gt(big, 1000, 'a maxed backpack really does hold over a thousand');
    t.eq(drained.carry, 0, 'a full late-game bag drains completely');
    t.eq(drained.coins, big * 3, 'and pays for every last item');

    /* Standing on the counter with nothing must be harmless. */
    await t.run(()=>{ G.coins = 100; G.till = 0; player().carry = emptyBag(); });
    await t.tick(3);
    const idle = await t.get(()=>({ coins: Math.round(G.coins) }));
    t.eq(idle.coins, 100, 'an empty player earns nothing at the counter');
  }
};
