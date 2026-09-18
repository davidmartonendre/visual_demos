/* Booting, drawing, and the dialogs.
 *
 * The restart dialog once had a single button and that button wiped the farm;
 * the confirm callback also outlived its dialog, so a cancelled wipe could
 * fire on the next dialog's OK.
 */
'use strict';
module.exports = {
  name: 'Boot and dialogs',
  async run(t){
    /* The page came up on its own -- the harness waited for G. */
    const boot = await t.get(()=>({
      canvas: !!document.getElementById('game').getContext('2d'),
      w: document.getElementById('game').width,
      coins: G.coins, level: G.level, actors: actors.length,
      pills: ITEM_ORDER.every(k => !!el('p-'+k)),
    }));
    t.gt(boot.w, 0, 'the canvas is sized');
    t.eq(boot.coins, await t.get(()=>START_COINS), 'a new farm starts with the starting purse');
    t.eq(boot.level, 1, 'at level 1');
    t.eq(boot.actors, 1, 'with just the player');
    t.ok(boot.pills, 'and a HUD pill built for every good');

    /* A frame must not cost the earth. This is a smoke test for a pathological
       regression, not a benchmark -- the bar is deliberately generous. */
    const perf = await t.get(()=>{
      G.coins = 1e7; G.earned = 1e7;
      for(const id of ['windmill','coop','bakery','dairy','cheese','orchard','jam','cherry','pickers','keeper'])
        buyPad(PADS.find(p=>p.id===id));
      for(let i=0;i<6;i++) buyPad(PADS.find(p=>p.id==='hand'));
      for(let i=0;i<60;i++){ update(1/60); draw(); }        // warm up
      const t0 = performance.now();
      for(let i=0;i<60;i++){ update(1/60); draw(); }
      return (performance.now()-t0)/60;
    });
    t.lte(perf, 25, 'a fully built farm still draws a frame in well under a frame budget');

    /* Restarting: cancel, Escape and the backdrop must all leave the farm
       alone, and only the red button may wipe it. */
    await t.run(()=>{ G.coins = 4321; G.earned = 90000; G.up.bag = 6;
                      G.up.hand = 1; G.hands = 1; save(); });
    const cancels = await t.get(()=>{
      const out = {};
      el('b-reset').click();
      out.hasCancel = !el('m-cancel').hidden;
      out.isDanger = el('m-ok').classList.contains('danger');
      el('m-cancel').click();
      out.afterCancel = { coins: G.coins, open: el('modal').classList.contains('on') };

      el('b-reset').click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      out.afterEsc = G.coins;

      el('b-reset').click();
      el('modal').click();                               // the dimmed backdrop
      out.afterBackdrop = G.coins;

      /* The cancelled confirm must not survive into the next dialog. */
      modal('Something else', '<p>hello</p>', 'OK');
      el('m-ok').click();
      out.afterUnrelatedOk = G.coins;
      return out;
    });
    t.ok(cancels.hasCancel, 'the restart dialog has a way out');
    t.ok(cancels.isDanger, 'and the wipe button is marked as dangerous');
    t.eq(cancels.afterCancel.coins, 4321, 'cancelling keeps the farm');
    t.ok(!cancels.afterCancel.open, 'and closes the dialog');
    t.eq(cancels.afterEsc, 4321, 'Escape keeps the farm');
    t.eq(cancels.afterBackdrop, 4321, 'tapping the backdrop keeps the farm');
    t.eq(cancels.afterUnrelatedOk, 4321, 'a cancelled wipe never fires on the next dialog');

    const wiped = await t.get(()=>{
      el('b-reset').click(); el('m-ok').click();
      return { coins: G.coins, bag: G.up.bag, hands: G.hands, actors: actors.length };
    });
    t.eq(wiped.coins, await t.get(()=>START_COINS), 'confirming really does start a fresh farm');
    t.eq(wiped.bag, 0, 'with no upgrades');
    t.eq(wiped.hands, 0, 'and no staff');
    t.eq(wiped.actors, 1, 'and nobody left on the map');

    /* The save dialog offers exactly what import will accept back. */
    const savebox = await t.get(()=>{
      G.coins = 777; openSaveFile();
      const text = document.querySelector('#savebox textarea').value;
      const r = decodeSave(text);
      closeModal();
      return { decodes: !!r.data, coins: r.data && r.data.coins };
    });
    t.ok(savebox.decodes, 'the text offered for copying is a real save');
    t.eq(savebox.coins, 777, 'of the farm you are actually playing');

    /* The journal shows what has happened and hides what has not. */
    const journal = await t.get(()=>{
      G.story = {}; openJournal();
      const locked = document.querySelectorAll('#jrn .lock').length;
      closeModal();
      G.story[STORY[0].id] = 1; openJournal();
      const open = document.querySelectorAll('#jrn .e').length - document.querySelectorAll('#jrn .lock').length;
      closeModal();
      return { locked, open };
    });
    t.gt(journal.locked, 0, 'an unread chapter stays a mystery');
    t.eq(journal.open, 1, 'and a read one is there to read again');
  }
};
