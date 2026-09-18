/* Cutting wheat, filling the bag, and selling at the market.
 *
 * The market regression is the important one here. It used to pick the item
 * to sell from a hard-coded list and fall through to 'wheat' for anything
 * unlisted, so selling cheese subtracted from an empty wheat stack, paid
 * wheat rates, and left the count negative -- which is what the player saw
 * as "wheat numbers disappear then reappear".
 *
 * The player sells from the bag panel, never by standing on the counter:
 * walking over it used to empty the whole bag, priciest good first, which is
 * exactly the accident the panel was added to prevent. The farmhands still
 * sell on arrival -- they have no panel to press -- and their takings go to
 * the till, so the counter loop is checked through one of them.
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

    /* Standing on the counter must not sell anything by itself. */
    await t.run(()=>{ G.coins = 0; G.earned = 0; G.till = 0;
                      const a = player(); a.carry = emptyBag(); a.carry.wheat = 20; });
    await t.stand(SELL.x, SELL.y);
    await t.tick(8);
    const stood = await t.get(()=>({ coins: Math.round(G.coins), wheat: player().carry.wheat }));
    t.eq(stood.wheat, 20, 'walking onto the counter leaves the bag alone');
    t.eq(stood.coins, 0, 'and earns nothing until you choose to sell');

    /* Selling from the panel: list price, nothing left behind, nothing
       negative. */
    const sold = await t.get(()=>{
      const err = sellBag(['wheat']);
      return { err, coins: Math.round(G.coins), carry: carried(player()),
               neg: ITEM_ORDER.filter(k=>player().carry[k] < 0) };
    });
    t.eq(sold.err, null, 'the panel sells what you asked it to');
    t.eq(sold.carry, 0, 'the whole stack goes');
    t.eq(sold.coins, 20 * 3, '20 wheat pays list price');
    t.eq(sold.neg.length, 0, 'no stack goes negative');

    /* A mixed load: every good must fetch its own price. This is the check
       the old hard-coded list failed. */
    const mixed = await t.get(()=>{
      const a = player(); a.carry = emptyBag();
      a.carry.cheese = 4; a.carry.flour = 5; a.carry.cherrypie = 2;
      G.coins = 0; G.earned = 0;
      const want = 4*ITEMS.cheese.price + 5*ITEMS.flour.price + 2*ITEMS.cherrypie.price;
      sellBag(ITEM_ORDER);
      return { want, coins: Math.round(G.coins), carry: carried(a),
               neg: ITEM_ORDER.filter(k=>a.carry[k] < 0) };
    });
    t.eq(mixed.coins, mixed.want, 'a mixed load pays each good its own price');
    t.eq(mixed.carry, 0, 'a mixed load sells out completely');
    t.eq(mixed.neg.length, 0, 'selling cheese never drives wheat negative');

    /* Selling one good must leave the others where they are -- the whole
       point of choosing. */
    const one = await t.get(()=>{
      const a = player(); a.carry = emptyBag();
      a.carry.wheat = 9; a.carry.milk = 4;
      G.coins = 0; G.earned = 0;
      sellBag(['milk']);
      return { coins: Math.round(G.coins), wheat: a.carry.wheat, milk: a.carry.milk };
    });
    t.eq(one.milk, 0, 'the good you picked is sold');
    t.eq(one.wheat, 9, 'and the rest of the bag is untouched');
    t.eq(one.coins, 4 * 16, 'paid for that good alone');

    /* A maxed backpack holds four hundred, and the panel takes the lot in
       one press. */
    const big = await t.get(()=>{
      G.up.bag = 20; G.coins = 0; G.earned = 0;
      const a = player(); a.carry = emptyBag(); a.carry.wheat = capacity();
      const cap = capacity();
      sellBag(ITEM_ORDER);
      return { cap, carry: carried(a), coins: Math.round(G.coins) };
    });
    t.eq(big.cap, 400, 'a maxed backpack holds four hundred');
    t.eq(big.carry, 0, 'and a full one empties in a single press');
    t.eq(big.coins, big.cap * 3, 'paying for every last item');

    /* The farmhands still sell on arrival, into the till. Their parcels are
       sized from a constant, never from what is left, or the tail of the
       stack decays geometrically and the last items never arrive. */
    // the player has to be somewhere else: standing anywhere near the counter
    // collects the till as fast as the hand fills it
    await t.run(()=>{ G.till = 0; G.coins = 0;
      const a = player(); a.x = 22; a.y = 12; a.carry = emptyBag();
      actors.length = 1;
      const h = newActor(11.2, 5.5, true, false, 'field');
      h.carry = emptyBag(); h.carry.wheat = actorCap(h);
      actors.push(h); });
    const load = await t.get(()=>actorCap(actors[1]));
    await t.tick(4);              // it drains in about three, then walks off
    const hand = await t.get(()=>({ carry: carried(actors[1]), till: Math.round(G.till) }));
    t.eq(load, 80, 'a farmhand carries eighty');
    t.eq(hand.carry, 0, 'and its whole load reaches the counter');
    t.eq(hand.till, load * 3, 'every item of it paid into the till');
    await t.run(()=>{ actors.length = 1; });

    /* Fruit comes off a branch at half the speed wheat comes off the field,
       and stays half however sharp the scythe is -- the groves are meant to
       be the pickers' work, not yours. */
    const fruit = await t.get(()=>{
      G.up.orchard = 1; G.up.scythe = 6; G.up.bag = 20;
      // a harvest is worth whole trees or whole tiles, so time the swing
      // rather than counting what comes off it
      const a = player(), swing = (x,y)=>{
        a.x = x; a.y = y; a.cut = 0; a.carry = emptyBag();
        let i = 0; while(i < 900 && carried(a) === 0){ tryHarvest(a, 1/60); i++; }
        return i;
      };
      const g = PATCHES.find(p=>p.id==='orchard').rect;
      return { tree: swing(g.x + g.w/2, g.y + g.h/2), wheat: swing(22, 12) };
    });
    t.gt(fruit.wheat, 0, 'a sharp scythe still cuts wheat');
    t.near(fruit.tree, fruit.wheat*2, 1.5,
           'and the player picks fruit at half that rate, sharp scythe or not');

    /* Hired hands are capped at 80 whatever backpack the player is wearing. */
    const hands = await t.get(()=>{
      G.up.bag = 20;
      const h = newActor(0,0,true,false,'field');
      return { hand: actorCap(h), player: actorCap(player()) };
    });
    t.eq(hands.hand, 80, 'a farmhand carries at most eighty');
    t.eq(hands.player, 400, 'while the player carries four hundred');

    /* Standing on the counter with nothing must be harmless. */
    await t.run(()=>{ G.coins = 100; G.till = 0; player().carry = emptyBag(); });
    await t.tick(3);
    const idle = await t.get(()=>({ coins: Math.round(G.coins) }));
    t.eq(idle.coins, 100, 'an empty player earns nothing at the counter');
  }
};
