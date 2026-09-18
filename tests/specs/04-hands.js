/* Farmhands: the deadlock, the laziness, and the routing.
 *
 * The reported bug: a hand crossing a workshop's TAKE tray on its way to the
 * FEED tray picked up flour. Nothing but wheat can be unloaded anywhere a
 * hand walks, so carried() never reached zero, the hand never left 'deliver',
 * and it shuffled between input trays forever. Three guards came out of it,
 * and all three are checked here.
 */
'use strict';

/* Runs in the page. A farm with the first two workshops and some hands. */
function staffedFarm(n){
  G.coins = 1e6; G.earned = 1e6;
  G.up.windmill = 1; station('windmill').unlocked = true;
  G.up.coop = 1; station('coop').unlocked = true;
  G.hands = n; G.handLazy = [];
  actors.length = 1;
  for(let i=0;i<n;i++){ G.handLazy.push(false); actors.push(newActor(22+i, 12, true, false, 'field')); }
}

module.exports = {
  name: 'Farmhands',
  async run(t){
    await t.reset();

    /* A keen hand cuts, fills up, delivers and goes back for more. */
    await t.run(staffedFarm, 1);
    await t.tick(60);
    const worked = await t.get(()=>{
      const h = actors[1], w = station('windmill'), c = station('coop');
      // the mill eats what it is given, so count the flour, not the bin
      return { state: h.state, made: w.bin.wheat + w.out.flour + c.bin.wheat + c.out.egg };
    });
    t.gt(worked.made, 0, 'a farmhand feeds the workshops');
    t.ok(['seek','deliver'].includes(worked.state), 'and is still doing something');

    /* The deadlock, reproduced exactly: park a loaded hand on an out tray and
       confirm it refuses to pick anything up. */
    await t.run(()=>{ const h = actors[1];
      h.carry = emptyBag(); h.carry.wheat = 4; h.state = 'deliver'; h.tray = null;
      flyers.length = 0;                       // nothing still in the air to land
      const s = station('windmill');
      s.bin = emptyBag(); s.pend = emptyBag(); s.out = emptyBag(); s.out.flour = 40;
      const tr = s.trays.find(x=>x.mode==='out');
      h.x = tr.x + tr.w/2; h.y = tr.y + tr.h/2; });
    await t.tick(6);
    const onOut = await t.get(()=>({ flour: actors[1].carry.flour,
                                     trayFlour: station('windmill').out.flour }));
    t.eq(onOut.flour, 0, 'a farmhand never lifts finished goods off an out tray');
    // it walks off to deliver its wheat, and the mill turns that into more
    // flour -- the point is the pile never goes down
    t.gte(onOut.trayFlour, 40, 'and the tray is left for the player');

    /* Give one a load it cannot deliver anywhere. It must end up at the
       market -- which buys everything -- rather than shuffling forever. */
    await t.run(()=>{ const h = actors[1];
      h.carry = emptyBag(); h.carry.flour = 6; h.state = 'deliver'; h.tray = null;
      h.stuck = 0; h.lastLoad = -1; h.think = 0; G.till = 0; });
    await t.tick(45);
    // it may well be back in the field with a fresh armful of wheat by now;
    // what matters is that the flour is gone
    const stray = await t.get(()=>({ flour: actors[1].carry.flour, state: actors[1].state,
                                     till: Math.round(G.till) }));
    t.eq(stray.flour, 0, 'a stray non-wheat load gets delivered, not carried forever');
    t.gt(stray.till, 0, 'it is sold at the market and the takings go to the till');

    /* A hand's takings wait at the market. Constant coin flashes for someone
       else's work were just noise, so coins only move when the player
       collects. */
    const till = await t.get(()=>({ coins: Math.round(G.coins), till: Math.round(G.till) }));
    await t.stand(11.2, 5.5);
    await t.tick(3);
    const collected = await t.get(()=>({ coins: Math.round(G.coins), till: Math.round(G.till) }));
    t.eq(collected.till, 0, 'stepping on the counter empties the till');
    t.eq(collected.coins, till.coins + till.till, 'and pays every penny of it');

    /* Laziness: rolled once at hire, and it must survive a reload or a
       player could reroll a dud into a worker by refreshing. */
    await t.reset();
    const rolls = await t.get(()=>{
      let lazy = 0;
      for(let i=0;i<400;i++) if(newActor(0,0,true,undefined,'field').lazy) lazy++;
      return lazy/400;
    });
    t.near(rolls, 0.5, 0.12, 'about half of hired farmhands are lazy');

    await t.run(()=>{ G.up.hand = 4; G.hands = 4; G.handLazy = [true,false,true,false];
      actors.length = 1;
      for(let i=0;i<4;i++) actors.push(newActor(22+i,12,true,G.handLazy[i],'field'));
      save(); });
    const before = await t.get(()=>actors.slice(1).map(h=>h.lazy));
    await t.run(()=>{ const raw = localStorage.getItem(SAVE_KEY); resetGame();
                      localStorage.setItem(SAVE_KEY, raw); load(); });
    const after = await t.get(()=>({ lazy: actors.slice(1).map(h=>h.lazy), hands: G.hands }));
    t.eq(after.lazy.join(','), before.join(','), 'the lazy trait survives a reload');
    t.eq(after.hands, 4, 'and so does the headcount');

    /* A keen hand never naps; a lazy one naps, drops its load, and gets up. */
    await t.run(()=>{ G.up.windmill = 1; station('windmill').unlocked = true;
      actors.length = 1;
      actors.push(newActor(22,12,true,false,'field'));   // keen
      actors.push(newActor(23,12,true,true,'field'));    // lazy
      actors[2].work = 2; actors[2].carry = emptyBag(); actors[2].carry.wheat = 5; });
    await t.tick(4);
    const napped = await t.get(()=>({ keen: actors[1].state, lazy: actors[2].state,
                                      dropped: carried(actors[2]) }));
    t.eq(napped.lazy, 'nap', 'a lazy hand downs tools when its stretch is up');
    t.eq(napped.dropped, 0, 'and drops everything it was carrying');
    t.ok(napped.keen !== 'nap', 'a keen hand never naps');

    await t.tick(25);
    t.ok(await t.get(()=>actors[2].state) !== 'nap', 'and a lazy hand always gets back up');
  }
};
