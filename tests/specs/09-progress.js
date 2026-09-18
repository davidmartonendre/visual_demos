/* Upgrade pads, what the valley knows how to make, and the shop.
 *
 * availableItems() is the single source of truth for what exists yet: the HUD
 * pills, the villagers' wants and the order board all derive from it, and
 * that is what stops the game asking for goods the player cannot make.
 */
'use strict';
module.exports = {
  name: 'Upgrades, wants and the shop',
  async run(t){
    await t.reset();

    /* Standing on a pad spends coins and buys the upgrade. */
    const bought = await t.get(()=>{
      const p = PADS.find(p=>p.id==='scythe'), cost = padCost(p);
      G.paid.scythe = 0; G.coins = cost;        // exactly one level's worth
      const a = player(); a.x = p.x; a.y = p.y;
      for(let i=0;i<600;i++) update(1/60);
      return { level: G.up.scythe, spent: cost - G.coins, cost };
    });
    t.eq(bought.level, 1, 'standing on a pad buys it');
    t.near(bought.spent, bought.cost, 2, 'and costs what it says');

    /* An upgrade at its maximum is off the board. */
    const maxed = await t.get(()=>{
      const p = PADS.find(p=>p.id==='windmill');
      G.up.windmill = p.max;
      return { visible: visiblePads().some(x=>x.id==='windmill') };
    });
    t.ok(!maxed.visible, 'a maxed-out pad disappears');

    /* Buying a building's pad opens the building, by name, with no extra code. */
    await t.reset();
    const opened = await t.get(()=>{
      const out = {};
      for(const id of ['windmill','coop','bakery','dairy','cheese','jam']){
        buyPad(PADS.find(p=>p.id===id));
        out[id] = station(id).unlocked;
      }
      return out;
    });
    for(const id in opened) t.ok(opened[id], 'buying the ' + id + ' pad opens the ' + id);

    /* Hiring adds an actual worker, of the right sort. */
    await t.reset();
    const hired = await t.get(()=>{
      buyPad(PADS.find(p=>p.id==='hand'));
      buyPad(PADS.find(p=>p.id==='orchard'));
      buyPad(PADS.find(p=>p.id==='pickers'));
      buyPad(PADS.find(p=>p.id==='keeper'));
      return { field: actors.filter(a=>a.job==='field').length,
               orchard: actors.filter(a=>a.job==='orchard').length,
               stall: actors.filter(a=>a.job==='stall').length,
               hands: G.hands, lazyRolled: G.handLazy.length, pickerRolled: G.pickerLazy.length };
    });
    t.eq(hired.field, 1, 'hiring a farmhand puts one in the field');
    t.eq(hired.orchard, 1, 'hiring a picker puts one in the groves');
    t.eq(hired.stall, 1, 'hiring a keeper puts one at the stall');
    t.eq(hired.hands, 1, 'the headcount matches');
    t.eq(hired.lazyRolled, 1, 'and each hand has its trait rolled once');
    t.eq(hired.pickerRolled, 1, 'and so does each picker');

    /* availableItems() must only ever name things the player can actually
       get hold of, and must grow as the farm does. */
    await t.reset();
    const start = await t.get(()=>availableItems());
    t.eq(start.join(','), 'wheat', 'a new farm can only make wheat');

    const grown = await t.get(()=>{
      const steps = [];
      for(const id of ['windmill','coop','bakery','orchard','jam','cherry','dairy','cheese']){
        buyPad(PADS.find(p=>p.id===id));
        steps.push({ id, items: availableItems() });
      }
      return steps;
    });
    for(let i=1;i<grown.length;i++)
      t.gte(grown[i].items.length, grown[i-1].items.length,
            'unlocking ' + grown[i].id + ' never takes a good away');
    t.eq(grown[grown.length-1].items.length, await t.get(()=>ITEM_ORDER.length),
         'a fully built farm can make everything');

    /* Villagers and the order board only ever ask for those. */
    const asks = await t.get(()=>{
      const open = availableItems();
      for(const c of customers) resetCustomer(c);
      refreshOrders();
      const orders = [];
      for(let i=0;i<40;i++){ const o = makeOrder(); orders.push.apply(orders, Object.keys(o.items)); }
      return { wants: customers.map(c=>c.want).filter(w => !open.includes(w)),
               orders: orders.filter(k => !open.includes(k)) };
    });
    t.eq(asks.wants.length, 0, 'no villager asks for something that cannot be made');
    t.eq(asks.orders.length, 0, 'and neither does the order board');

    /* Anything laid out along a building has to be spaced from that
       building's own width and capped, or it marches off the end once
       enough goods are unlocked. */
    const drawn = await t.get(()=>{
      const a = player(); a.carry = emptyBag();
      for(const k of ITEM_ORDER) a.carry[k] = 5;
      const errs = [];
      try { drawStall(); drawStandPad(); drawBoard(); draw(); }
      catch(e){ errs.push(e.message); }
      return errs;
    });
    t.eq(drawn.length, 0, 'a fully stocked farm draws without complaint');

    /* The HUD shows a pill for every good the player is holding, whatever it
       is -- four places once listed only wheat, eggs and pies. */
    const pills = await t.get(()=>{
      const a = player(); a.carry = emptyBag();
      for(const k of ITEM_ORDER) a.carry[k] = 7;
      syncHUD();
      return ITEM_ORDER.filter(k => { const n = el('p-'+k);
        return !n || n.classList.contains('hide') || n.querySelector('span').textContent !== '7'; });
    });
    t.eq(pills.join(','), '', 'every carried good gets its own HUD pill');

    /* The shop: buy, wear, take off, and it all persists. */
    const shop = await t.get(()=>{
      G.coins = 1e7; G.cos = {}; G.wear = {};
      openShop();
      const first = COSMETICS[0];
      el('shop').querySelector('[data-c='+first.id+']').click();
      const afterBuy = { owned: !!G.cos[first.id], worn: G.wear[first.slot], coins: G.coins };
      el('shop').querySelector('[data-c='+first.id+']').click();
      const afterOff = G.wear[first.slot];
      closeModal();
      return { first: first.id, cost: first.cost, afterBuy, afterOff };
    });
    t.ok(shop.afterBuy.owned, 'a cosmetic can be bought');
    t.eq(shop.afterBuy.worn, shop.first, 'and is worn straight away');
    t.eq(shop.afterBuy.coins, 1e7 - shop.cost, 'for its price');
    t.eq(shop.afterOff, null, 'and can be taken off again');
    t.gte(shop.cost, 500000, 'the cheapest cosmetic is a serious amount of money');

    const kept = await t.get(()=>{
      save(); const raw = localStorage.getItem(SAVE_KEY);
      resetGame(); localStorage.setItem(SAVE_KEY, raw); load();
      return { owned: G.cos[COSMETICS[0].id] };
    });
    t.ok(!!kept.owned, 'and what you own survives a reload');
  }
};
