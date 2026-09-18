/* The million-dollar party.
 *
 * Everything stops, the valley walks into the wheat field, and the player
 * still has the controls. Two dance moves, alternating, so mashing the button
 * looks like the dance everyone else is doing.
 */
'use strict';
module.exports = {
  name: 'The party',
  async run(t){
    await t.reset();

    /* You cannot throw one you have not paid for. */
    const broke = await t.get(()=>{
      G.coins = PARTY_COST - 1; openShop();
      const btn = el('shop').querySelector('[data-c=party]');
      btn.click();
      const out = { party: partyOn(), coins: G.coins, msg: el('shopmsg').textContent };
      closeModal();
      return out;
    });
    t.ok(!broke.party, 'a million short of a million buys no party');
    t.eq(broke.coins, await t.get(()=>PARTY_COST - 1), 'and costs nothing');
    t.ok(broke.msg.length > 0, 'it says why');

    /* Set up a busy farm, then buy it. */
    await t.run(()=>{
      G.coins = 2e6; G.earned = 5e6;
      G.up.windmill = 1; station('windmill').unlocked = true;
      G.up.hand = 3; G.hands = 3; G.handLazy = [false,true,false];
      actors.length = 1;
      for(let i=0;i<3;i++) actors.push(newActor(22+i, 12, true, G.handLazy[i], 'field'));
      const s = station('windmill'); s.bin = emptyBag(); s.bin.wheat = 40; s.out = emptyBag();
    });
    const bought = await t.get(()=>{
      openShop(); el('shop').querySelector('[data-c=party]').click();
      return { party: partyOn(), coins: G.coins, owned: !!G.cos.party,
               ui: el('party').classList.contains('on'),
               modal: el('modal').classList.contains('on') };
    });
    t.ok(bought.party, 'a million buys a party');
    t.eq(bought.coins, 1e6, 'and costs exactly a million');
    t.ok(bought.owned, 'it is yours from then on');
    t.ok(bought.ui, 'the dance controls appear');
    t.ok(!bought.modal, 'and the shop gets out of the way');

    /* Work stops. Nothing is produced, nothing is harvested, no orders turn
       over -- the valley is at the party. */
    const before = await t.get(()=>({ flour: station('windmill').out.flour,
                                      wheat: PATCHES[0].nodes.filter(n=>n.ripe).length }));
    await t.tick(10);
    const during = await t.get(()=>({ flour: station('windmill').out.flour,
                                      wheat: PATCHES[0].nodes.filter(n=>n.ripe).length }));
    t.eq(during.flour, before.flour, 'the mill stops while the party is on');
    t.eq(during.wheat, before.wheat, 'and nobody is cutting wheat');

    /* Everyone gathers and dances. */
    const crowd = await t.get(()=>{
      const c = partyCrowd();
      return { n: c.length, dancing: c.filter(q=>q.dancing).length,
               spread: Math.max.apply(null, c.map(q=>Math.hypot(q.x-G.party.x, q.y-G.party.y))) };
    });
    t.gt(crowd.n, 3, 'the farmhands and the stand queue all come');
    t.eq(crowd.dancing, crowd.n, 'and every one of them is dancing');
    t.lte(crowd.spread, 8, 'in a ring around the middle of the field');

    /* The player still drives. */
    const moved = await t.get(()=>{
      const a = player(), x0 = a.x, y0 = a.y;
      for(let i=0;i<30;i++) moveActor(a, 1, 0, 1, 1/60);
      return Math.hypot(a.x-x0, a.y-y0);
    });
    t.gt(moved, 0.3, 'you can still walk about');

    /* Two moves, alternating, so mashing looks like a dance. */
    const moves = [];
    for(let i=0;i<6;i++) moves.push(await t.get(()=>{ playerDance();
      return { move: player().danceMove, dancing: player().dancing }; }));
    t.ok(moves.every(m=>m.dancing), 'every tap dances');
    t.eq(new Set(moves.map(m=>m.move)).size, 2, 'there are exactly two moves');
    t.ok(moves.every((m,i)=> i===0 || m.move !== moves[i-1].move), 'and they alternate');

    /* A move times out, so a single tap is one move and not a permanent pose. */
    await t.tick(1);
    t.ok(!(await t.get(()=>player().dancing)), 'a dance move ends on its own');

    /* Music plays on the beat rather than every frame. */
    const beats = await t.get(()=>{
      const seen = new Set();
      for(let i=0;i<300;i++){ G.party.t += 1/60; partyMusic(); seen.add(G.party.lastBeat); }
      return seen.size;
    });
    t.gt(beats, 3, 'the tune advances');
    t.lte(beats, 30, 'but on beats, not on frames');

    /* Back to work. */
    await t.run(()=>endParty());
    await t.tick(20);
    const back = await t.get(()=>({ party: partyOn(), ui: el('party').classList.contains('on'),
      working: actors.slice(1).filter(a=>a.state!=='party').length,
      flour: station('windmill').out.flour }));
    t.ok(!back.party, 'the party ends');
    t.ok(!back.ui, 'the controls go away');
    t.gt(back.working, 0, 'the farmhands go back to work');
    t.gt(back.flour, 0, 'and the mill turns again');

    /* Once bought, it can be thrown again for free. */
    const again = await t.get(()=>{
      const coins = G.coins;
      openShop(); el('shop').querySelector('[data-c=party]').click();
      const out = { party: partyOn(), paidAgain: coins !== G.coins };
      endParty();
      return out;
    });
    t.ok(again.party, 'you can throw another one');
    t.ok(!again.paidAgain, 'without paying twice');
  }
};
