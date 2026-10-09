/* Auto sell and auto buy.
 *
 * Two toggles for how much the farm does by itself, both shipped ON.
 *
 * Auto sell puts back the on-contact selling the bag panel was built to
 * replace -- walk onto the counter, the stand or the order board and the bag
 * empties. Off, those squares only point at the panel, and 11-bag covers that
 * side. Whichever is on, the goods leave through sellBag/standBag/boardBag:
 * one payout path, so a good cannot be worth one price on contact and another
 * from a button.
 *
 * Auto buy is the same bargain at the upgrade pads. The case worth care is
 * turning it OFF with coins already poured into a pad: that money has to stay
 * poured, and the BUY button has to charge only what is left.
 *
 * The page's rAF loop runs between evaluates, so anything counting coins sets
 * up, acts and reads inside ONE call.
 */
'use strict';
const SELL = { x:11.2, y:5.5 };

module.exports = {
  name: 'Auto sell and auto buy',
  async run(t){
    await t.reset();

    const def = await t.get(()=>({ sell:G.autoSell, buy:G.autoBuy }));
    t.ok(def.sell, 'a fresh farm sells automatically');
    t.ok(def.buy,  'and buys automatically');

    /* ---- auto sell: the counter ---- */
    const counter = await t.get(()=>{
      G.autoSell = true; G.coins = 0; G.earned = 0; G.till = 0;
      const a = player();
      a.carry = emptyBag(); a.carry.wheat = 20; a.carry.egg = 5;
      a.x = 11.2; a.y = 5.5;
      // the panel is not even offered: these squares do the choosing
      syncHUD();
      const button = el('b-bag').classList.contains('on'), spot = bagSpot();
      for(let i=0;i<180;i++) update(1/60);
      return { button, spot, carry: carried(a),
               coins: Math.round(G.coins), earned: Math.round(G.earned),
               worth: ITEMS.wheat.price*20 + ITEMS.egg.price*5 };
    });
    t.eq(counter.spot, null,    'auto-sell leaves the bag panel with nowhere to open');
    t.eq(counter.button, false, 'so the INVENTORY button stays hidden');
    t.eq(counter.carry, 0,      'standing on the counter empties the bag');
    t.eq(counter.coins, counter.worth, 'and pays market rate for every good in it');
    t.eq(counter.earned, counter.worth, 'which counts towards the level, as selling always has');

    /* ---- auto sell: the farm stand, with a keeper minding it ---- */
    const stocked = await t.get(()=>{
      G.autoSell = true; G.up.keeper = 1;
      if(!actors.some(x=>x.job==='stall')) actors.push(newActor(keeperSpot().x, keeperSpot().y, true, false, 'stall'));
      G.stock = emptyBag();
      const a = player();
      a.carry = emptyBag(); a.carry.wheat = 30;
      a.x = STAND.x + STAND.w/2; a.y = STAND.y + STAND.h/2;
      for(let i=0;i<180;i++) update(1/60);
      return { carry: carried(a), stock: stockTotal() };
    });
    t.eq(stocked.carry, 0,  'at the stand it hands the load over');
    t.gt(stocked.stock, 0,  'and the keeper has it to sell');

    /* ---- auto sell: the order board ---- */
    const board = await t.get(()=>{
      G.autoSell = true; G.coins = 0;
      const o = G.orders[0];
      const k = Object.keys(o.need)[0], want = o.need[k];
      const a = player();
      a.carry = emptyBag(); a.carry[k] = want;
      a.x = BOARD.x + BOARD.w/2; a.y = BOARD.y + BOARD.h/2;
      for(let i=0;i<240;i++) update(1/60);
      return { left: a.carry[k], want, coins: Math.round(G.coins) };
    });
    t.eq(board.left, 0,   'standing at the board hands over what the order asked for');
    t.gt(board.coins, 0,  'and the order pays');

    /* ---- auto sell off: the board waits, and the panel opens there ---- */
    const manual = await t.get(()=>{
      G.autoSell = false; G.coins = 0;
      const o = G.orders[0];
      const k = Object.keys(o.need)[0], want = o.need[k];
      const a = player();
      a.carry = emptyBag(); a.carry[k] = want;
      a.x = BOARD.x + BOARD.w/2; a.y = BOARD.y + BOARD.h/2;
      for(let i=0;i<120;i++) update(1/60);
      const held = a.carry[k], idle = Math.round(G.coins);
      // the board sits close to the counter, so a radius check would open the
      // wrong panel here -- it is matched by its own rect first
      const spot = bagSpot();
      const err = boardBag([k]);
      return { held, idle, spot, err, after: a.carry[k], coins: Math.round(G.coins) };
    });
    t.gt(manual.held, 0,     'with auto-sell off the board takes nothing by itself');
    t.eq(manual.idle, 0,     'and pays nothing');
    t.eq(manual.spot, 'board', 'the panel knows it is at the order board, not the counter');
    t.eq(manual.err, null,   'and handing goods over from it works');
    t.eq(manual.after, 0,    'the goods go');
    t.gt(manual.coins, 0,    'and the order pays the same way');

    /* ---- auto buy on: the pad drinks your coins, no button ---- */
    const pour = await t.get(()=>{
      G.autoBuy = true; G.up.scythe = 0; G.paid.scythe = 0; G.coins = 10;
      const p = PADS.find(x=>x.id==='scythe');
      const a = player(); a.x = p.x; a.y = p.y;
      for(let i=0;i<120;i++) update(1/60);
      syncHUD();
      return { coins: Math.round(G.coins), paid: Math.round(G.paid.scythe),
               button: el('b-buy').classList.contains('on'), cost: padCost(p) };
    });
    t.eq(pour.button, false, 'auto-buy shows no BUY button -- the pad is the button');
    t.eq(pour.coins, 0,      'standing on a pad pours in what you have');
    t.gt(pour.paid, 0,       'and the pad holds it');

    /* ---- THE case: turn auto-buy off with money already in the pad ----
       That money must stay in it. Re-pricing an upgrade somebody is halfway
       through would quietly charge them twice for the same coins. */
    const owing = await t.get(()=>{
      G.autoBuy = false; G.coins = 0;
      const p = PADS.find(x=>x.id==='scythe');
      const a = player(); a.x = p.x; a.y = p.y;
      for(let i=0;i<120;i++) update(1/60);
      syncHUD();
      const b = el('b-buy');
      return { paid: Math.round(G.paid.scythe), cost: padCost(p), owe: padOwing(p),
               on: b.classList.contains('on'), poor: b.classList.contains('poor'),
               text: b.textContent, refused: buyHere(), still: G.up.scythe };
    });
    t.eq(owing.paid, 10,            'the coins poured in under auto-buy are still in the pad');
    t.eq(owing.owe, owing.cost - 10,'so the BUY button asks only for the rest');
    t.ok(owing.on,                  'the button is on the screen');
    t.ok(owing.poor,                'greyed, because the rest is not affordable yet');
    t.ok(/SCYTHE/.test(owing.text), 'and it names the upgrade');
    t.ok(/\$/.test(owing.text),     'and the price');
    t.ok(owing.refused,             'pressing it refuses rather than part-paying');
    t.eq(owing.still, 0,            'nothing is bought');

    /* a penny short is still short */
    const short = await t.get(()=>{
      const p = PADS.find(x=>x.id==='scythe');
      G.coins = padOwing(p) - 1;
      const a = player(); a.x = p.x; a.y = p.y;
      for(let i=0;i<30;i++) update(1/60);
      return { err: buyHere(), level: G.up.scythe, coins: Math.round(G.coins) };
    });
    t.ok(short.err,        'one coin short and the button still refuses');
    t.eq(short.level, 0,   'no upgrade');
    t.gt(short.coins, 0,   'and auto-buy being off means the pad took nothing either');

    /* exactly enough buys it, and charges only what was owed */
    const bought = await t.get(()=>{
      const p = PADS.find(x=>x.id==='scythe');
      const owe = padOwing(p);
      G.coins = owe + 7;                       // a little spare, to prove the price
      const a = player(); a.x = p.x; a.y = p.y;
      for(let i=0;i<30;i++) update(1/60);
      const err = buyHere();
      return { err, owe, level: G.up.scythe, coins: Math.round(G.coins),
               paid: Math.round(G.paid.scythe) };
    });
    t.eq(bought.err, null,   'with the rest in hand, BUY buys');
    t.eq(bought.level, 1,    'the upgrade lands');
    t.eq(bought.coins, 7,    'and costs exactly what was owed, not the full price again');
    t.eq(bought.paid, 0,     'the pad starts empty for the next level');

    /* ---- both survive a reload ---- */
    const saved = await t.get(()=>{
      G.autoSell = false; G.autoBuy = false; save();
      // resetGame() saves on its way out, so it buries the farm you just
      // wrote. Hold the blob and put it back before loading -- init() does
      // exactly this dance, and for exactly this reason.
      const raw = STORE.read();
      resetGame(); STORE.write(raw); load();
      const off = { sell:G.autoSell, buy:G.autoBuy };
      // a save from before the toggles existed opens with the shipped defaults
      const old = sanitiseSave({});
      return { off, oldSell: old.autoSell, oldBuy: old.autoBuy };
    });
    t.eq(saved.off.sell, false, 'auto-sell survives a reload');
    t.eq(saved.off.buy, false,  'and so does auto-buy');
    t.ok(saved.oldSell,         'a save from before the toggles gets auto-sell on, like a new farm');
    t.ok(saved.oldBuy,          'and auto-buy on');

    await t.reset();
  }
};
