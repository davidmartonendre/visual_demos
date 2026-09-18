/* The bag panel, and the money pile beside the counter.
 *
 * Walking onto a tray moves the whole bag at once. That is the fast way and
 * it stays, but it used to be the only way: collecting what the farmhands had
 * earned meant standing on the SELL tray, which sold everything you were
 * carrying on the way past. The panel is the deliberate version -- one good
 * at a time, and the takings on a button of their own.
 *
 * The pile itself used to be drawn on the SELL tray, which is exactly where
 * the player stands to collect it, so their own body covered the money and it
 * looked as though the farmhands had earned nothing.
 *
 * Note for anyone adding to this file: the page's own frame loop is still
 * running between one evaluate and the next, so a load set down on a tray can
 * be sold before the next call arrives. Set the position and the bag in the
 * same evaluate as the thing being tested.
 */
'use strict';
const SELL  = { x:11.2, y:5.5 };          // the market's sell tray
const NEAR  = { x:13.2, y:7.0 };          // within reach of it, on nothing
const FIELD = { x:22, y:12 };

module.exports = {
  name: 'The bag panel',
  async run(t){
    await t.reset();

    /* The button knows where you are standing. */
    const near = await t.get(()=>{
      const a = player(), on = ()=>{ syncHUD(); return el('b-bag').classList.contains('on'); };
      a.x = 22; a.y = 12;                    const field = on();
      a.x = 13.2; a.y = 7.0;                 const market = on();
      a.x = STAND.x+1.3; a.y = STAND.y+1.4;  const stand = on();
      return { field, market, stand, where: bagSpot() };
    });
    t.ok(!near.field, 'the panel does not offer itself out in the field');
    t.ok(near.market, 'it is there at the counter');
    t.ok(near.stand, 'and at the farm stand');
    t.eq(near.where, 'stand', 'and it knows which of the two you are at');

    /* Selling one good sells that good and nothing else. */
    const one = await t.get(([x,y])=>{
      G.coins = 0; G.earned = 0; G.till = 0;
      const a = player(); a.x = x; a.y = y;
      a.carry = emptyBag(); a.carry.wheat = 10; a.carry.cheese = 4;
      openBag('market');
      el('bag').querySelector('[data-k=cheese]').click();
      return { coins: Math.round(G.coins), wheat: a.carry.wheat, cheese: a.carry.cheese,
               open: el('modal').classList.contains('on'),
               rows: document.querySelectorAll('#bag .crow').length };
    }, [NEAR.x, NEAR.y]);
    t.eq(one.cheese, 0, 'the cheese goes');
    t.eq(one.wheat, 10, 'and the wheat stays in the bag');
    t.eq(one.coins, 4 * 52, 'paid at list price for what was sold');
    t.ok(one.open, 'the panel stays up for the next decision');
    t.eq(one.rows, 2, 'and the sold-out row has gone from it');

    /* The takings come out on their own, without selling the bag. */
    const takings = await t.get(()=>{
      G.coins = 0; G.earned = 0; G.till = 500;
      openBag('market');
      el('bag').querySelector('[data-k=__till]').click();
      const paid = { coins: Math.round(G.coins), till: Math.round(G.till),
                     wheat: player().carry.wheat };
      el('bag').querySelector('[data-k=__till]').click();       // and again, on nothing
      paid.twice = Math.round(G.coins);
      paid.msg = el('bagmsg').textContent;
      return paid;
    });
    t.eq(takings.till, 0, 'collecting empties the till');
    t.eq(takings.coins, 500, 'and pays every penny of it');
    t.eq(takings.wheat, 10, 'without touching what you are carrying');
    t.eq(takings.twice, 500, 'an empty till pays nothing the second time');
    t.ok(takings.msg.length > 0, 'and says why');

    /* With the panel open the trays keep their hands off the bag, or the
       whole load would be gone before the first button was pressed. */
    await t.run(([x,y])=>{ const a = player(); a.x = x; a.y = y;
      a.carry = emptyBag(); a.carry.wheat = 10; openBag('market'); }, [SELL.x, SELL.y]);
    await t.tick(4);
    t.eq(await t.get(()=>player().carry.wheat), 10,
         'standing on the counter with the panel open sells nothing by itself');

    /* Walking off closes it -- the panel belongs to the place, not the player. */
    await t.stand(FIELD.x, FIELD.y, 0.2);
    const walked = await t.get(()=>({ open: el('modal').classList.contains('on'), bag: bagOpen }));
    t.ok(!walked.open, 'walking away shuts the panel');
    t.eq(walked.bag, null, 'and forgets it was open');

    /* ... and the tray still works the old way once it is shut. */
    await t.stand(SELL.x, SELL.y, 6);
    t.eq(await t.get(()=>carried(player())), 0, 'the counter still takes the lot when you just walk on');

    /* The money pile stands on its own square beside the counter. */
    const pad = await t.get(()=>({
      clear: TILL_PAD.x + TILL_PAD.w <= 10.2 || TILL_PAD.x >= 12.2 ||
             TILL_PAD.y + TILL_PAD.h <= 3.4 || TILL_PAD.y >= 7.6,
      x: TILL_PAD.x + TILL_PAD.w/2, y: TILL_PAD.y + TILL_PAD.h/2 }));
    t.ok(pad.clear, 'the pile is off the SELL tray, not on top of it');

    /* Stepping on it collects without selling anything. */
    await t.run(([x,y])=>{ const a = player(); a.x = x; a.y = y;
      G.till = 250; G.coins = 0; G.earned = 0;
      a.carry = emptyBag(); a.carry.pie = 3; }, [pad.x, pad.y]);
    await t.tick(1);
    const stepped = await t.get(()=>({ coins: Math.round(G.coins), till: Math.round(G.till),
                                       pie: player().carry.pie }));
    t.eq(stepped.till, 0, 'stepping on the money collects it');
    t.eq(stepped.coins, 250, 'for what it was worth');
    t.eq(stepped.pie, 3, 'and the pies stay in the bag');

    /* The farm stand. With a keeper it takes goods into stock. */
    const stocked = await t.get(()=>{
      G.up.keeper = 1; G.stock = emptyBag();
      const a = player(); a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2;
      a.carry = emptyBag(); a.carry.pie = 12; a.carry.milk = 5;
      openBag('stand');
      el('bag').querySelector('[data-k=pie]').click();
      return { stock: G.stock.pie, milk: G.stock.milk, carried: a.carry.pie, kept: a.carry.milk };
    });
    t.eq(stocked.stock, 12, 'a keeper takes the whole stack into stock');
    t.eq(stocked.carried, 0, 'and it leaves the bag');
    t.eq(stocked.milk, 0, 'nothing else goes with it');
    t.eq(stocked.kept, 5, 'the rest of the load stays with you');

    /* Without one, it sells to whoever in the queue asked for it -- and says
       so plainly when nobody did. */
    const served = await t.get(()=>{
      G.up.keeper = 0; G.coins = 0; G.earned = 0;
      const a = player(); a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2;
      a.carry = emptyBag(); a.carry.pie = 6; a.carry.wheat = 9;
      for(const c of customers){ c.state = 'walk'; c.n = 0; }
      const c = customers[0]; c.state = 'wait'; c.want = 'pie'; c.n = 4;
      openBag('stand');
      el('bag').querySelector('[data-k=pie]').click();
      const paid = Math.round(G.coins);
      el('bag').querySelector('[data-k=wheat]').click();
      return { paid, pie: a.carry.pie, wheat: a.carry.wheat,
               msg: el('bagmsg').textContent, coins: Math.round(G.coins),
               price: standPrice('pie') };
    });
    t.eq(served.pie, 2, 'the villager takes what they asked for and no more');
    t.eq(served.paid, 4 * served.price, 'and pays over the odds for it');
    t.eq(served.wheat, 9, 'a good nobody wants stays in the bag');
    t.eq(served.coins, served.paid, 'and earns nothing');
    t.ok(served.msg.length > 0, 'the panel says why nothing happened');
  }
};
